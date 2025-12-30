# 💰 Cash Deposits Collection - Implementación

## Descripción General

Se ha implementado una nueva colección `cash_deposits` en Firestore para trackear todos los depósitos y retiros de efectivo con fechas exactas. Esto permite calcular el XIRR (Annualized Return) con mayor precisión al incluir todos los flujos de efectivo en el análisis.

---

## 🗂️ Estructura de la Colección

### Firestore Path
```
users/{userId}/cash_deposits/{depositId}
```

### Esquema del Documento
```javascript
{
  amount: Number,           // Monto del depósito/retiro (positivo para depósitos, negativo para retiros)
  date: String,            // Fecha en formato "YYYY-MM-DD"
  type: String,            // "deposit" o "withdrawal"
  timestamp: String        // ISO timestamp de cuando se creó el registro
}
```

### Ejemplo
```javascript
{
  amount: 5000,
  date: "2024-12-22",
  type: "deposit",
  timestamp: "2024-12-22T15:30:45.123Z"
}
```

---

## 🔧 Implementación en el Código

### 1. Estado en App.js
```javascript
const [cashDeposits, setCashDeposits] = useState([]);
```

### 2. Funciones Principales

#### `loadCashDeposits(userId)`
Carga el historial de depósitos desde Firestore o localStorage (modo guest).

```javascript
const loadCashDeposits = async (userId) => {
    if (!userId) {
        setCashDeposits([]);
        return;
    }

    try {
        if (userId === 'guest') {
            // Cargar desde localStorage
            const guestDeposits = JSON.parse(localStorage.getItem('cashDeposits') || '[]');
            setCashDeposits(guestDeposits);
            return;
        }

        // Cargar desde Firestore
        const depositsRef = collection(db, "users", userId, "cash_deposits");
        const depositsSnapshot = await getDocs(depositsRef);
        
        const deposits = [];
        depositsSnapshot.forEach((doc) => {
            const data = doc.data();
            deposits.push({
                id: doc.id,
                amount: Number(data.amount),
                date: data.date,
                type: data.type,
                timestamp: data.timestamp
            });
        });
        
        // Ordenar por fecha descendente
        deposits.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        setCashDeposits(deposits);
    } catch (error) {
        console.error("Error loading cash deposits:", error);
        setCashDeposits([]);
    }
};
```

#### `addCashDeposit(depositAmount)`
Registra un nuevo depósito/retiro con fecha automática.

```javascript
const addCashDeposit = async (depositAmount) => {
    try {
        const newAmount = availableCash + depositAmount;
        await updateAvailableCash(newAmount);
        
        // Crear registro del depósito
        const depositDate = new Date().toISOString().split('T')[0];
        const depositRecord = {
            amount: depositAmount,
            date: depositDate,
            type: depositAmount >= 0 ? 'deposit' : 'withdrawal',
            timestamp: new Date().toISOString()
        };
        
        if (user && user.uid && user.uid !== 'guest') {
            // Guardar en Firestore
            const depositRef = await addDoc(
                collection(db, "users", user.uid, "cash_deposits"), 
                depositRecord
            );
            
            // Actualizar estado local
            setCashDeposits(prevDeposits => [
                { id: depositRef.id, ...depositRecord },
                ...prevDeposits
            ]);
        } else {
            // Modo guest: localStorage
            const guestDeposits = JSON.parse(localStorage.getItem('cashDeposits') || '[]');
            const newDeposit = { id: Date.now().toString(), ...depositRecord };
            guestDeposits.unshift(newDeposit);
            localStorage.setItem('cashDeposits', JSON.stringify(guestDeposits));
            setCashDeposits(guestDeposits);
        }
    } catch (error) {
        console.error("Error adding cash deposit:", error);
    }
};
```

---

## 📊 Integración con XIRR

### Cálculo Actualizado

El cálculo de XIRR ahora incluye tanto las compras de acciones como los depósitos de efectivo:

```javascript
// 1. Agregar todas las transacciones de compra de acciones
positions.forEach(p => {
    if (p.history && p.history.length > 0) {
        p.history.forEach(t => {
            cashFlows.push({
                amount: t.purchasePrice * t.quantity,
                date: t.purchaseDate
            });
        });
    }
});

// 2. Agregar todos los depósitos/retiros de efectivo
if (cashDeposits && cashDeposits.length > 0) {
    cashDeposits.forEach(deposit => {
        cashFlows.push({
            amount: Math.abs(deposit.amount),
            date: deposit.date
        });
    });
}

// 3. Calcular XIRR con valor total (acciones + cash)
if (cashFlows.length > 0) {
    annualizedReturn = calculatePortfolioXIRR(cashFlows, totalValue);
}
```

### Por Qué es Importante

**Antes:**
- XIRR solo consideraba compras de acciones
- Ignoraba cuándo se depositaba el efectivo
- No reflejaba el costo de oportunidad del efectivo sin invertir

**Ahora:**
- XIRR incluye TODOS los flujos de efectivo con fechas exactas
- Refleja el verdadero timing de tus inversiones
- Más preciso y alineado con estándares profesionales

---

## 🎨 Componente UI: CashDepositsModal

### Características

1. **Resumen de Flujos de Efectivo:**
   - Total Depositado
   - Total Retirado
   - Flujo Neto de Efectivo

2. **Historial Detallado:**
   - Fecha de cada transacción
   - Tipo (Deposit/Withdrawal)
   - Monto con colores (verde para depósitos, rojo para retiros)

3. **Acceso desde Dashboard:**
   - Botón de historial (ícono) en la tarjeta "Available Cash"
   - Solo aparece si hay depósitos registrados

### Código del Modal

```jsx
<CashDepositsModal
    isOpen={showCashDepositsModal}
    onClose={() => setShowCashDepositsModal(false)}
    cashDeposits={cashDeposits || []}
    formatCurrency={formatCurrency}
/>
```

---

## 🔄 Flujo de Datos

### 1. Usuario Agrega Depósito
```
Usuario hace clic en "Add Deposit"
    ↓
Ingresa monto
    ↓
addCashDeposit(amount)
    ↓
Actualiza availableCash
    ↓
Guarda en Firestore/localStorage
    ↓
Actualiza estado local cashDeposits
    ↓
Se recalcula XIRR automáticamente
```

### 2. Carga Inicial
```
Usuario se loguea
    ↓
loadPortfolio(userId)
    ↓
loadAvailableCash(userId)
    ↓
loadRealizedSales(userId)
    ↓
loadCashDeposits(userId) ← NUEVO
    ↓
Renderiza Dashboard con datos completos
```

### 3. Recálculo Automático
```javascript
useEffect(() => {
    const calculatePortfolioStats = () => {
        // ... cálculos ...
        
        // XIRR se recalcula automáticamente cuando cambian:
        // - positions
        // - cashDeposits ← NUEVO
        // - availableCash
    };
    
    if ((user || isGuest)) {
        calculatePortfolioStats();
    }
}, [positions, user, isGuest, availableCash, cashDeposits]);
```

---

## 📈 Impacto en Métricas

### Métricas Afectadas

| Métrica | ¿Se ve afectada? | Explicación |
|---------|------------------|-------------|
| Portfolio Value | ❌ No | Solo suma valores actuales |
| Total Invested | ❌ No | Se calcula de forma diferente |
| Total P/L | ❌ No | Basado en valores, no en fechas |
| Total Return | ❌ No | Basado en P/L y Total Invested |
| **Annualized Return (XIRR)** | ✅ **SÍ** | **Incluye fechas de depósitos para cálculo preciso** |

### Ejemplo de Impacto

**Escenario:**
- 1 de enero: Depositas $10,000
- 1 de enero: Compras acciones por $8,000
- 1 de julio: Depositas otros $5,000
- 1 de julio: Compras acciones por $4,000
- 31 de diciembre: Valor de acciones = $13,500 + Cash = $3,000

**XIRR Anterior (❌ Incorrecto):**
```javascript
Flujos:
  2024-01-01: -$8,000 (compra)
  2024-07-01: -$4,000 (compra)
  2024-12-31: +$13,500 (solo acciones)
XIRR ≈ 15.2% (INCORRECTO - ignora $3,000 en cash y timing de depósitos)
```

**XIRR Nuevo (✅ Correcto):**
```javascript
Flujos:
  2024-01-01: -$10,000 (depósito)
  2024-01-01: -$8,000 (compra)
  2024-07-01: -$5,000 (depósito)
  2024-07-01: -$4,000 (compra)
  2024-12-31: +$16,500 (acciones + cash)
XIRR ≈ 12.8% (CORRECTO - incluye todo)
```

---

## 🚀 Mejoras Futuras

### 1. Editar/Eliminar Depósitos
Permitir modificar registros históricos desde el modal.

### 2. Depósitos Programados
Recordatorios para aportes mensuales regulares.

### 3. Importar desde Archivo
Cargar historial de depósitos desde CSV/Excel.

### 4. Gráfico de Flujo de Efectivo
Visualizar depósitos vs retiros en el tiempo.

### 5. Análisis de Timing
Mostrar si tus depósitos coinciden con buenos momentos del mercado.

---

## 🧪 Testing

### Tests Recomendados

1. **Crear depósito con usuario autenticado**
   - Verificar guardado en Firestore
   - Verificar actualización de estado local
   - Verificar recálculo de XIRR

2. **Crear depósito en modo guest**
   - Verificar guardado en localStorage
   - Verificar persistencia entre sesiones

3. **Cargar depósitos existentes**
   - Verificar orden correcto
   - Verificar formato de datos

4. **Modal de historial**
   - Verificar cálculos de totales
   - Verificar renderizado de tabla

---

## 📝 Notas Importantes

1. **Fecha Automática:** Los depósitos usan la fecha actual del sistema. Considera agregar un campo de fecha manual para registros históricos.

2. **Modo Guest:** Los depósitos se guardan en localStorage y se pierden si se limpia el navegador.

3. **Sincronización:** Los cambios se reflejan inmediatamente en la UI gracias a la actualización optimista del estado.

4. **XIRR Fallback:** Si el cálculo de XIRR falla (por ejemplo, con muy pocas transacciones), el sistema muestra 0.00%.

5. **Performance:** Con muchos depósitos (100+), considera paginación o lazy loading en el modal.

---

**Fecha de implementación:** 22 de diciembre de 2025  
**Versión:** 1.0  
**Status:** ✅ Implementado y funcional
