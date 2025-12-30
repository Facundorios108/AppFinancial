// AllTick API Configuration
// Documentación: https://alltick.co/docs

export const ALLTICK_CONFIG = {
    // Token de AllTick API
    API_TOKEN: '044feb2d8481410d3e98b6020d43c865-c-app',
    
    // URLs de la API
    QUOTE_URL: 'https://quote-api.alltick.co/quote',
    HISTORY_URL: 'https://quote-api.alltick.co/history',
    
    // Configuraciones
    AUTO_REFRESH_INTERVAL: 30000, // 30 segundos
    REQUEST_TIMEOUT: 10000, // 10 segundos
    
    // Mercados soportados
    MARKETS: {
        US: '.US',
        NYSE: '.NYSE',
        NASDAQ: '.NASDAQ'
    },
    
    // Campos disponibles para quotes
    QUOTE_FIELDS: [
        'last_price',      // Precio actual
        'open',           // Precio de apertura
        'high',           // Precio máximo del día
        'low',            // Precio mínimo del día
        'volume',         // Volumen
        'change',         // Cambio absoluto
        'change_ratio',   // Cambio porcentual
        'timestamp',      // Timestamp
        'prev_close',     // Cierre anterior
        'market_cap',     // Capitalización de mercado
        'pe_ratio'        // Relación P/E
    ]
};

// Función helper para formatear símbolos
export const formatSymbolForAllTick = (ticker, market = 'US') => {
    return `${ticker.toUpperCase()}${ALLTICK_CONFIG.MARKETS[market]}`;
};

// Función helper para crear headers de request
export const getAllTickHeaders = () => ({
    'Content-Type': 'application/json',
    'token': ALLTICK_CONFIG.API_TOKEN
});

// Función helper para crear trace ID único
export const generateTraceId = (operation, ticker = '') => {
    return `${operation}_${ticker}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
