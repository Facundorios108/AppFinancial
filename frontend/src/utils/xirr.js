/**
 * XIRR (Extended Internal Rate of Return) Calculator
 * Calcula la tasa interna de retorno con fechas variables, método estándar de fondos profesionales
 * 
 * @author Financial Portfolio App
 * @version 1.0.0
 */

/**
 * Calcula XIRR usando el método Newton-Raphson para encontrar la tasa que hace NPV = 0
 * 
 * @param {Array} cashFlows - Array de objetos con formato: [{fecha: "YYYY-MM-DD", monto: number}]
 * @param {number} guess - Estimación inicial de la tasa (por defecto 0.1 = 10%)
 * @param {number} maxIterations - Máximo número de iteraciones (por defecto 100)
 * @param {number} tolerance - Tolerancia para convergencia (por defecto 1e-6)
 * @returns {number} Tasa anualizada como decimal (0.15 = 15%)
 * @throws {Error} Si no converge o hay errores en los datos
 * 
 * @example
 * const flujos = [
 *   { fecha: "2022-07-01", monto: -10000 },  // Inversión inicial
 *   { fecha: "2023-03-10", monto: -5000 },   // Aporte adicional
 *   { fecha: "2024-12-01", monto: 2000 },    // Retiro parcial
 *   { fecha: "2025-07-19", monto: 18500 }    // Valor actual del portfolio
 * ];
 * const tasaAnual = calculateXIRR(flujos);
 * console.log(`Rendimiento anualizado: ${(tasaAnual * 100).toFixed(2)}%`);
 */
export function calculateXIRR(cashFlows, guess = 0.1, maxIterations = 100, tolerance = 1e-6) {
    // 1. Validaciones de entrada
    if (!Array.isArray(cashFlows) || cashFlows.length < 2) {
        throw new Error('XIRR requiere al menos 2 flujos de efectivo');
    }

    // 2. Validar y procesar los flujos de efectivo
    const processedFlows = cashFlows.map((flow, index) => {
        if (!flow.fecha || typeof flow.monto !== 'number') {
            throw new Error(`Flujo ${index + 1}: requiere 'fecha' (string) y 'monto' (number)`);
        }

        const date = new Date(flow.fecha);
        if (isNaN(date.getTime())) {
            throw new Error(`Flujo ${index + 1}: fecha inválida '${flow.fecha}'`);
        }

        return {
            date: date,
            amount: flow.monto,
            originalIndex: index
        };
    });

    // 3. Ordenar flujos por fecha (requerido para XIRR)
    processedFlows.sort((a, b) => a.date.getTime() - b.date.getTime());

    // 4. Validar que hay flujos positivos y negativos
    const hasPositive = processedFlows.some(f => f.amount > 0);
    const hasNegative = processedFlows.some(f => f.amount < 0);
    
    if (!hasPositive || !hasNegative) {
        throw new Error('XIRR requiere al menos un flujo positivo y uno negativo');
    }

    // 5. Usar la primera fecha como referencia (fecha 0)
    const baseDate = processedFlows[0].date;

    // 6. Calcular días transcurridos desde la fecha base para cada flujo
    const flowsWithDays = processedFlows.map(flow => ({
        amount: flow.amount,
        days: (flow.date.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24),
        years: (flow.date.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    }));

    /**
     * Calcula el Valor Presente Neto (NPV) para una tasa dada
     * NPV = Σ(Flujo_i / (1 + tasa)^años_i)
     */
    function calculateNPV(rate) {
        return flowsWithDays.reduce((npv, flow) => {
            if (flow.years === 0) {
                // Primer flujo (fecha base) no se descuenta
                return npv + flow.amount;
            }
            return npv + (flow.amount / Math.pow(1 + rate, flow.years));
        }, 0);
    }

    /**
     * Calcula la derivada del NPV (requerida para Newton-Raphson)
     * dNPV/dr = Σ(-años_i * Flujo_i / (1 + tasa)^(años_i + 1))
     */
    function calculateNPVDerivative(rate) {
        return flowsWithDays.reduce((derivative, flow) => {
            if (flow.years === 0) {
                // Primer flujo no contribuye a la derivada
                return derivative;
            }
            return derivative - (flow.years * flow.amount / Math.pow(1 + rate, flow.years + 1));
        }, 0);
    }

    // 7. Algoritmo Newton-Raphson para encontrar la tasa donde NPV = 0
    let rate = guess;
    let iteration = 0;

    while (iteration < maxIterations) {
        const npv = calculateNPV(rate);
        const npvDerivative = calculateNPVDerivative(rate);

        // Verificar convergencia
        if (Math.abs(npv) < tolerance) {
            return rate; // Converged!
        }

        // Verificar que la derivada no sea cero (evitar división por cero)
        if (Math.abs(npvDerivative) < tolerance) {
            throw new Error(`XIRR no converge: derivada demasiado pequeña en iteración ${iteration + 1}`);
        }

        // Actualizar tasa usando Newton-Raphson: x_nuevo = x_viejo - f(x)/f'(x)
        const newRate = rate - (npv / npvDerivative);

        // Limitar la tasa a rangos razonables (-99% a +1000% anual)
        const clampedRate = Math.max(-0.99, Math.min(10.0, newRate));

        // Verificar si el cambio es suficientemente pequeño
        if (Math.abs(clampedRate - rate) < tolerance) {
            return clampedRate;
        }

        rate = clampedRate;
        iteration++;
    }

    // 8. Si llegamos aquí, no convergió
    throw new Error(`XIRR no converge después de ${maxIterations} iteraciones. NPV final: ${calculateNPV(rate).toFixed(6)}`);
}

/**
 * Función helper para convertir el resultado XIRR a porcentaje formateado
 * 
 * @param {Array} cashFlows - Mismo formato que calculateXIRR
 * @returns {number} Porcentaje redondeado a 2 decimales
 * 
 * @example
 * const rendimiento = getXIRRAsPercentage(flujos);
 * console.log(`${rendimiento}%`); // "15.47%"
 */
export function getXIRRAsPercentage(cashFlows) {
    try {
        const rate = calculateXIRR(cashFlows);
        return Math.round(rate * 10000) / 100; // Redondear a 2 decimales
    } catch (error) {
        console.error('Error calculando XIRR:', error.message);
        return null;
    }
}

/**
 * Función helper para validar y preparar flujos de efectivo desde transacciones del portfolio
 * 
 * @param {Array} cashFlowsInput - Array de flujos ya preparados: [{date: string, amount: number}]
 * @param {number} currentValue - Valor actual total del portfolio
 * @returns {Array} Flujos formateados para XIRR
 */
export function preparePortfolioCashFlows(cashFlowsInput, currentValue) {
    if (!Array.isArray(cashFlowsInput)) {
        throw new Error('cashFlowsInput debe ser un array');
    }

    if (typeof currentValue !== 'number' || currentValue < 0) {
        throw new Error('Valor actual debe ser un número positivo');
    }

    console.log('📝 Preparing cash flows:', {
        inputFlows: cashFlowsInput.length,
        currentValue: currentValue
    });

    // Convertir flujos al formato XIRR (los montos ya vienen con el signo correcto)
    const flows = cashFlowsInput.map(flow => {
        const formattedDate = flow.date instanceof Date ? flow.date.toISOString().split('T')[0] : flow.date;
        console.log(`  Flow: ${formattedDate} → $${flow.amount}`);
        return {
            fecha: formattedDate,
            monto: flow.amount // Mantener el signo original: negativo para inversiones, positivo para retiros
        };
    });

    // Agregar valor actual como flujo positivo en fecha de hoy
    const today = new Date().toISOString().split('T')[0];
    flows.push({
        fecha: today,
        monto: currentValue
    });
    
    console.log(`  Current Value: ${today} → $${currentValue}`);

    return flows;
}

/**
 * Función principal para calcular XIRR del portfolio completo
 * 
 * @param {Array} cashFlows - Flujos de efectivo ya preparados con signos correctos
 * @param {number} currentPortfolioValue - Valor actual total (acciones + efectivo)
 * @returns {number|null} Rendimiento anualizado como porcentaje, o null si hay error
 */
export function calculatePortfolioXIRR(cashFlows, currentPortfolioValue) {
    try {
        // Validación básica
        if (!cashFlows || cashFlows.length === 0) {
            console.warn('No hay flujos de efectivo para calcular XIRR');
            return null;
        }

        if (!currentPortfolioValue || currentPortfolioValue <= 0) {
            console.warn('Valor actual del portfolio inválido:', currentPortfolioValue);
            return null;
        }

        // Validar que haya suficiente tiempo transcurrido (mínimo 60 días)
        const dates = cashFlows.map(f => new Date(f.date)).sort((a, b) => a - b);
        const oldestDate = dates[0];
        const today = new Date();
        const daysDiff = (today - oldestDate) / (1000 * 60 * 60 * 24);
        
        console.log('🔍 Preparando flujos para XIRR:', {
            numberOfFlows: cashFlows.length,
            currentValue: currentPortfolioValue,
            oldestDate: oldestDate.toISOString().split('T')[0],
            daysSinceOldest: Math.floor(daysDiff),
            flows: cashFlows
        });

        // Si ha pasado menos de 60 días, no calcular XIRR
        if (daysDiff < 60) {
            console.warn(`⏰ Periodo muy corto para XIRR: ${Math.floor(daysDiff)} días (mínimo: 60 días)`);
            return null;
        }

        const formattedFlows = preparePortfolioCashFlows(cashFlows, currentPortfolioValue);
        
        console.log('📋 Flujos formateados:', formattedFlows);
        
        const result = getXIRRAsPercentage(formattedFlows);
        
        // Validar que el resultado sea razonable (-100% a 500%)
        if (result !== null && (result < -100 || result > 500)) {
            console.warn('⚠️ XIRR result seems unrealistic:', result, '% - Returning null');
            return null;
        }
        
        return result;
    } catch (error) {
        console.error('❌ Error calculando XIRR del portfolio:', error.message);
        console.error('Stack:', error.stack);
        return null;
    }
}

// Exportación por defecto
export default {
    calculateXIRR,
    getXIRRAsPercentage,
    preparePortfolioCashFlows,
    calculatePortfolioXIRR
};
