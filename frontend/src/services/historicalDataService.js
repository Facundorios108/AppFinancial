import { FMP_CONFIG } from '../config/fmp.js';
import logger from '../utils/logger';

const BASE_URL = 'https://financialmodelingprep.com/api/v3';

export const historicalDataService = {
    // Get historical prices for a specific stock using backend
    async getHistoricalPrices(symbol, from, to) {
        logger.log(`📊 Fetching historical data for ${symbol} from ${from} to ${to}`);
        
        try {
            // Call backend instead of FMP directly
            const response = await fetch(
                `/api/market/historical/${symbol}?from_date=${from}&to_date=${to}`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success && result.data) {
                const historicalData = result.data.map(item => ({
                    date: item.date,
                    close: item.close,
                    open: item.open,
                    high: item.high,
                    low: item.low,
                    volume: item.volume
                })).sort((a, b) => new Date(a.date) - new Date(b.date));
                
                logger.log(`✅ Historical data success for ${symbol}: ${historicalData.length} data points`);
                return historicalData;
            }
            
            logger.warn(`⚠️ Backend returned no data for ${symbol}`);
            return [];
            
        } catch (error) {
            logger.error(`❌ Historical data failed for ${symbol}:`, error);
            return [];
        }
    },

    // Get historical prices for multiple stocks
    async getMultipleHistoricalPrices(symbols, from, to) {
        logger.log(`📊 Fetching historical data for ${symbols.length} symbols`);
        
        const results = {};
        
        // Process symbols sequentially to avoid rate limiting
        for (const symbol of symbols) {
            try {
                const data = await this.getHistoricalPrices(symbol, from, to);
                results[symbol] = data;
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 200));
            } catch (error) {
                logger.error(`Historical data failed for ${symbol}:`, error);
                results[symbol] = [];
            }
        }
        
        return results;
    },

    // Generate portfolio time series based on positions and historical data
    generatePortfolioTimeSeries(positions, historicalData, from, to, interval = 'daily') {
        logger.log(`📈 Generating portfolio time series from ${from} to ${to}`);
        logger.log(`📋 Input positions:`, positions);
        logger.log(`📊 Historical data keys:`, Object.keys(historicalData));
        
        if (!positions || positions.length === 0) {
            logger.warn('⚠️ No positions provided for portfolio calculation');
            return [];
        }

        // Get all dates from historical data, but only include dates on or after the first investment
        const firstInvestmentDate = new Date(from);
        const allDates = new Set();
        
        Object.values(historicalData).forEach(symbolData => {
            if (Array.isArray(symbolData)) {
                symbolData.forEach(item => {
                    const date = new Date(item.date);
                    // Only include dates from the first investment date onwards
                    if (date >= firstInvestmentDate && date <= new Date(to)) {
                        allDates.add(item.date);
                    }
                });
            }
        });


        // Asegurar que la fecha de hoy esté incluida en el array de fechas
        const todayStr = new Date().toISOString().split('T')[0];
        allDates.add(todayStr);
        const sortedDates = Array.from(allDates).sort((a, b) => new Date(a) - new Date(b));

        logger.log(`📅 Date range: ${sortedDates.length} dates from ${sortedDates[0] || 'N/A'} to ${sortedDates[sortedDates.length - 1] || 'N/A'}`);

        if (sortedDates.length === 0) {
            logger.warn('⚠️ No valid dates found in historical data for range');
            return [];
        }

        // Generate time series
        const timeSeries = sortedDates.map((date, index) => {
            let totalValue = 0;
            const currentDate = new Date(date);
            
            // Para cada posición, buscar el último precio conocido hasta la fecha actual
            positions.forEach(position => {
                const symbolData = historicalData[position.ticker];
                let price = 0;
                if (Array.isArray(symbolData)) {
                    // Buscar el precio más reciente <= fecha actual
                    let lastKnownPrice = 0;
                    for (let i = symbolData.length - 1; i >= 0; i--) {
                        const itemDate = new Date(symbolData[i].date);
                        if (itemDate <= currentDate) {
                            lastKnownPrice = symbolData[i].close;
                            break;
                        }
                    }
                    price = lastKnownPrice;
                }
                // Calcular cantidad poseída en esa fecha
                let quantityOnDate = 0;
                if (position.purchaseDate && new Date(position.purchaseDate) <= currentDate) {
                    quantityOnDate += position.quantity || 0;
                }
                if (position.history && position.history.length > 0) {
                    position.history.forEach(transaction => {
                        const transactionDate = new Date(transaction.purchaseDate || transaction.date);
                        if (!isNaN(transactionDate.getTime()) && transactionDate <= currentDate) {
                            quantityOnDate += transaction.quantity || 0;
                        }
                    });
                }
                if (position.additionalTransactions && position.additionalTransactions.length > 0) {
                    position.additionalTransactions.forEach(transaction => {
                        const transactionDate = new Date(transaction.purchaseDate || transaction.date);
                        if (!isNaN(transactionDate.getTime()) && transactionDate <= currentDate) {
                            quantityOnDate += transaction.quantity || 0;
                        }
                    });
                }
                const positionValue = price * quantityOnDate;
                totalValue += positionValue;
            });
            return {
                date: date,
                value: totalValue
            };
        });

        logger.log(`✅ Generated ${timeSeries.length} data points for portfolio`);
        logger.log(`📊 Value range: $${Math.min(...timeSeries.map(t => t.value))} - $${Math.max(...timeSeries.map(t => t.value))}`);
        logger.log(`🎯 First day (${timeSeries[0]?.date}): $${timeSeries[0]?.value}`);
        logger.log(`🎯 Last day (${timeSeries[timeSeries.length - 1]?.date}): $${timeSeries[timeSeries.length - 1]?.value}`);
        return timeSeries;
    },

    // Get date range for different time periods
    getDateRange(timePeriod, positions = []) {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        logger.log(`🔍 getDateRange called with period: ${timePeriod}, positions: ${positions?.length || 0}`);
        
        switch (timePeriod) {
            case 'last2Weeks':
                const twoWeeksAgo = new Date(today);
                twoWeeksAgo.setDate(today.getDate() - 14);
                return {
                    from: twoWeeksAgo.toISOString().split('T')[0],
                    to: todayStr,
                    interval: 'daily'
                };
                
            case 'last1Month':
                const oneMonthAgo = new Date(today);
                oneMonthAgo.setMonth(today.getMonth() - 1);
                return {
                    from: oneMonthAgo.toISOString().split('T')[0],
                    to: todayStr,
                    interval: 'daily'
                };
                
            case 'last3Months':
                const threeMonthsAgo = new Date(today);
                threeMonthsAgo.setMonth(today.getMonth() - 3);
                return {
                    from: threeMonthsAgo.toISOString().split('T')[0],
                    to: todayStr,
                    interval: 'daily'
                };
                
            case 'last6Months':
                const sixMonthsAgo = new Date(today);
                sixMonthsAgo.setMonth(today.getMonth() - 6);
                return {
                    from: sixMonthsAgo.toISOString().split('T')[0],
                    to: todayStr,
                    interval: 'daily'
                };
                
            case 'ytd':
                const yearStart = new Date(today.getFullYear(), 0, 1);
                return {
                    from: yearStart.toISOString().split('T')[0],
                    to: todayStr,
                    interval: 'daily'
                };
                
            case 'custom':
                // Custom range should be handled with additional parameters
                // For now, default to last month if no custom dates provided
                const defaultStart = new Date(today);
                defaultStart.setMonth(today.getMonth() - 1);
                return {
                    from: defaultStart.toISOString().split('T')[0],
                    to: todayStr,
                    interval: 'daily'
                };
                
            case 'ALL':
                logger.log('🔎 Processing ALL time period...');
                // Get the earliest transaction date from all positions and their history
                // This ensures "All Time" starts from the actual first investment, not earlier
                if (positions && positions.length > 0) {
                    logger.log('📋 Analyzing positions for earliest date:');
                    positions.forEach((pos, index) => {
                        logger.log(`  Position ${index + 1}: ${pos.ticker}, purchaseDate: ${pos.purchaseDate}, quantity: ${pos.quantity}`);
                        if (pos.history) {
                            logger.log(`    Has history: ${pos.history.length} transactions`);
                            pos.history.forEach((tx, txIndex) => {
                                logger.log(`      TX ${txIndex + 1}: date=${tx.purchaseDate}, qty=${tx.quantity}, price=${tx.purchasePrice}`);
                            });
                        }
                    });
                    
                    let earliestDate = new Date('2099-12-31'); // Initialize with far future date
                    
                    positions.forEach(pos => {
                        // Check main purchase date (initial position) - only if it exists
                        if (pos.purchaseDate) {
                            const posDate = new Date(pos.purchaseDate);
                            logger.log(`📅 Checking main purchase date: ${pos.ticker} -> ${pos.purchaseDate} (parsed as ${posDate})`);
                            if (!isNaN(posDate.getTime()) && posDate < earliestDate) {
                                earliestDate = posDate;
                                logger.log(`  ✅ New earliest date: ${earliestDate.toISOString().split('T')[0]}`);
                            }
                        } else {
                            logger.log(`📅 Skipping main purchase date for ${pos.ticker} (undefined)`);
                        }
                        
                        // Check transaction history if it exists (multiple transactions for same ticker)
                        if (pos.history && pos.history.length > 0) {
                            pos.history.forEach(transaction => {
                                const transactionDate = new Date(transaction.purchaseDate || transaction.date);
                                logger.log(`📅 Checking history date: ${transaction.purchaseDate || transaction.date} (parsed as ${transactionDate})`);
                                if (!isNaN(transactionDate.getTime()) && transactionDate < earliestDate) {
                                    earliestDate = transactionDate;
                                    logger.log(`  ✅ New earliest date from history: ${earliestDate.toISOString().split('T')[0]}`);
                                }
                            });
                        }
                        
                        // Also check additionalTransactions format (backup compatibility)
                        if (pos.additionalTransactions && pos.additionalTransactions.length > 0) {
                            pos.additionalTransactions.forEach(transaction => {
                                const transactionDate = new Date(transaction.purchaseDate || transaction.date);
                                logger.log(`📅 Checking additional transaction date: ${transaction.purchaseDate || transaction.date} (parsed as ${transactionDate})`);
                                if (!isNaN(transactionDate.getTime()) && transactionDate < earliestDate) {
                                    earliestDate = transactionDate;
                                    logger.log(`  ✅ New earliest date from additional: ${earliestDate.toISOString().split('T')[0]}`);
                                }
                            });
                        }
                    });
                    
                    logger.log(`🚀 Portfolio Chart - All Time period starting from: ${earliestDate.toISOString().split('T')[0]} (first investment date)`);
                    
                    // Start exactly from the first investment date - no padding
                    return {
                        from: earliestDate.toISOString().split('T')[0],
                        to: todayStr,
                        interval: 'daily'
                    };
                }
                
                // Default to 2 years if no positions
                const twoYearsAgo = new Date(today);
                twoYearsAgo.setFullYear(today.getFullYear() - 2);
                return {
                    from: twoYearsAgo.toISOString().split('T')[0],
                    to: todayStr,
                    interval: 'daily'
                };
                
            default:
                return {
                    from: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    to: todayStr,
                    interval: 'daily'
                };
        }
    }
};
