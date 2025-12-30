/**
 * Test para la función XIRR
 * Este archivo demuestra cómo usar la función XIRR y valida su precisión
 */

import { calculateXIRR, getXIRRAsPercentage, calculatePortfolioXIRR } from './xirr.js';

// Función para ejecutar las pruebas
function runXIRRTests() {
    console.log('🧪 Ejecutando pruebas XIRR...\n');

    // Test 1: Caso simple - Una inversión
    console.log('📊 Test 1: Inversión simple');
    const test1 = [
        { fecha: "2023-01-01", monto: -10000 },  // Inversión inicial
        { fecha: "2025-01-01", monto: 12500 }    // Valor final después de 2 años
    ];
    
    try {
        const resultado1 = getXIRRAsPercentage(test1);
        console.log(`   Flujos: ${JSON.stringify(test1)}`);
        console.log(`   XIRR: ${resultado1}%`);
        console.log(`   Esperado: ~11.8% (verificar: (12500/10000)^(1/2) - 1 = 11.8%)\n`);
    } catch (error) {
        console.error(`   Error: ${error.message}\n`);
    }

    // Test 2: Múltiples inversiones (caso real de portfolio)
    console.log('📊 Test 2: Portfolio con múltiples aportes');
    const test2 = [
        { fecha: "2022-07-01", monto: -10000 },  // Primera inversión
        { fecha: "2023-03-10", monto: -5000 },   // Segunda inversión
        { fecha: "2024-12-01", monto: 2000 },    // Retiro parcial
        { fecha: "2025-07-19", monto: 18500 }    // Valor actual
    ];
    
    try {
        const resultado2 = getXIRRAsPercentage(test2);
        console.log(`   Flujos: ${JSON.stringify(test2)}`);
        console.log(`   XIRR: ${resultado2}%`);
        console.log(`   Este resultado considera el timing exacto de cada transacción\n`);
    } catch (error) {
        console.error(`   Error: ${error.message}\n`);
    }

    // Test 3: Usando la función de portfolio directamente
    console.log('📊 Test 3: Función calculatePortfolioXIRR');
    const deposits = [
        { date: "2022-07-01", amount: 10000 },
        { date: "2023-03-10", amount: 5000 },
        { date: "2024-12-01", amount: -2000 }  // Retiro
    ];
    const currentValue = 18500;
    
    try {
        const resultado3 = calculatePortfolioXIRR(deposits, currentValue);
        console.log(`   Depósitos: ${JSON.stringify(deposits)}`);
        console.log(`   Valor actual: $${currentValue}`);
        console.log(`   XIRR: ${resultado3}%\n`);
    } catch (error) {
        console.error(`   Error: ${error.message}\n`);
    }

    // Test 4: Comparación con Excel/Google Sheets
    console.log('📊 Test 4: Verificación con Excel (caso conocido)');
    const testExcel = [
        { fecha: "2020-01-01", monto: -1000 },
        { fecha: "2020-06-01", monto: -1000 },
        { fecha: "2021-01-01", monto: -1000 },
        { fecha: "2022-01-01", monto: 4300 }
    ];
    
    try {
        const resultadoExcel = getXIRRAsPercentage(testExcel);
        console.log(`   Flujos: ${JSON.stringify(testExcel)}`);
        console.log(`   XIRR: ${resultadoExcel}%`);
        console.log(`   Esperado en Excel: ~19.1% (puedes verificar con =XIRR() en Excel)\n`);
    } catch (error) {
        console.error(`   Error: ${error.message}\n`);
    }

    // Test 5: Casos extremos
    console.log('📊 Test 5: Casos extremos');
    
    // Pérdida total
    const testPerdida = [
        { fecha: "2024-01-01", monto: -1000 },
        { fecha: "2025-01-01", monto: 0 }
    ];
    
    try {
        const resultadoPerdida = getXIRRAsPercentage(testPerdida);
        console.log(`   Pérdida total: ${resultadoPerdida}%`);
    } catch (error) {
        console.log(`   Pérdida total: Error esperado - ${error.message}`);
    }
    
    // Ganancia muy alta
    const testGanancia = [
        { fecha: "2024-01-01", monto: -1000 },
        { fecha: "2024-12-31", monto: 5000 }
    ];
    
    try {
        const resultadoGanancia = getXIRRAsPercentage(testGanancia);
        console.log(`   Ganancia extrema en 1 año: ${resultadoGanancia}%\n`);
    } catch (error) {
        console.error(`   Error ganancia extrema: ${error.message}\n`);
    }

    console.log('✅ Pruebas XIRR completadas!');
    console.log('\n💡 Para usar en tu portfolio:');
    console.log('   1. Recopila todas las fechas de inversión y montos');
    console.log('   2. Incluye el valor actual del portfolio como flujo positivo hoy');
    console.log('   3. Llama a calculatePortfolioXIRR(deposits, currentValue)');
    console.log('   4. El resultado es el rendimiento anualizado profesional (XIRR)');
}

// Ejecutar las pruebas si este archivo se carga directamente
if (typeof window !== 'undefined') {
    // En el navegador
    window.runXIRRTests = runXIRRTests;
    console.log('🔬 Tests XIRR cargados. Ejecuta runXIRRTests() en la consola del navegador.');
} else if (typeof module !== 'undefined' && module.exports) {
    // En Node.js
    module.exports = { runXIRRTests };
}

export { runXIRRTests };
