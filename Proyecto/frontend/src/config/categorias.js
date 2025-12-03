/**
 * Configuración de Categorías de Procesos SEACE
 */
import {
  ComputerDesktopIcon,
  BuildingOffice2Icon,
  BoltIcon,
  HeartIcon,
  AcademicCapIcon,
  UserGroupIcon,
  ShoppingCartIcon,
  TruckIcon,
  EllipsisHorizontalCircleIcon
} from '@heroicons/react/24/outline';

export const CATEGORIAS = {
  'TECNOLOGIA': {
    id: 'TECNOLOGIA',
    nombre: 'Tecnología e Informática',
    color: '#3B82F6',
    icon: ComputerDesktopIcon,
    descripcion: 'Software, sistemas, desarrollo, equipamiento tecnológico'
  },
  'CONSTRUCCION': {
    id: 'CONSTRUCCION',
    nombre: 'Construcción e Infraestructura',
    color: '#F59E0B',
    icon: BuildingOffice2Icon,
    descripcion: 'Obras, edificaciones, infraestructura vial'
  },
  'SERVICIOS_BASICOS': {
    id: 'SERVICIOS_BASICOS',
    nombre: 'Servicios Básicos',
    color: '#10B981',
    icon: BoltIcon,
    descripcion: 'Electricidad, agua, limpieza, mantenimiento'
  },
  'SALUD': {
    id: 'SALUD',
    nombre: 'Salud y Equipamiento Médico',
    color: '#EF4444',
    icon: HeartIcon,
    descripcion: 'Equipamiento médico, medicamentos, hospitales'
  },
  'EDUCACION': {
    id: 'EDUCACION',
    nombre: 'Educación y Capacitación',
    color: '#8B5CF6',
    icon: AcademicCapIcon,
    descripcion: 'Capacitación, material educativo, infraestructura educativa'
  },
  'CONSULTORIA': {
    id: 'CONSULTORIA',
    nombre: 'Consultoría y Asesoría',
    color: '#6366F1',
    icon: UserGroupIcon,
    descripcion: 'Servicios de consultoría, estudios, supervisión'
  },
  'BIENES': {
    id: 'BIENES',
    nombre: 'Adquisición de Bienes',
    color: '#EC4899',
    icon: ShoppingCartIcon,
    descripcion: 'Compra de mobiliario, equipos, vehículos'
  },
  'TRANSPORTE': {
    id: 'TRANSPORTE',
    nombre: 'Transporte y Logística',
    color: '#14B8A6',
    icon: TruckIcon,
    descripcion: 'Vehículos, logística, mantenimiento vehicular'
  },
  'OTROS': {
    id: 'OTROS',
    nombre: 'Otros Servicios',
    color: '#6B7280',
    icon: EllipsisHorizontalCircleIcon,
    descripcion: 'Servicios generales y otros'
  }
};

export const CATEGORIAS_ARRAY = Object.values(CATEGORIAS);

export const getCategoriaConfig = (categoriaId) => {
  return CATEGORIAS[categoriaId] || CATEGORIAS.OTROS;
};
