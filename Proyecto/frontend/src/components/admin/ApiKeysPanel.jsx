import React, { useEffect, useState } from 'react'
import { Card, CardHeader, CardBody } from '../ui/Card'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/Loading'
import { ErrorAlert, Alert } from '../ui/Alert'
import { configService } from '../../services/configService'
import { apiKeyService } from '../../services/apiKeyService'
import { 
  PencilSquareIcon, 
  TrashIcon, 
  BeakerIcon,
  ServerStackIcon,
  CommandLineIcon,
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  PlusIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline'

export default function ConfigurationPanel() {
  const [items, setItems] = useState([])
  const [apiKeys, setApiKeys] = useState([])
  const [loading, setLoading] = useState(false)
  const [keysLoading, setKeysLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Edit state for Config
  const [editingItem, setEditingItem] = useState(null)
  const [editForm, setEditForm] = useState({ valor: '', is_secret: false, descripcion: '' })
  const [saving, setSaving] = useState(false)

  // Edit/Add state for API Keys
  const [editingKey, setEditingKey] = useState(null) // null for none, {} for new, object for edit
  const [keyForm, setKeyForm] = useState({ alias: '', key_value: '', provider: 'google', is_active: true })
  const [savingKey, setSavingKey] = useState(false)

  // Test state
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  const fetchConfig = async () => {
    try {
      setLoading(true)
      const data = await configService.listKeys()
      setItems(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchApiKeys = async () => {
    try {
      setKeysLoading(true)
      const data = await apiKeyService.listKeys()
      setApiKeys(data)
    } catch (e) {
      console.error("Error fetching API keys:", e)
      // Don't set global error to avoid blocking the config view
    } finally {
      setKeysLoading(false)
    }
  }

  useEffect(() => { 
    fetchConfig() 
    fetchApiKeys()
  }, [])

  const [showLogs, setShowLogs] = useState(false)
  const [selectedKeyLogs, setSelectedKeyLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [selectedKeyAlias, setSelectedKeyAlias] = useState('')

  const fetchKeyLogs = async (keyId, alias) => {
    try {
      setLogsLoading(true)
      setSelectedKeyAlias(alias)
      setShowLogs(true)
      const data = await apiKeyService.getStats(keyId) // We need to add getStats to frontend service
      setSelectedKeyLogs(data)
    } catch (e) {
      console.error("Error fetching key logs:", e)
    } finally {
      setLogsLoading(false)
    }
  }
  
  const closeLogs = () => {
    setShowLogs(false)
    setSelectedKeyLogs([])
  }

  // ... Config handlers ...
  const handleEdit = (item) => {
    setEditingItem(item)
    setEditForm({
      valor: '', 
      is_secret: item.is_secret,
      descripcion: item.descripcion || ''
    })
  }

  const handleSave = async () => {
    if (!editingItem) return
    try {
      setSaving(true)
      if (!editForm.valor) {
          if (editForm.descripcion !== editingItem.descripcion) {
             await configService.updateKey(editingItem.clave, { descripcion: editForm.descripcion })
          } else {
             setEditingItem(null)
             return
          }
      } else {
          await configService.setKey({
            clave: editingItem.clave,
            valor: editForm.valor,
            is_secret: editForm.is_secret,
            descripcion: editForm.descripcion
          })
      }
      setEditingItem(null)
      await fetchConfig()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (clave) => {
    if (!window.confirm('¿Estás seguro de eliminar esta configuración personalizada? Si existe una variable de entorno, se usará esa en su lugar.')) return
    try {
      setLoading(true)
      await configService.deleteKey(clave)
      await fetchConfig()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleTest = async (clave) => {
    try {
      setTesting(true)
      setTestResult(null)
      const res = await configService.testKey(clave)
      setTestResult(res)
    } catch (e) {
      setTestResult({ ok: false, error: e.message })
    } finally {
      setTesting(false)
    }
  }

  // ... API Keys handlers ...
  const handleAddKey = () => {
    setEditingKey({ isNew: true })
    setKeyForm({ alias: '', key_value: '', provider: 'google', is_active: true })
  }

  const handleEditKey = (key) => {
    setEditingKey({ ...key, isNew: false })
    setKeyForm({ 
      alias: key.alias, 
      key_value: '', // Don't show existing key for security
      provider: key.provider, 
      is_active: key.is_active 
    })
  }

  const handleSaveKey = async () => {
    try {
      setSavingKey(true)
      if (editingKey.isNew) {
        await apiKeyService.addKey(keyForm)
      } else {
        const updateData = {
            alias: keyForm.alias,
            is_active: keyForm.is_active
        }
        // Only send key if provided
        if (keyForm.key_value) {
            updateData.key_value = keyForm.key_value
        }
        await apiKeyService.updateKey(editingKey.id, updateData)
      }
      setEditingKey(null)
      await fetchApiKeys()
    } catch (e) {
      setError(e.message)
    } finally {
      setSavingKey(false)
    }
  }

  const handleDeleteKey = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta API Key?')) return
    try {
      setKeysLoading(true)
      await apiKeyService.deleteKey(id)
      await fetchApiKeys()
    } catch (e) {
      setError(e.message)
    } finally {
      setKeysLoading(false)
    }
  }

  const handleReorder = async (index, direction) => {
    if (keysLoading) return;
    
    const newApiKeys = [...apiKeys];
    if (direction === 'up' && index > 0) {
      [newApiKeys[index], newApiKeys[index - 1]] = [newApiKeys[index - 1], newApiKeys[index]];
    } else if (direction === 'down' && index < newApiKeys.length - 1) {
      [newApiKeys[index], newApiKeys[index + 1]] = [newApiKeys[index + 1], newApiKeys[index]];
    } else {
      return;
    }

    setApiKeys(newApiKeys); // Optimistic update

    try {
      const orderedIds = newApiKeys.map(k => k.id);
      await apiKeyService.reorderKeys(orderedIds);
    } catch (e) {
      console.error("Error reordering keys:", e);
      setError("Error al guardar el orden: " + e.message);
      await fetchApiKeys(); // Revert on error
    }
  }

  return (
    <div className="space-y-6">
      {/* API Keys Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <KeyIcon className="w-5 h-5" />
              Pool de API Keys (IA)
            </h3>
            <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={fetchApiKeys}>Actualizar</Button>
                <Button size="sm" onClick={handleAddKey}>
                    <PlusIcon className="w-4 h-4 mr-1" />
                    Nueva Key
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardBody>
            {keysLoading && !apiKeys.length ? (
                <LoadingSpinner />
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prioridad</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Alias</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proveedor</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uso</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cuota</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {apiKeys.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                                        No hay API Keys configuradas.
                                    </td>
                                </tr>
                            ) : apiKeys.map((key, index) => (
                                <tr key={key.id}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1">
                                            <div className="flex flex-col">
                                                <button 
                                                    onClick={() => handleReorder(index, 'up')} 
                                                    disabled={index === 0 || keysLoading}
                                                    className={`p-1 rounded hover:bg-gray-100 ${index === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:text-blue-600'}`}
                                                    title="Mover arriba"
                                                >
                                                    <ArrowUpIcon className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleReorder(index, 'down')} 
                                                    disabled={index === apiKeys.length - 1 || keysLoading}
                                                    className={`p-1 rounded hover:bg-gray-100 ${index === apiKeys.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:text-blue-600'}`}
                                                    title="Mover abajo"
                                                >
                                                    <ArrowDownIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <span className="text-xs text-gray-400 font-mono ml-2">#{index + 1}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900">{key.alias}</div>
                                        <div className="text-xs text-gray-400 font-mono">ID: {key.id}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                                            {key.provider}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            key.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                        }`}>
                                            {key.is_active ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900 font-semibold">{key.usage_count} usos totales</div>
                                        
                                        {/* Usage by type breakdown */}
                                        {key.usage_by_type && Object.keys(key.usage_by_type).length > 0 && (
                                            <div className="mt-2 space-y-1 bg-gray-50 p-2 rounded text-xs">
                                                {Object.entries(key.usage_by_type).map(([type, count]) => (
                                                    <div key={type} className="flex justify-between gap-2">
                                                        <span className="text-gray-500 capitalize">{type.replace('_', ' ')}</span>
                                                        <span className="font-mono text-gray-700 font-medium">{count}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {key.error_count > 0 && (
                                            <div className="text-xs text-red-600 flex items-center mt-2 pt-1">
                                                <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
                                                {key.error_count} errores
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {key.quota_exceeded ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                Excedida
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                OK
                                            </span>
                                        )}
                                        {key.quota_reset_at && (
                                            <div className="text-xs text-gray-400 mt-1">
                                                Reset: {new Date(key.quota_reset_at).toLocaleString()}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-medium">
                                        <div className="flex justify-end gap-2">
                                            <Button size="sm" variant="ghost" onClick={() => fetchKeyLogs(key.id, key.alias)} title="Ver Historial">
                                                <ServerStackIcon className="w-4 h-4 text-purple-600" />
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => handleEditKey(key)} title="Editar">
                                                <PencilSquareIcon className="w-4 h-4 text-blue-600" />
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => handleDeleteKey(key.id)} title="Eliminar">
                                                <TrashIcon className="w-4 h-4 text-red-600" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <ServerStackIcon className="w-5 h-5" />
              Configuración del Sistema
            </h3>
            <Button size="sm" variant="outline" onClick={fetchConfig}>Actualizar</Button>
          </div>
        </CardHeader>
        <CardBody>
          {error && <ErrorAlert error={error} onDismiss={() => setError(null)} />}
          
          {testResult && (
            <div className="mb-4">
              <Alert 
                type={testResult.ok ? "success" : "error"} 
                title={testResult.ok ? "Prueba Exitosa" : "Error en Prueba"}
                message={testResult.ok ? `Latencia: ${testResult.latency_ms}ms • Modelo: ${testResult.model}` : testResult.error}
                onDismiss={() => setTestResult(null)}
              />
            </div>
          )}

          {loading && !items.length ? (
            <LoadingSpinner />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clave / Descripción</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Actual</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Origen</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr key={item.clave}>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{item.clave}</div>
                        <div className="text-sm text-gray-500">{item.descripcion}</div>
                        {item.env_var_name && (
                          <div className="text-xs text-gray-400 mt-1 font-mono">ENV: {item.env_var_name}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 font-mono bg-gray-50 px-2 py-1 rounded inline-block max-w-xs truncate">
                          {item.valor_masked || '(vacío)'}
                        </div>
                        {item.is_secret && <span className="ml-2 text-xs text-yellow-600 bg-yellow-50 px-1 rounded border border-yellow-200">Secreto</span>}
                      </td>
                      <td className="px-6 py-4">
                        {item.source === 'database' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <ServerStackIcon className="w-3 h-3 mr-1" />
                            Base de Datos
                          </span>
                        ) : item.source === 'env' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            <CommandLineIcon className="w-3 h-3 mr-1" />
                            Variables de Entorno
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Faltante
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          {item.clave === 'google_api_key' && (
                            <Button size="sm" variant="ghost" onClick={() => handleTest(item.clave)} title="Probar conexión">
                              <BeakerIcon className="w-4 h-4 text-green-600" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(item)} title="Editar">
                            <PencilSquareIcon className="w-4 h-4 text-blue-600" />
                          </Button>
                          {item.source === 'database' && (
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(item.clave)} title="Restaurar a valor por defecto (si existe) o eliminar">
                              <TrashIcon className="w-4 h-4 text-red-600" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Editar {editingItem.clave}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nuevo Valor</label>
                <input 
                  type={editForm.is_secret ? "password" : "text"} 
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={editingItem.is_secret ? "************" : "Ingresa valor..."}
                  value={editForm.valor}
                  onChange={e => setEditForm({...editForm, valor: e.target.value})}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {editingItem.is_secret 
                    ? "Dejar en blanco para mantener la clave actual." 
                    : "Ingresa el nuevo valor para sobrescribir."}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea 
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="2"
                  value={editForm.descripcion}
                  onChange={e => setEditForm({...editForm, descripcion: e.target.value})}
                />
              </div>

              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="is_secret" 
                  checked={editForm.is_secret}
                  onChange={e => setEditForm({...editForm, is_secret: e.target.checked})}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="is_secret" className="ml-2 block text-sm text-gray-900">Es un valor secreto (se encriptará)</label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditingItem(null)}>Cancelar</Button>
              <Button onClick={handleSave} loading={saving}>Guardar</Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit/New API Key Modal */}
      {editingKey && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">
                {editingKey.isNew ? 'Nueva API Key' : 'Editar API Key'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alias (Nombre identificativo)</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Gemini Key Principal"
                  value={keyForm.alias}
                  onChange={e => setKeyForm({...keyForm, alias: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                <select 
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={keyForm.provider}
                    onChange={e => setKeyForm({...keyForm, provider: e.target.value})}
                    disabled={!editingKey.isNew} // Provider usually shouldn't change
                >
                    <option value="google">Google (Gemini)</option>
                    {/* Future providers can be added here */}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                <input 
                  type="password"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={editingKey.isNew ? "Pegar API Key aquí..." : "************"}
                  value={keyForm.key_value}
                  onChange={e => setKeyForm({...keyForm, key_value: e.target.value})}
                />
                {!editingKey.isNew && (
                    <p className="text-xs text-gray-500 mt-1">
                        Dejar en blanco para mantener la clave actual.
                    </p>
                )}
              </div>

              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="key_is_active" 
                  checked={keyForm.is_active}
                  onChange={e => setKeyForm({...keyForm, is_active: e.target.checked})}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="key_is_active" className="ml-2 block text-sm text-gray-900">Activa</label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditingKey(null)}>Cancelar</Button>
              <Button onClick={handleSaveKey} loading={savingKey}>Guardar</Button>
            </div>
          </div>
        </div>
      )}
      {/* Logs Modal */}
      {showLogs && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Historial de Uso: {selectedKeyAlias}</h3>
              <button onClick={closeLogs} className="text-gray-500 hover:text-gray-700">
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1">
              {logsLoading ? (
                <LoadingSpinner />
              ) : selectedKeyLogs.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No hay registros de uso para esta clave.</p>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Operación</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Error</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedKeyLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-xs text-gray-500">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-xs font-medium text-gray-900 capitalize">
                          {log.operation_type}
                        </td>
                        <td className="px-4 py-2 text-xs">
                          <span className={`px-2 py-0.5 rounded-full ${
                            log.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xs text-red-600 truncate max-w-xs" title={log.error_message}>
                          {log.error_message || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            <div className="mt-4 flex justify-end">
              <Button onClick={closeLogs}>Cerrar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
