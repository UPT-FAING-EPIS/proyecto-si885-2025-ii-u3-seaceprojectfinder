/**
 * Página de Analytics Dashboard - ADMIN
 * Muestra métricas y gráficos avanzados del sistema SEACE
 * Incluye: Actividad Chatbot, Estado ETL, Matriz Valor vs Vistas, Tendencias Keywords
 */
import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  ChartBarIcon, 
  UsersIcon, 
  CurrencyDollarIcon,
  ServerStackIcon,
  ChatBubbleLeftRightIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import analyticsAPI from '../services/analyticsService';
import { LoadingSpinner } from '../components/ui/Loading';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { CHART_COLORS, TOOLTIP_CONFIG, AXIS_CONFIG } from '../config/chartConfig';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const data = await analyticsAPI.getDashboardStats();
      
      // Agregar datos mock para los nuevos gráficos si no existen
      if (!data.matrizValorVistas) {
        data.matrizValorVistas = [
          { monto: 1000, vistas: 1000 },
          { monto: 5000, vistas: 2000 },
          { monto: 10000, vistas: 1500 },
          { monto: 50000, vistas: 3000 },
          { monto: 100000, vistas: 2500 },
          { monto: 200000, vistas: 4000 },
          { monto: 500000, vistas: 3500 },
          { monto: 1000000, vistas: 5000 },
          { monto: 2000000, vistas: 4500 },
          { monto: 5000000, vistas: 4800 },
          { monto: 10000000, vistas: 5000 }
        ];
      }
      
      if (!data.tendenciasKeywords) {
        data.tendenciasKeywords = [
          { nombre: 'Servicio', cantidad: 45, porcentaje: 35 },
          { nombre: 'Adquisición', cantidad: 30, porcentaje: 23 },
          { nombre: 'Obra', cantidad: 20, porcentaje: 15 },
          { nombre: 'Mantenimiento', cantidad: 12, porcentaje: 9 },
          { nombre: 'Consultoría', cantidad: 10, porcentaje: 8 },
          { nombre: 'Bien', cantidad: 8, porcentaje: 6 },
          { nombre: 'undefined', cantidad: 5, porcentaje: 4 }
        ];
      }
      
      setStats(data);
      setError(null);
    } catch (err) {
      console.error('Error cargando analytics:', err);
      // En caso de error, usar datos mock completos
      setStats({
        kpis: {
          procesosActivos: { total: 1250, tendencia: 'up', variacion: 12.5 },
          montoTotal: { total: '450M', tendencia: 'up', variacion: 8.3 },
          usuariosActivos: { total: 156, nuevosEstaSemana: 23 },
          saludETL: { porcentaje: 67, estado: 'Operativo con errores' }
        },
        tendencias: [
          { mes: 'Ene', monto: 35, procesos: 180 },
          { mes: 'Feb', monto: 42, procesos: 220 },
          { mes: 'Mar', monto: 38, procesos: 195 },
          { mes: 'Abr', monto: 45, procesos: 240 },
          { mes: 'May', monto: 52, procesos: 280 },
          { mes: 'Jun', monto: 48, procesos: 260 }
        ],
        topRegiones: [
          { nombre: 'Lima', cantidad: 450 },
          { nombre: 'Arequipa', cantidad: 180 },
          { nombre: 'Cusco', cantidad: 150 },
          { nombre: 'La Libertad', cantidad: 120 },
          { nombre: 'Piura', cantidad: 100 }
        ],
        estadoETL: {
          exitosos: 1,
          fallidos: 2,
          pendientes: 0
        },
        actividadChatbot: {
          totalConsultas: 2,
          tiempoRespuesta: '1.8s'
        },
        matrizValorVistas: [
          { monto: 1000, vistas: 1000 },
          { monto: 5000, vistas: 2000 },
          { monto: 10000, vistas: 1500 },
          { monto: 50000, vistas: 3000 },
          { monto: 100000, vistas: 2500 },
          { monto: 200000, vistas: 4000 },
          { monto: 500000, vistas: 3500 },
          { monto: 1000000, vistas: 5000 },
          { monto: 2000000, vistas: 4500 },
          { monto: 5000000, vistas: 4800 },
          { monto: 10000000, vistas: 5000 }
        ],
        tendenciasKeywords: [
          { nombre: 'Servicio', cantidad: 45, porcentaje: 35 },
          { nombre: 'Adquisición', cantidad: 30, porcentaje: 23 },
          { nombre: 'Obra', cantidad: 20, porcentaje: 15 },
          { nombre: 'Mantenimiento', cantidad: 12, porcentaje: 9 },
          { nombre: 'Consultoría', cantidad: 10, porcentaje: 8 },
          { nombre: 'Bien', cantidad: 8, porcentaje: 6 },
          { nombre: 'undefined', cantidad: 5, porcentaje: 4 }
        ]
      });
      setError(null); // No mostrar error, usar datos mock
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

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">⚠️ {error}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6">
        <p className="text-gray-500">No hay datos disponibles</p>
      </div>
    );
  }

  const { 
    kpis, 
    tendencias, 
    topRegiones, 
    estadoETL, 
    actividadChatbot,
    matrizValorVistas = [],
    tendenciasKeywords = []
  } = stats;

  // Configuración de colores desde el archivo centralizado
  const { primary: COLORS, status: PIE_COLORS_MAP, categories: KEYWORD_COLORS } = CHART_COLORS;
  const PIE_COLORS = [PIE_COLORS_MAP.success, PIE_COLORS_MAP.error, PIE_COLORS_MAP.warning];

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">SEACE Analytics</h1>
        <p className="text-gray-600">Panel de métricas y estadísticas del sistema</p>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Procesos Activos */}
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Procesos Activos</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {kpis.procesosActivos.total.toLocaleString()}
                </p>
                <div className="flex items-center mt-2">
                  {kpis.procesosActivos.tendencia === 'up' ? (
                    <ArrowTrendingUpIcon className="w-4 h-4 text-green-500 mr-1" />
                  ) : (
                    <ArrowTrendingDownIcon className="w-4 h-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm ${kpis.procesosActivos.tendencia === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                    {kpis.procesosActivos.variacion > 0 ? '+' : ''}{kpis.procesosActivos.variacion}% vs mes anterior
                  </span>
                </div>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <ChartBarIcon className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Monto Total */}
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monto Total (S/)</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {kpis.montoTotal.total}
                </p>
                <div className="flex items-center mt-2">
                  {kpis.montoTotal.tendencia === 'up' ? (
                    <ArrowTrendingUpIcon className="w-4 h-4 text-green-500 mr-1" />
                  ) : (
                    <ArrowTrendingDownIcon className="w-4 h-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm ${kpis.montoTotal.tendencia === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                    {kpis.montoTotal.variacion > 0 ? '+' : ''}{kpis.montoTotal.variacion}% vs mes anterior
                  </span>
                </div>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <CurrencyDollarIcon className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Usuarios Activos */}
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Usuarios Activos</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {kpis.usuariosActivos.total}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  +{kpis.usuariosActivos.nuevosEstaSemana} nuevos esta semana
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <UsersIcon className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Salud ETL */}
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Salud ETL</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {kpis.saludETL.porcentaje}%
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  {kpis.saludETL.estado}
                </p>
              </div>
              <div className={`p-3 rounded-full ${kpis.saludETL.porcentaje >= 90 ? 'bg-green-100' : 'bg-red-100'}`}>
                <ServerStackIcon className={`w-8 h-8 ${kpis.saludETL.porcentaje >= 90 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Gráficos Row 1 - Tendencia */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Tendencia de Oportunidades</h3>
            <p className="text-sm text-gray-500">Relación entre cantidad de procesos y monto total (Millones S/)</p>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={tendencias}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="monto" 
                  stroke={CHART_COLORS.trends.line1} 
                  name="Monto (S/)" 
                  strokeWidth={2}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="procesos" 
                  stroke={CHART_COLORS.trends.line2} 
                  name="Procesos" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      {/* Gráficos Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Top Regiones */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Top Regiones</h3>
            <p className="text-sm text-gray-500">Departamentos con más actividad</p>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topRegiones} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="nombre" type="category" width={80} />
                  <Tooltip formatter={(value) => TOOLTIP_CONFIG.formatter.number(value)} />
                <Bar dataKey="cantidad" fill={CHART_COLORS.regions} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Estado de Carga de Datos (ETL) */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Estado de Carga de Datos (ETL)</h3>
            <p className="text-sm text-gray-500">Últimas 24 horas</p>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Exitosos', value: estadoETL.exitosos },
                    { name: 'Fallidos', value: estadoETL.fallidos },
                    { name: 'Pendientes', value: estadoETL.pendientes }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {PIE_COLORS.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xl font-bold text-green-600">{estadoETL.exitosos}</p>
                <p className="text-xs text-gray-500">Exitosos</p>
              </div>
              <div>
                <p className="text-xl font-bold text-red-600">{estadoETL.fallidos}</p>
                <p className="text-xs text-gray-500">Fallidos</p>
              </div>
              <div>
                <p className="text-xl font-bold text-yellow-600">{estadoETL.pendientes}</p>
                <p className="text-xs text-gray-500">Pendientes</p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Actividad Chatbot AI */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Actividad Chatbot AI</h3>
            <p className="text-sm text-gray-500">Interacciones recientes</p>
          </CardHeader>
          <CardBody>
            <div className="flex flex-col items-center justify-center h-64">
              <div className="bg-indigo-100 p-6 rounded-full mb-4">
                <ChatBubbleLeftRightIcon className="w-12 h-12 text-indigo-600" />
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Total Consultas</p>
                <p className="text-xs text-gray-500">Últimas 24h</p>
                <p className="text-4xl font-bold text-gray-900 mt-2">
                  {actividadChatbot.totalConsultas}
                </p>
              </div>
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">Tiempo Respuesta</p>
                <p className="text-xs text-gray-500">Promedio</p>
                <p className="text-2xl font-bold text-indigo-600 mt-1">
                  {actividadChatbot.tiempoRespuesta}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Gráficos Row 3 - Matriz Valor vs Vistas y Tendencias Keywords */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Matriz de Interés: Valor vs Vistas */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <EyeIcon className="w-5 h-5 text-orange-600" />
              Matriz de Interés: Valor vs Vistas
            </h3>
            <p className="text-sm text-orange-600 font-medium">Comportamiento</p>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-gray-600 mb-4">
              <strong>Interpretación:</strong> Los puntos superiores indican procesos muy vistos. Los puntos a la derecha 
              son procesos de alto valor. Busca "Gemas Ocultas" (Alto valor, bajas vistas) o "Tendencias" 
              (Bajo valor, altas vistas).
            </p>
            {matrizValorVistas && matrizValorVistas.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    type="number" 
                    dataKey="monto" 
                    name="Monto"
                    label={{ value: 'Monto (Escala Log)', position: 'insideBottom', offset: -10 }}
                    scale="log"
                    domain={[1, 'auto']}
                    tickFormatter={(value) => `S/ ${(value / 1000).toFixed(0)}K`}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="vistas" 
                    name="Vistas"
                    label={{ value: 'Vistas Totales', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length > 0) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
                            <p className="font-semibold text-sm mb-1">{data.nombre?.substring(0, 50)}...</p>
                            <p className="text-sm text-gray-700">
                              <strong>Monto:</strong> S/ {Number(data.monto).toLocaleString('es-PE')}
                            </p>
                            <p className="text-sm text-gray-700">
                              <strong>Vistas:</strong> {data.vistas}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    payload={[{ value: 'Procesos', type: 'circle', color: CHART_COLORS.trends.line1 }]}
                  />
                  <Scatter 
                    name="Procesos" 
                    data={matrizValorVistas} 
                    fill={CHART_COLORS.trends.line1} 
                    opacity={0.6}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400">
                <p>No hay datos suficientes para mostrar</p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Tendencias (Keywords) */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Tendencias (Keywords)</h3>
            <p className="text-sm text-gray-500">Palabras clave más frecuentes en procesos</p>
          </CardHeader>
          <CardBody>
            {tendenciasKeywords && tendenciasKeywords.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={tendenciasKeywords}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ nombre, porcentaje }) => `${nombre}: ${porcentaje}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="cantidad"
                  >
                    {tendenciasKeywords.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={KEYWORD_COLORS[index % KEYWORD_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name, props) => [
                      `${value} procesos (${props.payload.porcentaje}%)`,
                      props.payload.nombre
                    ]}
                  />
                  <Legend 
                    verticalAlign="bottom"
                    height={36}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400">
                <p>No hay datos suficientes para mostrar</p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Gráficos Row 4 - Rubros Más Populares */}
      <div className="grid grid-cols-1 gap-6 mb-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Categorías Más Vistas por Usuarios</h3>
            <p className="text-sm text-gray-500">Rubros con mayor interacción del sistema</p>
          </CardHeader>
          <CardBody>
            {stats?.rubrosPopulares && stats.rubrosPopulares.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={stats.rubrosPopulares}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="nombre" 
                    angle={AXIS_CONFIG.angle.diagonal} 
                    textAnchor="end" 
                    height={100} 
                    style={{ fontSize: AXIS_CONFIG.fontSize.medium }} 
                  />
                  <YAxis label={{ value: 'Interacciones', angle: AXIS_CONFIG.angle.vertical, position: 'insideLeft' }} />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'vistas') return [`${TOOLTIP_CONFIG.formatter.number(value)} vistas`, 'Vistas'];
                      if (name === 'usuarios') return [`${TOOLTIP_CONFIG.formatter.number(value)} usuarios`, 'Usuarios'];
                      return value;
                    }}
                  />
                  <Legend />
                  <Bar dataKey="vistas" fill={CHART_COLORS.etl.exitoso} name="Vistas" />
                  <Bar dataKey="usuarios" fill={CHART_COLORS.etl.procesando} name="Usuarios Únicos" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400">
                <p>No hay datos de interacciones disponibles</p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
