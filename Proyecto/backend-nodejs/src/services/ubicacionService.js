/**
 * Servicio de Inferencia de Ubicación Geográfica usando IA (Gemini)
 * Infiere departamento, provincia y distrito de manera dinámica con sistema de doble pasada
 */
const { Proceso } = require('../models');
const { Op } = require('sequelize');
const logger = require('../config/logger');
const { generateText } = require('../utils/ai');

class UbicacionService {
  constructor() {
    // Base de conocimiento acumulado durante la primera pasada
    this.baseConocimiento = {
      distritos: new Map(), // distrito -> { departamento, provincia }
      provincias: new Map() // provincia -> departamento
    };
  }
  
  /**
   * Inferir ubicación usando Gemini AI
   */
  async inferirUbicacionConIA(proceso) {
    try {
      const entidadNombre = proceso.entidad_nombre || proceso.nombre_entidad || '';
      const descripcion = proceso.descripcion_objeto || proceso.objeto_contratacion || '';
      
      const prompt = `Eres un experto en geografía del Perú. Tu tarea es extraer la ubicación geográfica EXACTA de este proceso de contratación.

**REGLA DE ORO: LA DESCRIPCIÓN TIENE PRIORIDAD ABSOLUTA**
Si la descripción menciona explícitamente la ubicación (departamento, provincia, distrito), ESA es la respuesta correcta, NO la sede de la entidad.

**ESTRATEGIA DE ANÁLISIS (en orden de prioridad):**

**1. PRIMERO: Analizar la DESCRIPCIÓN (prioridad máxima)**
Busca menciones EXPLÍCITAS en el texto:
- "DEL DISTRITO DE [Z]" → Distrito = [Z]
- "DE LA PROVINCIA DE [Y]" → Provincia = [Y]
- "DEL DEPARTAMENTO DE [X]" → Departamento = [X]
- "EN LA REGIÓN [X]" → Departamento = [X]
- "EN EL DISTRITO DE [Z]" → Distrito = [Z]

**2. SEGUNDO: Analizar el NOMBRE DE LA ENTIDAD**
Solo si la descripción NO menciona ubicación:
- "GOBIERNO REGIONAL DE [X]" → Departamento = [X]
- "MUNICIPALIDAD PROVINCIAL DE [Y]" → Provincia = [Y], infiere departamento
- "MUNICIPALIDAD DISTRITAL DE [Z]" → Distrito = [Z], infiere provincia y departamento

**3. TERCERO: Completar datos faltantes**
- Si tienes solo distrito → DEBES inferir provincia y departamento usando tu conocimiento de Perú
- Si tienes solo provincia → DEBES inferir el departamento

**DATOS A ANALIZAR:**
Descripción del Proceso: ${descripcion.substring(0, 1500)}

Nombre de la Entidad: ${entidadNombre}

**IMPORTANTE:** 
- La ubicación mencionada en la DESCRIPCIÓN siempre tiene prioridad
- Si dice "DEL DISTRITO DE ANDOAS DE LA PROVINCIA DE DATEM DEL MARAÑÓN DEL DEPARTAMENTO DE LORETO", la respuesta es: Loreto / Datem Del Marañón / Andoas
- Usa nombres en formato Título (Primera Letra Mayúscula)
- Si no puedes determinar, usa null

Responde SOLO en formato JSON:
{
  "departamento": "string",
  "provincia": "string o null",
  "distrito": "string o null",
  "nivel_confianza": "Alto|Medio|Bajo",
  "fuente_dato": "Descripcion|Entidad|Inferencia"
}`;

      const { text: respuesta, keyAlias } = await generateText(prompt);
      
      // Limpiar respuesta (remover markdown si existe)
      let textoLimpio = respuesta.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Intentar parsear JSON
      const ubicacion = JSON.parse(textoLimpio);
      
      const resultado = {
        departamento: this.capitalizar(ubicacion.departamento) || 'No Determinado',
        provincia: this.capitalizar(ubicacion.provincia) || null,
        distrito: this.capitalizar(ubicacion.distrito) || null,
        nivel_confianza: ubicacion.nivel_confianza || 'Bajo',
        fuente_dato: ubicacion.fuente_dato || 'Inferencia',
        keyAlias
      };
      
      logger.info(`[IA] ${proceso.id_proceso} → D:${resultado.departamento}, P:${resultado.provincia || 'N/A'}, Di:${resultado.distrito || 'N/A'} (Conf: ${resultado.nivel_confianza}, Key: ${keyAlias})`);
      
      return resultado;
      
    } catch (error) {
      logger.error(`❌ Error en inferirUbicacionConIA para ${proceso.id_proceso}: ${error.message}`);
      
      // Si es error de API key, propagar para que sea visible
      if (error.message.includes('API key') || error.message.includes('403') || error.message.includes('Forbidden')) {
        logger.error(`🚨 ERROR CRÍTICO DE API KEY: ${error.message}`);
        throw new Error(`API_KEY_ERROR: ${error.message}`);
      }
      
      // Fallback a método sin IA para otros errores
      logger.warn(`⚠️ Usando fallback para ${proceso.id_proceso}`);
      return this.inferirUbicacionFallback(proceso, 'Fallback (Error)');
    }
  }

  /**
   * Método de fallback sin IA (patrones básicos)
   */
  inferirUbicacionFallback(proceso, keyAlias = 'Fallback (Keywords)') {
    logger.warn('⚠️ Usando método de fallback sin IA');
    
    const entidadNombre = proceso.entidad_nombre || proceso.nombre_entidad || '';
    const texto = `${entidadNombre} ${proceso.descripcion_objeto || ''}`.toUpperCase();
    
    // Detectar gobierno regional
    const matchRegional = texto.match(/GOBIERNO\s+REGIONAL\s+DE\s+([A-ZÁÉÍÓÚÑ\s]+?)(?:\s|,|\.|\()/i);
    if (matchRegional) {
      const depto = this.capitalizar(matchRegional[1].trim());
      return {
        departamento: depto,
        provincia: null,
        distrito: null,
        nivel_confianza: 'Alto',
        fuente_dato: 'Entidad',
        keyAlias
      };
    }
    
    // Detectar municipalidad provincial
    const matchProvincial = texto.match(/MUNICIPALIDAD\s+PROVINCIAL\s+DE\s+([A-ZÁÉÍÓÚÑ\s]+?)(?:\s|,|\.|\()/i);
    if (matchProvincial) {
      const prov = this.capitalizar(matchProvincial[1].trim());
      return {
        departamento: 'Por Determinar',
        provincia: prov,
        distrito: null,
        nivel_confianza: 'Medio',
        fuente_dato: 'Entidad',
        keyAlias
      };
    }
    
    // Detectar municipalidad distrital
    const matchDistrital = texto.match(/MUNICIPALIDAD\s+DISTRITAL\s+DE\s+([A-ZÁÉÍÓÚÑ\s]+?)(?:\s|,|\.|\()/i);
    if (matchDistrital) {
      const dist = this.capitalizar(matchDistrital[1].trim());
      return {
        departamento: 'Por Determinar',
        provincia: 'Por Determinar',
        distrito: dist,
        nivel_confianza: 'Medio',
        fuente_dato: 'Entidad',
        keyAlias
      };
    }
    
    // Si no encuentra nada
    return {
      departamento: 'No Determinado',
      provincia: null,
      distrito: null,
      nivel_confianza: 'Bajo',
      fuente_dato: 'Inferencia',
      keyAlias
    };
  }

  /**
   * Capitalizar texto (Primera letra mayúscula)
   */
  capitalizar(texto) {
    if (!texto || texto === 'null' || texto === 'undefined') return null;
    
    return texto
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .split(' ')
      .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
      .join(' ');
  }

  /**
   * Agregar conocimiento a la base acumulada
   */
  agregarConocimiento(ubicacion) {
    const { departamento, provincia, distrito } = ubicacion;
    
    // Solo agregar si los datos son válidos (no vacíos ni genéricos)
    const esValido = (val) => {
      if (!val) return false;
      const invalidos = [
        'no determinado',
        'por determinar',
        'no especificado',
        'nacional / multiregional',
        'nacional',
        'multiregional',
        'error'
      ];
      return !invalidos.includes(val.toLowerCase());
    };

    // Agregar distrito completo (con provincia y departamento)
    if (esValido(distrito) && esValido(provincia) && esValido(departamento)) {
      const distritoKey = distrito.toLowerCase().trim();
      this.baseConocimiento.distritos.set(distritoKey, {
        departamento,
        provincia
      });
      logger.info(`📚 Conocimiento distrito: ${distrito} -> ${provincia}, ${departamento}`);
    }

    // Agregar provincia (incluso si no hay distrito)
    if (esValido(provincia) && esValido(departamento)) {
      const provinciaKey = provincia.toLowerCase().trim();
      if (!this.baseConocimiento.provincias.has(provinciaKey)) {
        this.baseConocimiento.provincias.set(provinciaKey, departamento);
        logger.info(`📚 Conocimiento provincia: ${provincia} -> ${departamento}`);
      }
    }
  }

  /**
   * Completar ubicación usando base de conocimiento
   */
  completarConConocimiento(ubicacion) {
    let { departamento, provincia, distrito } = ubicacion;
    let mejorado = false;

    const esIncompleto = (val) => !val || 
      val === 'Por Determinar' || 
      val === 'No Determinado' ||
      val === 'No especificado';

    // Si tenemos distrito, buscar provincia y departamento
    if (distrito && !esIncompleto(distrito)) {
      const distritoKey = distrito.toLowerCase();
      const conocimiento = this.baseConocimiento.distritos.get(distritoKey);
      
      if (conocimiento) {
        if (esIncompleto(provincia)) {
          provincia = conocimiento.provincia;
          mejorado = true;
          logger.info(`✨ Completado provincia de ${distrito}: ${provincia}`);
        }
        if (esIncompleto(departamento)) {
          departamento = conocimiento.departamento;
          mejorado = true;
          logger.info(`✨ Completado departamento de ${distrito}: ${departamento}`);
        }
      }
    }

    // Si tenemos provincia pero no departamento
    if (provincia && !esIncompleto(provincia) && esIncompleto(departamento)) {
      const provinciaKey = provincia.toLowerCase();
      const deptoConocido = this.baseConocimiento.provincias.get(provinciaKey);
      
      if (deptoConocido) {
        departamento = deptoConocido;
        mejorado = true;
        logger.info(`✨ Completado departamento de ${provincia}: ${departamento}`);
      }
    }

    if (mejorado) {
      return {
        ...ubicacion,
        departamento,
        provincia,
        distrito,
        nivel_confianza: 'Alto', // Actualizar confianza si se completó
        fuente_dato: 'Inferencia + Base de Conocimiento'
      };
    }

    return ubicacion;
  }

  /**
   * Solicitar a Gemini que complete datos faltantes usando contexto
   */
  async completarConIA(ubicacion, entidadNombre, descripcion) {
    try {
      const { departamento, provincia, distrito } = ubicacion;
      
      // Construir lista de ubicaciones conocidas para contexto
      const distritosConocidos = Array.from(this.baseConocimiento.distritos.entries())
        .slice(0, 30) // Aumentar ejemplos a 30
        .map(([dist, info]) => `${this.capitalizar(dist)}: ${info.provincia}, ${info.departamento}`)
        .join('\n');

      const provinciasConocidas = Array.from(this.baseConocimiento.provincias.entries())
        .slice(0, 20)
        .map(([prov, depto]) => `${this.capitalizar(prov)}: ${depto}`)
        .join('\n');

      const prompt = `Eres un experto en geografía administrativa del Perú. Tu tarea es completar información de ubicación faltante o incorrecta.

**DATOS ACTUALES DEL PROCESO:**
- Distrito: ${distrito || 'No disponible'}
- Provincia: ${provincia || 'No disponible'}
- Departamento: ${departamento || 'No disponible'}

**DATOS ORIGINALES DEL PROCESO (para contexto):**
- Entidad: ${entidadNombre.substring(0, 200)}
- Descripción: ${descripcion.substring(0, 500)}

**BASE DE CONOCIMIENTO - Ubicaciones detectadas en otros procesos:**

Distritos conocidos:
${distritosConocidos || 'No hay datos'}

Provincias conocidas:
${provinciasConocidas || 'No hay datos'}

**INSTRUCCIONES CRÍTICAS:**
1. Si tienes un DISTRITO válido (ej: "Andoas", "Socabaya"), DEBES completar su provincia y departamento
2. Si tienes una PROVINCIA válida, DEBES completar el departamento
3. Usa tu conocimiento geográfico de Perú + la base de conocimiento proporcionada
4. Si encuentras "Por Determinar" o valores incompletos, reemplázalos con datos correctos
5. Usa nombres en formato Título (Primera Letra Mayúscula)

**EJEMPLOS:**
- Si Distrito="Andoas" → Provincia="Datem Del Marañón", Departamento="Loreto"
- Si Distrito="Socabaya" → Provincia="Arequipa", Departamento="Arequipa"
- Si Distrito="Miraflores" → Provincia="Lima", Departamento="Lima"

Responde SOLO en formato JSON:
{
  "departamento": "string",
  "provincia": "string o null",
  "distrito": "string o null",
  "completado": true/false,
  "confianza": "Alto|Medio|Bajo"
}`;

      const respuesta = await generateText(prompt);
      let textoLimpio = respuesta.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const resultado = JSON.parse(textoLimpio);
      
      if (resultado.completado) {
        logger.info(`🤖 IA completó ubicación: ${resultado.distrito || distrito} -> ${resultado.provincia}, ${resultado.departamento}`);
        return {
          departamento: this.capitalizar(resultado.departamento) || departamento,
          provincia: this.capitalizar(resultado.provincia) || provincia,
          distrito: this.capitalizar(resultado.distrito) || distrito,
          nivel_confianza: 'Alto',
          fuente_dato: 'IA - Completado'
        };
      }
      
      return ubicacion;
      
    } catch (error) {
      logger.error(`❌ Error en completarConIA: ${error.message}`);
      
      // Si es error de API key o rate limit, propagar
      if (error.message.includes('API key') || error.message.includes('403') || error.message.includes('429') || error.message.includes('Forbidden')) {
        logger.error(`🚨 ERROR DE API EN FASE 2: ${error.message}`);
        throw error; // Propagar para que se detecte en el nivel superior
      }
      
      return ubicacion;
    }
  }

  /**
   * Determinar si una ubicación está incompleta o necesita mejora
   */
  necesitaMejora(proceso) {
    const valoresIncompletos = [
      null, 
      '', 
      'No especificado', 
      'Por Determinar', 
      'No Determinado',
      'Error'
    ];

    const deptoIncompleto = valoresIncompletos.includes(proceso.departamento);
    const provIncompleta = valoresIncompletos.includes(proceso.provincia);
    const distIncompleto = valoresIncompletos.includes(proceso.distrito);

    return deptoIncompleto || provIncompleta || distIncompleto;
  }

  /**
   * Inferir ubicación de procesos pendientes con sistema de doble pasada
   * Incluye procesos sin ubicación Y procesos con ubicación incompleta
   */
  async inferirUbicacionPendientes(operationId = null, limit = null) {
    const { ETLLog } = require('../models');
    let etlLog = null;

    try {
      // Limpiar base de conocimiento para esta operación
      this.baseConocimiento = {
        distritos: new Map(),
        provincias: new Map()
      };

      // Contar procesos que necesitan inferencia (sin ubicación O con ubicación incompleta)
      const totalProcesosPendientes = await Proceso.count({
        where: {
          [Op.or]: [
            { departamento: null },
            { departamento: '' },
            { departamento: 'No especificado' },
            { departamento: 'Por Determinar' },
            { departamento: 'No Determinado' },
            { departamento: 'Error' },
            { provincia: null },
            { provincia: '' },
            { provincia: 'No especificado' },
            { provincia: 'Por Determinar' },
            { provincia: 'No Determinado' },
            { provincia: 'Error' },
            { distrito: null },
            { distrito: '' },
            { distrito: 'No especificado' },
            { distrito: 'Por Determinar' },
            { distrito: 'No Determinado' },
            { distrito: 'Error' }
          ]
        }
      });

      const limiteFinal = limit || totalProcesosPendientes;

      // Crear registro de ETL
      if (operationId) {
        etlLog = await ETLLog.create({
          operation_type: 'UBICACION',
          operation_id: operationId,
          status: 'running',
          message: 'Iniciando inferencia de ubicación (Doble Pasada + Actualización)',
          paso_actual: 0,
          paso_total: limiteFinal * 2, // Doble porque son 2 pasadas
          porcentaje: 0,
          mensaje_actual: 'Fase 0: Identificando procesos que necesitan mejora...'
        });
      }

      // Obtener procesos que necesitan inferencia o mejora
      const procesosPendientes = await Proceso.findAll({
        where: {
          [Op.or]: [
            { departamento: null },
            { departamento: '' },
            { departamento: 'No especificado' },
            { departamento: 'Por Determinar' },
            { departamento: 'No Determinado' },
            { departamento: 'Error' },
            { provincia: null },
            { provincia: '' },
            { provincia: 'No especificado' },
            { provincia: 'Por Determinar' },
            { provincia: 'No Determinado' },
            { provincia: 'Error' },
            { distrito: null },
            { distrito: '' },
            { distrito: 'No especificado' },
            { distrito: 'Por Determinar' },
            { distrito: 'No Determinado' },
            { distrito: 'Error' }
          ]
        },
        limit: limiteFinal
      });

      logger.info(`🔄 Iniciando DOBLE PASADA para ${procesosPendientes.length} procesos...`);
      logger.info(`   - Procesos sin ubicación o con ubicación incompleta`);

      let procesados = 0;
      let exitosos = 0;
      let usaronIA = 0;
      let usaronFallback = 0;
      let actualizados = 0; // Procesos que ya tenían algo pero se mejoró
      const startTime = Date.now();

      // ============================================
      // PRIMERA PASADA: Inferencia inicial o actualización
      // ============================================
      logger.info('📍 FASE 1/2: Inferencia inicial y actualización...');
      
      const resultadosPrimeraVuelta = [];
      let lastKeyAlias = '';

      for (const proceso of procesosPendientes) {
        try {
          const tieneDatosAnteriores = proceso.departamento || proceso.provincia || proceso.distrito;
          
          if (procesados === 0) {
            logger.info(`📋 Ejemplo de proceso a inferir: ${proceso.id_proceso}`);
            logger.info(`   Entidad: ${(proceso.entidad_nombre || '').substring(0, 80)}`);
            logger.info(`   Datos actuales: D:${proceso.departamento || 'null'}, P:${proceso.provincia || 'null'}, Di:${proceso.distrito || 'null'}`);
          }
          
          // Inferir ubicación con IA (siempre, incluso si tiene datos parciales)
          const ubicacion = await this.inferirUbicacionConIA(proceso);
          if (ubicacion.keyAlias) lastKeyAlias = ubicacion.keyAlias;
          
          // Si tenía datos anteriores, verificar si se mejoró
          if (tieneDatosAnteriores) {
            const seActualizo = 
              (ubicacion.departamento && ubicacion.departamento !== proceso.departamento) ||
              (ubicacion.provincia && ubicacion.provincia !== proceso.provincia) ||
              (ubicacion.distrito && ubicacion.distrito !== proceso.distrito);
            
            if (seActualizo) {
              actualizados++;
              logger.info(`♻️ Actualizado: ${proceso.id_proceso} | ${proceso.departamento || '?'}/${proceso.provincia || '?'}/${proceso.distrito || '?'} → ${ubicacion.departamento}/${ubicacion.provincia || '?'}/${ubicacion.distrito || '?'}`);
            }
          }
          
          // Guardar para segunda pasada
          resultadosPrimeraVuelta.push({
            proceso,
            ubicacion,
            teniaDatos: tieneDatosAnteriores
          });

          // Agregar a base de conocimiento
          this.agregarConocimiento(ubicacion);
          
          if (ubicacion.nivel_confianza !== 'Bajo') {
            usaronIA++;
          } else {
            usaronFallback++;
          }
          
        } catch (error) {
          logger.error(`❌ Error procesando proceso ${proceso.id_proceso}: ${error.message}`);
          
          // Si es error crítico de API (key inválida), detener todo el proceso
          if (error.message.includes('API_KEY_ERROR') || error.message.includes('403') || error.message.includes('Forbidden')) {
            logger.error(`🚨 ERROR CRÍTICO DE API KEY - Deteniendo proceso de inferencia`);
            
            if (etlLog) {
              await etlLog.update({
                status: 'failed',
                message: `❌ ERROR CRÍTICO: API Key de Gemini inválida o revocada`,
                mensaje_actual: 'La API key fue reportada como filtrada o es inválida. Genera una nueva key en https://aistudio.google.com/app/apikey',
                porcentaje: Math.round((procesados / totalProcesosPendientes) * 100),
                error: error.message
              });
            }
            
            throw new Error('API_KEY_INVALIDA: La API key de Gemini fue revocada o es inválida. Por favor configura una nueva API key.');
          }
          
          // Para otros errores, continuar con fallback
          resultadosPrimeraVuelta.push({
            proceso,
            ubicacion: {
              departamento: 'Error',
              provincia: null,
              distrito: null,
              nivel_confianza: 'Bajo',
              fuente_dato: 'Error'
            },
            teniaDatos: false
          });
          usaronFallback++;
        }
        
        procesados++;

        // Actualizar progreso en ETL log
        if (etlLog && procesados % 5 === 0) {
          const porcentaje = Math.round((procesados / (procesosPendientes.length * 2)) * 100);
          await etlLog.update({
            paso_actual: procesados,
            porcentaje,
            mensaje_actual: `Fase 1/2: Procesando ${procesados} de ${procesosPendientes.length}... (Key: ${lastKeyAlias})`,
            updated_at: new Date()
          });
        }

        // Log cada 10 procesos
        if (procesados % 10 === 0) {
          logger.info(`Fase 1 - Progreso: ${procesados}/${procesosPendientes.length} procesos`);
        }
      }

      logger.info(`✅ Fase 1 completada. Base de conocimiento: ${this.baseConocimiento.distritos.size} distritos, ${this.baseConocimiento.provincias.size} provincias`);
      
      if (this.baseConocimiento.distritos.size > 0) {
        logger.info(`📚 Ejemplos de distritos en base: ${Array.from(this.baseConocimiento.distritos.keys()).slice(0, 5).join(', ')}`);
      }
      if (this.baseConocimiento.provincias.size > 0) {
        logger.info(`📚 Ejemplos de provincias en base: ${Array.from(this.baseConocimiento.provincias.keys()).slice(0, 5).join(', ')}`);
      }

      // ============================================
      // SEGUNDA PASADA: Completar datos faltantes
      // ============================================
      logger.info('🔍 FASE 2/2: Completando datos faltantes...');
      
      let mejorados = 0;
      let completadosConBase = 0;
      let completadosConIA = 0;

      for (let i = 0; i < resultadosPrimeraVuelta.length; i++) {
        const { proceso, ubicacion, teniaDatos } = resultadosPrimeraVuelta[i];
        
        try {
          let ubicacionFinal = { ...ubicacion };
          
          // Verificar si hay datos incompletos
          const valoresIncompletos = [
            'Por Determinar', 
            'No Determinado', 
            'No especificado',
            'Error',
            null,
            ''
          ];

          const deptoIncompleto = valoresIncompletos.includes(ubicacion.departamento);
          const provIncompleta = valoresIncompletos.includes(ubicacion.provincia);
          const distIncompleto = valoresIncompletos.includes(ubicacion.distrito);

          const tieneIncompletos = deptoIncompleto || provIncompleta || distIncompleto;

          // Intentar mejorar CUALQUIER dato incompleto
          if (tieneIncompletos) {
            // Prioridad 1: Completar con base de conocimiento (rápido)
            const ubicacionMejorada = this.completarConConocimiento(ubicacion);
            
            const mejoroDato = 
              ubicacionMejorada.departamento !== ubicacion.departamento || 
              ubicacionMejorada.provincia !== ubicacion.provincia ||
              ubicacionMejorada.distrito !== ubicacion.distrito;

            if (mejoroDato) {
              ubicacionFinal = ubicacionMejorada;
              mejorados++;
              completadosConBase++;
              logger.info(`📚 Completado con base: ${proceso.id_proceso} | ${ubicacion.distrito || '?'} → ${ubicacionMejorada.departamento}/${ubicacionMejorada.provincia}`);
            } else {
              // Prioridad 2: Completar con IA usando contexto completo (preciso)
              const entidadNombre = proceso.entidad_nombre || proceso.nombre_entidad || '';
              const descripcion = proceso.descripcion_objeto || proceso.objeto_contratacion || '';
              
              const ubicacionIA = await this.completarConIA(ubicacion, entidadNombre, descripcion);
              
              const mejoroDatoIA = 
                ubicacionIA.departamento !== ubicacion.departamento || 
                ubicacionIA.provincia !== ubicacion.provincia ||
                ubicacionIA.distrito !== ubicacion.distrito;

              if (mejoroDatoIA) {
                ubicacionFinal = ubicacionIA;
                mejorados++;
                completadosConIA++;
                logger.info(`🤖 Completado con IA Fase 2: ${proceso.id_proceso} | ${ubicacion.departamento || '?'}/${ubicacion.provincia || '?'}/${ubicacion.distrito || '?'} → ${ubicacionIA.departamento}/${ubicacionIA.provincia || '?'}/${ubicacionIA.distrito || '?'}`);
              }
            }
          }

          // Solo actualizar si realmente cambió algo
          const cambioReal = 
            ubicacionFinal.departamento !== proceso.departamento ||
            ubicacionFinal.provincia !== proceso.provincia ||
            ubicacionFinal.distrito !== proceso.distrito;

          if (cambioReal) {
            await proceso.update({
              departamento: ubicacionFinal.departamento,
              provincia: ubicacionFinal.provincia,
              distrito: ubicacionFinal.distrito
            });
            
            if (teniaDatos) {
              logger.debug(`♻️ Mejorado: ${proceso.id_proceso} | ${proceso.departamento || '?'}/${proceso.provincia || '?'}/${proceso.distrito || '?'} → ${ubicacionFinal.departamento}/${ubicacionFinal.provincia || '?'}/${ubicacionFinal.distrito || '?'}`);
            }
          }
          
          exitosos++;
          
        } catch (error) {
          logger.error(`❌ Error en fase 2 para proceso ${proceso.id_proceso}: ${error.message}`);
          
          // Si es error crítico de API, detener Fase 2
          if (error.message.includes('API key') || error.message.includes('403') || error.message.includes('429')) {
            logger.error(`🚨 ERROR DE API EN FASE 2 - Continuando sin completar más datos`);
            
            if (etlLog) {
              await etlLog.update({
                mensaje_actual: `⚠️ Fase 2 interrumpida por error de API (procesados: ${i}/${resultadosPrimeraVuelta.length})`
              });
            }
            
            // No propagar el error, solo detener la Fase 2
            break;
          }
        }
        
        procesados++;

        // Actualizar progreso en ETL log
        if (etlLog && procesados % 5 === 0) {
          const porcentaje = Math.round((procesados / (procesosPendientes.length * 2)) * 100);
          await etlLog.update({
            paso_actual: procesados,
            porcentaje,
            mensaje_actual: `Fase 2/2: Completando ${i + 1} de ${resultadosPrimeraVuelta.length}...`,
            updated_at: new Date()
          });
        }

        // Log cada 10 procesos
        if ((i + 1) % 10 === 0) {
          logger.info(`Fase 2 - Progreso: ${i + 1}/${resultadosPrimeraVuelta.length} procesos`);
        }
      }

      const duration = Date.now() - startTime;

      logger.info(`✅ DOBLE PASADA completada:`);
      logger.info(`   - Total procesados: ${exitosos}`);
      logger.info(`   - Procesos actualizados (tenían datos): ${actualizados}`);
      logger.info(`   - Usaron IA (Fase 1): ${usaronIA}`);
      logger.info(`   - Usaron Fallback (Fase 1): ${usaronFallback}`);
      logger.info(`   - Mejorados en Fase 2: ${mejorados}`);
      logger.info(`   - Completados con Base de Conocimiento: ${completadosConBase}`);
      logger.info(`   - Completados con IA (Fase 2): ${completadosConIA}`);

      // Actualizar ETL log con resultado final
      if (etlLog) {
        await etlLog.update({
          status: 'completed',
          message: `Inferencia de ubicación completada con doble pasada: ${exitosos} procesos (${actualizados} actualizados)`,
          paso_actual: procesosPendientes.length * 2,
          paso_total: procesosPendientes.length * 2,
          porcentaje: 100,
          mensaje_actual: 'Inferencia finalizada exitosamente (2 pasadas + actualizaciones)',
          process_count: exitosos,
          duration_ms: duration,
          details: {
            usaronIA,
            usaronFallback,
            actualizados,
            mejorados,
            completadosConBase,
            completadosConIA,
            totalPendientes: totalProcesosPendientes,
            baseConocimiento: {
              distritos: this.baseConocimiento.distritos.size,
              provincias: this.baseConocimiento.provincias.size
            }
          }
        });
      }

      return { 
        success: true,
        procesados: procesosPendientes.length, 
        total: procesosPendientes.length,
        totalPendientes: totalProcesosPendientes,
        exitosos,
        actualizados,
        usaronIA,
        usaronFallback,
        mejorados,
        completadosConBase,
        completadosConIA,
        duration_ms: duration,
        operation_id: operationId
      };
    } catch (error) {
      logger.error(`Error en inferirUbicacionPendientes: ${error.message}`);
      
      if (etlLog) {
        await etlLog.update({
          status: 'failed',
          message: `Error en inferencia de ubicación: ${error.message}`,
          error: error.stack
        });
      }
      
      throw error;
    }
  }

  /**
   * Obtener estadísticas de ubicación
   */
  async getEstadisticasUbicacion() {
    try {
      const total = await Proceso.count();
      
      const conUbicacion = await Proceso.count({
        where: {
          departamento: { 
            [Op.and]: [
              { [Op.ne]: null },
              { [Op.ne]: '' },
              { [Op.ne]: 'No especificado' },
              { [Op.ne]: 'No Determinado' }
            ]
          }
        }
      });

      const porDepartamento = await Proceso.findAll({
        attributes: [
          'departamento',
          [Proceso.sequelize.fn('COUNT', Proceso.sequelize.col('id')), 'total']
        ],
        where: {
          departamento: { 
            [Op.and]: [
              { [Op.ne]: null },
              { [Op.ne]: '' },
              { [Op.ne]: 'No especificado' },
              { [Op.ne]: 'No Determinado' }
            ]
          }
        },
        group: ['departamento'],
        order: [[Proceso.sequelize.fn('COUNT', Proceso.sequelize.col('id')), 'DESC']],
        limit: 25,
        raw: true
      });

      return {
        total,
        conUbicacion,
        sinUbicacion: total - conUbicacion,
        porcentajeCompletado: total > 0 ? ((conUbicacion / total) * 100).toFixed(2) : 0,
        porDepartamento: porDepartamento.map(stat => ({
          departamento: stat.departamento,
          total: parseInt(stat.total)
        }))
      };
    } catch (error) {
      logger.error(`Error en getEstadisticasUbicacion: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new UbicacionService();
