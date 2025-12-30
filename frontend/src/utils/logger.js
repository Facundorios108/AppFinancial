/**
 * Logger utility for conditional logging
 * Only logs in development mode to improve production performance
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
    log: (...args) => {
        if (isDevelopment) {
            console.log(...args);
        }
    },
    
    warn: (...args) => {
        if (isDevelopment) {
            console.warn(...args);
        }
    },
    
    error: (...args) => {
        // Always log errors, even in production
        console.error(...args);
    },
    
    info: (...args) => {
        if (isDevelopment) {
            console.info(...args);
        }
    },
    
    debug: (...args) => {
        if (isDevelopment) {
            console.debug(...args);
        }
    },
    
    table: (data) => {
        if (isDevelopment && console.table) {
            console.table(data);
        }
    }
};

export default logger;
