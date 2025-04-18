/**
 * Utility functions for BlackIntheBack Loan ToDo Application
 */

// Namespace for utility functions
const BbUtils = {
    /**
     * Format a date string to a more readable format
     * @param {string} dateString - The date string to format
     * @param {string} format - The format to use (default: 'MM/DD/YYYY')
     * @returns {string} - The formatted date string
     */
    formatDate: function(dateString, format = 'MM/DD/YYYY') {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        
        let formattedDate = format;
        formattedDate = formattedDate.replace('DD', day);
        formattedDate = formattedDate.replace('MM', month);
        formattedDate = formattedDate.replace('YYYY', year);
        
        return formattedDate;
    },
    
    /**
     * Format a number as currency
     * @param {number} amount - The amount to format
     * @param {string} currency - The currency symbol (default: '$')
     * @returns {string} - The formatted currency string
     */
    formatCurrency: function(amount, currency = '$') {
        if (amount === null || amount === undefined) return '';
        
        return currency + parseFloat(amount).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    },
    
    /**
     * Truncate a string to a specified length and add ellipsis
     * @param {string} str - The string to truncate
     * @param {number} length - The maximum length (default: 50)
     * @returns {string} - The truncated string
     */
    truncateString: function(str, length = 50) {
        if (!str) return '';
        
        if (str.length <= length) return str;
        
        return str.substring(0, length) + '...';
    },
    
    /**
     * Validate a loan number format
     * @param {string} loanNumber - The loan number to validate
     * @returns {boolean} - Whether the loan number is valid
     */
    validateLoanNumber: function(loanNumber) {
        if (!loanNumber) return false;
        
        // This is a simple validation - adjust the regex as needed
        const regex = /^\d{10}$/;
        return regex.test(loanNumber);
    },
    
    /**
     * Debounce a function to prevent multiple rapid calls
     * @param {Function} func - The function to debounce
     * @param {number} wait - The debounce wait time in milliseconds
     * @returns {Function} - The debounced function
     */
    debounce: function(func, wait = 300) {
        let timeout;
        
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    /**
     * Create a toast notification
     * @param {string} message - The message to display
     * @param {string} type - The type of toast (success, error, warning, info)
     * @param {number} duration - How long to show the toast in milliseconds
     */
    showToast: function(message, type = 'info', duration = 3000) {
        // Create toast container if it doesn't exist
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.style.position = 'fixed';
            toastContainer.style.top = '20px';
            toastContainer.style.right = '20px';
            toastContainer.style.zIndex = '9999';
            document.body.appendChild(toastContainer);
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.minWidth = '250px';
        toast.style.margin = '10px 0';
        toast.style.padding = '15px';
        toast.style.borderRadius = '4px';
        toast.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        toast.style.animation = 'fadeIn 0.3s ease-in-out';
        
        // Set background color based on type
        switch (type) {
            case 'success':
                toast.style.backgroundColor = '#2ecc71';
                toast.style.color = 'white';
                break;
            case 'error':
                toast.style.backgroundColor = '#e74c3c';
                toast.style.color = 'white';
                break;
            case 'warning':
                toast.style.backgroundColor = '#f39c12';
                toast.style.color = 'white';
                break;
            default:
                toast.style.backgroundColor = '#3498db';
                toast.style.color = 'white';
        }
        
        // Add message
        toast.textContent = message;
        
        // Add to container
        toastContainer.appendChild(toast);
        
        // Remove after duration
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease-in-out';
            setTimeout(() => {
                toastContainer.removeChild(toast);
            }, 300);
        }, duration);
    },
    
    /**
     * Copy text to clipboard
     * @param {string} text - The text to copy
     * @returns {Promise} - A promise that resolves when the text is copied
     */
    copyToClipboard: function(text) {
        return navigator.clipboard.writeText(text)
            .then(() => {
                this.showToast('Copied to clipboard!', 'success');
                return true;
            })
            .catch(err => {
                console.error('Failed to copy text: ', err);
                this.showToast('Failed to copy to clipboard', 'error');
                return false;
            });
    },
    
    /**
     * Get URL parameters as an object
     * @returns {Object} - An object containing all URL parameters
     */
    getUrlParams: function() {
        const params = {};
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        
        for (const [key, value] of urlParams.entries()) {
            params[key] = value;
        }
        
        return params;
    },
    
    /**
     * Set a cookie
     * @param {string} name - The cookie name
     * @param {string} value - The cookie value
     * @param {number} days - How many days until the cookie expires
     */
    setCookie: function(name, value, days = 30) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        const expires = `expires=${date.toUTCString()}`;
        document.cookie = `${name}=${value};${expires};path=/`;
    },
    
    /**
     * Get a cookie value
     * @param {string} name - The cookie name
     * @returns {string} - The cookie value
     */
    getCookie: function(name) {
        const cookieName = `${name}=`;
        const cookies = document.cookie.split(';');
        
        for (let i = 0; i < cookies.length; i++) {
            let cookie = cookies[i].trim();
            if (cookie.indexOf(cookieName) === 0) {
                return cookie.substring(cookieName.length, cookie.length);
            }
        }
        
        return '';
    },
    
    /**
     * Delete a cookie
     * @param {string} name - The cookie name
     */
    deleteCookie: function(name) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
    },
    
    /**
     * Generate a random ID
     * @param {number} length - The length of the ID (default: 10)
     * @returns {string} - The random ID
     */
    generateId: function(length = 10) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        
        return result;
    }
};

// Make utilities available globally
window.BbUtils = BbUtils;