import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWifi, faExclamationTriangle, faCheck, faSpinner } from '@fortawesome/free-solid-svg-icons';
import fmpService from '../services/fmpService';
import './FMPStatus.css';

const FMPStatus = () => {
    const [status, setStatus] = useState({ status: 'checking', message: 'Checking API status...' });
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        checkApiStatus();
        
        // Check status every 5 minutes
        const interval = setInterval(checkApiStatus, 5 * 60 * 1000);
        
        return () => clearInterval(interval);
    }, []);

    const checkApiStatus = async () => {
        try {
            const result = await fmpService.getApiStatus();
            setStatus(result);
            
            // Show status for a few seconds if there's an issue
            if (result.status === 'error') {
                setIsVisible(true);
                setTimeout(() => setIsVisible(false), 8000);
            }
        } catch (error) {
            setStatus({ status: 'error', message: 'Failed to check API status' });
            setIsVisible(true);
            setTimeout(() => setIsVisible(false), 8000);
        }
    };

    const getStatusIcon = () => {
        switch (status.status) {
            case 'connected':
                return <FontAwesomeIcon icon={faCheck} className="status-icon success" />;
            case 'error':
                return <FontAwesomeIcon icon={faExclamationTriangle} className="status-icon error" />;
            case 'checking':
            default:
                return <FontAwesomeIcon icon={faSpinner} className="status-icon checking" spin />;
        }
    };

    const getStatusColor = () => {
        switch (status.status) {
            case 'connected':
                return 'success';
            case 'error':
                return 'error';
            case 'checking':
            default:
                return 'checking';
        }
    };

    // Only show if there's an error or if explicitly made visible
    if (!isVisible && status.status === 'connected') {
        return null;
    }

    return (
        <div className={`fmp-status ${getStatusColor()}`} onClick={() => setIsVisible(false)}>
            <div className="status-content">
                {getStatusIcon()}
                <span className="status-text">
                    {status.status === 'connected' ? 'Market Data Connected (FMP)' : 'Market Data Issue'}
                </span>
                <FontAwesomeIcon icon={faWifi} className="wifi-icon" />
            </div>
            {status.status === 'error' && (
                <div className="status-details">
                    {status.message}
                    <br />
                    <small>Configure FMP API key in config/fmp.js</small>
                </div>
            )}
        </div>
    );
};

export default FMPStatus;
