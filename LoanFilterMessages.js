// Loan Number Validator with Secure Access Control
// Copy and paste this entire script into your browser console

(function() {
    // ########## CORE UTILITIES ##########
    // Ensure Bootstrap is loaded
    function ensureBootstrapLoaded() {
        return new Promise((resolve, reject) => {
            // Check if Bootstrap is already loaded
            if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
                resolve();
                return;
            }
            
            // Load Bootstrap CSS if not already loaded
            if (!document.querySelector('link[href*="bootstrap"]')) {
                const bootstrapCSS = document.createElement('link');
                bootstrapCSS.rel = 'stylesheet';
                bootstrapCSS.href = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css';
                bootstrapCSS.integrity = 'sha384-T3c6CoIi6uLrA9TneNEoa7RxnatzjcDSCmG1MXxSR1GAsXEV/Dwwykc2MPK8M2HN';
                bootstrapCSS.crossOrigin = 'anonymous';
                document.head.appendChild(bootstrapCSS);
            }
            
            // Load Bootstrap Icons if not already loaded
            if (!document.querySelector('link[href*="bootstrap-icons"]')) {
                const bootstrapIcons = document.createElement('link');
                bootstrapIcons.rel = 'stylesheet';
                bootstrapIcons.href = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css';
                document.head.appendChild(bootstrapIcons);
            }
            
            // Load Bootstrap JS if not already loaded
            if (typeof bootstrap === 'undefined' || !bootstrap.Modal) {
                const bootstrapJS = document.createElement('script');
                bootstrapJS.src = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js';
                bootstrapJS.integrity = 'sha384-C6RzsynM9kWDrMNeT87bh95OGNyZPhcTNXj1NW7RuBCsyN/o0jlpcV8Qyq46cDfL';
                bootstrapJS.crossOrigin = 'anonymous';
                bootstrapJS.onload = resolve;
                bootstrapJS.onerror = reject;
                document.body.appendChild(bootstrapJS);
            }
        });
    }
    
    // Monitor value changes (similar to the reference file)
    function onValueChange(
        evalFunction,
        callback,
        options = {}
    ) {
        let lastValue = undefined;
        const startTime = new Date().getTime();
        const endTime = options.maxTime ? startTime + options.maxTime : null;
        const intervalId = setInterval(async () => {
            const currentTime = new Date().getTime();
            if (endTime && currentTime > endTime) {
                clearInterval(intervalId);
                return;
            }
            let newValue = await evalFunction();
            if (newValue === '') newValue = null;
        
            if (lastValue === newValue) return;
            lastValue = newValue;
        
            await callback(newValue, lastValue);
        }, 500);
    }
    
    // ########## UI COMPONENTS ##########
    // Create an unallowed element to replace content
    function createUnallowedElement() {
        const unallowed = document.createElement("div");
        unallowed.appendChild(document.createTextNode("You are not provisioned to access this loan"));
        unallowed.className = "access-denied-message";
        unallowed.style.display = "flex";
        unallowed.style.justifyContent = "center";
        unallowed.style.alignItems = "center";
        unallowed.style.height = "100px";
        unallowed.style.fontSize = "20px";
        unallowed.style.fontWeight = "bold";
        unallowed.style.color = "red";
        unallowed.style.position = "relative";
        unallowed.style.zIndex = "1";
        unallowed.style.backgroundColor = "#f8d7da";
        unallowed.style.padding = "20px";
        unallowed.style.borderRadius = "5px";
        unallowed.style.margin = "20px 0";
        unallowed.style.border = "1px solid #f5c6cb";

        return unallowed;
    }
    
    // ViewElement class to handle DOM manipulation
    class ViewElement {
        constructor() {
            // Find the main content element that contains loan details
            this.element = this.findMainContentElement();
            this.parent = this.element && this.element.parentElement;
            this.unallowed = createUnallowedElement();
            this.unallowedParent = document.querySelector("body") || document.documentElement;
        }
        
        findMainContentElement() {
            // Look for the loan number in the specific HTML structure
            const loanLabelElements = document.querySelectorAll('.fieldLabel');
            
            for (const labelElement of loanLabelElements) {
                if (labelElement.textContent.trim() === 'Loan Number:') {
                    // Get the container that holds the loan details
                    return labelElement.closest('.container') || 
                           labelElement.closest('.content') || 
                           labelElement.closest('main') || 
                           labelElement.closest('div');
                }
            }
            
            return null;
        }

        remove() {
            if (this.element) {
                // Store original display style
                this.originalDisplay = this.element.style.display;
                // Hide the element
                this.element.style.display = 'none';
                // Add the unallowed message
                if (this.parent) {
                    this.parent.insertBefore(this.unallowed, this.element);
                } else {
                    this.unallowedParent.appendChild(this.unallowed);
                }
            }
        }

        add() {
            if (this.element) {
                // Remove the unallowed message
                if (this.unallowed.parentNode) {
                    this.unallowed.remove();
                }
                // Restore the element
                this.element.style.display = this.originalDisplay || '';
            }
        }
    }
    
    // Function to create and show a Bootstrap modal that cannot be dismissed
    function showAccessDeniedModal() {
        // Remove any existing modal with the same ID
        const existingModal = document.getElementById('accessDeniedModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Create modal HTML - Note: no close button in header, static backdrop
        const modalHTML = `
        <div class="modal fade" id="accessDeniedModal" tabindex="-1" aria-labelledby="accessDeniedModalLabel" aria-hidden="true" data-bs-backdrop="static" data-bs-keyboard="false">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-danger text-white">
                        <h5 class="modal-title" id="accessDeniedModalLabel">Access Denied</h5>
                        <!-- No close button -->
                    </div>
                    <div class="modal-body">
                        <div class="d-flex align-items-center">
                            <i class="bi bi-exclamation-triangle-fill text-danger me-3" style="font-size: 2rem;"></i>
                            <p class="mb-0">You are not provisioned to access this loan</p>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" id="closeButton">Close</button>
                    </div>
                </div>
            </div>
        </div>
        `;
        
        // Append modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Get the modal element
        const modalElement = document.getElementById('accessDeniedModal');
        
        // Initialize the Bootstrap modal with options to prevent dismissal
        const modal = new bootstrap.Modal(modalElement, {
            backdrop: 'static',  // Prevents closing when clicking outside
            keyboard: false      // Prevents closing with ESC key
        });
        
        // Show the modal
        modal.show();
        
        // Add event listener to the "Close" button
        document.getElementById('closeButton').addEventListener('click', function() {
            // Redirect to a safe page or reload the current page
            window.location.href = window.location.origin;
            // Alternative: reload the current page
            // window.location.reload();
        });
        
        // Completely secure the page by hiding content and preventing interaction
        securePageContent();
        
        // Prevent modal from being closed programmatically
        preventModalDismissal(modal, modalElement);
    }
    
    // Function to completely secure the page content
    function securePageContent() {
        // 1. Create a style element to hide ALL content except our modal
        const styleElement = document.createElement('style');
        styleElement.id = 'loan-access-denied-styles';
        styleElement.textContent = `
            /* Hide everything except our modal */
            body > *:not(#accessDeniedModal):not(script):not(link):not(style) {
                display: none !important;
            }
            
            /* Create a full-page overlay that sits behind the modal */
            body::before {
                content: "";
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(255, 255, 255, 0.95);
                z-index: 1040;
            }
            
            /* Make sure the modal is visible and on top */
            #accessDeniedModal {
                display: block !important;
                z-index: 1050 !important;
            }
            
            /* Ensure modal backdrop is visible */
            .modal-backdrop {
                z-index: 1045 !important;
            }
        `;
        document.head.appendChild(styleElement);
        
        // 2. Create a full-page overlay div that captures all clicks
        const overlay = document.createElement('div');
        overlay.id = 'securityOverlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        overlay.style.zIndex = '1039'; // Just below the modal backdrop
        document.body.appendChild(overlay);
        
        // 3. Disable all interactive elements on the page
        const interactiveElements = document.querySelectorAll('a, button, input, select, textarea, [role="button"]');
        interactiveElements.forEach(element => {
            if (element.id !== 'closeButton' && !element.closest('#accessDeniedModal')) {
                element.disabled = true;
                element.style.pointerEvents = 'none';
                if (element.tagName === 'A') {
                    element.href = 'javascript:void(0)';
                    element.onclick = function(e) { e.preventDefault(); return false; };
                }
            }
        });
        
        // 4. Prevent scrolling
        document.body.style.overflow = 'hidden';
        
        // 5. Clear any sensitive data from the DOM
        const sensitiveElements = document.querySelectorAll('[id*="loan"], [id*="Loan"], [class*="loan"], [class*="Loan"], [id*="account"], [id*="Account"]');
        sensitiveElements.forEach(element => {
            if (!element.closest('#accessDeniedModal')) {
                element.innerHTML = '';
            }
        });
    }
    
    // Function to prevent modal from being dismissed programmatically
    function preventModalDismissal(modal, modalElement) {
        // Override the hide and dispose methods
        const originalHide = modal.hide;
        modal.hide = function() {
            // Only allow hiding if it's triggered by our close button
            const closeButtonClicked = document.activeElement && document.activeElement.id === 'closeButton';
            
            if (!closeButtonClicked) {
                console.warn("Attempted to dismiss modal programmatically");
                return false;
            }
            
            // If close button was clicked, allow the default behavior
            return originalHide.apply(this, arguments);
        };
        
        // Prevent programmatic removal
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
                    for (let i = 0; i < mutation.removedNodes.length; i++) {
                        if (mutation.removedNodes[i].id === 'accessDeniedModal' || 
                            mutation.removedNodes[i].contains(modalElement)) {
                            // If someone tries to remove our modal, reload the page
                            window.location.reload();
                            break;
                        }
                    }
                }
            });
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
        
        // Allow the modal to be closed only via our close button
        modalElement.addEventListener('hide.bs.modal', function (event) {
            const closeButtonClicked = document.activeElement && document.activeElement.id === 'closeButton';
            
            if (!closeButtonClicked) {
                event.preventDefault();
                event.stopPropagation();
                return false;
            }
        });
    }
    
    // Function to show error modal
    function showErrorModal(message) {
        // Remove any existing modal with the same ID
        const existingModal = document.getElementById('errorModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Create modal HTML
        const modalHTML = `
        <div class="modal fade" id="errorModal" tabindex="-1" aria-labelledby="errorModalLabel" aria-hidden="true" data-bs-backdrop="static">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-warning">
                        <h5 class="modal-title" id="errorModalLabel">Error</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="d-flex align-items-center">
                            <i class="bi bi-exclamation-circle-fill text-warning me-3" style="font-size: 2rem;"></i>
                            <p class="mb-0">${message}</p>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary" onclick="location.reload()">Refresh Page</button>
                    </div>
                </div>
            </div>
        </div>
        `;
        
        // Append modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Get the modal element
        const modalElement = document.getElementById('errorModal');
        
        // Initialize the Bootstrap modal
        const modal = new bootstrap.Modal(modalElement);
        
        // Show the modal
        modal.show();
    }
    
    // ########## LOAN NUMBER HANDLING ##########
    // Extract loan number from the page
    function getLoanNumber() {
        // Look for the loan number in the specific HTML structure
        const loanLabelElements = document.querySelectorAll('.fieldLabel');
        
        for (const labelElement of loanLabelElements) {
            if (labelElement.textContent.trim() === 'Loan Number:') {
                // Get the next sibling span with class "field normal-font"
                const loanNumberElement = labelElement.parentElement.querySelector('.field.normal-font');
                if (loanNumberElement) {
                    return loanNumberElement.textContent.trim();
                }
            }
        }
        
        // If not found, prompt the user
        return prompt("Could not find loan number automatically. Please enter it manually:");
    }
    
    // Function to wait for loan number to appear in the DOM
    function waitForLoanNumber() {
        return new Promise((resolve) => {
            // First check if loan number is already available
            const viewElement = new ViewElement();
            if (viewElement.element) {
                const loanNumber = getLoanNumber();
                if (loanNumber) {
                    resolve({ viewElement, loanNumber });
                    return;
                }
            }
            
            // If not, observe DOM changes
            const observer = new MutationObserver((mutationsList, observer) => {
                const viewElement = new ViewElement();
                if (viewElement.element) {
                    const loanNumber = getLoanNumber();
                    if (loanNumber) {
                        observer.disconnect(); // Stop observing
                        resolve({ viewElement, loanNumber });
                    }
                }
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        });
    }
    
    // Check if the loan number is allowed
    async function checkLoanAccess(loanNumber) {
        // Check if storedNumbersSet exists
        if (!window.storedNumbersSet) {
            showErrorModal("Loan number database not loaded. Please refresh the page and try again.");
            console.error("storedNumbersSet is not available");
            return false;
        }
        
        // Check if the loan number is in the set
        return window.storedNumbersSet.has(loanNumber);
    }
    
    // ########## MAIN FUNCTIONALITY ##########
    // Main function to validate loan access
    async function validateLoanAccess() {
        try {
            // Ensure Bootstrap is loaded
            await ensureBootstrapLoaded();
            
            // Wait for loan number to appear
            const { viewElement, loanNumber } = await waitForLoanNumber();
            
            if (!loanNumber) {
                console.log("No loan number provided.");
                return;
            }
            
            console.log(`Found loan number: ${loanNumber}`);
            
            // Hide content initially
            viewElement.remove();
            
            // Check if the loan number is allowed
            const isAllowed = await checkLoanAccess(loanNumber);
            
            if (isAllowed) {
                console.log(`Loan number ${loanNumber} is valid and you have access.`);
                viewElement.add();
            } else {
                console.error(`Loan number ${loanNumber} is not in the provisioned set.`);
                showAccessDeniedModal();
            }
        } catch (error) {
            console.error("Error validating loan access:", error);
            showErrorModal("An error occurred while validating loan access. Please try again later.");
        }
    }
    
    // Monitor URL changes to revalidate access when navigating
    onValueChange(() => document.location.href, async (newUrl) => {
        // Check if the URL contains loan-related paths
        if (newUrl && (
            newUrl.includes("loan") || 
            newUrl.includes("application") || 
            newUrl.includes("details") ||
            newUrl.includes("view")
        )) {
            console.log("URL changed to loan-related page, validating access...");
            validateLoanAccess();
        }
    });
    
    // Start the validation process for the current page
    validateLoanAccess();
})();