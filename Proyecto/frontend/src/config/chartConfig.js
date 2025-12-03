/**
 * Configuración centralizada para gráficos y visualizaciones
 * Todos los colores, estilos y configuraciones de charts deben provenir de aquí
 */

// Paletas de colores para gráficos - usando Tailwind CSS colors
export const CHART_COLORS = {
  // Paleta principal para gráficos generales
  primary: [
    '#3b82f6', // blue-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#8b5cf6', // violet-500
    '#ef4444', // red-500
    '#06b6d4', // cyan-500
    '#eab308', // yellow-500
    '#ec4899'  // pink-500
  ],
  
  // Colores para estados (ETL, procesos, etc.)
  status: {
    success: '#10b981', // emerald-500 - verde
    error: '#ef4444',   // red-500 - rojo
    warning: '#f59e0b', // amber-500 - amarillo
    info: '#3b82f6',    // blue-500 - azul
    pending: '#6b7280'  // gray-500 - gris
  },
  
  // Colores específicos por tipo de dato
  budget: {
    free: '#ef4444',    // red-500 - para procesos gratuitos
    paid: '#10b981',    // emerald-500 - para procesos con presupuesto
    ranges: [           // Para distribución por rangos de presupuesto
      '#8b5cf6',        // violet-500
      '#6366f1',        // indigo-500
      '#3b82f6',        // blue-500
      '#06b6d4',        // cyan-500
      '#10b981',        // emerald-500
      '#f59e0b',        // amber-500
      '#ef4444',        // red-500
      '#ec4899'         // pink-500
    ]
  },
  
  // Colores para gráficos de línea/tendencias
  trends: {
    line1: '#3b82f6',   // blue-500
    line2: '#10b981',   // emerald-500
    line3: '#f97316',   // orange-500
    area: '#93c5fd'     // blue-300
  },
  
  // Colores para categorías/keywords
  categories: [
    '#3b82f6',  // blue-500
    '#10b981',  // emerald-500
    '#f97316',  // orange-500
    '#a855f7',  // purple-500
    '#ef4444',  // red-500
    '#06b6d4',  // cyan-500
    '#eab308'   // yellow-500
  ],
  
  // Colores para regiones/entidades
  regions: '#8b5cf6',  // violet-500
  
  // Colores para ETL y procesos
  etl: {
    exitoso: '#10b981',    // emerald-500 - verde
    error: '#ef4444',      // red-500 - rojo
    procesando: '#3b82f6', // blue-500 - azul
    pendiente: '#f59e0b'   // amber-500 - amarillo
  }
};

// Configuración de dimensiones para gráficos responsivos
export const CHART_DIMENSIONS = {
  small: 300,
  medium: 400,
  large: 500,
  xlarge: 600
};

// Configuración de tooltips
export const TOOLTIP_CONFIG = {
  formatter: {
    currency: (value) => `S/ ${Number(value).toLocaleString('es-PE', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    })}`,
    number: (value) => Number(value).toLocaleString('es-PE'),
    percentage: (value) => `${value}%`
  }
};

// Configuración de ejes
export const AXIS_CONFIG = {
  fontSize: {
    small: '10px',
    medium: '11px',
    large: '12px'
  },
  angle: {
    vertical: -90,
    diagonal: -15,
    horizontal: 0
  }
};

// Configuración de animación
export const ANIMATION_CONFIG = {
  duration: 300,
  easing: 'ease-in-out'
};

export default {
  CHART_COLORS,
  CHART_DIMENSIONS,
  TOOLTIP_CONFIG,
  AXIS_CONFIG,
  ANIMATION_CONFIG
};
