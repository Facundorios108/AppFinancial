// Financial Modeling Prep API Configuration
// Documentación: https://financialmodelingprep.com/developer/docs

export const FMP_CONFIG = {
    // Tu API key de Financial Modeling Prep
    // Regístrate gratis en: https://financialmodelingprep.com/developer/docs
    API_KEY: '7UjLPs72sLse1LcMrr6ZBJtwrO2SLkyb',
    
    // URLs de la API
    BASE_URL: 'https://financialmodelingprep.com/api/v3',
    QUOTE_URL: 'https://financialmodelingprep.com/api/v3/quote',
    PROFILE_URL: 'https://financialmodelingprep.com/api/v3/profile',
    HISTORICAL_URL: 'https://financialmodelingprep.com/api/v3/historical-price-full',
    
    // Configuraciones
    AUTO_REFRESH_INTERVAL: 30000, // 30 segundos
    REQUEST_TIMEOUT: 10000, // 10 segundos
    
    // Límites del plan gratuito
    FREE_PLAN: {
        REQUESTS_PER_DAY: 250,
        REQUESTS_PER_MINUTE: 5,
        REAL_TIME_DATA: false // Plan gratuito tiene datos con 15 min de delay
    },
    
    // Límites del plan premium
    PREMIUM_PLAN: {
        REQUESTS_PER_DAY: 10000,
        REQUESTS_PER_MINUTE: 300,
        REAL_TIME_DATA: true
    }
};

// Función helper para crear URLs con API key
export const buildFMPUrl = (endpoint, symbol = '', params = {}) => {
    const baseUrl = `${FMP_CONFIG.BASE_URL}${endpoint}`;
    const urlParams = new URLSearchParams({
        apikey: FMP_CONFIG.API_KEY,
        ...params
    });
    
    if (symbol) {
        return `${baseUrl}/${symbol}?${urlParams}`;
    }
    
    return `${baseUrl}?${urlParams}`;
};

// Función helper para múltiples símbolos
export const buildFMPBulkUrl = (endpoint, symbols = []) => {
    const symbolsString = symbols.join(',');
    return buildFMPUrl(endpoint, symbolsString);
};
