const crypto = require('../utils/crypto')
const { Configuracion } = require('../models')
const { GoogleGenerativeAI } = require('@google/generative-ai')

let cache = {}
const CACHE_TTL_MS = 5 * 60 * 1000

const KNOWN_KEYS = [
  // google_api_key removido para evitar duplicidad con Pool de API Keys
  { key: 'gemini_model', envVars: ['GEMINI_MODEL', 'GOOGLE_GEMINI_MODEL'], isSecret: false, description: 'Modelo de Gemini (ej: gemini-2.5-flash)' },
  { key: 'scrape_timeout', envVars: ['SCRAPE_TIMEOUT'], isSecret: false, description: 'Timeout para scraping (ms)' },
  { key: 'headless_mode', envVars: ['HEADLESS_MODE'], isSecret: false, description: 'Modo headless para navegador (true/false)' },
  { key: 'log_level', envVars: ['LOG_LEVEL'], isSecret: false, description: 'Nivel de log (info, debug, error)' }
]

function now() { return Date.now() }

function setCache(clave, value) {
  cache[clave] = { value, expiresAt: now() + CACHE_TTL_MS }
}

function getCache(clave) {
  const c = cache[clave]
  if (!c) return null
  if (c.expiresAt < now()) { delete cache[clave]; return null }
  return c.value
}

async function get(clave, opts = {}) {
  const cached = getCache(clave)
  if (cached !== null) return cached
  const row = await Configuracion.findOne({ where: { clave } })
  if (!row) return null
  let val = row.valor
  if (opts.decrypt && row.is_secret) val = crypto.decrypt(val)
  setCache(clave, val)
  return val
}

async function set(clave, valor, options = {}) {
  const isSecret = !!options.isSecret
  const descripcion = options.descripcion
  const updated_by = options.updated_by || null
  const toStore = isSecret ? crypto.encrypt(valor) : String(valor)
  const existing = await Configuracion.findOne({ where: { clave } })
  if (existing) {
    await existing.update({ valor: toStore, descripcion, is_secret: isSecret, updated_by, updated_at: new Date() })
  } else {
    await Configuracion.create({ clave, valor: toStore, descripcion, is_secret: isSecret, updated_by })
  }
  setCache(clave, isSecret ? valor : String(valor))
  return { clave }
}

async function list() {
  const dbRows = await Configuracion.findAll({ order: [['updated_at', 'DESC']] })
  const dbMap = new Map(dbRows.map(r => [r.clave, r]))

  const combined = KNOWN_KEYS.map(def => {
    const dbItem = dbMap.get(def.key)
    let envVal = null
    for (const envVar of def.envVars) {
      if (process.env[envVar] !== undefined) {
        envVal = process.env[envVar]
        break
      }
    }

    const isSecret = def.isSecret
    const val = dbItem ? (dbItem.is_secret ? crypto.decrypt(dbItem.valor) : dbItem.valor) : envVal

    return {
      clave: def.key,
      descripcion: dbItem?.descripcion || def.description,
      valor_masked: val !== null ? (isSecret ? crypto.mask(val) : val) : null,
      source: dbItem ? 'database' : (envVal !== null ? 'env' : 'missing'),
      is_secret: isSecret,
      updated_at: dbItem?.updated_at || null,
      env_var_name: def.envVars.join(', ')
    }
  })

  // Add DB items not in KNOWN_KEYS
  for (const r of dbRows) {
    if (!KNOWN_KEYS.find(k => k.key === r.clave)) {
      combined.push({
        clave: r.clave,
        descripcion: r.descripcion,
        valor_masked: r.is_secret ? crypto.mask(crypto.decrypt(r.valor)) : r.valor,
        source: 'database',
        is_secret: r.is_secret,
        updated_at: r.updated_at,
        env_var_name: null
      })
    }
  }

  return combined
}

async function testGoogleKey(keyOverride) {
  const key = keyOverride || await get('google_api_key', { decrypt: true }) || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY
  if (!key) return { ok: false, error: 'NO_KEY' }
  const start = now()
  try {
    const client = new GoogleGenerativeAI(key)
    const modelName = await get('gemini_model') || process.env.GEMINI_MODEL || process.env.GOOGLE_GEMINI_MODEL || 'gemini-2.5-flash'
    const model = client.getGenerativeModel({ model: modelName })
    const res = await model.generateContent('ping')
    const latency_ms = now() - start
    const ok = !!(res && res.response)
    return { ok, latency_ms, model: modelName }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

async function remove(clave) {
  const existing = await Configuracion.findOne({ where: { clave } })
  if (existing) {
    await existing.destroy()
    invalidate(clave)
    return true
  }
  return false
}

function invalidate(clave) { delete cache[clave] }

module.exports = { get, set, list, testGoogleKey, remove, invalidate }
