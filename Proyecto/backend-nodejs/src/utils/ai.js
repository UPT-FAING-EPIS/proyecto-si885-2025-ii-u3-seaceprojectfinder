/**
 * Utilidad de IA (Gemini) para el chatbot
 * Soporta rotación de claves y manejo de errores
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../config/logger');
const configService = require('../services/configService');
const apiKeyService = require('../services/apiKeyService');

async function getModelName() {
  const dbModel = await configService.get('gemini_model');
  const envModel = process.env.GEMINI_MODEL || process.env.GOOGLE_GEMINI_MODEL;
  return dbModel || envModel || 'gemini-2.5-flash';
}

/**
 * Ejecuta una operación con rotación automática de claves
 */
async function executeWithRotation(operationFn, operationType = 'unknown') {
  let lastError = null;
  const MAX_ATTEMPTS = 10; 

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    // Obtener clave activa (DB)
    let keyInfo = await apiKeyService.getActiveKey();
    
    if (!keyInfo) {
        if (i === 0) throw new Error('No hay API Keys configuradas en el Pool. Por favor agregue una clave en el panel de administración.');
        throw lastError || new Error('Todas las claves disponibles han fallado o excedido su cuota.');
    }

    try {
      const client = new GoogleGenerativeAI(keyInfo.key);
      const modelName = await getModelName();
      const model = client.getGenerativeModel({ model: modelName });

      const text = await operationFn(model);
      
      // Si tuvimos éxito, registramos el uso exitoso
      await apiKeyService.logUsage(keyInfo.id, operationType, true);

      // Retornamos el texto y el alias usado
      return { text, keyAlias: keyInfo.alias };

    } catch (error) {
      lastError = error;
      logger.warn(`[AI Rotation] Falló clave '${keyInfo.alias}': ${error.message}`);

      // Reportar error para que el servicio marque la clave si es necesario (Quota, etc) y loguee el fallo
      const isRecoverable = await apiKeyService.reportError(keyInfo.id, error, operationType);

      // Si no es un error recuperable (ej. error de sintaxis del prompt 400), lanzamos
      if (!isRecoverable && (error.message.includes('400') || error.message.includes('INVALID_ARGUMENT'))) {
        throw error;
      }
      
      // Si es recuperable (429, 500, etc), el loop continuará con la siguiente clave
    }
  }
  
  throw lastError || new Error('Se agotaron todas las API Keys disponibles');
}

/**
 * Genera texto usando Gemini AI
 */
async function generateText(prompt) {
  try {
    const { text, keyAlias } = await executeWithRotation(async (model) => {
      const result = await model.generateContent(prompt);
      const txt = result?.response?.text?.() || result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!txt) throw new Error('Respuesta vacía de Gemini');
      return txt.trim();
    }, 'text_generation'); // Default type for generic text gen

    logger.info(`generateText completado usando: ${keyAlias}`);
    return { text, keyAlias };
  } catch (error) {
    logger.error(`❌ Gemini generateText ERROR: ${error.message}`);
    throw new Error(`[GEMINI FALLÓ] ${error.message}`);
  }
}

/**
 * Genera una respuesta para el chatbot con contexto
 */
async function generateChatResponse(userQuery, context = {}) {
  try {
    const { text, keyAlias } = await executeWithRotation(async (model) => {
      // ... (código de prompt building igual que antes) ...
      const processes = Array.isArray(context.processes) ? context.processes : [];
      const metadata = context.metadata || {};
      const userContext = context.userContext || null;

      const processesText = processes.map((p, i) => {
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const procesoUrl = `${baseUrl}/process/${p.id}`;
        const montoDisplay = p.montoFormateado ? p.montoFormateado : `${p.monto || 'N/A'} ${p.moneda || 'Soles'}`;
        const escalaInfo = p.escala ? ` [ESCALA: ${p.escala.toUpperCase()}]` : '';
        return `(${i + 1}) ${p.nomenclatura || p.descripcion || 'Proceso'} | entidad: ${p.entidad} | tipo: ${p.tipo} | objeto: ${p.objeto_contratacion || 'N/A'} | monto: ${montoDisplay}${escalaInfo} | fecha: ${p.fecha || ''} | URL_COMPLETA: ${procesoUrl}`;
      }).join('\n');

      const userContextText = userContext ? [
        '',
        '[CONTEXTO DEL USUARIO]',
        `- Especialidad: ${userContext.especialidad}`,
        `- Tecnologías: ${userContext.tecnologias}`,
        `- Tamaño empresa: ${userContext.tamano_empresa}`,
        `- Regiones foco: ${userContext.regiones_foco}`,
        `- Monto preferido: ${userContext.monto_preferido}`,
        `- Proyectos preferidos: ${userContext.proyectos_preferidos}`,
        '',
        'Usa este contexto para personalizar la respuesta, destacando procesos que coincidan con el expertise del usuario.',
        ''
      ].join('\n') : '';

      const usedFallback = metadata.usedFallback || false;
      const fallbackMessage = metadata.fallbackMessage || '';
      const busquedaPorPatron = metadata.busquedaPorPatron || false;
      const procesosAgrupados = metadata.procesosAgrupados || null;

      let patronSection = '';
      if (busquedaPorPatron && procesosAgrupados) {
        patronSection = [
          '⚠️ **IMPORTANTE:** Se encontraron procesos en diferentes escalas monetarias:',
          procesosAgrupados.millones > 0 ? `- 💰 ${procesosAgrupados.millones} proceso(s) en **MILLONES** (más probable)` : '',
          procesosAgrupados.miles > 0 ? `- 💵 ${procesosAgrupados.miles} proceso(s) en **MILES**` : '',
          procesosAgrupados.cientos > 0 ? `- 💳 ${procesosAgrupados.cientos} proceso(s) en **CIENTOS**` : '',
          procesosAgrupados.unidades > 0 ? `- 🪙 ${procesosAgrupados.unidades} proceso(s) en **UNIDADES**` : '',
          '',
          '**Agrupé los resultados por escala. Los procesos en MILLONES suelen ser los más comunes en SEACE.**',
          ''
        ].filter(line => line !== '').join('\n');
      }

      const prompt = [
        'Actúa como asistente experto en contratación pública peruana (SEACE).',
        'Responde de forma estructurada y profesional.',
        '',
        '## 🔍 Resultado de Búsqueda',
        busquedaPorPatron ? '[Indica que encontraste procesos en diferentes escalas monetarias]' : (usedFallback ? fallbackMessage : '[Breve resumen de lo encontrado]'),
        '',
        patronSection,
        usedFallback && !busquedaPorPatron ? '⚠️ **Nota importante:** Los criterios completos no arrojaron resultados, por lo que se muestran procesos basados únicamente en tu especialidad.' : '',
        '',
        busquedaPorPatron ? '### 📊 Procesos Agrupados por Escala (ordenados por relevancia):' : '### 📄 Procesos Relevantes:',
        busquedaPorPatron ? 'Agrupa los procesos por escala (MILLONES primero, luego MILES, etc.) y para cada uno usa este formato:' : 'Para cada proceso relevante, usa este formato:',
        '• **[Nomenclatura]** - [Breve descripción]',
        '  - Entidad: [nombre]',
        busquedaPorPatron ? '  - Monto: [monto formateado con su escala - ej: "12.70 millones de Soles"]' : '  - Monto: [monto] [moneda]',
        '  - Tipo: [tipo]',
        '  - [Ver proceso](URL_COMPLETA)',
        '',
        busquedaPorPatron ? '💡 **Consejo:** Revisa primero los procesos en MILLONES, ya que son los más comunes en contratación pública.' : '',
        '',
        '⚠️ IMPORTANTE: Usa los URLS EXACTOS de los procesos listados abajo. NO los modifiques.',
        '',
        userContextText,
        'Si el usuario tiene perfil completado, SIEMPRE prioriza procesos que coincidan con su especialidad y regiones.',
        'Si la consulta es genérica, muestra procesos variados pero relevantes.',
        '',
        `Consulta del usuario: ${userQuery}`,
        '',
        'Contexto de procesos disponibles:',
        processesText || '(Sin procesos relevantes encontrados)',
        '',
        '### 💡 Recomendaciones',
        busquedaPorPatron ? '[Sugiere al usuario que especifique mejor la escala si busca algo más específico]' : (usedFallback ? '[Sugiere al usuario ampliar criterios o revisar sus preferencias]' : '[Consejos para participar o afinar la búsqueda]')
      ].join('\n');

      const result = await model.generateContent(prompt);
      const txt = result?.response?.text?.() || result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!txt) throw new Error('Respuesta vacía de Gemini');
      return txt.trim();
    }, 'chatbot'); // Operation Type: chatbot

    // Append footer with used key alias
    return `${text}\n\n---\n*ApiKey en uso: ${keyAlias}*`;
    
  } catch (error) {
    logger.error(`❌ Gemini Chat Response ERROR: ${error.message}`);
    throw new Error(`[GEMINI FALLÓ] ${error.message}`);
  }
}

// Backward compatibility helper if needed, or simple wrapper
async function getClient() {
  // NOTE: This is legacy and doesn't support rotation easily for callers who keep the client.
  // New code should use generateText/generateChatResponse.
  // But for backward compatibility, we return a client with the CURRENT active key.
  const keyInfo = await apiKeyService.getActiveKey();
  if (keyInfo) return new GoogleGenerativeAI(keyInfo.key);
  
  const legacyKey = await configService.get('google_api_key', { decrypt: true }) || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!legacyKey) throw new Error('No API Key available');
  return new GoogleGenerativeAI(legacyKey);
}

module.exports = {
  generateText,
  generateChatResponse,
  getModelName,
  getClient // Deprecated but kept for compatibility
};
