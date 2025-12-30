import yahooFinanceService from './yahooFinanceService';
import fmpService from './fmpService';

/**
 * Unified API Service - Orchestrates between Yahoo Finance and FMP APIs
 * Provides seamless fallback between data sources
 */
class UnifiedAPIService {
    constructor() {
        this.primaryService = yahooFinanceService;
        this.fallbackService = fmpService;
        this.serviceStatus = {
            yahoo: { active: false, lastCheck: null, errorCount: 0 },
            fmp: { active: false, lastCheck: null, errorCount: 0 }
        };
        this.maxRetries = 3;
        this.retryDelay = 1000;
        this.initialized = false;
    }

    /**
     * Initialize services and test their availability
     */
    async initializeServices() {
        console.log('🔄 Initializing unified API services...');
        
        try {
            // Test Yahoo Finance service
            try {
                await this.primaryService.testConnection();
                this.serviceStatus.yahoo.active = true;
                this.serviceStatus.yahoo.lastCheck = new Date();
                this.serviceStatus.yahoo.errorCount = 0;
                console.log('✅ Yahoo Finance service is active');
            } catch (error) {
                console.warn('⚠️ Yahoo Finance service unavailable:', error.message);
                this.serviceStatus.yahoo.active = false;
                this.serviceStatus.yahoo.errorCount++;
            }

            // Test FMP service
            try {
                await this.fallbackService.testConnection();
                this.serviceStatus.fmp.active = true;
                this.serviceStatus.fmp.lastCheck = new Date();
                this.serviceStatus.fmp.errorCount = 0;
                console.log('✅ FMP service is active');
            } catch (error) {
                console.warn('⚠️ FMP service unavailable:', error.message);
                this.serviceStatus.fmp.active = false;
                this.serviceStatus.fmp.errorCount++;
            }

            this.initialized = true;
            console.log('✅ Unified API services initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize unified API services:', error);
            this.initialized = false;
            throw error;
        }
    }

    /**
     * Execute a service method with fallback logic
     */
    async executeWithFallback(methodName, ...args) {
        if (!this.initialized) {
            await this.initializeServices();
        }

        let primaryError = null;
        let fallbackError = null;

        // Try primary service (Yahoo Finance)
        if (this.serviceStatus.yahoo.active) {
            try {
                console.log(`🔄 Trying Yahoo Finance for ${methodName}...`);
                const result = await this.primaryService[methodName](...args);
                if (result) {
                    console.log(`✅ Yahoo Finance ${methodName} successful`);
                    return result;
                }
            } catch (error) {
                console.warn(`⚠️ Yahoo Finance ${methodName} failed:`, error.message);
                primaryError = error;
                this.serviceStatus.yahoo.errorCount++;
                
                // Disable Yahoo if too many errors
                if (this.serviceStatus.yahoo.errorCount >= this.maxRetries) {
                    this.serviceStatus.yahoo.active = false;
                    console.warn('⚠️ Yahoo Finance service disabled due to repeated failures');
                }
            }
        }

        // Try fallback service (FMP)
        if (this.serviceStatus.fmp.active) {
            try {
                console.log(`🔄 Trying FMP for ${methodName}...`);
                const result = await this.fallbackService[methodName](...args);
                if (result) {
                    console.log(`✅ FMP ${methodName} successful`);
                    return result;
                }
            } catch (error) {
                console.warn(`⚠️ FMP ${methodName} failed:`, error.message);
                fallbackError = error;
                this.serviceStatus.fmp.errorCount++;
                
                // Disable FMP if too many errors
                if (this.serviceStatus.fmp.errorCount >= this.maxRetries) {
                    this.serviceStatus.fmp.active = false;
                    console.warn('⚠️ FMP service disabled due to repeated failures');
                }
            }
        }

        // Both services failed
        const errorMessage = `Both services failed. Primary: ${primaryError?.message || 'unavailable'}, Fallback: ${fallbackError?.message || 'unavailable'}`;
        console.error(`❌ ${methodName} failed:`, errorMessage);
        throw new Error(errorMessage);
    }

    /**
     * Search for ticker symbols
     */
    async searchTickers(query) {
        return this.executeWithFallback('searchTickers', query);
    }

    /**
     * Get quote for a single ticker
     */
    async getQuote(ticker) {
        return this.executeWithFallback('getQuote', ticker);
    }

    /**
     * Get quotes for multiple tickers
     */
    async getQuotes(tickers) {
        return this.executeWithFallback('getQuotes', tickers);
    }

    /**
     * Get historical prices for a ticker
     */
    async getHistoricalPrices(ticker, from, to) {
        return this.executeWithFallback('getHistoricalPrices', ticker, from, to);
    }

    /**
     * Get multiple historical prices
     */
    async getMultipleHistoricalPrices(tickers, from, to) {
        return this.executeWithFallback('getMultipleHistoricalPrices', tickers, from, to);
    }

    /**
     * Get current service status
     */
    getServiceStatus() {
        return {
            ...this.serviceStatus,
            initialized: this.initialized,
            primaryActive: this.serviceStatus.yahoo.active,
            fallbackActive: this.serviceStatus.fmp.active,
            anyActive: this.serviceStatus.yahoo.active || this.serviceStatus.fmp.active
        };
    }

    /**
     * Reset service status and re-initialize
     */
    async resetServices() {
        console.log('🔄 Resetting unified API services...');
        this.serviceStatus = {
            yahoo: { active: false, lastCheck: null, errorCount: 0 },
            fmp: { active: false, lastCheck: null, errorCount: 0 }
        };
        this.initialized = false;
        await this.initializeServices();
    }

    /**
     * Test connection to all services
     */
    async testConnection() {
        if (!this.initialized) {
            await this.initializeServices();
        }
        
        const status = this.getServiceStatus();
        if (!status.anyActive) {
            throw new Error('No active services available');
        }
        
        return status;
    }

    /**
     * Get preferred service name for logging
     */
    getPreferredService() {
        if (this.serviceStatus.yahoo.active) return 'Yahoo Finance';
        if (this.serviceStatus.fmp.active) return 'FMP';
        return 'None';
    }
}

// Export singleton instance
const unifiedAPIService = new UnifiedAPIService();
export { unifiedAPIService };
