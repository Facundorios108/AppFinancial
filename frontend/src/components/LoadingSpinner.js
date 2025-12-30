import React from 'react';

const LoadingSpinner = ({ size = 'medium', className = '' }) => {
    const sizeClass = size === 'small' ? 'small' : size === 'large' ? 'large' : '';
    
    return (
        <div className={`loading-spinner ${sizeClass} ${className}`}></div>
    );
};

export default LoadingSpinner;
