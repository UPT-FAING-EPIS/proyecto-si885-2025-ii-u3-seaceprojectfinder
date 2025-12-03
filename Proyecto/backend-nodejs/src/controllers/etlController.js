/**
 * Controlador de ETL
 */
const etlService = require('../services/etlService');
const logger = require('../config/logger');

class ETLController {
  async startScraping(req, res, next) {
    try {
      const params = req.body;
      const result = await etlService.startScraping(params);
      
      // Evitar cache
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      // Retornar directamente
      res.json(result);
    } catch (error) {
      logger.error(`Error en startScraping: ${error.message}`);
      next(error);
    }
  }

  async createScrapingTask(req, res, next) {
    try {
      const params = req.body;
      const userId = req.user?.id;
      
      const task = await etlService.createScrapingTask(params, userId);
      res.status(201).json(task);
    } catch (error) {
      next(error);
    }
  }

  async getScrapingTask(req, res, next) {
    try {
      const { task_id } = req.params;
      const task = await etlService.getScrapingTask(task_id);
      res.json(task);
    } catch (error) {
      if (error.message.includes('no encontrada')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      next(error);
    }
  }

  async getScrapingTasks(req, res, next) {
    try {
      const filters = {
        page: parseInt(req.query.page) || 1,
        size: parseInt(req.query.size) || 20,
        estado: req.query.estado,
        user_id: req.query.user_id
      };

      const result = await etlService.getScrapingTasks(filters);
      
      // Evitar cache
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      // Retornar directamente
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateScrapingTask(req, res, next) {
    try {
      const { task_id } = req.params;
      const updateData = req.body;
      
      const task = await etlService.updateScrapingTask(task_id, updateData);
      res.json(task);
    } catch (error) {
      if (error.message.includes('no encontrada')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      next(error);
    }
  }

  async getETLLogs(req, res, next) {
    try {
      const filters = {
        page: parseInt(req.query.page) || 1,
        size: parseInt(req.query.size) || 50,
        operation_type: req.query.operation_type,
        status: req.query.status,
        operation_id: req.query.operation_id
      };

      const result = await etlService.getETLLogs(filters);
      
      // Evitar cache
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      // Retornar directamente
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getETLStats(req, res, next) {
    try {
      const stats = await etlService.getETLStats();
      
      // Evitar cache
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      // Retornar directamente
      res.json(stats);
    } catch (error) {
      next(error);
    }
  }

  async syncProcesses(req, res, next) {
    try {
      const params = req.body;
      const result = await etlService.syncProcesses(params);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async generateEmbeddings(req, res, next) {
    try {
      const { proceso_id } = req.body;
      const result = await etlService.generateEmbeddings(proceso_id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener detalles de una operación ETL específica
   */
  async getOperationDetails(req, res, next) {
    try {
      const { operation_id } = req.params;
      const details = await etlService.getOperationDetails(operation_id);
      
      if (!details) {
        return res.status(404).json({ 
          success: false, 
          message: 'Operación no encontrada' 
        });
      }

      // Evitar cache
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      res.json({
        success: true,
        data: details
      });
    } catch (error) {
      logger.error(`Error en getOperationDetails: ${error.message}`);
      next(error);
    }
  }

  /**
   * Obtener progreso en tiempo real de una operación ETL
   */
  async getOperationProgress(req, res, next) {
    try {
      const { operation_id } = req.params;
      const progress = await etlService.getOperationProgress(operation_id);
      
      // Evitar cache
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      res.json({
        success: true,
        data: progress
      });
    } catch (error) {
      logger.error(`Error en getOperationProgress: ${error.message}`);
      next(error);
    }
  }

  /**
   * Listar archivos de exportación
   */
  async listExportedFiles(req, res, next) {
    try {
      const exportService = require('../services/exportService');
      const filter = req.query.filter || null;
      
      const files = await exportService.listExportedFiles(filter);
      res.json({ success: true, data: files });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Descargar archivo de exportación
   */
  async downloadExportedFile(req, res, next) {
    try {
      const exportService = require('../services/exportService');
      const { fileName } = req.params;
      
      const file = await exportService.getExportedFile(fileName);
      if (!file) {
        return res.status(404).json({ success: false, message: 'Archivo no encontrado' });
      }

      // Determinar tipo de contenido
      let contentType = 'text/plain; charset=utf-8';
      if (fileName.endsWith('.json')) {
        contentType = 'application/json';
      } else if (fileName.endsWith('.csv')) {
        contentType = 'text/csv; charset=utf-8';
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(file.content);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Iniciar proceso de categorización de procesos
   */
  async iniciarCategorizacion(req, res, next) {
    try {
      const categorizacionService = require('../services/categorizacionService');
      const { v4: uuidv4 } = require('uuid');
      
      const operationId = uuidv4();
      
      // Ejecutar categorización en background
      setImmediate(async () => {
        try {
          await categorizacionService.categorizarProcesosPendientes(operationId);
        } catch (error) {
          logger.error(`Error en proceso de categorización: ${error.message}`);
        }
      });
      
      res.json({
        success: true,
        message: 'Proceso de categorización iniciado',
        operation_id: operationId
      });
    } catch (error) {
      logger.error(`Error al iniciar categorización: ${error.message}`);
      next(error);
    }
  }

  /**
   * Obtener estado de la categorización
   */
  async getEstadoCategorizacion(req, res, next) {
    try {
      const { operation_id } = req.params;
      const { ETLLog } = require('../models');
      
      const etlLog = await ETLLog.findOne({
        where: {
          operation_type: 'CATEGORIZACION',
          operation_id: operation_id
        },
        order: [['created_at', 'DESC']]
      });

      if (!etlLog) {
        return res.status(404).json({
          success: false,
          message: 'Operación no encontrada'
        });
      }

      // Evitar cache
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');

      res.json({
        success: true,
        data: {
          operation_id: etlLog.operation_id,
          status: etlLog.status,
          message: etlLog.message,
          paso_actual: etlLog.paso_actual,
          paso_total: etlLog.paso_total,
          porcentaje: etlLog.porcentaje,
          mensaje_actual: etlLog.mensaje_actual,
          process_count: etlLog.process_count,
          duration_ms: etlLog.duration_ms,
          details: etlLog.details,
          created_at: etlLog.created_at,
          updated_at: etlLog.updated_at
        }
      });
    } catch (error) {
      logger.error(`Error al obtener estado de categorización: ${error.message}`);
      next(error);
    }
  }

  /**
   * Obtener estadísticas de categorías
   */
  async getEstadisticasCategorias(req, res, next) {
    try {
      const categorizacionService = require('../services/categorizacionService');
      const stats = await categorizacionService.getEstadisticasCategorias();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error(`Error al obtener estadísticas: ${error.message}`);
      next(error);
    }
  }

  /**
   * Iniciar inferencia de ubicación
   */
  async iniciarInferenciaUbicacion(req, res, next) {
    try {
      const { limit } = req.body;
      const ubicacionService = require('../services/ubicacionService');
      
      // Generar ID único
      const operationId = `ubicacion_${Date.now()}`;
      
      // Iniciar proceso en background
      ubicacionService.inferirUbicacionPendientes(operationId, limit)
        .catch(error => {
          logger.error(`❌ Error CRÍTICO en inferencia de ubicación: ${error.message}`);
          
          // Detectar tipo de error y registrarlo en ETL Log
          if (error.message.includes('API key') || error.message.includes('403') || error.message.includes('Forbidden')) {
            logger.error(`🚨 ERROR DE API KEY DETECTADO: La API key de Gemini es inválida o fue revocada`);
          } else if (error.message.includes('429') || error.message.includes('quota')) {
            logger.error(`⏱️ ERROR DE CUOTA: Se excedió el límite de requests de Gemini API`);
          } else {
            logger.error(`⚠️ Error desconocido: ${error.stack}`);
          }
        });

      res.json({
        success: true,
        message: 'Inferencia de ubicación iniciada',
        operation_id: operationId
      });
    } catch (error) {
      logger.error(`Error al iniciar inferencia de ubicación: ${error.message}`);
      next(error);
    }
  }

  /**
   * Obtener estado de inferencia de ubicación
   */
  async getEstadoInferenciaUbicacion(req, res, next) {
    try {
      const { operation_id } = req.params;
      const { ETLLog } = require('../models');
      
      const etlLog = await ETLLog.findOne({
        where: { operation_id },
        order: [['created_at', 'DESC']]
      });

      if (!etlLog) {
        return res.status(404).json({
          success: false,
          message: 'Operación no encontrada'
        });
      }

      res.json({
        success: true,
        data: {
          operation_id: etlLog.operation_id,
          status: etlLog.status,
          message: etlLog.message,
          paso_actual: etlLog.paso_actual,
          paso_total: etlLog.paso_total,
          porcentaje: etlLog.porcentaje,
          mensaje_actual: etlLog.mensaje_actual,
          process_count: etlLog.process_count,
          duration_ms: etlLog.duration_ms,
          details: etlLog.details,
          created_at: etlLog.created_at,
          updated_at: etlLog.updated_at
        }
      });
    } catch (error) {
      logger.error(`Error al obtener estado de inferencia de ubicación: ${error.message}`);
      next(error);
    }
  }

  /**
   * Obtener estadísticas de ubicación
   */
  async getEstadisticasUbicacion(req, res, next) {
    try {
      const ubicacionService = require('../services/ubicacionService');
      const stats = await ubicacionService.getEstadisticasUbicacion();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error(`Error al obtener estadísticas de ubicación: ${error.message}`);
      next(error);
    }
  }
}

module.exports = new ETLController();