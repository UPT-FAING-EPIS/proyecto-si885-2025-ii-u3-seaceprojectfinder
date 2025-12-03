/**
 * Servicio de Categorización Inteligente de Procesos
 * Usa keywords + IA (Gemini) para asignar categorías a procesos SEACE
 */
const { Proceso } = require('../models');
const { Op } = require('sequelize');
const logger = require('../config/logger');
const { generateText } = require('../utils/ai');

// Definición de categorías con keywords
const CATEGORIAS = {
  'TECNOLOGIA': {
    nombre: 'Tecnología e Informática',
    keywords: [
      'software', 'sistema', 'desarrollo', 'aplicación', 'app',
      'web', 'móvil', 'base de datos', 'servidor', 'cloud',
      'tecnología', 'informática', 'computadora', 'equipo de cómputo',
      'licencia', 'microsoft', 'oracle', 'sap', 'erp', 'crm',
      'ciberseguridad', 'backup', 'red', 'wifi', 'telecomunicaciones',
      'programación', 'digital', 'electrónico'
    ]
  },
  'CONSTRUCCION': {
    nombre: 'Construcción e Infraestructura',
    keywords: [
      'construcción', 'obra', 'infraestructura', 'edificación',
      'carretera', 'puente', 'túnel', 'hospital', 'escuela',
      'mejoramiento', 'ampliación', 'remodelación', 'rehabilitación',
      'saneamiento', 'agua', 'desagüe', 'alcantarillado', 'pista',
      'vereda', 'muro', 'canal', 'reservorio'
    ]
  },
  'SERVICIOS_BASICOS': {
    nombre: 'Servicios Básicos',
    keywords: [
      'electricidad', 'energía', 'luz', 'alumbrado',
      'agua potable', 'tratamiento de agua', 'residuos sólidos',
      'limpieza', 'mantenimiento', 'seguridad', 'vigilancia',
      'jardinería', 'fumigación', 'desinfección'
    ]
  },
  'SALUD': {
    nombre: 'Salud y Equipamiento Médico',
    keywords: [
      'salud', 'médico', 'hospital', 'clínica', 'posta',
      'equipamiento médico', 'medicamentos', 'insumos médicos',
      'ambulancia', 'rayos x', 'ecógrafo', 'laboratorio',
      'quirófano', 'camilla', 'enfermería'
    ]
  },
  'EDUCACION': {
    nombre: 'Educación y Capacitación',
    keywords: [
      'educación', 'capacitación', 'formación', 'enseñanza',
      'colegio', 'institución educativa', 'universidad',
      'material educativo', 'mobiliario escolar', 'aula',
      'pizarra', 'carpeta', 'biblioteca', 'laboratorio educativo'
    ]
  },
  'CONSULTORIA': {
    nombre: 'Consultoría y Asesoría',
    keywords: [
      'consultoría', 'asesoría', 'estudio', 'supervisión',
      'evaluación', 'diagnóstico', 'plan', 'estrategia',
      'servicio de consultoría', 'servicio no personal',
      'auditoría', 'inspección', 'peritaje'
    ]
  },
  'BIENES': {
    nombre: 'Adquisición de Bienes',
    keywords: [
      'adquisición', 'compra', 'suministro', 'provisión',
      'mobiliario', 'equipamiento', 'vehículo', 'maquinaria',
      'útiles de oficina', 'papelería', 'equipos',
      'herramientas', 'materiales'
    ]
  },
  'TRANSPORTE': {
    nombre: 'Transporte y Logística',
    keywords: [
      'transporte', 'logística', 'vehículo', 'camión',
      'movilidad', 'combustible', 'mantenimiento vehicular',
      'repuestos', 'neumáticos', 'flota', 'carga'
    ]
  },
  'OTROS': {
    nombre: 'Otros Servicios',
    keywords: []
  }
};

class CategorizacionService {
  
  /**
   * Categorizar un proceso por keywords
   */
  categorizarPorKeywords(proceso) {
    const textoCompleto = `
      ${proceso.objeto_contratacion || ''} 
      ${proceso.descripcion_objeto || ''} 
      ${proceso.nomenclatura || ''}
    `.toLowerCase();

    let mejorCategoria = 'OTROS';
    let maxCoincidencias = 0;

    for (const [categoria, config] of Object.entries(CATEGORIAS)) {
      if (categoria === 'OTROS') continue;

      let coincidencias = 0;
      for (const keyword of config.keywords) {
        if (textoCompleto.includes(keyword.toLowerCase())) {
          coincidencias++;
        }
      }

      if (coincidencias > maxCoincidencias) {
        maxCoincidencias = coincidencias;
        mejorCategoria = categoria;
      }
    }

    // Requerir al menos 2 coincidencias para asignar categoría
    return maxCoincidencias >= 2 ? mejorCategoria : null;
  }

  /**
   * Categorizar usando Gemini AI
   * Ahora se usa SIEMPRE para todos los procesos
   */
  async categorizarConIA(proceso) {
    try {
      const prompt = `Eres un experto en contratación pública del Estado Peruano. Debes analizar y clasificar este proceso de contratación en UNA categoría específica.

CATEGORÍAS DISPONIBLES (DEBES elegir una):

1. TECNOLOGIA: 
   - Desarrollo/mantenimiento de software, sistemas informáticos, aplicaciones web/móviles
   - Equipos de cómputo, servidores, infraestructura tecnológica
   - Licencias de software (Microsoft, Oracle, SAP, ERP, CRM)
   - Servicios de ciberseguridad, backup, redes, telecomunicaciones, WiFi
   - Cualquier servicio o bien relacionado con tecnología e informática

2. CONSTRUCCION:
   - Obras de construcción, edificación, infraestructura civil
   - Carreteras, puentes, túneles, hospitales, escuelas
   - Mejoramiento, ampliación, remodelación, rehabilitación
   - Sistemas de saneamiento, agua, desagüe, alcantarillado
   - Pistas, veredas, muros, canales, reservorios

3. SERVICIOS_BASICOS:
   - Servicios de electricidad, energía, alumbrado público
   - Agua potable, tratamiento de agua
   - Gestión de residuos sólidos, limpieza pública
   - Servicios de seguridad, vigilancia
   - Jardinería, fumigación, desinfección, mantenimiento general

4. SALUD:
   - Equipamiento médico, instrumental médico-quirúrgico
   - Medicamentos, insumos médicos, material clínico
   - Ambulancias, equipos de diagnóstico (rayos X, ecógrafos)
   - Implementación de laboratorios, quirófanos
   - Servicios de salud especializados

5. EDUCACION:
   - Servicios de capacitación, formación, enseñanza
   - Material educativo, libros, recursos didácticos
   - Mobiliario escolar, equipamiento de aulas
   - Implementación de bibliotecas, laboratorios educativos
   - Infraestructura educativa menor

6. CONSULTORIA:
   - Servicios de consultoría, asesoría profesional
   - Estudios técnicos, evaluaciones, diagnósticos
   - Supervisión de obras o proyectos
   - Elaboración de planes, estrategias, políticas
   - Auditorías, inspecciones, peritajes
   - Servicios no personales profesionales

7. BIENES:
   - Adquisición de bienes generales, mobiliario, equipamiento
   - Vehículos, maquinaria, herramientas
   - Útiles de oficina, papelería
   - Suministros diversos no especializados
   - Equipos y materiales generales

8. TRANSPORTE:
   - Servicios de transporte de personas o carga
   - Adquisición o mantenimiento de vehículos
   - Combustible, repuestos automotrices, neumáticos
   - Logística, gestión de flotas
   - Servicios de mensajería o courier

DATOS DEL PROCESO:
- Objeto: ${proceso.objeto_contratacion || 'N/A'}
- Descripción: ${proceso.descripcion_objeto || 'N/A'}
- Nomenclatura: ${proceso.nomenclatura || 'N/A'}

INSTRUCCIONES CRÍTICAS:
1. DEBES elegir UNA categoría de las 8 opciones
2. NO uses "OTROS" - elige la categoría más cercana incluso si no es perfecta
3. Analiza el contexto completo del proceso
4. Si el proceso tiene múltiples aspectos, elige la categoría PRINCIPAL
5. Responde SOLO con el nombre de la categoría en MAYÚSCULAS (ej: TECNOLOGIA)

Tu respuesta (solo el nombre de la categoría):`;

      const { text: respuesta, keyAlias } = await generateText(prompt);
      const categoriaDetectada = respuesta.trim().toUpperCase().replace(/[^A-Z_]/g, '');

      // Validar que la categoría existe y no es OTROS
      if (CATEGORIAS[categoriaDetectada] && categoriaDetectada !== 'OTROS') {
        logger.info(`[IA] ✓ Proceso ${proceso.id_proceso} → ${categoriaDetectada} (Key: ${keyAlias})`);
        return { categoria: categoriaDetectada, keyAlias };
      }

      // Si la IA devolvió OTROS o algo inválido, intentar inferir de keywords como fallback
      logger.warn(`[IA] Respuesta inválida para ${proceso.id_proceso}: "${respuesta}", usando fallback`);
      const fallbackCategoria = this.categorizarPorKeywords(proceso);
      return { categoria: fallbackCategoria || 'BIENES', keyAlias: `${keyAlias} (Fallback)` };
      
    } catch (error) {
      logger.error(`Error en categorizarConIA para proceso ${proceso.id_proceso}: ${error.message}`);
      // Fallback a keywords en caso de error
      const fallbackCategoria = this.categorizarPorKeywords(proceso);
      return { categoria: fallbackCategoria || 'BIENES', keyAlias: 'Fallback (Error)' };
    }
  }

  /**
   * Categorizar un proceso individual
   * Ahora usa SIEMPRE IA para máxima precisión
   */
  async categorizarProceso(proceso) {
    // Usar IA para todos los procesos
    return await this.categorizarConIA(proceso);
  }

  /**
   * Categorizar procesos pendientes (sin categoría o NO_CATEGORIZADO)
   */
  async categorizarProcesosPendientes(operationId = null, limit = null) {
    const { ETLLog } = require('../models');
    let etlLog = null;

    try {
      // Contar procesos sin categorizar (incluye OTROS)
      const totalProcesosSinCategoria = await Proceso.count({
        where: {
          [Op.or]: [
            { categoria_proyecto: null },
            { categoria_proyecto: '' },
            { categoria_proyecto: 'NO_CATEGORIZADO' },
            { categoria_proyecto: 'OTROS' }
          ]
        }
      });

      // Si no hay operationId, usar todos los procesos
      const limiteFinal = limit || totalProcesosSinCategoria;

      // Crear registro de ETL
      if (operationId) {
        etlLog = await ETLLog.create({
          operation_type: 'CATEGORIZACION',
          operation_id: operationId,
          status: 'running',
          message: 'Iniciando categorización de procesos',
          paso_actual: 0,
          paso_total: limiteFinal,
          porcentaje: 0,
          mensaje_actual: 'Buscando procesos sin categorizar...'
        });
      }

      const procesosSinCategoria = await Proceso.findAll({
        where: {
          [Op.or]: [
            { categoria_proyecto: null },
            { categoria_proyecto: '' },
            { categoria_proyecto: 'NO_CATEGORIZADO' },
            { categoria_proyecto: 'OTROS' }
          ]
        },
        limit: limiteFinal
      });

      logger.info(`🚀 Iniciando categorización con IA de ${procesosSinCategoria.length} procesos...`);

      let procesados = 0;
      let usaronIA = 0;
      const distribucionCategorias = {};
      const startTime = Date.now();

      for (const proceso of procesosSinCategoria) {
        // Usar IA para TODOS los procesos
        const { categoria, keyAlias } = await this.categorizarConIA(proceso);
        usaronIA++;

        // Registrar distribución
        if (!distribucionCategorias[categoria]) {
          distribucionCategorias[categoria] = 0;
        }
        distribucionCategorias[categoria]++;

        await proceso.update({ categoria_proyecto: categoria });
        procesados++;

        // Actualizar progreso en ETL log
        if (etlLog && procesados % 5 === 0) {
          const porcentaje = Math.round((procesados / procesosSinCategoria.length) * 100);
          await etlLog.update({
            paso_actual: procesados,
            porcentaje,
            mensaje_actual: `Categorizando proceso ${procesados} de ${procesosSinCategoria.length}... (Key: ${keyAlias})`,
            updated_at: new Date()
          });
        }

        // Log cada 10 procesos
        if (procesados % 10 === 0) {
          logger.info(`Progreso: ${procesados}/${procesosSinCategoria.length} procesos categorizados`);
        }
      }

      const duration = Date.now() - startTime;

      logger.info(`✅ Categorización con IA completada: ${procesados} procesos en ${(duration/1000).toFixed(2)}s`);
      logger.info(`📊 Distribución de categorías:`);
      Object.entries(distribucionCategorias).forEach(([cat, count]) => {
        logger.info(`   ${cat}: ${count} procesos (${((count/procesados)*100).toFixed(1)}%)`);
      });

      // Actualizar ETL log con resultado final
      if (etlLog) {
        await etlLog.update({
          status: 'completed',
          message: `Categorización con IA completada: ${procesados} procesos`,
          paso_actual: procesados,
          paso_total: procesosSinCategoria.length,
          porcentaje: 100,
          mensaje_actual: 'Categorización finalizada exitosamente',
          process_count: procesados,
          duration_ms: duration,
          details: {
            usaronIA,
            distribucionCategorias,
            totalSinCategorizar: totalProcesosSinCategoria,
            metodo: 'IA_GEMINI'
          }
        });
      }

      return { 
        success: true,
        procesados, 
        total: procesosSinCategoria.length,
        totalSinCategorizar: totalProcesosSinCategoria,
        usaronIA,
        distribucionCategorias,
        duration_ms: duration,
        operation_id: operationId,
        metodo: 'IA_GEMINI'
      };
    } catch (error) {
      logger.error(`Error en categorizarProcesosPendientes: ${error.message}`);
      
      // Marcar error en ETL log
      if (etlLog) {
        await etlLog.update({
          status: 'failed',
          message: `Error en categorización: ${error.message}`,
          error: error.stack
        });
      }
      
      throw error;
    }
  }

  /**
   * Obtener estadísticas de categorías
   */
  async getEstadisticasCategorias() {
    try {
      const stats = await Proceso.findAll({
        attributes: [
          'categoria_proyecto',
          [Proceso.sequelize.fn('COUNT', Proceso.sequelize.col('id')), 'total'],
          [Proceso.sequelize.fn('SUM', Proceso.sequelize.col('monto_referencial')), 'monto_total']
        ],
        where: {
          categoria_proyecto: { [Op.ne]: null }
        },
        group: ['categoria_proyecto'],
        order: [[Proceso.sequelize.fn('COUNT', Proceso.sequelize.col('id')), 'DESC']],
        raw: true
      });

      // Agregar nombres legibles
      return stats.map(stat => ({
        ...stat,
        nombre: CATEGORIAS[stat.categoria_proyecto]?.nombre || 'Desconocida',
        total: parseInt(stat.total),
        monto_total: parseFloat(stat.monto_total) || 0
      }));
    } catch (error) {
      logger.error(`Error en getEstadisticasCategorias: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener configuración de categorías
   */
  getCategorias() {
    return CATEGORIAS;
  }
}

module.exports = new CategorizacionService();
