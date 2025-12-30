export const formatCurrency = (value) => {
    if (typeof value !== 'number') {
        value = 0;
    }

    const formattedValue = new Intl.NumberFormat('de-DE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);

    return `$${formattedValue}`;
};
