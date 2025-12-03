/**
 * UserAnalytics - Página de Analytics para usuarios comunes
 * Muestra gráficos de: Distribución por Presupuesto, Top 5 Gratuitos, Top 5 Pagos, Top Entidades Activas
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  ChartBarIcon,
  BuildingOffice2Icon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import { LoadingSpinner } from '../components/ui/Loading';
import { Card } from '../components/ui/Card';
import { CHART_COLORS, TOOLTIP_CONFIG, AXIS_CONFIG } from '../config/chartConfig';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const UserAnalytics = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    distribucionPresupuesto: [],
    top5Gratuitos: [],
    top5Pagos: [],
    topEntidades: [],
    distribucionRubros: []
  });
  const [modalRango, setModalRango] = useState(null);
  const [procesosRango, setProcesosRango] = useState([]);
  const [loadingModal, setLoadingModal] = useState(false);

  // Función para manejar click en barras de procesos
  const handleProcesoClick = (data) => {
    if (data && data.id) {
      navigate(`/process/${data.id}`);
    }
  };

  // Función para manejar click en barras de distribución por presupuesto
  const handleRangoClick = async (data) => {
    if (data && data.rango) {
      setModalRango(data.rango);
      setLoadingModal(true);
      
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/analytics/procesos-por-rango`, {
          params: { rango: data.rango },
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.success) {
          setProcesosRango(response.data.data.procesos);
        }
      } catch (err) {
        console.error('Error cargando procesos del rango:', err);
        setProcesosRango([]);
      } finally {
        setLoadingModal(false);
      }
    }
  };

  // Cerrar modal
  const closeModal = () => {
    setModalRango(null);
    setProcesosRango([]);
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Obtener datos de analytics desde el backend
      const response = await axios.get(`${API_URL}/analytics/user-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Validar que la respuesta tenga los datos esperados
      if (!response.data?.data) {
        throw new Error('El servidor no devolvió datos válidos');
      }

      // Validar estructura de datos requerida
      const requiredFields = ['distribucionPresupuesto', 'top5Gratuitos', 'top5Pagos', 'topEntidades', 'distribucionRubros'];
      const missingFields = requiredFields.filter(field => !response.data.data[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Faltan campos requeridos en la respuesta: ${missingFields.join(', ')}`);
      }

      setData(response.data.data);
      setError(null);
    } catch (err) {
      console.error('Error cargando analytics:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Error al cargar estadísticas';
      setError(`No se pudieron cargar las estadísticas: ${errorMessage}`);
      
      // NO usar datos mock - mostrar error al usuario
      setData({
        distribucionPresupuesto: [],
        top5Gratuitos: [],
        top5Pagos: [],
        topEntidades: [],
        distribucionRubros: []
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  // Verificar si hay datos disponibles para mostrar
  const hasData = data.distribucionPresupuesto.length > 0 || 
                  data.top5Gratuitos.length > 0 || 
                  data.top5Pagos.length > 0 || 
                  data.topEntidades.length > 0 ||
                  data.distribucionRubros.length > 0;

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <ChartBarIcon className="w-8 h-8 text-indigo-600" />
              Analytics de Procesos
            </h1>
          </div>
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-red-900 mb-2">Error al cargar estadísticas</h2>
            <p className="text-red-700 mb-4">{error}</p>
            <p className="text-sm text-red-600">
              Por favor, contacta al administrador del sistema o intenta nuevamente más tarde.
            </p>
            <button
              onClick={fetchAnalyticsData}
              className="mt-6 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <ChartBarIcon className="w-8 h-8 text-indigo-600" />
              Analytics de Procesos
            </h1>
          </div>
          <Card className="p-12 text-center">
            <ChartBarIcon className="w-20 h-20 text-gray-300 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-700 mb-2">No hay datos disponibles</h2>
            <p className="text-gray-600 mb-6">
              Aún no hay suficiente información para generar estadísticas.
            </p>
            <p className="text-sm text-gray-500">
              Los datos se generarán automáticamente a medida que se agreguen más procesos al sistema.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <ChartBarIcon className="w-8 h-8 text-indigo-600" />
            Analytics de Procesos
          </h1>
          <p className="text-gray-600">
            Visualiza tendencias y patrones en los procesos de contratación pública
          </p>
        </div>

        {/* Primera fila: Distribución por Presupuesto */}
        <div className="mb-8">
          <Card className="bg-white shadow-lg">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <CurrencyDollarIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Distribución Detallada por Presupuesto</h3>
                  <p className="text-sm text-gray-600">Granularidad Alta</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Segmentación de procesos según rangos de valor específicos (Soles). <span className="text-blue-600 font-medium">Haz clic en una barra para ver los procesos.</span>
              </p>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data.distribucionPresupuesto}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="rango" angle={-15} textAnchor="end" height={80} />
                  <YAxis label={{ value: 'N° Procesos', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Bar 
                    dataKey="cantidad" 
                    name="Procesos"
                    cursor="pointer"
                    onClick={handleRangoClick}
                  >
                    {data.distribucionPresupuesto.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS.budget.ranges[index % CHART_COLORS.budget.ranges.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Segunda fila: Top 5 Gratuitos y Top 5 Pagos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Top 5 Populares (Gratuito) - Más Vistos */}
          <Card className="bg-white shadow-lg">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-red-100 p-3 rounded-lg">
                  <ArrowTrendingUpIcon className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Top 5 Populares (GRATUITO)</h3>
                  <p className="text-sm text-red-600 font-medium">Más Vistos</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Procesos con monto 0 que generaron mayor tráfico. <span className="text-blue-600 font-medium">Haz clic en una barra para ver detalles.</span>
              </p>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={data.top5Gratuitos} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="nombre" type="category" width={150} style={{ fontSize: AXIS_CONFIG.fontSize.large }} />
                  <Tooltip formatter={(value) => TOOLTIP_CONFIG.formatter.number(value)} />
                  <Bar 
                    dataKey="vistas" 
                    fill={CHART_COLORS.budget.free} 
                    name="Vistas"
                    cursor="pointer"
                    onClick={handleProcesoClick}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Top 5 Populares (PAGA) - Alto Valor + Tráfico */}
          <Card className="bg-white shadow-lg">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-green-100 p-3 rounded-lg">
                  <CurrencyDollarIcon className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Top 5 Populares (PAGA)</h3>
                  <p className="text-sm text-green-600 font-medium">Alto Valor + Tráfico</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Procesos con presupuesto {'>'} 0 con mayor cantidad de vistas. <span className="text-blue-600 font-medium">Haz clic en una barra para ver detalles.</span>
              </p>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={data.top5Pagos} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="nombre" type="category" width={150} style={{ fontSize: AXIS_CONFIG.fontSize.large }} />
                  <Tooltip
                    formatter={(value, name, props) => {
                      if (name === 'monto') {
                        return TOOLTIP_CONFIG.formatter.currency(value);
                      }
                      return TOOLTIP_CONFIG.formatter.number(value);
                    }}
                  />
                  <Bar 
                    dataKey="vistas" 
                    fill={CHART_COLORS.budget.paid} 
                    name="Vistas"
                    cursor="pointer"
                    onClick={handleProcesoClick}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Tercera fila: Top Entidades Activas */}
        <div className="mb-8">
          <Card className="bg-white shadow-lg">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-indigo-100 p-3 rounded-lg">
                  <BuildingOffice2Icon className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Top Entidades Activas</h3>
                  <p className="text-sm text-indigo-600 font-medium">Líderes</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Instituciones con mayor volumen de publicaciones recientes.
              </p>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data.topEntidades}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nombre" angle={AXIS_CONFIG.angle.diagonal} textAnchor="end" height={120} style={{ fontSize: AXIS_CONFIG.fontSize.medium }} />
                  <YAxis label={{ value: 'N° Publicaciones', angle: AXIS_CONFIG.angle.vertical, position: 'insideLeft' }} />
                  <Tooltip formatter={(value) => TOOLTIP_CONFIG.formatter.number(value)} />
                  <Bar dataKey="cantidad" fill={CHART_COLORS.regions} name="Publicaciones" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Cuarta fila: Distribución por Rubros */}
        <div className="mb-8">
          <Card className="bg-white shadow-lg">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <ArrowTrendingUpIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Distribución por Categorías</h3>
                  <p className="text-sm text-purple-600 font-medium">Sistema General</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Total de procesos registrados según categorización (Bien, Servicio, Obra, etc.).
              </p>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={data.distribucionRubros}
                    cx="50%"
                    cy="50%"
                    labelLine
                    label={({ nombre, cantidad, percent }) => `${nombre}: ${cantidad} (${(percent * 100).toFixed(1)}%)`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="cantidad"
                  >
                    {data.distribucionRubros.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS.categories[index % CHART_COLORS.categories.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => TOOLTIP_CONFIG.formatter.number(value)} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value, entry) => `${entry.payload.nombre} (${entry.payload.cantidad})`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>

      {/* Modal para mostrar procesos por rango de presupuesto */}
      {modalRango && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={closeModal}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del modal */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold">Procesos en rango: {modalRango}</h3>
              <button 
                onClick={closeModal}
                className="text-white hover:bg-blue-700 rounded-full p-2 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contenido del modal */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
              {loadingModal ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : procesosRango.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg">No se encontraron procesos en este rango.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 mb-4">
                    Mostrando {procesosRango.length} proceso(s). Haz clic en cualquiera para ver detalles completos.
                  </p>
                  {procesosRango.map((proceso) => (
                    <div
                      key={proceso.id}
                      onClick={() => {
                        closeModal();
                        navigate(`/process/${proceso.id}`);
                      }}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-2 text-sm">
                            {proceso.nomenclatura || 'Sin nomenclatura'}
                          </h4>
                          <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                            {proceso.objeto_contratacion || 'Sin descripción'}
                          </p>
                          <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                              <span className="font-medium">{proceso.entidad || 'N/A'}</span>
                            </span>
                            {proceso.departamento && (
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span>{proceso.departamento}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg font-bold text-sm">
                            S/ {Number(proceso.monto_referencial || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserAnalytics;
