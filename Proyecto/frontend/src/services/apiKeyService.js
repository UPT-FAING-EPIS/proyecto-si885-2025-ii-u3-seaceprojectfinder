import api from './api'

export const apiKeyService = {
  listKeys: async () => {
    const res = await api.get('/admin/config/api-keys')
    return res.data?.data || []
  },
  
  addKey: async (data) => {
    // data: { alias, key_value, provider }
    const res = await api.post('/admin/config/api-keys', data)
    return res.data?.data
  },
  
  updateKey: async (id, data) => {
    // data: { alias, key_value, is_active }
    const res = await api.put(`/admin/config/api-keys/${id}`, data)
    return res.data?.data
  },
  
  deleteKey: async (id) => {
    const res = await api.delete(`/admin/config/api-keys/${id}`)
    return res.data?.data
  },
  
  getUsageStats: async () => {
    // Assuming there might be a stats endpoint or we just use listKeys
    // The backend routes show /admin/config/api-keys returns list with stats
    const res = await api.get('/admin/config/api-keys')
    return res.data?.data || []
  },

  getStats: async (id) => {
    const res = await api.get(`/admin/config/api-keys/${id}/stats`)
    return res.data?.data || []
  },

  reorderKeys: async (orderedIds) => {
    const res = await api.post('/admin/config/api-keys/reorder', { orderedIds })
    return res.data
  }
}
