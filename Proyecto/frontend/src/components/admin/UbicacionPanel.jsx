import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { 
  MapPinIcon, 
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

export default function UbicacionPanel() {
  const [loading, setLoading] = useState(false);
  const [estadisticas, setEstadisticas] = useState(null);
  const [operationId, setOperationId] = useState(null);
  const [progreso, setProgreso] = useState(null);
  const [error, setError] = useState(null);

  // Cargar estadísticas al montar
  useEffect(() => {
    cargarEstadisticas();
  }, []);

  // Polling para actualizar progreso
  useEffect(() => {
    if (operationId && progreso?.status === 'running') {
      const interval = setInterval(() => {
        consultarProgreso(operationId);
      }, 2000);
      
      return () => clearInterval(interval);
    }
  }, [operationId, progreso?.status]);

  const cargarEstadisticas = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/etl/ubicacion/estadisticas`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      setEstadisticas(response.data.data);
    } catch (err) {
      console.error('Error al cargar estadísticas:', err);
    }
  };

  const consultarProgreso = async (opId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/etl/ubicacion/estado/${opId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      setProgreso(response.data.data);
      
      if (response.data.data.status === 'completed' || response.data.data.status === 'failed') {
        cargarEstadisticas();
      }
    } catch (err) {
      console.error('Error al consultar progreso:', err);
    }
  };

  const iniciarInferencia = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/etl/ubicacion/iniciar`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      setOperationId(response.data.operation_id);
      setProgreso({ status: 'running', porcentaje: 0 });
      
    } catch (err) {
      console.error('Error al iniciar inferencia:', err);
      setError(err.response?.data?.message || 'Error al iniciar inferencia de ubicación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg p-6 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center mb-2">
              <MapPinIcon className="w-8 h-8 mr-3" />
              <h2 className="text-2xl font-bold">Inferencia de Ubicación Geográfica</h2>
            </div>
            <p className="text-purple-100 text-sm">
              Sistema inteligente de inferencia automática usando IA (Gemini) para detectar departamento, provincia y distrito
            </p>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      {estadisticas && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-purple-500">
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total de Procesos</p>
                  <p className="text-2xl font-bold text-gray-900">{estadisticas.total}</p>
                </div>
                <ChartBarIcon className="w-10 h-10 text-purple-500" />
              </div>
            </CardBody>
          </Card>

          <Card className="border-l-4 border-green-500">
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Con Ubicación</p>
                  <p className="text-2xl font-bold text-green-600">{estadisticas.conUbicacion}</p>
                </div>
                <CheckCircleIcon className="w-10 h-10 text-green-500" />
              </div>
            </CardBody>
          </Card>

          <Card className="border-l-4 border-orange-500">
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Sin Ubicación</p>
                  <p className="text-2xl font-bold text-orange-600">{estadisticas.sinUbicacion}</p>
                </div>
                <ExclamationCircleIcon className="w-10 h-10 text-orange-500" />
              </div>
            </CardBody>
          </Card>

          <Card className="border-l-4 border-purple-500">
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">% Completado</p>
                  <p className="text-2xl font-bold text-purple-600">{estadisticas.porcentajeCompletado}%</p>
                </div>
                <div className="text-purple-500">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Botón de Acción */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100">
          <h3 className="text-lg font-semibold text-purple-900 flex items-center">
            <ArrowPathIcon className="w-5 h-5 mr-2" />
            Ejecutar Inferencia de Ubicación
          </h3>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <p className="text-gray-600 text-sm">
              El sistema utilizará IA (Gemini) con <strong>doble pasada</strong> para analizar y mejorar la ubicación de cada proceso:
            </p>
            <ul className="text-xs text-gray-700 space-y-1 ml-4 list-disc">
              <li><strong>Fase 1:</strong> Infiere o actualiza ubicaciones incompletas usando IA (3 fases de análisis)</li>
              <li><strong>Fase 2:</strong> Completa datos faltantes usando base de conocimiento acumulada</li>
              <li>✅ Incluye procesos sin ubicación <strong>Y procesos con ubicación incompleta</strong></li>
              <li>♻️ Actualiza automáticamente campos con "Por Determinar", "No especificado", etc.</li>
            </ul>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {progreso && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-purple-900">
                    {progreso.status === 'running' ? 'En Progreso...' : 
                     progreso.status === 'completed' ? '✅ Completado' : 
                     '❌ Error'}
                  </span>
                  <span className="text-sm font-bold text-purple-600">
                    {progreso.porcentaje}%
                  </span>
                </div>
                <div className="w-full bg-purple-200 rounded-full h-2.5">
                  <div 
                    className="bg-purple-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${progreso.porcentaje}%` }}
                  ></div>
                </div>
                {progreso.mensaje_actual && (
                  <div className="mt-2">
                    <p className="text-xs text-purple-700">
                      {progreso.mensaje_actual.replace(/\(Key: .*?\)/, '')}
                    </p>
                     {/* Extract Key Alias Badge */}
                     {progreso.mensaje_actual.match(/\(Key: (.*?)\)/) && (
                        <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/50 text-purple-800 border border-purple-200">
                          <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-1.5"></span>
                          Key: {progreso.mensaje_actual.match(/\(Key: (.*?)\)/)[1]}
                        </div>
                     )}
                  </div>
                )}
                {progreso.status === 'completed' && progreso.details && (
                  <div className="mt-3 text-xs text-purple-800 space-y-1">
                    <p className="font-semibold">📊 Resultados de Doble Pasada:</p>
                    <div className="bg-blue-50 p-2 rounded mt-1 mb-2">
                      <p className="font-semibold text-blue-900">Fase 1 - Inferencia/Actualización:</p>
                      <p>✅ Inferencias con IA: {progreso.details.usaronIA}</p>
                      <p>⚠️ Fallback usado: {progreso.details.usaronFallback}</p>
                      {progreso.details.actualizados > 0 && (
                        <p className="text-blue-700">♻️ Procesos actualizados (tenían datos): {progreso.details.actualizados}</p>
                      )}
                    </div>
                    <div className="bg-green-50 p-2 rounded">
                      <p className="font-semibold text-green-900">Fase 2 - Completado Inteligente:</p>
                      <p>✨ Total mejorados: {progreso.details.mejorados || 0}</p>
                      <p>📚 Completados con Base de Conocimiento: {progreso.details.completadosConBase || 0}</p>
                      <p>🤖 Completados con IA: {progreso.details.completadosConIA || 0}</p>
                    </div>
                    {progreso.details.baseConocimiento && (
                      <p className="mt-2 text-purple-600 font-medium">
                        💡 Base de Conocimiento Generada: {progreso.details.baseConocimiento.distritos} distritos, {progreso.details.baseConocimiento.provincias} provincias
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={iniciarInferencia}
              disabled={loading || (progreso?.status === 'running')}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-lg"
            >
              {loading || (progreso?.status === 'running') ? (
                <>
                  <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <MapPinIcon className="w-5 h-5 mr-2" />
                  Iniciar Inferencia de Ubicación
                </>
              )}
            </button>
          </div>
        </CardBody>
      </Card>

      {/* Distribución por Departamento */}
      {estadisticas?.porDepartamento && estadisticas.porDepartamento.length > 0 && (
        <Card>
          <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100">
            <h3 className="text-lg font-semibold text-purple-900 flex items-center">
              <ChartBarIcon className="w-5 h-5 mr-2" />
              Distribución por Departamento
            </h3>
          </CardHeader>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Departamento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total de Procesos
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Porcentaje
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {estadisticas.porDepartamento.map((item, index) => {
                    const porcentaje = ((item.total / estadisticas.conUbicacion) * 100).toFixed(1);
                    return (
                      <tr key={index} className="hover:bg-purple-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.departamento}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.total}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <div className="w-full bg-gray-200 rounded-full h-2 mr-2" style={{ width: '100px' }}>
                              <div 
                                className="bg-purple-600 h-2 rounded-full"
                                style={{ width: `${porcentaje}%` }}
                              ></div>
                            </div>
                            <span>{porcentaje}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Información del Proceso */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100">
          <h3 className="text-lg font-semibold text-purple-900">ℹ️ Cómo Funciona</h3>
        </CardHeader>
        <CardBody>
          <div className="prose prose-sm max-w-none text-gray-600">
            <p className="mb-4">
              El sistema utiliza <strong>Google Gemini AI</strong> con un innovador <strong>sistema de doble pasada</strong> 
              que aprende de los datos en tiempo real para maximizar la precisión:
            </p>
            
            <div className="space-y-3">
              <div className="bg-purple-50 p-3 rounded-lg mb-3">
                <p className="font-bold text-purple-900 mb-2">🔄 Sistema de Doble Pasada</p>
                <p className="text-sm text-purple-800">
                  El sistema realiza 2 pasadas completas para maximizar la precisión:
                </p>
              </div>

              <div className="flex items-start">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm mr-3 flex-shrink-0">1️⃣</span>
                <div>
                  <p className="font-semibold text-gray-900">Primera Pasada: Inferencia Inicial con IA</p>
                  <p className="text-sm">Gemini analiza cada proceso en 3 fases: jerarquía de entidad, minería de texto en descripción, y validación. 
                  Durante esta fase se construye una <strong>base de conocimiento</strong> con todos los distritos, provincias y departamentos detectados.</p>
                </div>
              </div>

              <div className="flex items-start">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600 font-bold text-sm mr-3 flex-shrink-0">2️⃣</span>
                <div>
                  <p className="font-semibold text-gray-900">Segunda Pasada: Completar Datos Faltantes</p>
                  <p className="text-sm">Usando la base de conocimiento acumulada, el sistema identifica procesos con datos incompletos 
                  (ej: "Distrito: Socabaya, Provincia: Por Determinar") y los completa automáticamente. 
                  <strong>Ejemplo:</strong> Si la primera pasada encontró que Socabaya pertenece a Arequipa, 
                  en la segunda pasada completará automáticamente todos los campos.</p>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="bg-purple-50 border-l-4 border-purple-500 p-3 rounded">
                <p className="text-sm">
                  <strong>✨ Ventaja del Sistema de Doble Pasada:</strong> Mejora automáticamente la precisión al usar 
                  el conocimiento acumulado. Por ejemplo, si un proceso tiene "Distrito: Socabaya" pero falta el departamento, 
                  la segunda pasada lo completará con "Departamento: Arequipa" basándose en otros procesos analizados.
                </p>
              </div>
              
              <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded">
                <p className="text-sm">
                  <strong>📍 Ubicación en Procesos:</strong> Los campos de ubicación se actualizan automáticamente y son visibles 
                  en la sección "Información Adicional" de cada proceso (Departamento, Provincia, Distrito).
                </p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
