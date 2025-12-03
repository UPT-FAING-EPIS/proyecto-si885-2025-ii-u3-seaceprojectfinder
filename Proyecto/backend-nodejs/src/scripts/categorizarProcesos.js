/**
 * Script para categorizar procesos existentes
 * Ejecutar: node src/scripts/categorizarProcesos.js
 */
const { Proceso } = require('../models');
const categorizacionService = require('../services/categorizacionService');
const logger = require('../config/logger');

async function categorizarTodosLosProcesos() {
  try {
    console.log('🚀 Iniciando categorización de procesos...\n');

    // Contar procesos sin categoría
    const totalSinCategoria = await Proceso.count({
      where: {
        categoria_proyecto: null
      }
    });

    console.log(`📊 Total de procesos sin categoría: ${totalSinCategoria}\n`);

    if (totalSinCategoria === 0) {
      console.log('✅ Todos los procesos ya tienen categoría asignada');
      return;
    }

    // Procesar en lotes de 100
    const batchSize = 100;
    let totalProcesados = 0;
    let batch = 1;

    while (totalProcesados < totalSinCategoria) {
      console.log(`\n📦 Procesando lote ${batch} (${batchSize} procesos)...`);
      
      const resultado = await categorizacionService.categorizarProcesosPendientes(batchSize);
      
      totalProcesados += resultado.procesados;
      
      console.log(`  ✓ Procesados: ${resultado.procesados}`);
      console.log(`  ✓ Keywords: ${resultado.usaronKeywords}`);
      console.log(`  ✓ IA: ${resultado.usaronIA}`);
      console.log(`  📈 Progreso total: ${totalProcesados}/${totalSinCategoria} (${Math.round(totalProcesados/totalSinCategoria*100)}%)`);
      
      batch++;
      
      // Evitar saturar la API de IA
      if (resultado.usaronIA > 0) {
        console.log('  ⏳ Esperando 2 segundos antes del siguiente lote...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log('\n✅ Categorización completada!');
    
    // Mostrar estadísticas finales
    const stats = await categorizacionService.getEstadisticasCategorias();
    
    console.log('\n📊 Estadísticas por Categoría:');
    console.log('─'.repeat(70));
    console.log(`${'Categoría'.padEnd(35)} ${'Procesos'.padEnd(15)} Monto Total`);
    console.log('─'.repeat(70));
    
    stats.forEach(stat => {
      const montoFormateado = `S/ ${(stat.monto_total / 1_000_000).toFixed(2)}M`;
      console.log(`${stat.nombre.padEnd(35)} ${stat.total.toString().padEnd(15)} ${montoFormateado}`);
    });
    
    console.log('─'.repeat(70));
    
  } catch (error) {
    console.error('❌ Error en categorización:', error.message);
    logger.error(`Error en categorizarTodosLosProcesos: ${error.message}`);
    throw error;
  } finally {
    // Cerrar conexión de BD
    await Proceso.sequelize.close();
    console.log('\n👋 Conexión a BD cerrada');
  }
}

// Ejecutar script
if (require.main === module) {
  categorizarTodosLosProcesos()
    .then(() => {
      console.log('\n🎉 Script completado exitosamente');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { categorizarTodosLosProcesos };
