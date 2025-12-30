import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPieChart, faChartLine } from '@fortawesome/free-solid-svg-icons';

const Allocation = ({ 
    positions = [], 
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
    // Calculate allocation percentages
    const allocationData = positions.map(position => {
        const positionValue = position.marketValue * position.quantity;
        const percentage = portfolioStats.totalValue > 0 ? (positionValue / portfolioStats.totalValue) * 100 : 0;
        
        return {
            ticker: position.ticker,
            value: positionValue,
            percentage: percentage,
            shares: position.quantity,
            avgPrice: position.avgPurchasePrice
        };
    }).sort((a, b) => b.percentage - a.percentage);

    return (
        <div className="page-container">
            <div className="page-header">
                <div className="page-title">
                    <FontAwesomeIcon icon={faPieChart} className="page-icon" />
                    <div>
                        <h1>Portfolio Allocation</h1>
                        <p>See how your investments are distributed</p>
                    </div>
                </div>
            </div>

            <div className="page-content">
                {/* Summary Stats */}
                <div className="allocation-summary">
                    <div className="summary-card">
                        <h3>Total Portfolio Value</h3>
                        <div className="summary-value">{formatCurrency(portfolioStats.totalValue)}</div>
                    </div>
                    <div className="summary-card">
                        <h3>Number of Positions</h3>
                        <div className="summary-value">{positions.length}</div>
                    </div>
                    <div className="summary-card">
                        <h3>Largest Position</h3>
                        <div className="summary-value">
                            {allocationData.length > 0 ? `${allocationData[0].percentage.toFixed(1)}%` : '0%'}
                        </div>
                    </div>
                </div>

                {/* Allocation Breakdown */}
                <div className="allocation-section">
                    <div className="section-header">
                        <h2>Position Breakdown</h2>
                    </div>
                    
                    {allocationData.length > 0 ? (
                        <div className="allocation-list">
                            {allocationData.map((item, index) => (
                                <div key={item.ticker} className="allocation-item">
                                    <div className="allocation-info">
                                        <div className="ticker-info">
                                            <span className="ticker">{item.ticker}</span>
                                            <span className="shares">{item.shares} shares @ {formatCurrency(item.avgPrice)}</span>
                                        </div>
                                        <div className="allocation-values">
                                            <span className="percentage">{item.percentage.toFixed(1)}%</span>
                                            <span className="value">{formatCurrency(item.value)}</span>
                                        </div>
                                    </div>
                                    <div className="allocation-bar">
                                        <div 
                                            className="allocation-fill"
                                            style={{ 
                                                width: `${item.percentage}%`,
                                                backgroundColor: `hsl(${(index * 137.5) % 360}, 70%, 50%)`
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <FontAwesomeIcon icon={faPieChart} className="empty-icon" />
                            <h3>No positions to analyze</h3>
                            <p>Add some positions to see your portfolio allocation breakdown.</p>
                        </div>
                    )}
                </div>

                {/* Allocation Chart Placeholder */}
                <div className="chart-section">
                    <div className="section-header">
                        <h2>Visual Allocation</h2>
                    </div>
                    <div className="chart-placeholder">
                        <FontAwesomeIcon icon={faPieChart} className="placeholder-icon" />
                        <h3>Pie Chart Coming Soon</h3>
                        <p>Interactive pie chart visualization will be implemented here</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Allocation;
