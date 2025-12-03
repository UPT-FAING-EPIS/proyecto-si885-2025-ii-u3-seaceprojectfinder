import api from './api'

export const configService = {
  listKeys: async () => {
    const res = await api.get('/admin/config/keys')
    return res.data?.data?.items || []
  },
  getKey: async (clave) => {
    const res = await api.get(`/admin/config/keys/${encodeURIComponent(clave)}`)
    return res.data?.data || null
  },
  setKey: async ({ clave, valor, is_secret = true, descripcion }) => {
    const res = await api.post('/admin/config/keys', { clave, valor, is_secret, descripcion })
    return res.data?.data || null
  },
  updateKey: async (clave, { valor, descripcion }) => {
    const res = await api.put(`/admin/config/keys/${encodeURIComponent(clave)}`, { valor, descripcion })
    return res.data?.data || null
  },
  deleteKey: async (clave) => {
    const res = await api.delete(`/admin/config/keys/${encodeURIComponent(clave)}`)
    return res.data?.data || null
  },
  testKey: async (clave, valor) => {
    const res = await api.post(`/admin/config/keys/${encodeURIComponent(clave)}/test`, { valor })
    return res.data?.data || null
  }
}

