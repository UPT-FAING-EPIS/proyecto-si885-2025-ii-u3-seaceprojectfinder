import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  MagnifyingGlassIcon, 
  ChatBubbleLeftRightIcon, 
  ChartBarIcon,
  DocumentTextIcon,
  SparklesIcon,
  ArrowRightIcon,
  BellIcon,
  ArrowTrendingUpIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  EyeIcon,
  UserGroupIcon,
  ClockIcon,
  BuildingOffice2Icon
} from '@heroicons/react/24/outline';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/Loading';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useAutoGenerateRecommendations } from '../hooks/useAutoGenerateRecommendations';
import ToastContainer from '../components/ui/ToastContainer';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const Home = () => {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toasts, removeToast, success, error: showError } = useToast();
  
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [topProcesses, setTopProcesses] = useState([]);
  const [loadingTopProcesses, setLoadingTopProcesses] = useState(true);

  // Auto-generación de recomendaciones al cargar Home (Sistema UI-Driven)
  // Usar directamente user?.profile_completed para evitar race conditions
  const { isGenerating } = useAutoGenerateRecommendations({
    enabled: isAuthenticated && user?.profile_completed,
    onSuccess: (data) => {
      if (data.generated_count > 0) {
        console.log(`[Home] Auto-generadas ${data.generated_count} nuevas recomendaciones`);
        // Recargar recomendaciones después de auto-generar
        loadRecommendations();
      }
    },
    onError: (error) => {
      console.error('[Home] Error en auto-generación:', error);
    }
  });

  useEffect(() => {
    if (isAuthenticated) {
      loadStats();
      loadTopProcesses();
      if (user?.profile_completed) {
        loadRecommendations();
      }
    }
  }, [isAuthenticated, user?.profile_completed]);

  const loadRecommendations = async () => {
    try {
      setLoadingRecommendations(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${API_URL}/users/me/recommendations?limit=6&only_unseen=false`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setRecommendations(response.data.data.items || []);
    } catch (err) {
      console.error('Error cargando recomendaciones:', err);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const loadStats = async () => {
    try {
      setLoadingStats(true);
      const token = localStorage.getItem('token');
      
      // Obtener estadísticas generales del sistema
      const response = await axios.get(`${API_URL}/procesos/stats/overview`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setStats(response.data.data || response.data);
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadTopProcesses = async () => {
    try {
      setLoadingTopProcesses(true);
      const token = localStorage.getItem('token');
      
      // Obtener solo los 5 procesos más recientes
      const response = await axios.get(`${API_URL}/procesos/?limit=5&sort_by=fecha_publicacion&sort_order=desc`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setTopProcesses(response.data.items || response.data.data?.items || []);
    } catch (err) {
      console.error('Error cargando procesos destacados:', err);
    } finally {
      setLoadingTopProcesses(false);
    }
  };

  const trackRecommendationClick = async (recommendationId, procesoId) => {
    try {
      const token = localStorage.getItem('token');
      
      // Marcar como vista
      await axios.post(
        `${API_URL}/users/me/recommendations/seen`,
        { recommendation_ids: [recommendationId] },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Registrar click en analytics (opcional: agregar endpoint en backend)
      try {
        await axios.post(
          `${API_URL}/analytics/recommendation-click`,
          {
            recommendation_id: recommendationId,
            proceso_id: procesoId,
            timestamp: new Date().toISOString()
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (analyticsError) {
        // No bloquear navegación si analytics falla
        console.warn('Analytics tracking failed:', analyticsError);
      }

      // Navegar al proceso
      navigate(`/process/${procesoId}`);
    } catch (err) {
      console.error('Error tracking click:', err);
      showError('Error al procesar la recomendación');
    }
  };

  const formatScore = (score) => `${Math.round(score)}%`;
  
  const formatMonto = (monto) => {
    if (!monto && monto !== 0) return 'N/A';
    const numMonto = typeof monto === 'string' ? parseFloat(monto) : monto;
    return `S/ ${numMonto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 60) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (score >= 40) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-blue-50 to-indigo-100">
      <ToastContainer toasts={toasts} onClose={removeToast} />
      
      {/* Header con Bienvenida Personalizada */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                ¡Bienvenido, {user?.full_name || user?.username}!
              </h1>
              <p className="mt-2 text-lg text-gray-600">
                {isAdmin() 
                  ? 'Panel de control administrativo - Gestiona todo el sistema'
                  : 'Tu centro de control para procesos de contratación pública'
                }
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                isAdmin() 
                  ? 'bg-purple-100 text-purple-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {isAdmin() ? '👑 Administrador' : '👤 Usuario'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas Principales con Explicaciones */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">📊 Resumen del Sistema</h2>
          <p className="text-gray-600">
            Métricas clave sobre los procesos de contratación analizados y tu actividad en la plataforma
          </p>
        </div>

        {loadingStats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded"></div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Total de Procesos */}
            <Card hover className="bg-white border-l-4 border-l-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    Procesos Totales
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats?.total_procesos?.toLocaleString('es-PE') || '0'}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    📌 Total de procesos de contratación registrados en el sistema
                  </p>
                </div>
                <DocumentTextIcon className="w-12 h-12 text-blue-500 opacity-80" />
              </div>
            </Card>

            {/* Recomendaciones Activas */}
            <Card hover className="bg-white border-l-4 border-l-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    Tus Recomendaciones
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {recommendations.length}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    🎯 Procesos personalizados según tu perfil
                  </p>
                </div>
                <BellIcon className="w-12 h-12 text-orange-500 opacity-80" />
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Procesos Recientes - Diseño de Lista Compacta */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <ClockIcon className="w-7 h-7 text-indigo-600" />
              Procesos Recientes
            </h2>
            <p className="text-gray-600">
              Procesos de contratación publicados más recientemente
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/catalog" className="flex items-center gap-2">
              Ver Todos
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </Button>
        </div>

        {loadingTopProcesses ? (
          <Card>
            <div className="divide-y divide-gray-200">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-4 animate-pulse">
                  <div className="h-5 bg-gray-200 rounded mb-2 w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </Card>
        ) : topProcesses.length > 0 ? (
          <Card className="overflow-hidden">
            <div className="divide-y divide-gray-200">
              {topProcesses.map((proceso, index) => (
                <div
                  key={proceso.id}
                  className="p-4 hover:bg-indigo-50 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/process/${proceso.id}`)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Título */}
                      <h3 className="text-base font-semibold text-gray-900 group-hover:text-indigo-600 transition line-clamp-1 mb-1">
                        {proceso.descripcion_objeto || proceso.nombre_proceso}
                      </h3>
                      
                      {/* Info en una línea */}
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                        <span className="flex items-center gap-1 font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                          {proceso.nomenclatura}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPinIcon className="w-4 h-4 text-gray-400" />
                          {proceso.departamento || 'N/A'}
                        </span>
                        <span className="flex items-center gap-1">
                          <BuildingOffice2Icon className="w-4 h-4 text-gray-400" />
                          <span className="truncate max-w-xs">{proceso.nombre_entidad || 'N/A'}</span>
                        </span>
                        <span className="flex items-center gap-1 font-medium text-indigo-600">
                          <CurrencyDollarIcon className="w-4 h-4" />
                          {formatMonto(proceso.monto_referencial)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Fecha y acción */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <ClockIcon className="w-3 h-3" />
                        {proceso.fecha_publicacion ? new Date(proceso.fecha_publicacion).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }) : 'N/A'}
                      </span>
                      <ArrowRightIcon className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card className="text-center py-12 bg-gray-50">
            <DocumentTextIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No hay procesos recientes disponibles</p>
          </Card>
        )}
      </div>

      {/* Recomendaciones Personalizadas */}
      {isAuthenticated && user?.profile_completed && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 animate-fade-in">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <BellIcon className="w-8 h-8 text-indigo-600" />
                Recomendaciones Para Ti
              </h2>
              <p className="text-lg text-gray-600">
                Procesos seleccionados según tu perfil profesional
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link to="/notifications">
                Ver Todas
                <ArrowRightIcon className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>

          {loadingRecommendations ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </Card>
              ))}
            </div>
          ) : recommendations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendations.map((rec, index) => (
                <Card
                  key={rec.id}
                  hover
                  className={`cursor-pointer transition-all duration-300 hover:shadow-xl animate-scale-in ${
                    !rec.seen ? 'border-l-4 border-l-indigo-500' : ''
                  }`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                  onClick={() => trackRecommendationClick(rec.id, rec.proceso.id)}
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getScoreColor(rec.score)}`}>
                      {formatScore(rec.score)} match
                    </span>
                    {!rec.seen && (
                      <span className="bg-indigo-100 text-indigo-700 text-xs font-medium px-2 py-1 rounded-full animate-pulse-soft">
                        Nuevo
                      </span>
                    )}
                  </div>

                  {/* Título */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 hover:text-indigo-600 transition">
                    {rec.proceso.descripcion_objeto}
                  </h3>

                  {/* Número de Proceso */}
                  <p className="text-sm text-gray-600 mb-3">{rec.proceso.nomenclatura}</p>

                  {/* Información */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <MapPinIcon className="w-4 h-4 text-gray-400" />
                      <span>{rec.proceso.departamento}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <CurrencyDollarIcon className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{formatMonto(rec.proceso.monto_referencial)}</span>
                    </div>
                  </div>

                  {/* Score Breakdown */}
                  <div className="border-t pt-3 mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>Región: {formatScore(rec.match_region)}</span>
                      <span>Tipo: {formatScore(rec.match_tipo_proyecto)}</span>
                      {rec.match_monto > 0 ? (
                        <span>Monto: {formatScore(rec.match_monto)}</span>
                      ) : rec.match_carrera > 0 ? (
                        <span>Carrera: {formatScore(rec.match_carrera)}</span>
                      ) : (
                        <span>-</span>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center py-12 bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
              <BellIcon className="w-16 h-16 text-indigo-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Genera tus primeras recomendaciones
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Busca procesos de contratación que coincidan con tu perfil profesional y preferencias
              </p>
              <Button asChild size="lg">
                <Link to="/notifications" className="inline-flex items-center gap-2">
                  <BellIcon className="w-5 h-5" />
                  Buscar Recomendaciones
                </Link>
              </Button>
            </Card>
          )}
        </div>
      )}

      {/* Mensaje si perfil incompleto */}
      {isAuthenticated && !user?.profile_completed && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 animate-fade-in">
          <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                  <SparklesIcon className="w-8 h-8 text-indigo-600" />
                </div>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  ¡Completa tu perfil para recibir recomendaciones!
                </h3>
                <p className="text-gray-700 mb-4">
                  Configura tus preferencias profesionales y recibe procesos de contratación 
                  personalizados según tu expertise, ubicación y áreas de interés.
                </p>
                <Button size="lg" onClick={() => {
                  // El ProfileModal se abre desde el Navbar al hacer click en el icono de usuario
                  success('Haz click en tu icono de perfil en la esquina superior derecha');
                }}>
                  <SparklesIcon className="w-5 h-5 mr-2" />
                  Configurar Ahora
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}


    </div>
  );
};
