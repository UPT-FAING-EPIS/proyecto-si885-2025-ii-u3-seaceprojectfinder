const configService = require('../services/configService')
const apiKeyService = require('../services/apiKeyService')

class ConfigController {
  // API Keys Management
  async listApiKeys(req, res, next) {
    try {
      const keys = await apiKeyService.listKeys()
      res.json({ success: true, data: keys })
    } catch (e) { next(e) }
  }

  async getApiKeyStats(req, res, next) {
    try {
        const { id } = req.params
        const stats = await apiKeyService.getStats(id)
        res.json({ success: true, data: stats }) 
    } catch (e) { next(e) }
  }
  
  async addApiKey(req, res, next) {
    try {
      const { alias, key_value, provider } = req.body
      if (!alias || !key_value) return res.status(400).json({ success: false, message: 'Faltan datos (alias, key_value)' })
      await apiKeyService.addKey(alias, key_value, provider)
      res.json({ success: true })
    } catch (e) { next(e) }
  }

  async updateApiKey(req, res, next) {
    try {
      const { id } = req.params
      const { alias, key_value, is_active } = req.body
      await apiKeyService.updateKey(id, { alias, keyValue: key_value, is_active })
      res.json({ success: true })
    } catch (e) { next(e) }
  }

  async deleteApiKey(req, res, next) {
    try {
      const { id } = req.params
      await apiKeyService.deleteKey(id)
      res.json({ success: true })
    } catch (e) { next(e) }
  }

  async reorderApiKeys(req, res, next) {
    try {
      const { orderedIds } = req.body
      if (!orderedIds || !Array.isArray(orderedIds)) {
        return res.status(400).json({ success: false, message: 'Invalid input: orderedIds must be an array' })
      }
      await apiKeyService.updateOrder(orderedIds)
      res.json({ success: true })
    } catch (e) { next(e) }
  }

  async listKeys(req, res, next) {
    try { const items = await configService.list(); res.json({ success: true, data: { items } }) } catch (e) { next(e) }
  }
  async getKey(req, res, next) {
    try {
      const clave = req.params.clave
      const items = await configService.list()
      const item = items.find(i => i.clave === clave)
      if (!item) return res.status(404).json({ success: false, message: 'Clave no encontrada' })
      res.json({ success: true, data: item })
    } catch (e) { next(e) }
  }
  async setKey(req, res, next) {
    try {
      const { clave, valor, is_secret, descripcion } = req.body
      if (!clave) return res.status(400).json({ success: false, message: 'Falta clave' })
      if (valor === undefined) return res.status(400).json({ success: false, message: 'Falta valor' })
      await configService.set(clave, valor, { isSecret: !!is_secret, descripcion, updated_by: req.user?.id || null })
      configService.invalidate(clave)
      res.json({ success: true, data: { clave } })
    } catch (e) { next(e) }
  }
  async updateKey(req, res, next) {
    try {
      const clave = req.params.clave
      const { valor, descripcion } = req.body
      if (valor === undefined && descripcion === undefined) return res.status(400).json({ success: false, message: 'Nada para actualizar' })
      const isSecret = clave === 'google_api_key'
      await configService.set(clave, valor, { isSecret, descripcion, updated_by: req.user?.id || null })
      configService.invalidate(clave)
      res.json({ success: true, data: { clave } })
    } catch (e) { next(e) }
  }
  async deleteKey(req, res, next) {
    try {
      const clave = req.params.clave
      await configService.remove(clave)
      res.json({ success: true, data: { clave } })
    } catch (e) { next(e) }
  }
  async testKey(req, res, next) {
    try {
      const clave = req.params.clave
      if (clave !== 'google_api_key') return res.status(400).json({ success: false, message: 'Solo se admite prueba de google_api_key' })
      const { valor } = req.body || {}
      const result = await configService.testGoogleKey(valor)
      res.json({ success: true, data: result })
    } catch (e) { next(e) }
  }
}

module.exports = new ConfigController()

