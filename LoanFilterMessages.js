// Loan Number Validator with Secure Access Control
// Copy and paste this entire script into your browser console

(function() {
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
    
    // Main function to validate loan access
    async function validateLoanAccess() {
        try {
            // Ensure Bootstrap is loaded
            await ensureBootstrapLoaded();
            
            // Get the loan number
            const loanNumber = getLoanNumber();
            
            if (!loanNumber) {
                console.log("No loan number provided.");
                return;
            }
            
            console.log(`Found loan number: ${loanNumber}`);
            
            // Check if storedNumbersSet exists
            if (!window.storedNumbersSet) {
                showErrorModal("Loan number database not loaded. Please refresh the page and try again.");
                console.error("storedNumbersSet is not available");
                return;
            }
            
            // Check if the loan number is in the set
            if (window.storedNumbersSet.has(loanNumber)) {
                console.log(`Loan number ${loanNumber} is valid and you have access.`);
            } else {
                console.error(`Loan number ${loanNumber} is not in the provisioned set.`);
                showAccessDeniedModal();
            }
        } catch (error) {
            console.error("Error validating loan access:", error);
            alert("An error occurred while validating loan access. Please try again later.");
        }
    }
    
    // Start the validation process
    validateLoanAccess();
})();