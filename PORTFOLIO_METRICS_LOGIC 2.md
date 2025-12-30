# 📊 Lógica de Métricas del Portfolio

## Resumen de Correcciones Implementadas

Este documento explica la lógica correcta de cada métrica mostrada en el dashboard y las correcciones realizadas.

---

## 🎯 Métricas del Dashboard

### 1. **Portfolio Value (Current Value)** ✅
**Fórmula:**
```
Current Value = Valor de Acciones + Available Cash
```

**Explicación:**
- Muestra el valor total actual de tu portfolio
- Incluye el valor de mercado de todas tus acciones + el efectivo disponible
- Este es el dinero que tendrías si venderías todo hoy

**Estado:** ✅ **CORRECTO** desde el inicio

---

### 2. **Total Invested** ✅ (CORREGIDO)
**Fórmula ANTERIOR (❌ INCORRECTA):**
```
Total Invested = Suma de todas las compras de acciones
```

**Fórmula NUEVA (✅ CORRECTA):**
```
Total Invested = Suma de compras de acciones + Available Cash
```

**Explicación:**
- Representa TODO el capital que has aportado al portfolio
- Si depositaste $10,000 y compraste acciones por $8,000, tu "Total Invested" es $10,000
- El efectivo disponible ($2,000) es parte de tu inversión total, solo que no está en acciones
- **Esto es crucial para calcular correctamente el P/L y el retorno**

**Por qué era incorrecto antes:**
- Solo contaba el dinero en acciones
- Si tenías $1,000 en efectivo, no se contaba como parte de tu inversión
- Esto hacía que el P/L y retorno parecieran mejores de lo que realmente eran

---

### 3. **Total P/L (Profit/Loss)** ✅ (CORREGIDO)
**Fórmula ANTERIOR (❌ INCORRECTA):**
```
Total P/L = Valor de Acciones - Total Invertido en Acciones
```

**Fórmula NUEVA (✅ CORRECTA):**
```
Total P/L = (Valor de Acciones + Available Cash) - Total Invested
Total P/L = Current Value - Total Invested
```

**Ejemplo práctico:**
- Depositaste: $10,000
- Compraste acciones: $8,000
- Valor actual de acciones: $9,000
- Available Cash: $2,000

**Cálculo correcto:**
```
Total Invested = $8,000 + $2,000 = $10,000
Current Value = $9,000 + $2,000 = $11,000
Total P/L = $11,000 - $10,000 = +$1,000 ✅
```

**Cálculo anterior (incorrecto):**
```
Total P/L = $9,000 - $8,000 = +$1,000 ✅ (casualmente correcto en este caso)
```

**Pero si el efectivo cambia, el cálculo anterior falla:**
- Si retiras $500 del efectivo disponible:
```
Cálculo correcto:
Current Value = $9,000 + $1,500 = $10,500
Total P/L = $10,500 - $10,000 = +$500 ✅

Cálculo anterior (incorrecto):
Total P/L = $9,000 - $8,000 = +$1,000 ❌ (ignora el retiro)
```

---

### 4. **Total Return** ✅ (CORREGIDO)
**Fórmula ANTERIOR (❌ INCORRECTA):**
```
Total Return = (Total P/L / Solo inversión en acciones) × 100
```

**Fórmula NUEVA (✅ CORRECTA):**
```
Total Return = (Total P/L / Total Invested) × 100
```

**Explicación:**
- Muestra tu retorno porcentual considerando TODO tu capital
- Usa el Total Invested correcto (incluyendo efectivo)
- Es más realista porque considera todo el dinero que pusiste

**Ejemplo:**
- Total Invested: $10,000
- Current Value: $11,000
- Total P/L: +$1,000

```
Total Return = ($1,000 / $10,000) × 100 = 10.00%
```

---

### 5. **Annualized Return (XIRR)** ✅ (CORREGIDO)
**Problema ANTERIOR:**
- ❌ Solo incluía transacciones de compra de acciones
- ❌ No consideraba depósitos de efectivo con sus fechas
- ❌ Usaba solo el valor de acciones como valor final

**Implementación NUEVA:**
- ✅ Incluye TODAS las transacciones de compra de acciones con fechas exactas
- ✅ Usa el valor TOTAL (acciones + cash) como valor final
- ✅ Calcula el XIRR usando el método Newton-Raphson

**¿Qué es XIRR?**
XIRR (Extended Internal Rate of Return) es el método estándar usado por fondos profesionales para calcular retornos cuando hay múltiples inversiones en diferentes fechas.

**Flujos de efectivo para XIRR:**
```javascript
[
  { date: "2024-01-15", amount: -10000 },  // Compra inicial
  { date: "2024-06-20", amount: -5000 },   // Segunda compra
  { date: "2024-12-22", amount: 18000 }    // Valor actual (incluye cash)
]
```

**Interpretación:**
- Los flujos negativos son inversiones (salidas de dinero)
- El flujo positivo final es el valor actual total
- XIRR calcula la tasa anualizada que conecta estos flujos

**Limitación actual:**
⚠️ Si depositas efectivo sin invertirlo inmediatamente, el sistema necesitaría un historial de depósitos con fechas para incluirlos en XIRR. Actualmente solo trackea el monto total de efectivo disponible.

**Solución futura recomendada:**
Crear una colección `cash_deposits` en Firestore para trackear:
```javascript
{
  date: "2024-12-01",
  amount: 5000,
  type: "deposit" // o "withdrawal"
}
```

Esto permitiría calcular XIRR con precisión incluyendo todos los movimientos de efectivo.

---

## 📈 Resumen de Cambios

| Métrica | Estado Anterior | Estado Actual |
|---------|----------------|---------------|
| Portfolio Value | ✅ Correcto | ✅ Correcto |
| Total Invested | ❌ Solo acciones | ✅ Acciones + Cash |
| Total P/L | ❌ Fórmula incorrecta | ✅ Corregido |
| Total Return | ❌ Denominador incorrecto | ✅ Corregido |
| Annualized Return (XIRR) | ❌ Solo acciones en valor final | ✅ Valor total |

---

## 🔍 Cómo Verificar los Cálculos

Puedes usar las funciones de prueba en la consola del navegador:

```javascript
// Prueba rápida de XIRR
testXIRR()

// Pruebas completas
runXIRRTests()

// Calcular XIRR manualmente
const deposits = [
  { date: "2024-01-01", amount: 10000 },
  { date: "2024-06-01", amount: 5000 }
];
const currentValue = 18000;
calculatePortfolioXIRR(deposits, currentValue);
```

---

## 📝 Notas Importantes

1. **Available Cash** es parte integral del portfolio
   - No es dinero "fuera" del portfolio
   - Debe incluirse en todos los cálculos de valor y retorno

2. **Daily P/L** solo considera acciones
   - Es correcto porque el efectivo no fluctúa diariamente
   - Muestra cambios del mercado en ese día

3. **XIRR vs Simple Return**
   - XIRR: Considera el TIEMPO de cada inversión (más preciso)
   - Simple Return: Solo compara valor inicial vs final (más simple)
   - XIRR es el estándar profesional usado por fondos mutuos

4. **Realized Gains**
   - Están separados en la pestaña "Realized"
   - Las ventas automáticamente incrementan el "Available Cash"
   - No afectan directamente el P/L de posiciones activas

---

## 🚀 Mejoras Futuras Recomendadas

1. **Historial de Depósitos de Efectivo**
   - Trackear cada depósito/retiro con fecha
   - Permitir cálculo XIRR más preciso
   - Mostrar gráfico de capital aportado vs tiempo

2. **Benchmark Comparison**
   - Comparar tu XIRR con S&P 500
   - Mostrar alpha (retorno por encima del mercado)

3. **Tax Reporting**
   - Exportar realized gains para impuestos
   - Calcular tax liability basado en holding period

4. **Performance Attribution**
   - Mostrar qué acciones contribuyen más al retorno
   - Análisis sector/industria

---

**Fecha de actualización:** 22 de diciembre de 2025
**Versión:** 2.0 (Correcciones implementadas)
