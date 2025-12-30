import { FMP_CONFIG } from '../config/fmp.js';
import yahooFinanceService from './yahooFinanceService.js';

const BASE_URL = 'https://financialmodelingprep.com/api/v3';

export const historicalDataService = {
    // Get historical prices for a specific stock (with fallback)
    async getHistoricalPrices(symbol, from, to) {
        console.log(`📊 Fetching historical data for ${symbol} from ${from} to ${to}`);
        
        // Try Yahoo Finance first
        try {
            console.log('🔄 Attempting Yahoo Finance...');
            const yahooData = await yahooFinanceService.getHistoricalPrices(symbol, from, to);
            if (yahooData && yahooData.length > 0) {
                console.log(`✅ Yahoo Finance success for ${symbol}: ${yahooData.length} data points`);
                return yahooData;
            }
        } catch (yahooError) {
            console.warn(`⚠️ Yahoo Finance failed for ${symbol}:`, yahooError.message);
        }

        // Fallback to FMP
        try {
            console.log('🔄 Falling back to FMP...');
            const response = await fetch(
                `${BASE_URL}/historical-price-full/${symbol}?from=${from}&to=${to}&apikey=${FMP_CONFIG.API_KEY}`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.historical) {
                const fmpData = data.historical.map(item => ({
                    date: item.date,
                    close: item.close,
                    open: item.open,
                    high: item.high,
                    low: item.low,
                    volume: item.volume
                })).sort((a, b) => new Date(a.date) - new Date(b.date));
                
                console.log(`✅ FMP success for ${symbol}: ${fmpData.length} data points`);
                return fmpData;
            }
            
            console.warn(`⚠️ FMP returned no data for ${symbol}`);
            return [];
        } catch (fmpError) {
            console.error(`❌ FMP also failed for ${symbol}:`, fmpError.message);
            return [];
        }
    },

    // Get historical prices for multiple stocks (with fallback)
    async getMultipleHistoricalPrices(symbols, from, to) {
        console.log(`📊 Fetching historical data for ${symbols.length} symbols`);
        
        // Try Yahoo Finance first
        try {
            console.log('🔄 Attempting Yahoo Finance for multiple symbols...');
            const yahooData = await yahooFinanceService.getMultipleHistoricalPrices(symbols, from, to);
            
            // Check if we got data for all symbols
            const hasAllData = symbols.every(symbol => 
                yahooData[symbol] && yahooData[symbol].length > 0
            );
            
            if (hasAllData) {
                console.log('✅ Yahoo Finance success for all symbols');
                return yahooData;
            } else {
                console.warn('⚠️ Yahoo Finance incomplete data, falling back to FMP');
            }
        } catch (yahooError) {
            console.warn('⚠️ Yahoo Finance failed for multiple symbols:', yahooError.message);
        }

        // Fallback to FMP
        try {
            console.log('🔄 Falling back to FMP for multiple symbols...');
            const promises = symbols.map(symbol => 
                this.getHistoricalPrices(symbol, from, to)
            );
            
            const results = await Promise.all(promises);
            
            // Return as object with symbol as key
            const historicalData = {};
            symbols.forEach((symbol, index) => {
                historicalData[symbol] = results[index];
            });
            
            console.log('✅ FMP fallback completed');
            return historicalData;
        } catch (fmpError) {
            console.error('❌ Both Yahoo Finance and FMP failed for multiple symbols:', fmpError);
            return {};
        }
    },

    // Calculate portfolio value for a specific date
    calculatePortfolioValueAtDate(positions, historicalData, targetDate) {
        let totalValue = 0;
        
        positions.forEach(position => {
            const symbolData = historicalData[position.ticker];
            if (!symbolData || symbolData.length === 0) return;
            
            // Find the closest price data to the target date
            const targetDateTime = new Date(targetDate).getTime();
            const purchaseDateTime = new Date(position.firstPurchaseDate || position.purchaseDate).getTime();
            
            // Only include if position was purchased before target date
            if (purchaseDateTime <= targetDateTime) {
                // Find closest price point
                let closestPrice = null;
                let smallestDiff = Infinity;
                
                symbolData.forEach(dataPoint => {
                    const dataDateTime = new Date(dataPoint.date).getTime();
                    const diff = Math.abs(dataDateTime - targetDateTime);
                    
                    if (diff < smallestDiff && dataDateTime <= targetDateTime) {
                        smallestDiff = diff;
                        closestPrice = dataPoint.close;
                    }
                });
                
                if (closestPrice !== null) {
                    totalValue += closestPrice * position.quantity;
                }
            }
        });
        
        return totalValue;
    },

    // Generate portfolio time series data
    generatePortfolioTimeSeries(positions, historicalData, startDate, endDate, interval = 'daily') {
        const timeSeries = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Determine step size based on interval
        const stepSize = interval === 'daily' ? 1 : 
                        interval === 'weekly' ? 7 : 
                        interval === 'monthly' ? 30 : 1;
        
        // Generate date points
        const current = new Date(start);
        while (current <= end) {
            const dateStr = current.toISOString().split('T')[0];
            const portfolioValue = this.calculatePortfolioValueAtDate(positions, historicalData, dateStr);
            
            if (portfolioValue > 0) {
                timeSeries.push({
                    date: dateStr,
                    value: portfolioValue
                });
            }
            
            current.setDate(current.getDate() + stepSize);
        }
        
        return timeSeries;
    },

    // Get date range for different periods
    getDateRange(period, positions) {
        const today = new Date();
        const currentYear = today.getFullYear();
        
        switch (period) {
            case '7D':
                const sevenDaysAgo = new Date(today);
                sevenDaysAgo.setDate(today.getDate() - 7);
                return {
                    from: sevenDaysAgo.toISOString().split('T')[0],
                    to: today.toISOString().split('T')[0],
                    interval: 'daily'
                };
                
            case '30D':
                const thirtyDaysAgo = new Date(today);
                thirtyDaysAgo.setDate(today.getDate() - 30);
                return {
                    from: thirtyDaysAgo.toISOString().split('T')[0],
                    to: today.toISOString().split('T')[0],
                    interval: 'daily'
                };
                
            case '1Y':
                const oneYearAgo = new Date(today);
                oneYearAgo.setFullYear(today.getFullYear() - 1);
                return {
                    from: oneYearAgo.toISOString().split('T')[0],
                    to: today.toISOString().split('T')[0],
                    interval: 'weekly'
                };
                
            case 'YTD':
                const startOfYear = new Date(currentYear, 0, 1);
                return {
                    from: startOfYear.toISOString().split('T')[0],
                    to: today.toISOString().split('T')[0],
                    interval: 'weekly'
                };
                
            case 'ALL':
                // Find earliest purchase date
                const earliestDate = positions.reduce((earliest, position) => {
                    const posDate = new Date(position.firstPurchaseDate || position.purchaseDate);
                    return !earliest || posDate < earliest ? posDate : earliest;
                }, null);
                
                if (earliestDate) {
                    return {
                        from: earliestDate.toISOString().split('T')[0],
                        to: today.toISOString().split('T')[0],
                        interval: 'monthly'
                    };
                }
                
                // Fallback to 1 year if no purchase date found
                const fallbackDate = new Date(today);
                fallbackDate.setFullYear(today.getFullYear() - 1);
                return {
                    from: fallbackDate.toISOString().split('T')[0],
                    to: today.toISOString().split('T')[0],
                    interval: 'monthly'
                };
                
            default:
                return {
                    from: thirtyDaysAgo.toISOString().split('T')[0],
                    to: today.toISOString().split('T')[0],
                    interval: 'daily'
                };
        }
    },

    // Get current real-time prices for multiple stocks
    async getCurrentPrices(symbols) {
        console.log(`💰 Fetching current prices for ${symbols.length} symbols`);
        
        const currentPrices = {};
        
        // Try Yahoo Finance first for all symbols
        try {
            console.log('🔄 Attempting Yahoo Finance for current prices...');
            
            for (const symbol of symbols) {
                try {
                    const quote = await yahooFinanceService.getQuote(symbol);
                    if (quote && quote.price) {
                        currentPrices[symbol] = {
                            price: quote.price,
                            change: quote.change,
                            changePercent: quote.changePercent,
                            volume: quote.volume,
                            previousClose: quote.previousClose,
                            dayLow: quote.dayLow,
                            dayHigh: quote.dayHigh,
                            source: 'yahoo'
                        };
                        console.log(`✅ Yahoo quote for ${symbol}: $${quote.price}`);
                    }
                    
                    // Small delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 100));
                } catch (error) {
                    console.warn(`⚠️ Yahoo Finance failed for ${symbol}:`, error.message);
                }
            }
            
            // If we got most of the data from Yahoo, return it
            if (Object.keys(currentPrices).length >= symbols.length * 0.5) {
                console.log(`✅ Yahoo Finance provided ${Object.keys(currentPrices).length}/${symbols.length} prices`);
                return currentPrices;
            }
        } catch (yahooError) {
            console.warn('⚠️ Yahoo Finance failed for current prices:', yahooError.message);
        }

        // Fallback to FMP for missing symbols
        const missingSymbols = symbols.filter(symbol => !currentPrices[symbol]);
        
        if (missingSymbols.length > 0) {
            console.log(`🔄 Falling back to FMP for ${missingSymbols.length} missing symbols...`);
            
            try {
                // Import fmpService here to avoid circular dependency
                const fmpService = await import('./fmpService.js');
                
                for (const symbol of missingSymbols) {
                    try {
                        const fmpQuote = await fmpService.default.getQuote(symbol);
                        if (fmpQuote && fmpQuote.price) {
                            currentPrices[symbol] = {
                                price: fmpQuote.price,
                                change: fmpQuote.change,
                                changePercent: fmpQuote.changePercent,
                                volume: fmpQuote.volume,
                                previousClose: fmpQuote.previousClose,
                                dayLow: fmpQuote.dayLow,
                                dayHigh: fmpQuote.dayHigh,
                                source: 'fmp'
                            };
                            console.log(`✅ FMP quote for ${symbol}: $${fmpQuote.price}`);
                        }
                    } catch (error) {
                        console.warn(`⚠️ FMP also failed for ${symbol}:`, error.message);
                    }
                }
            } catch (fmpError) {
                console.error('❌ FMP service import failed:', fmpError);
            }
        }
        
        console.log(`📊 Final result: ${Object.keys(currentPrices).length}/${symbols.length} prices obtained`);
        return currentPrices;
    },
};
