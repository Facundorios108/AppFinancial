import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWifi, faExclamationTriangle, faCheck, faSpinner, faTimes } from '@fortawesome/free-solid-svg-icons';
import fmpService from '../services/fmpService';
import logger from '../utils/logger';
import './FMPStatus.css';

const FMPStatus = () => {
    const [status, setStatus] = useState({ status: 'checking', message: 'Checking API status...' });
    const [isVisible, setIsVisible] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

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
            
            // Show status for errors only if not manually dismissed
            if (result.status === 'error' && !isDismissed) {
                setIsVisible(true);
                // Auto-hide after 5 seconds
                setTimeout(() => {
                    setIsVisible(false);
                }, 5000);
            } else if (result.status === 'connected') {
                // Reset dismissal when connection is restored
                setIsDismissed(false);
                setIsVisible(false);
            }
        } catch (error) {
            logger.error('Error checking FMP API status:', error);
            if (!isDismissed) {
                setStatus({ status: 'error', message: 'Failed to check API status' });
                setIsVisible(true);
                // Auto-hide after 5 seconds
                setTimeout(() => {
                    setIsVisible(false);
                }, 5000);
            }
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
        setIsDismissed(true);
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

    // Only show if visible and not manually dismissed
    if (!isVisible || isDismissed) {
        return null;
    }

    return (
        <div className={`fmp-status ${getStatusColor()}`}>
            <div className="status-content">
                {getStatusIcon()}
                <span className="status-text">
                    {status.status === 'connected' ? 'Market Data Connected (FMP)' : 'Market Data Issue'}
                </span>
                <FontAwesomeIcon icon={faWifi} className="wifi-icon" />
                <button className="dismiss-btn" onClick={handleDismiss} title="Dismiss">
                    <FontAwesomeIcon icon={faTimes} />
                </button>
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
