/**
 * Componente para mostrar chip de categoría de proceso
 */
import { getCategoriaConfig } from '../../config/categorias';

export const CategoriaChip = ({ categoria, size = 'sm' }) => {
  if (!categoria) return null;

  const config = getCategoriaConfig(categoria);
  const Icon = config.icon;

  const sizeClasses = {
    xs: 'px-2 py-0.5 text-xs',
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-1.5 text-base'
  };

  return (
    <span 
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses[size]}`}
      style={{ 
        backgroundColor: `${config.color}20`, 
        color: config.color 
      }}
      title={config.descripcion}
    >
      <Icon className={`${size === 'xs' ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
      {config.nombre}
    </span>
  );
};

export default CategoriaChip;
