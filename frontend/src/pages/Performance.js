import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartLine, faCalendarAlt, faArrowUp, faArrowDown } from '@fortawesome/free-solid-svg-icons';

const Performance = ({ 
    portfolioStats = {
        totalValue: 0,
        totalInvested: 0,
        totalPL: 0,
        totalReturn: 0,
        annualizedReturn: 0,
        hasMarketData: false
    }, 
    formatCurrency 
}) => {
    // Sample historical data - in real app this would come from calculations
    const yearlyPerformance = [
        { year: 2024, return: 15.2, value: 1288.54, invested: 423.05, gain: 865.49 },
        { year: 2023, return: 12.8, value: 950.00, invested: 380.00, gain: 570.00 },
        { year: 2022, return: -8.5, value: 420.00, invested: 280.00, gain: 140.00 },
    ];

    const monthlyPerformance2024 = [
        { month: 'Jan', return: 2.1 },
        { month: 'Feb', return: -1.5 },
        { month: 'Mar', return: 3.2 },
        { month: 'Apr', return: 1.8 },
        { month: 'May', return: -0.8 },
        { month: 'Jun', return: 2.7 },
        { month: 'Jul', return: 1.9 },
    ];

    return (
        <div className="page-container">
            <div className="page-header">
                <div className="page-title">
                    <FontAwesomeIcon icon={faChartLine} className="page-icon" />
                    <div>
                        <h1>Performance History</h1>
                        <p>Track your portfolio's performance over time</p>
                    </div>
                </div>
            </div>

            <div className="page-content">
                {/* Current Performance Summary */}
                <div className="performance-summary">
                    <div className="summary-card highlight">
                        <h3>Current Total Return</h3>
                        <div className={`summary-value ${(portfolioStats.totalReturn || 0) >= 0 ? 'positive' : 'negative'}`}>
                            {(portfolioStats.totalReturn || 0).toFixed(2)}%
                        </div>
                        <div className="summary-detail">
                            {formatCurrency(portfolioStats.totalPL)} of {formatCurrency(portfolioStats.totalInvested)}
                        </div>
                    </div>
                    <div className="summary-card">
                        <h3>Annualized Return</h3>
                        <div className={`summary-value ${(portfolioStats.annualizedReturn || 0) >= 0 ? 'positive' : 'negative'}`}>
                            {(portfolioStats.annualizedReturn || 0).toFixed(2)}%
                        </div>
                        <div className="summary-detail">XIRR Method</div>
                    </div>
                    <div className="summary-card">
                        <h3>Best Year</h3>
                        <div className="summary-value positive">15.2%</div>
                        <div className="summary-detail">2024 (Current)</div>
                    </div>
                    <div className="summary-card">
                        <h3>Time Invested</h3>
                        <div className="summary-value">3 Years</div>
                        <div className="summary-detail">Since 2022</div>
                    </div>
                </div>

                {/* Yearly Performance */}
                <div className="yearly-performance-section">
                    <div className="section-header">
                        <h2>Yearly Performance</h2>
                    </div>
                    
                    <div className="performance-table">
                        <div className="table-header">
                            <div className="header-cell year">Year</div>
                            <div className="header-cell return">Return</div>
                            <div className="header-cell value">Portfolio Value</div>
                            <div className="header-cell invested">Total Invested</div>
                            <div className="header-cell gain">Gain/Loss</div>
                        </div>
                        
                        {yearlyPerformance.map((year) => (
                            <div key={year.year} className="table-row">
                                <div className="table-cell year">
                                    <span className="year-badge">{year.year}</span>
                                </div>
                                <div className="table-cell return">
                                    <div className={`return-container ${year.return >= 0 ? 'positive' : 'negative'}`}>
                                        <FontAwesomeIcon 
                                            icon={year.return >= 0 ? faArrowUp : faArrowDown} 
                                            className="return-icon"
                                        />
                                        <span className="return-value">{Math.abs(year.return).toFixed(1)}%</span>
                                    </div>
                                </div>
                                <div className="table-cell value">
                                    <span className="currency-value">{formatCurrency(year.value)}</span>
                                </div>
                                <div className="table-cell invested">
                                    <span className="currency-value">{formatCurrency(year.invested)}</span>
                                </div>
                                <div className="table-cell gain">
                                    <span className={`currency-value ${year.gain >= 0 ? 'positive' : 'negative'}`}>
                                        {year.gain >= 0 ? '+' : ''}{formatCurrency(year.gain)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Monthly Performance 2024 */}
                <div className="monthly-performance-section">
                    <div className="section-header">
                        <h2>2024 Monthly Performance</h2>
                    </div>
                    
                    <div className="monthly-chart">
                        {monthlyPerformance2024.map((month, index) => (
                            <div key={month.month} className="month-bar">
                                <div className="month-label">{month.month}</div>
                                <div className="bar-container">
                                    <div 
                                        className={`performance-bar ${month.return >= 0 ? 'positive' : 'negative'}`}
                                        style={{ 
                                            height: `${Math.abs(month.return) * 10}px`,
                                            minHeight: '4px'
                                        }}
                                    ></div>
                                </div>
                                <div className={`month-value ${month.return >= 0 ? 'positive' : 'negative'}`}>
                                    {month.return >= 0 ? '+' : ''}{month.return.toFixed(1)}%
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Performance Metrics */}
                <div className="metrics-section">
                    <div className="section-header">
                        <h2>Key Metrics</h2>
                    </div>
                    
                    <div className="metrics-grid">
                        <div className="metric-card">
                            <h4>Best Month</h4>
                            <div className="metric-value positive">+3.2%</div>
                            <div className="metric-detail">March 2024</div>
                        </div>
                        <div className="metric-card">
                            <h4>Worst Month</h4>
                            <div className="metric-value negative">-1.5%</div>
                            <div className="metric-detail">February 2024</div>
                        </div>
                        <div className="metric-card">
                            <h4>Win Rate</h4>
                            <div className="metric-value">71.4%</div>
                            <div className="metric-detail">5 of 7 months</div>
                        </div>
                        <div className="metric-card">
                            <h4>Avg Monthly Return</h4>
                            <div className="metric-value positive">+1.3%</div>
                            <div className="metric-detail">2024 YTD</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Performance;
