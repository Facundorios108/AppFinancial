import React, { useMemo, useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartLine, faArrowUp, faArrowDown, faChevronDown, faSpinner } from '@fortawesome/free-solid-svg-icons';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { historicalDataService } from '../services/historicalDataService';
import logger from '../utils/logger';
import './PortfolioChart.css';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const PortfolioChart = ({ 
    positions, 
    timePeriod = 'last2Weeks', 
    onTimePeriodChange, 
    isWidget = false, 
    totalInvested = 0, 
    totalValue,
    showPeriodGains = false,
    formatCurrencyProp
}) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [historicalData, setHistoricalData] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [contentVisible, setContentVisible] = useState(true);
    const [showCustomModal, setShowCustomModal] = useState(false);
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    
    // Debug logging
    logger.log(`📊 PortfolioChart - Mode: ${isWidget ? 'WIDGET' : 'STANDALONE'}, Period: ${timePeriod}, Positions: ${positions?.length || 0}`);
    
    // Time period options - Exactly matching Realized section
    const timePeriods = [
        { value: 'last2Weeks', label: '2 weeks', icon: '📅' },
        { value: 'last1Month', label: '1 month', icon: '📊' },
        { value: 'last3Months', label: '3 months', icon: '📈' },
        { value: 'last6Months', label: '6 months', icon: '📉' },
        { value: 'ytd', label: 'YTD', icon: '🗓️' },
        { value: 'custom', label: 'Custom range', icon: '⚙️' }
    ];

    const getCurrentPeriodData = () => {
        return timePeriods.find(p => p.value === timePeriod) || timePeriods[1];
    };

    const handlePeriodChange = (newPeriod) => {
        if (newPeriod === 'custom') {
            setShowCustomModal(true);
            setIsDropdownOpen(false);
        } else if (newPeriod !== timePeriod && onTimePeriodChange) {
            // Cerrar dropdown
            setIsDropdownOpen(false);
            
            // Iniciar transición suave
            setContentVisible(false);
            
            setTimeout(() => {
                setIsTransitioning(true);
                
                setTimeout(() => {
                    onTimePeriodChange(newPeriod);
                }, 100);
            }, 200); // Tiempo para fade-out
        }
    };

    // Funciones para custom range
    const handleCustomRangeApply = () => {
        if (customStartDate && customEndDate) {
            setShowCustomModal(false);
            
            // Mismo proceso de transición suave
            setContentVisible(false);
            
            setTimeout(() => {
                setIsTransitioning(true);
                
                setTimeout(() => {
                    onTimePeriodChange('custom', { start: customStartDate, end: customEndDate });
                }, 100);
            }, 200);
        }
    };

    const handleCustomRangeCancel = () => {
        setShowCustomModal(false);
    };

    // Fetch historical data when positions or timePeriod changes
    useEffect(() => {
        const fetchHistoricalData = async () => {
            logger.log('🚀 fetchHistoricalData - Starting fetch');
            logger.log('📊 Input positions:', positions?.length || 0);
            logger.log('⏰ Time period:', timePeriod);
            
            if (!positions || positions.length === 0) {
                logger.log('❌ No positions available, clearing historical data');
                setHistoricalData({});
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                // Get unique symbols from positions
                const symbols = [...new Set(positions.map(pos => pos.ticker))];
                logger.log('🏷️ Unique symbols:', symbols);
                
                // Get date range for the selected period
                const dateRange = historicalDataService.getDateRange(timePeriod, positions);
                logger.log('📅 Date range calculated:', dateRange);
                
                // Fetch historical data for all symbols
                logger.log('🔄 Fetching historical data...');
                const data = await historicalDataService.getMultipleHistoricalPrices(
                    symbols,
                    dateRange.from,
                    dateRange.to
                );
                
                logger.log('✅ Historical data received:', Object.keys(data || {}));
                logger.log('📈 Sample data for first symbol:', data[symbols[0]]?.slice(0, 3));
                
                // Check if we got any meaningful data
                const hasValidData = Object.values(data || {}).some(symbolData => 
                    Array.isArray(symbolData) && symbolData.length > 0
                );
                
                if (!hasValidData) {
                    setError('Unable to load historical data. This may be due to API limits or insufficient credits.');
                } else {
                    setHistoricalData(data);
                }
            } catch (err) {
                logger.error('💥 Error fetching historical data:', err);
                setError('Failed to load historical data. Please check your API configuration.');
            } finally {
                // Manejar el final de la carga según el tipo
                if (isTransitioning) {
                    setTimeout(() => {
                        setIsTransitioning(false);
                        
                        setTimeout(() => {
                            setContentVisible(true);
                        }, 100);
                    }, 300);
                } else {
                    setIsLoading(false);
                }
            }
        };

        fetchHistoricalData();
    }, [positions, timePeriod]);

    // Close dropdown when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (isDropdownOpen && !event.target.closest('.chart-period-dropdown')) {
                setIsDropdownOpen(false);
            }
        };

        const handleEscapeKey = (event) => {
            if (event.key === 'Escape' && isDropdownOpen) {
                setIsDropdownOpen(false);
            }
        };

        if (isDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscapeKey);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscapeKey);
        };
    }, [isDropdownOpen]);

    const chartData = useMemo(() => {
        logger.log('🔍 chartData useMemo - Starting calculation');
        logger.log('📊 Positions:', positions?.length || 0, positions);
        logger.log('📈 Historical data keys:', Object.keys(historicalData || {}));
        
        if (!positions || positions.length === 0 || Object.keys(historicalData).length === 0) {
            logger.log('❌ No positions or historical data available');
            return null;
        }

        try {
            // Get date range for the selected period
            const dateRange = historicalDataService.getDateRange(timePeriod, positions);
            logger.log('📅 Date range:', dateRange);
            
            // Generate portfolio time series with real data
            const timeSeries = historicalDataService.generatePortfolioTimeSeries(
                positions,
                historicalData,
                dateRange.from,
                dateRange.to,
                dateRange.interval
            );
            
            logger.log('⏰ Time series generated:', timeSeries?.length || 0, 'points');
            logger.log('📊 First few time series points:', timeSeries?.slice(0, 3));

            if (timeSeries.length === 0) {
                logger.log('❌ Empty time series returned');
                return null;
            }

            // Format data for chart display
            const chartDataPoints = timeSeries.map(point => {
                const date = new Date(point.date);
                let label;

                switch (timePeriod) {
                    case '7D':
                        label = date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
                        break;
                    case '30D':
                        label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        break;
                    case '1Y':
                    case 'YTD':
                        label = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                        break;
                    case 'ALL':
                        label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                        break;
                    default:
                        label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }

                return {
                    date: point.date,
                    value: point.value,
                    label: label
                };
            });
            
            logger.log('✅ Chart data points processed:', chartDataPoints?.length || 0);
            logger.log('💰 Value range:', {
                min: Math.min(...chartDataPoints.map(p => p.value)),
                max: Math.max(...chartDataPoints.map(p => p.value))
            });

            return chartDataPoints;
        } catch (error) {
            logger.error('💥 Error processing chart data:', error);
            return null;
        }
    }, [positions, historicalData, timePeriod]);

    // Calculate performance metrics based on the selected period
    const performanceMetrics = useMemo(() => {
        if (!chartData || chartData.length === 0) {
            return {
                currentValue: typeof totalValue !== 'undefined' ? totalValue : 0,
                startValue: 0,
                changeAmount: 0,
                changePercent: 0,
                isPositive: false
            };
        }

        // Usar el valor profesional pasado por prop si está definido
        const currentValue = typeof totalValue !== 'undefined' ? totalValue : (chartData[chartData.length - 1]?.value || 0);

        // ✅ NUEVA LÓGICA: Calcular rendimiento específico por período
        let baseValue;
        let changeAmount;
        let changePercent;

        if (timePeriod === 'ALL') {
            // Para "All Time", usar el total invertido como base (rendimiento total acumulado)
            baseValue = totalInvested > 0 ? totalInvested : (chartData[0]?.value || 0);
            changeAmount = currentValue - baseValue;
            changePercent = baseValue > 0 ? (changeAmount / baseValue) * 100 : 0;
        } else {
            // Para períodos específicos (7D, 30D, 1Y, YTD), usar el primer valor del período
            const startValue = chartData[0]?.value || 0;
            baseValue = startValue;
            changeAmount = currentValue - startValue;
            changePercent = startValue > 0 ? (changeAmount / startValue) * 100 : 0;
        }

        const isPositive = changeAmount >= 0;

        logger.log(`📊 PortfolioChart Metrics Calculation (${timePeriod}):`);
        logger.log(`  💰 Current Value: $${currentValue.toFixed(2)}`);
        logger.log(`  💰 Base Value: $${baseValue.toFixed(2)} ${timePeriod === 'ALL' ? '(Total Invested)' : '(Period Start)'}`);
        logger.log(`  📈 Change Amount: $${changeAmount.toFixed(2)}`);
        logger.log(`  📊 Change Percent: ${changePercent.toFixed(2)}%`);

        return {
            currentValue,
            startValue: baseValue,
            changeAmount,
            changePercent,
            isPositive
        };
    }, [chartData, timePeriod, totalInvested, totalValue]);

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    // Show loading state with subtle overlay
    const showLoadingOverlay = isLoading && (!chartData || chartData.length === 0);

    // Show error state
    if (error) {
        return (
            <div className="chart-placeholder" style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 16,
                minHeight: 220,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24
            }}>
                <div className="error-message" style={{ 
                    textAlign: 'center'
                }}>
                    <FontAwesomeIcon 
                        icon={faChartLine} 
                        style={{ 
                            color: '#ef4444', 
                            fontSize: 32, 
                            marginBottom: 16,
                            display: 'block'
                        }} 
                    />
                    <h4 style={{ 
                        color: '#ffffff', 
                        fontSize: 18,
                        fontWeight: '600',
                        margin: 0
                    }}>
                        Chart Unavailable
                    </h4>
                </div>
            </div>
        );
    }

    // Show placeholder when no data and not loading
    if (!chartData || chartData.length === 0) {
        if (showLoadingOverlay) {
            // Loading: formato unificado consistente con el resto de la app
            return (
                <div className="chart-placeholder" style={{
                    background: 'rgba(255, 255, 255, 0.05)', // Fondo sutil
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 16,
                    minHeight: 220,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'none',
                    padding: 20
                }}>
                    <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        gap: 12,
                        textAlign: 'center'
                    }}>
                        <FontAwesomeIcon 
                            icon={faSpinner} 
                            spin 
                            style={{ 
                                fontSize: 24, 
                                color: 'rgba(255, 255, 255, 0.7)' 
                            }} 
                        />
                        <span style={{ 
                            color: 'rgba(255, 255, 255, 0.9)', 
                            fontSize: 14, 
                            fontWeight: '500',
                            letterSpacing: '-0.025em',
                            margin: 0
                        }}>
                            Loading chart data...
                        </span>
                    </div>
                </div>
            );
        }
        // Placeholder cuando no hay datos
        return (
            <div className="chart-placeholder" style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 16,
                minHeight: 220,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24
            }}>
                <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    gap: 12,
                    textAlign: 'center',
                    maxWidth: 280
                }}>
                    <FontAwesomeIcon 
                        icon={faChartLine} 
                        style={{ 
                            fontSize: 28, 
                            color: 'rgba(255, 255, 255, 0.5)' 
                        }} 
                    />
                    <div style={{ textAlign: 'center' }}>
                        <h4 style={{ 
                            color: 'rgba(255, 255, 255, 0.9)', 
                            marginBottom: 8, 
                            fontSize: 16,
                            fontWeight: '600',
                            letterSpacing: '-0.025em',
                            margin: '0 0 8px 0'
                        }}>
                            {showPeriodGains ? 'Portfolio Performance' : 'Portfolio Growth'}
                        </h4>
                        <p style={{ 
                            color: 'rgba(255, 255, 255, 0.7)', 
                            fontSize: 14,
                            margin: 0,
                            lineHeight: 1.4
                        }}>
                            Add positions to see your portfolio evolution
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Extract metrics from the calculated object
    const { currentValue, startValue, changeAmount, changePercent, isPositive } = performanceMetrics;

    const chartConfig = {
        labels: chartData.map(d => d.label),
        datasets: [
            {
                label: 'Portfolio Value',
                data: chartData.map(d => d.value),
                borderColor: isPositive ? '#10b981' : '#ef4444',
                backgroundColor: (context) => {
                    const chart = context.chart;
                    const {ctx, chartArea} = chart;
                    if (!chartArea) return null;
                    
                    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                    if (isPositive) {
                        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.3)');
                        gradient.addColorStop(1, 'rgba(16, 185, 129, 0.05)');
                    } else {
                        gradient.addColorStop(0, 'rgba(239, 68, 68, 0.3)');
                        gradient.addColorStop(1, 'rgba(239, 68, 68, 0.05)');
                    }
                    return gradient;
                },
                borderWidth: 3,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: isPositive ? '#10b981' : '#ef4444',
                pointHoverBorderColor: '#ffffff',
                pointHoverBorderWidth: 2,
                tension: 0.4,
                fill: true
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            intersect: false,
            mode: 'index'
        },
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                titleColor: '#ffffff',
                bodyColor: '#ffffff',
                borderColor: isPositive ? '#10b981' : '#ef4444',
                borderWidth: 1,
                cornerRadius: 8,
                padding: 12,
                displayColors: false,
                callbacks: {
                    title: (context) => {
                        const dataIndex = context[0].dataIndex;
                        const date = new Date(chartData[dataIndex].date);
                        return date.toLocaleDateString('en-US', { 
                            weekday: 'short',
                            month: 'short', 
                            day: 'numeric' 
                        });
                    },
                    label: (context) => {
                        return `Portfolio Value: ${formatCurrency(context.parsed.y)}`;
                    }
                }
            }
        },
        scales: {
            x: {
                display: true,
                grid: {
                    display: false
                },
                ticks: {
                    color: '#9ca3af',
                    font: {
                        size: 11,
                        family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                    },
                    maxTicksLimit: 6
                }
            },
            y: {
                display: true,
                position: 'right',
                grid: {
                    color: 'rgba(156, 163, 175, 0.1)',
                    drawBorder: false
                },
                ticks: {
                    color: '#9ca3af',
                    font: {
                        size: 11,
                        family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                    },
                    callback: (value) => {
                        if (value >= 1000000) {
                            return `$${(value / 1000000).toFixed(1)}M`;
                        } else if (value >= 1000) {
                            return `$${(value / 1000).toFixed(0)}K`;
                        }
                        return `$${value}`;
                    },
                    maxTicksLimit: 5
                }
            }
        }
    };

    return (
        <div className={isWidget ? "widget-chart-content" : "portfolio-chart-widget"}>
            {/* Subtle loading overlay when updating existing data */}
            {isLoading && chartData && chartData.length > 0 && (
                <div className="chart-loading-overlay">
                    <div className="loading-indicator">
                        <div className="loading-dots">
                            <div className="dot"></div>
                            <div className="dot"></div>
                            <div className="dot"></div>
                        </div>
                    </div>
                </div>
            )}
            
            {!isWidget && (
                <div className="chart-header">
                    <div className="chart-title">
                        <FontAwesomeIcon icon={faChartLine} className="chart-icon" />
                        <span>Portfolio Growth</span>
                        {isLoading && chartData && chartData.length > 0 && (
                            <FontAwesomeIcon icon={faSpinner} spin className="title-loading-icon" />
                        )}
                    </div>
                    <div className="chart-period-dropdown">
                        <div 
                            className={`period-selector ${isDropdownOpen ? 'open' : ''}`}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsDropdownOpen(!isDropdownOpen);
                            }}
                        >
                            <span className="period-icon">{getCurrentPeriodData().icon}</span>
                            <span className="period-label">{getCurrentPeriodData().label}</span>
                            <FontAwesomeIcon 
                                icon={faChevronDown} 
                                className={`dropdown-arrow ${isDropdownOpen ? 'rotated' : ''}`}
                            />
                        </div>
                        {isDropdownOpen && (
                            <div className="period-dropdown-menu">
                                {timePeriods.map((period) => (
                                    <div
                                        key={period.value}
                                        className={`period-option ${period.value === timePeriod ? 'selected' : ''}`}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setIsDropdownOpen(false);
                                            handlePeriodChange(period.value);
                                        }}
                                    >
                                        <span className="option-icon">{period.icon}</span>
                                        <span className="option-label">{period.label}</span>
                                        {period.value === timePeriod && (
                                            <span className="selected-indicator">✓</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {isWidget && !showPeriodGains && (
                <div className="widget-header">
                    <div className="widget-title-container">
                        <FontAwesomeIcon icon={faChartLine} className="widget-icon" />
                        <h3>Portfolio Growth</h3>
                    </div>
                    <div className="widget-actions">
                        <div className="chart-period-dropdown">
                            <div 
                                className={`widget-period-selector ${isDropdownOpen ? 'open' : ''}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setIsDropdownOpen(!isDropdownOpen);
                                }}
                            >
                                <span className="period-label-small">{getCurrentPeriodData().label}</span>
                                <FontAwesomeIcon 
                                    icon={faChevronDown} 
                                    className={`dropdown-arrow ${isDropdownOpen ? 'rotated' : ''}`}
                                />
                            </div>
                            {isDropdownOpen && (
                                <div className="period-dropdown-menu widget-dropdown">
                                    {timePeriods.map((period) => (
                                        <div
                                            key={period.value}
                                            className={`period-option ${period.value === timePeriod ? 'selected' : ''}`}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setIsDropdownOpen(false);
                                                handlePeriodChange(period.value);
                                            }}
                                        >
                                            <span className="option-icon">{period.icon}</span>
                                            <span className="option-label">{period.label}</span>
                                            {period.value === timePeriod && (
                                                <span className="selected-indicator">✓</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            <div className={isWidget ? "widget-chart-stats" : "chart-stats"}>
                {showPeriodGains ? (
                    <div className="period-gains-display">
                        <div className="period-label">
                            {getCurrentPeriodData().label}
                        </div>
                        <div className={`period-gains ${isPositive ? 'positive' : 'negative'}`}>
                            <div className="gains-amount">
                                {isPositive ? '+' : ''}{formatCurrencyProp ? formatCurrencyProp(changeAmount) : `$${changeAmount.toFixed(2)}`}
                            </div>
                            <div className="gains-percent">
                                ({isPositive ? '+' : ''}{currentValue > 0 ? ((changeAmount / currentValue) * 100).toFixed(2) : '0.00'}%)
                            </div>
                        </div>
                        <div className={`gains-indicator ${isPositive ? 'positive' : 'negative'}`}>
                            <FontAwesomeIcon 
                                icon={isPositive ? faArrowUp : faArrowDown} 
                                className="trend-icon"
                            />
                            <span className="period-trend">
                                {isPositive ? 'Gain' : 'Loss'}
                            </span>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="current-value">{formatCurrencyProp ? formatCurrencyProp(currentValue) : `$${currentValue.toFixed(2)}`}</div>
                        <div className={`change-indicator ${isPositive ? 'positive' : 'negative'}`}>
                            <FontAwesomeIcon 
                                icon={isPositive ? faArrowUp : faArrowDown} 
                                className="trend-icon"
                            />
                            <span className="change-amount">{formatCurrencyProp ? formatCurrencyProp(Math.abs(changeAmount)) : `$${Math.abs(changeAmount).toFixed(2)}`}</span>
                            <span className="change-percent">({Math.abs(changePercent).toFixed(1)}%)</span>
                        </div>
                    </>
                )}
            </div>
            
            <div className={`${isWidget ? "widget-chart-container" : "chart-container"} ${contentVisible ? 'visible' : 'hidden'}`}>
                <Line data={chartConfig} options={chartOptions} />
            </div>

            {/* Transition Loading Overlay */}
            {isTransitioning && (
                <div className="transition-overlay">
                    <div className="transition-loader">
                        <div className="loader-spinner"></div>
                        <p>Updating chart data...</p>
                    </div>
                </div>
            )}

            {/* Modal para Custom Range */}
            {showCustomModal && (
                <div className="modal-overlay">
                    <div className="modal-content custom-date-modal">
                        <div className="modal-header">
                            <h2>Select Custom Date Range</h2>
                            <button onClick={handleCustomRangeCancel} className="close-button">&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="date-inputs">
                                <div className="form-group">
                                    <label htmlFor="chartStartDate">Start Date</label>
                                    <input 
                                        type="date" 
                                        id="chartStartDate" 
                                        value={customStartDate} 
                                        onChange={(e) => setCustomStartDate(e.target.value)} 
                                        className="date-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="chartEndDate">End Date</label>
                                    <input 
                                        type="date" 
                                        id="chartEndDate" 
                                        value={customEndDate} 
                                        onChange={(e) => setCustomEndDate(e.target.value)} 
                                        className="date-input"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button onClick={handleCustomRangeCancel} className="btn btn-secondary">
                                Cancel
                            </button>
                            <button 
                                onClick={handleCustomRangeApply} 
                                className="btn btn-primary"
                                disabled={!customStartDate || !customEndDate}
                            >
                                Apply Range
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PortfolioChart;