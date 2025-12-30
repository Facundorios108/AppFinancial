// Archivo de prueba para probar las funciones de formateo
const formatMarketCap = (marketCap) => {
    if (!marketCap || marketCap <= 0) return 'N/A';
    
    if (marketCap >= 1e12) {
        return `${(marketCap / 1e12).toFixed(2)}T`;
    } else if (marketCap >= 1e9) {
        return `${(marketCap / 1e9).toFixed(2)}B`;
    } else if (marketCap >= 1e6) {
        return `${(marketCap / 1e6).toFixed(2)}M`;
    } else if (marketCap >= 1e3) {
        return `${(marketCap / 1e3).toFixed(2)}K`;
    } else {
        return marketCap.toString();
    }
};

// Pruebas
console.log('Airbnb (~80B):', formatMarketCap(80000000000)); // Should show 80.00B
console.log('Apple (~2.7T):', formatMarketCap(2700000000000)); // Should show 2.70T
console.log('Small cap (500M):', formatMarketCap(500000000)); // Should show 500.00M
console.log('Micro cap (50M):', formatMarketCap(50000000)); // Should show 50.00M
