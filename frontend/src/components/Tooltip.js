import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';

const Tooltip = ({ title, description, trigger, children }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const triggerRef = useRef(null);
    const tooltipRef = useRef(null);

    const calculatePosition = () => {
        if (!triggerRef.current) return;

        const triggerRect = triggerRef.current.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        // Position tooltip above the trigger with some spacing
        const tooltipTop = triggerRect.top + scrollTop - 10; // 10px above
        const tooltipLeft = triggerRect.left + scrollLeft + (triggerRect.width / 2); // Center horizontally
        
        setPosition({
            top: tooltipTop,
            left: tooltipLeft
        });
    };

    const handleMouseEnter = () => {
        calculatePosition();
        setIsVisible(true);
    };

    const handleMouseLeave = () => {
        setIsVisible(false);
    };

    // Recalculate position on window resize
    useEffect(() => {
        const handleResize = () => {
            if (isVisible) {
                calculatePosition();
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isVisible]);

    const tooltipContent = isVisible && (
        <div
            ref={tooltipRef}
            className="portal-tooltip"
            style={{
                position: 'absolute',
                top: position.top,
                left: position.left,
                transform: 'translateX(-50%) translateY(-100%)',
                zIndex: 10000
            }}
        >
            <div className="tooltip-content">
                <div className="tooltip-title">{title}</div>
                <div className="tooltip-description">{description}</div>
            </div>
        </div>
    );

    return (
        <>
            <div
                ref={triggerRef}
                className="tooltip-trigger"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {trigger || children || <FontAwesomeIcon icon={faInfoCircle} className="info-icon" />}
            </div>
            {tooltipContent && createPortal(tooltipContent, document.body)}
        </>
    );
};

export default Tooltip;
