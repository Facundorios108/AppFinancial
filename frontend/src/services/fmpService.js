// Financial Modeling Prep API Service (via Backend Proxy)
// All requests now go through the backend to avoid CORS issues

import { API_ENDPOINTS, REQUEST_TIMEOUT } from '../config/api.js';

class FMPService {
    constructor() {
        this.requestTimeout = REQUEST_TIMEOUT;
    }

    // Helper to make API calls to backend
    async makeRequest(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            throw error;
        }
    }

    // Obtener quote de una sola acción
    async getQuote(ticker) {
        try {
            const url = API_ENDPOINTS.QUOTE(ticker.upper());
            const response = await this.makeRequest(url);
            
            if (response.success && response.data) {
                return response.data;
            } else {
                throw new Error(`No data returned for ${ticker}`);
            }
        } catch (error) {
            console.error(`Error fetching quote for ${ticker}:`, error);
            throw error;
        }
    }

    // Obtener quotes de múltiples acciones con mejor manejo de errores
    async getBulkQuotes(tickers) {
        if (!tickers || tickers.length === 0) return [];
        
        try {
            const url = API_ENDPOINTS.BULK_QUOTES;
            const response = await this.makeRequest(url, {
                method: 'POST',
                body: JSON.stringify(tickers)
            });
            
            if (response.success && response.data) {
                return response.data;
            }
            
            return [];
        } catch (error) {
            console.error('Error fetching bulk quotes:', error);
            return [];
        }
    }

    // Obtener perfil de empresa (información adicional)
    async getCompanyProfile(ticker) {
        try {
            const url = API_ENDPOINTS.COMPANY_PROFILE(ticker.toUpperCase());
            const response = await this.makeRequest(url);
            
            if (response.success && response.data) {
                return response.data;
            } else {
                throw new Error(`No profile data for ${ticker}`);
            }
        } catch (error) {
            console.error(`Error fetching profile for ${ticker}:`, error);
            throw error;
        }
    }

    // Obtener datos históricos
    async getHistoricalData(ticker, fromDate, toDate) {
        try {
            const url = `${API_ENDPOINTS.HISTORICAL_PRICES(ticker.toUpperCase())}?from_date=${fromDate}&to_date=${toDate}`;
            const response = await this.makeRequest(url);
            
            if (response.success && response.data) {
                return response.data;
            }
            
            return [];
        } catch (error) {
            console.error(`Error fetching historical data for ${ticker}:`, error);
            return [];
        }
    }

    // Buscar tickers por consulta de texto
    async searchTickers(query) {
        if (!query || query.trim().length < 1) {
            return [];
        }
        
        try {
            const url = `${API_ENDPOINTS.SEARCH_TICKERS}?query=${encodeURIComponent(query.trim())}`;
            const response = await this.makeRequest(url);
            
            if (response.success && response.data) {
                return response.data;
            }
            
            return [];
        } catch (error) {
            console.error('Error searching tickers:', error);
            return [];
        }
    }

    // Formatear datos de quote para uso interno (no necesario, backend ya lo hace)
    formatQuoteData(rawQuote) {
        // Backend ya envía el formato correcto
        return rawQuote;
    }

    // Validar si la API está configurada (siempre true ya que usamos backend)
    isConfigured() {
        return true;
    }

    // Obtener información del estado de la API
    async getApiStatus() {
        try {
            const url = API_ENDPOINTS.MARKET_STATUS;
            const response = await this.makeRequest(url);
            
            if (response.success) {
                return { 
                    status: 'connected', 
                    message: 'Backend API is working',
                    services: response.services
                };
            }
            
            return { status: 'error', message: 'Backend API unavailable' };
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    }

    // Verificar límites de rate (no necesario con backend)
    getRateLimitInfo() {
        return {
            canMakeRequest: true,
            waitTime: 0,
            message: 'Rate limiting handled by backend'
        };
    }

    // Test de conexión
    async testConnection() {
        try {
            await this.getQuote('AAPL');
            return true;
        } catch (error) {
            throw new Error('Backend API connection failed: ' + error.message);
        }
    }

    // Método legacy para compatibilidad
    async getQuotes(tickers) {
        return this.getBulkQuotes(tickers);
    }
}

// Exportar una instancia singleton
export const fmpService = new FMPService();
export default fmpService;
