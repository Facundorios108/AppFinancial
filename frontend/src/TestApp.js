import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Simple test components
const Dashboard = () => <div>Dashboard Works!</div>;
const Stocks = () => <div>Stocks Works!</div>;

const TestApp = () => {
    return (
        <BrowserRouter>
            <div>
                <h1>Testing Router</h1>
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/stocks" element={<Stocks />} />
                </Routes>
            </div>
        </BrowserRouter>
    );
};

export default TestApp;
