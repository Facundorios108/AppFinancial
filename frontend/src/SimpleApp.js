import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const SimpleApp = () => {
    return (
        <BrowserRouter>
            <div>
                <h1>Testing React Router</h1>
                <Routes>
                    <Route path="/" element={<div>Dashboard Works!</div>} />
                    <Route path="/stocks" element={<div>Stocks Works!</div>} />
                </Routes>
            </div>
        </BrowserRouter>
    );
};

export default SimpleApp;
