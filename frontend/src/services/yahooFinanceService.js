/**
 * Yahoo Finance Service - Primary data source for stock prices
 * Provides unlimited free access to stock market data
 */
class YahooFinanceService {
    constructor() {
        this.baseURL = 'https://query1.finance.yahoo.com/v8/finance/chart';
        this.searchURL = 'https://query1.finance.yahoo.com/v1/finance/search';
        this.quoteURL = 'https://query1.finance.yahoo.com/v7/finance/quote';
        this.cache = new Map();
        this.cacheExpiry = 60000; // 1 minute cache
        this.rateLimitDelay = 500; // 500ms between requests
        this.lastRequestTime = 0;
        this.maxRetries = 3;
    }

    /**
     * Rate limiting helper
     */
    async rateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        
        if (timeSinceLastRequest < this.rateLimitDelay) {
            const delay = this.rateLimitDelay - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        this.lastRequestTime = Date.now();
    }

    /**
     * Make HTTP request with retry logic
     */
    async makeRequest(url, options = {}) {
        await this.rateLimit();
        
        for (let attempt = 0; attempt < this.maxRetries; attempt++) {
            try {
                const response = await fetch(url, {
                    ...options,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'application/json',
                        ...options.headers
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                return data;
            } catch (error) {
                console.warn(`Yahoo Finance request attempt ${attempt + 1} failed:`, error.message);
                
                if (attempt === this.maxRetries - 1) {
                    throw error;
                }
                
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            }
        }
    }

    /**
     * Get cached data if available and not expired
     */
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            return cached.data;
        }
        return null;
    }

    /**
     * Store data in cache
     */
    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Test connection to Yahoo Finance
     */
    async testConnection() {
        try {
            const url = `${this.quoteURL}?symbols=AAPL`;
            const data = await this.makeRequest(url);
            
            if (data && data.quoteResponse && data.quoteResponse.result) {
                return true;
            }
            throw new Error('Invalid response format');
        } catch (error) {
            throw new Error(`Yahoo Finance connection test failed: ${error.message}`);
        }
    }

    /**
     * Search for ticker symbols
     */
    async searchTickers(query) {
        if (!query || query.length < 1) {
            return [];
        }

        const cacheKey = `search_${query}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }

        try {
            const url = `${this.searchURL}?q=${encodeURIComponent(query)}&quotes_count=10&news_count=0`;
            const data = await this.makeRequest(url);

            if (data && data.quotes) {
                const results = data.quotes
                    .filter(quote => quote.symbol && quote.shortname)
                    .map(quote => ({
                        symbol: quote.symbol,
                        name: quote.shortname || quote.longname || quote.symbol,
                        type: quote.typeDisp || 'Stock',
                        exchange: quote.exchange || 'Unknown'
                    }))
                    .slice(0, 10);

                this.setCache(cacheKey, results);
                return results;
            }

            return [];
        } catch (error) {
            console.error('Yahoo Finance search failed:', error);
            return [];
        }
    }

    /**
     * Get quote for a single ticker
     */
    async getQuote(ticker) {
        if (!ticker) {
            throw new Error('Ticker symbol is required');
        }

        const cacheKey = `quote_${ticker}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }

        try {
            const url = `${this.quoteURL}?symbols=${ticker.toUpperCase()}`;
            const data = await this.makeRequest(url);

            if (data && data.quoteResponse && data.quoteResponse.result && data.quoteResponse.result.length > 0) {
                const quote = data.quoteResponse.result[0];
                
                const result = {
                    symbol: quote.symbol,
                    price: quote.regularMarketPrice || 0,
                    change: quote.regularMarketChange || 0,
                    changePercent: quote.regularMarketChangePercent || 0,
                    previousClose: quote.regularMarketPreviousClose || 0,
                    dayHigh: quote.regularMarketDayHigh || 0,
                    dayLow: quote.regularMarketDayLow || 0,
                    volume: quote.regularMarketVolume || 0,
                    marketCap: quote.marketCap || 0,
                    source: 'yahoo',
                    timestamp: new Date().toISOString()
                };

                this.setCache(cacheKey, result);
                return result;
            }

            throw new Error('No quote data available');
        } catch (error) {
            console.error(`Yahoo Finance quote failed for ${ticker}:`, error);
            throw error;
        }
    }

    /**
     * Get quotes for multiple tickers
     */
    async getQuotes(tickers) {
        if (!Array.isArray(tickers) || tickers.length === 0) {
            return {};
        }

        const results = {};
        const batchSize = 10; // Yahoo Finance can handle multiple symbols
        
        for (let i = 0; i < tickers.length; i += batchSize) {
            const batch = tickers.slice(i, i + batchSize);
            const symbols = batch.map(t => t.toUpperCase()).join(',');
            
            try {
                const url = `${this.quoteURL}?symbols=${symbols}`;
                const data = await this.makeRequest(url);

                if (data && data.quoteResponse && data.quoteResponse.result) {
                    data.quoteResponse.result.forEach(quote => {
                        results[quote.symbol] = {
                            symbol: quote.symbol,
                            price: quote.regularMarketPrice || 0,
                            change: quote.regularMarketChange || 0,
                            changePercent: quote.regularMarketChangePercent || 0,
                            previousClose: quote.regularMarketPreviousClose || 0,
                            dayHigh: quote.regularMarketDayHigh || 0,
                            dayLow: quote.regularMarketDayLow || 0,
                            volume: quote.regularMarketVolume || 0,
                            marketCap: quote.marketCap || 0,
                            source: 'yahoo',
                            timestamp: new Date().toISOString()
                        };
                    });
                }
            } catch (error) {
                console.error(`Yahoo Finance batch quote failed for ${symbols}:`, error);
                // Continue with other batches
            }
        }

        return results;
    }

    /**
     * Get historical prices for a ticker
     */
    async getHistoricalPrices(ticker, from, to) {
        if (!ticker || !from || !to) {
            throw new Error('Ticker, from, and to parameters are required');
        }

        const cacheKey = `historical_${ticker}_${from}_${to}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }

        try {
            const fromTimestamp = Math.floor(new Date(from).getTime() / 1000);
            const toTimestamp = Math.floor(new Date(to).getTime() / 1000);
            
            const url = `${this.baseURL}/${ticker.toUpperCase()}?period1=${fromTimestamp}&period2=${toTimestamp}&interval=1d`;
            const data = await this.makeRequest(url);

            if (data && data.chart && data.chart.result && data.chart.result.length > 0) {
                const result = data.chart.result[0];
                const timestamps = result.timestamp || [];
                const prices = result.indicators?.quote?.[0] || {};
                
                const historicalData = timestamps.map((timestamp, index) => ({
                    date: new Date(timestamp * 1000).toISOString().split('T')[0],
                    open: prices.open?.[index] || 0,
                    high: prices.high?.[index] || 0,
                    low: prices.low?.[index] || 0,
                    close: prices.close?.[index] || 0,
                    volume: prices.volume?.[index] || 0
                })).filter(item => item.close > 0);

                this.setCache(cacheKey, historicalData);
                return historicalData;
            }

            throw new Error('No historical data available');
        } catch (error) {
            console.error(`Yahoo Finance historical data failed for ${ticker}:`, error);
            throw error;
        }
    }

    /**
     * Get multiple historical prices
     */
    async getMultipleHistoricalPrices(tickers, from, to) {
        if (!Array.isArray(tickers) || tickers.length === 0) {
            return {};
        }

        const results = {};
        
        // Process tickers sequentially to avoid rate limiting
        for (const ticker of tickers) {
            try {
                const data = await this.getHistoricalPrices(ticker, from, to);
                results[ticker] = data;
            } catch (error) {
                console.error(`Historical data failed for ${ticker}:`, error);
                results[ticker] = [];
            }
        }

        return results;
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

// Export singleton instance
const yahooFinanceService = new YahooFinanceService();
export default yahooFinanceService;
