import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody } from '../ui/Card';
import {
  TagIcon,
  PlayIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';

const CategorizacionPanel = () => {
  const [loading, setLoading] = useState(false);
  const [operationId, setOperationId] = useState(null);
  const [estado, setEstado] = useState(null);
  const [estadisticas, setEstadisticas] = useState([]);
  const [error, setError] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);

  // Cargar estadísticas al montar el componente
  useEffect(() => {
    cargarEstadisticas();
  }, []);

  // Polling cuando hay una operación en curso
  useEffect(() => {
    if (operationId && estado?.status === 'running') {
      const interval = setInterval(() => {
        consultarEstado(operationId);
      }, 2000); // Consultar cada 2 segundos

      setPollingInterval(interval);

      return () => clearInterval(interval);
    } else if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  }, [operationId, estado?.status]);

  const cargarEstadisticas = async () => {
    try {
      const response = await api.get('/etl/categorias/estadisticas');
      if (response.data.success) {
        setEstadisticas(response.data.data);
      }
    } catch (err) {
      console.error('Error al cargar estadísticas:', err);
    }
  };

  const iniciarCategorizacion = async () => {
    setLoading(true);
    setError(null);
    setEstado(null);

    try {
      const response = await api.post('/etl/categorizar/iniciar');
      
      if (response.data.success) {
        const opId = response.data.operation_id;
        setOperationId(opId);
        
        // Consultar estado inmediatamente
        await consultarEstado(opId);
      }
    } catch (err) {
      console.error('Error al iniciar categorización:', err);
      setError(err.response?.data?.message || 'Error al iniciar categorización');
      setLoading(false);
    }
  };

  const consultarEstado = async (opId) => {
    try {
      const response = await api.get(`/etl/categorizar/estado/${opId}`);
      
      if (response.data.success) {
        const nuevoEstado = response.data.data;
        setEstado(nuevoEstado);

        // Si terminó, recargar estadísticas
        if (nuevoEstado.status === 'completed' || nuevoEstado.status === 'failed') {
          setLoading(false);
          if (nuevoEstado.status === 'completed') {
            await cargarEstadisticas();
          }
        }
      }
    } catch (err) {
      console.error('Error al consultar estado:', err);
      setError('Error al consultar estado de categorización');
      setLoading(false);
    }
  };

  const renderEstadoBar = () => {
    if (!estado) return null;

    const porcentaje = estado.porcentaje || 0;
    const status = estado.status;

    let barColor = 'bg-blue-500';
    let statusText = 'En progreso';
    let statusIcon = <ArrowPathIcon className="w-5 h-5 animate-spin" />;

    if (status === 'completed') {
      barColor = 'bg-green-500';
      statusText = 'Completado';
      statusIcon = <CheckCircleIcon className="w-5 h-5 text-green-600" />;
    } else if (status === 'failed') {
      barColor = 'bg-red-500';
      statusText = 'Error';
      statusIcon = <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />;
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {statusIcon}
            <span className="font-medium">{statusText}</span>
          </div>
          <span className="text-sm text-gray-600">
            {estado.paso_actual || 0} / {estado.paso_total || 0}
          </span>
        </div>

        {/* Barra de progreso */}
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div
            className={`h-full ${barColor} transition-all duration-300 flex items-center justify-center text-xs text-white font-medium`}
            style={{ width: `${porcentaje}%` }}
          >
            {porcentaje > 10 && `${porcentaje}%`}
          </div>
        </div>

        {/* Mensaje actual */}
        {estado.mensaje_actual && (
          <div className="space-y-1">
            <p className="text-sm text-gray-600 italic">
              {estado.mensaje_actual.replace(/\(Key: .*?\)/, '')}
            </p>
            {/* Extract Key Alias Badge */}
            {estado.mensaje_actual.match(/\(Key: (.*?)\)/) && (
               <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                 <span className="w-2 h-2 bg-purple-500 rounded-full mr-1.5"></span>
                 Key en uso: {estado.mensaje_actual.match(/\(Key: (.*?)\)/)[1]}
               </div>
            )}
          </div>
        )}

        {/* Detalles si completó */}
        {status === 'completed' && estado.details && (
          <div className="mt-4 p-4 bg-green-50 rounded-lg">
            <h4 className="font-semibold text-green-800 mb-3">✅ Categorización Completada</h4>
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div>
                <span className="text-gray-600">Procesos categorizados:</span>
                <span className="ml-2 font-semibold text-green-700">{estado.process_count}</span>
              </div>
              <div>
                <span className="text-gray-600">Duración:</span>
                <span className="ml-2 font-semibold text-green-700">
                  {((estado.duration_ms || 0) / 1000).toFixed(2)}s
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600">Método:</span>
                <span className="ml-2 font-semibold text-green-700">🤖 Inteligencia Artificial (Gemini)</span>
              </div>
            </div>
            
            {/* Distribución de categorías */}
            {estado.details.distribucionCategorias && (
              <div className="mt-4 pt-4 border-t border-green-200">
                <h5 className="font-semibold text-green-800 mb-2">📊 Distribución por Categoría:</h5>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(estado.details.distribucionCategorias).map(([cat, count]) => (
                    <div key={cat} className="flex justify-between items-center p-2 bg-white rounded">
                      <span className="text-gray-700">{cat}:</span>
                      <span className="font-semibold text-green-700">
                        {count} ({((count / estado.process_count) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {status === 'failed' && (
          <div className="mt-4 p-4 bg-red-50 rounded-lg">
            <h4 className="font-semibold text-red-800 mb-2">Error:</h4>
            <p className="text-sm text-red-700">{estado.message}</p>
          </div>
        )}
      </div>
    );
  };

  const renderEstadisticas = () => {
    if (estadisticas.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No hay estadísticas de categorías disponibles
        </div>
      );
    }

    const totalProcesos = estadisticas.reduce((sum, cat) => sum + cat.total, 0);

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {estadisticas.map((cat) => {
            const porcentaje = totalProcesos > 0 
              ? ((cat.total / totalProcesos) * 100).toFixed(1) 
              : 0;

            return (
              <div
                key={cat.categoria_proyecto}
                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <TagIcon className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-sm">{cat.nombre}</h4>
                  </div>
                  <span className="text-xs text-gray-500">{porcentaje}%</span>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-gray-900">{cat.total}</p>
                  <p className="text-xs text-gray-600">
                    S/ {(cat.monto_total / 1000000).toFixed(2)}M
                  </p>
                </div>
                {/* Mini barra de progreso */}
                <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full"
                    style={{ width: `${porcentaje}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">Total de Procesos:</span>
            <span className="text-xl font-bold text-blue-900">{totalProcesos}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Card de Categorización */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <TagIcon className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-semibold">Categorización de Procesos</h3>
          </div>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Esta herramienta categoriza automáticamente los procesos usando <strong>Inteligencia Artificial (Gemini)</strong>.
              Analiza el objeto, descripción y nomenclatura de cada proceso para asignar la categoría más apropiada.
              Los procesos sin categorizar o marcados como "NO_CATEGORIZADO" o "OTROS" serán procesados.
            </p>

            {/* Botón de inicio */}
            {!loading && !operationId && (
              <button
                onClick={iniciarCategorizacion}
                disabled={loading}
                className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors"
              >
                <PlayIcon className="w-5 h-5" />
                <span>Iniciar Categorización</span>
              </button>
            )}

            {/* Estado del proceso */}
            {(loading || operationId) && renderEstadoBar()}

            {/* Botón para nueva categorización después de completar */}
            {estado?.status === 'completed' && (
              <button
                onClick={() => {
                  setOperationId(null);
                  setEstado(null);
                  iniciarCategorizacion();
                }}
                className="w-full md:w-auto px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2 transition-colors"
              >
                <ArrowPathIcon className="w-5 h-5" />
                <span>Categorizar Nuevamente</span>
              </button>
            )}

            {/* Error */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Card de Estadísticas */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Estadísticas de Categorías</h3>
        </CardHeader>
        <CardBody>
          {renderEstadisticas()}
        </CardBody>
      </Card>
    </div>
  );
};

export default CategorizacionPanel;
