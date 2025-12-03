const crypto = require('crypto')

function deriveKey() {
  const secret = process.env.CONFIG_ENCRYPTION_KEY || ''
  return crypto.createHash('sha256').update(secret).digest()
}

function encrypt(value) {
  const key = deriveKey()
  if (!key || !process.env.CONFIG_ENCRYPTION_KEY) return value
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${enc.toString('hex')}:${tag.toString('hex')}`
}

function decrypt(stored) {
  const key = deriveKey()
  if (!key || !process.env.CONFIG_ENCRYPTION_KEY) return stored
  const parts = String(stored).split(':')
  if (parts.length !== 3) return stored
  const iv = Buffer.from(parts[0], 'hex')
  const enc = Buffer.from(parts[1], 'hex')
  const tag = Buffer.from(parts[2], 'hex')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const dec = Buffer.concat([decipher.update(enc), decipher.final()])
  return dec.toString('utf8')
}

function mask(val) {
  const s = String(val || '')
  if (s.length <= 4) return '****'
  return `****-${s.slice(-4)}`
}

module.exports = { encrypt, decrypt, mask }
