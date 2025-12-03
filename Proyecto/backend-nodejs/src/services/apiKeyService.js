const { AiApiKey, sequelize } = require('../models')
const crypto = require('../utils/crypto')
const { Op } = require('sequelize')

// Helper to ensure priority column exists (Migration helper)
async function ensurePriorityColumn() {
  try {
    // Check if column exists
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='ai_api_keys' AND column_name='priority';
    `)
    
    if (results.length === 0) {
      console.log('Adding priority column to ai_api_keys table...')
      await sequelize.query(`
        ALTER TABLE ai_api_keys 
        ADD COLUMN priority INTEGER DEFAULT 0;
      `)
      console.log('Priority column added successfully.')
    }
  } catch (err) {
    console.error('Error checking/adding priority column:', err)
  }
}

// Helper to ensure .env key exists in DB if DB is empty
async function ensureSystemKeys() {
  try {
    const count = await AiApiKey.count()
    if (count === 0) {
      const envKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY
      if (envKey) {
        console.log('Initializing API Key pool with system key from .env')
        await addKey('Key Inicial (.env)', envKey, 'google')
      }
    }
  } catch (err) {
    console.error('Error ensuring system keys:', err)
  }
}

async function getActiveKey(provider = 'google') {
  // Ensure we have keys if this is the first run
  await ensureSystemKeys()
  await ensurePriorityColumn()

  // 1. Check if we need to reset any quotas (simple logic: if quota_reset_at passed)
  await AiApiKey.update(
    { quota_exceeded: false, quota_reset_at: null },
    { where: { quota_exceeded: true, quota_reset_at: { [Op.lt]: new Date() } } }
  )

  // 2. Find best key
  // Order by priority ASC (0 is highest), then last_used_at ASC (least recently used within same priority)
  const key = await AiApiKey.findOne({
    where: {
      provider,
      is_active: true,
      quota_exceeded: false
    },
    order: [
      ['priority', 'ASC'],
      ['last_used_at', 'ASC'] 
    ]
  })

  if (!key) return null

  return {
    id: key.id,
    key: crypto.decrypt(key.key_value),
    alias: key.alias
  }
}

async function logUsage(id, operationType = 'unknown', success = true, errorMessage = null) {
    if (id === 'legacy') return // Don't log legacy key usage in DB logs (or handle differently)
    
    const key = await AiApiKey.findByPk(id)
    if (!key) return

    // Update key stats
    const updates = {
        last_used_at: new Date(),
        usage_count: key.usage_count + 1
    }
    if (!success) {
        updates.error_count = key.error_count + 1
    }
    await key.update(updates)

    // Insert into log table
    try {
        await sequelize.query(
            `INSERT INTO ai_key_logs (key_id, operation_type, status, error_message, created_at) 
             VALUES (:key_id, :type, :status, :error, NOW())`,
            {
                replacements: {
                    key_id: id,
                    type: operationType,
                    status: success ? 'success' : 'error',
                    error: errorMessage ? errorMessage.substring(0, 500) : null
                },
                type: sequelize.QueryTypes.INSERT
            }
        )
    } catch (err) {
        console.error('Error logging key usage:', err)
    }
}

async function reportError(id, error, operationType = 'unknown') {
  await logUsage(id, operationType, false, error.message)

  const key = await AiApiKey.findByPk(id)
  if (!key) return

  const isQuota = error.message && (
    error.message.includes('429') || 
    error.message.includes('quota') || 
    error.message.includes('RESOURCE_EXHAUSTED')
  )

  const updates = {}

  if (isQuota) {
    updates.quota_exceeded = true
    // Reset in 24 hours
    const resetTime = new Date()
    resetTime.setHours(resetTime.getHours() + 24)
    updates.quota_reset_at = resetTime
    await key.update(updates)
  }
  
  return isQuota
}

async function addKey(alias, keyValue, provider = 'google') {
  const encrypted = crypto.encrypt(keyValue)
  
  // Get max priority to append to end
  const maxPriority = await AiApiKey.max('priority') || 0
  
  return await AiApiKey.create({
    alias,
    key_value: encrypted,
    provider,
    priority: maxPriority + 1
  })
}

async function updateKey(id, { alias, keyValue, is_active }) {
  const key = await AiApiKey.findByPk(id)
  if (!key) throw new Error('Key not found')
  
  const updates = {}
  if (alias !== undefined) updates.alias = alias
  if (is_active !== undefined) updates.is_active = is_active
  if (keyValue) {
    updates.key_value = crypto.encrypt(keyValue)
    // If updating key, maybe reset quota flags?
    updates.quota_exceeded = false
    updates.error_count = 0
  }

  await key.update(updates)
  return key
}

async function updateOrder(orderedIds) {
  if (!Array.isArray(orderedIds)) throw new Error('Invalid input')
  
  const transaction = await sequelize.transaction()
  try {
    for (let i = 0; i < orderedIds.length; i++) {
      await AiApiKey.update(
        { priority: i },
        { 
          where: { id: orderedIds[i] },
          transaction
        }
      )
    }
    await transaction.commit()
    return true
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}

async function deleteKey(id) {
  const key = await AiApiKey.findByPk(id)
  if (key) await key.destroy()
}

async function listKeys(provider = 'google') {
  await ensureSystemKeys()
  await ensurePriorityColumn()
  
  const keys = await AiApiKey.findAll({
    where: { provider },
    order: [['priority', 'ASC'], ['created_at', 'DESC']]
  })

  // Fetch usage by type for each key
  // This is an expensive query (N+1), in production we should do a GROUP BY join.
  // For MVP with few keys, this is fine.
  const keysWithStats = await Promise.all(keys.map(async (k) => {
      // Get usage counts by type
      const stats = await sequelize.query(
          `SELECT operation_type, COUNT(*) as count 
           FROM ai_key_logs 
           WHERE key_id = :keyId 
           GROUP BY operation_type`,
          {
              replacements: { keyId: k.id },
              type: sequelize.QueryTypes.SELECT
          }
      )
      
      const usageByType = {}
      stats.forEach(s => {
          usageByType[s.operation_type] = parseInt(s.count)
      })

      return {
        id: k.id,
        alias: k.alias,
        masked_key: crypto.mask(crypto.decrypt(k.key_value)),
        is_active: k.is_active,
        usage_count: k.usage_count, // Total from counter
        usage_by_type: usageByType, // Detailed from logs
        error_count: k.error_count,
        quota_exceeded: k.quota_exceeded,
        last_used_at: k.last_used_at,
        created_at: k.created_at,
        priority: k.priority || 0
      }
  }))

  return keysWithStats
}

async function resetStats(id) {
  const key = await AiApiKey.findByPk(id)
  if (key) {
    await key.update({
      usage_count: 0,
      error_count: 0,
      quota_exceeded: false,
      quota_reset_at: null
    })
  }
}

async function getStats(id) {
  // Fetch last 100 logs for this key
  const logs = await sequelize.query(
    `SELECT * FROM ai_key_logs WHERE key_id = :id ORDER BY created_at DESC LIMIT 100`,
    {
      replacements: { id },
      type: sequelize.QueryTypes.SELECT
    }
  )
  return logs
}

module.exports = {
  getActiveKey,
  logUsage,
  reportError,
  addKey,
  updateKey,
  updateOrder,
  deleteKey,
  listKeys,
  resetStats,
  getStats
}
