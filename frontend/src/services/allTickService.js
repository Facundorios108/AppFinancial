// AllTick API Service
// Servicio para manejar todas las llamadas a la API de AllTick

import { ALLTICK_CONFIG, formatSymbolForAllTick, getAllTickHeaders, generateTraceId } from '../config/alltick.js';

class AllTickService {
    constructor() {
        this.rateLimitDelay = 100; // 100ms entre requests para evitar rate limiting
        this.lastRequestTime = 0;
    }

    // Función para manejar rate limiting
    async waitForRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        
        if (timeSinceLastRequest < this.rateLimitDelay) {
            await new Promise(resolve => 
                setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest)
            );
        }
        
        this.lastRequestTime = Date.now();
    }

    // Obtener quote de una sola acción
    async getQuote(ticker) {
        await this.waitForRateLimit();
        
        try {
            const response = await fetch(ALLTICK_CONFIG.QUOTE_URL, {
                method: 'POST',
                headers: getAllTickHeaders(),
                body: JSON.stringify({
                    trace: generateTraceId('quote', ticker),
                    data: {
                        symbol_list: [formatSymbolForAllTick(ticker)],
                        field_list: ALLTICK_CONFIG.QUOTE_FIELDS
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.code === 0 && data.data && data.data.length > 0) {
                return this.formatQuoteData(data.data[0]);
            } else {
                throw new Error(`No data returned for ${ticker}: ${data.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error(`Error fetching quote for ${ticker}:`, error);
            throw error;
        }
    }

    // Obtener quotes de múltiples acciones
    async getBulkQuotes(tickers) {
        if (!tickers || tickers.length === 0) return [];
        
        await this.waitForRateLimit();
        
        try {
            const symbolList = tickers.map(ticker => formatSymbolForAllTick(ticker));
            
            const response = await fetch(ALLTICK_CONFIG.QUOTE_URL, {
                method: 'POST',
                headers: getAllTickHeaders(),
                body: JSON.stringify({
                    trace: generateTraceId('bulk_quote'),
                    data: {
                        symbol_list: symbolList,
                        field_list: ALLTICK_CONFIG.QUOTE_FIELDS
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.code === 0 && data.data) {
                return data.data.map(quote => this.formatQuoteData(quote));
            } else {
                throw new Error(`Bulk quote error: ${data.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error fetching bulk quotes:', error);
            throw error;
        }
    }

    // Obtener datos históricos (para futuras funcionalidades)
    async getHistoricalData(ticker, period = '1d') {
        await this.waitForRateLimit();
        
        try {
            const response = await fetch(ALLTICK_CONFIG.HISTORY_URL, {
                method: 'POST',
                headers: getAllTickHeaders(),
                body: JSON.stringify({
                    trace: generateTraceId('history', ticker),
                    data: {
                        symbol: formatSymbolForAllTick(ticker),
                        period: period,
                        count: 100 // Últimas 100 barras
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.code === 0 && data.data) {
                return data.data;
            } else {
                throw new Error(`Historical data error: ${data.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error(`Error fetching historical data for ${ticker}:`, error);
            throw error;
        }
    }

    // Formatear datos de quote para uso interno
    formatQuoteData(rawQuote) {
        const ticker = rawQuote.symbol.replace('.US', '');
        
        return {
            ticker: ticker,
            symbol: rawQuote.symbol,
            lastPrice: parseFloat(rawQuote.last_price) || 0,
            open: parseFloat(rawQuote.open) || 0,
            high: parseFloat(rawQuote.high) || 0,
            low: parseFloat(rawQuote.low) || 0,
            volume: parseInt(rawQuote.volume) || 0,
            change: parseFloat(rawQuote.change) || 0,
            changePercent: parseFloat(rawQuote.change_ratio) || 0,
            previousClose: parseFloat(rawQuote.prev_close) || 0,
            marketCap: parseFloat(rawQuote.market_cap) || 0,
            peRatio: parseFloat(rawQuote.pe_ratio) || 0,
            timestamp: rawQuote.timestamp || Date.now(),
            lastUpdate: new Date().toISOString()
        };
    }

    // Validar si el token está configurado
    isConfigured() {
        return ALLTICK_CONFIG.API_TOKEN && ALLTICK_CONFIG.API_TOKEN !== 'YOUR_ALLTICK_API_TOKEN';
    }

    // Obtener información del estado de la API
    async getApiStatus() {
        try {
            // Hacer una llamada simple para verificar el estado
            await this.getQuote('AAPL');
            return { status: 'connected', message: 'AllTick API is working' };
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    }
}

// Exportar una instancia singleton
export const allTickService = new AllTickService();
export default allTickService;
