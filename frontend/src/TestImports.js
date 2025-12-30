// Test imports to identify the problematic component
import React from 'react';

console.log('Testing Dashboard import...');
try {
    const Dashboard = require('./pages/Dashboard').default;
    console.log('Dashboard imported successfully:', typeof Dashboard);
    console.log('Dashboard:', Dashboard);
} catch (error) {
    console.error('Dashboard import failed:', error);
}

console.log('Testing Stocks import...');
try {
    const Stocks = require('./pages/Stocks').default;
    console.log('Stocks imported successfully:', typeof Stocks);
    console.log('Stocks:', Stocks);
} catch (error) {
    console.error('Stocks import failed:', error);
}

export default function TestComponent() {
    return <div>Test Component</div>;
}
