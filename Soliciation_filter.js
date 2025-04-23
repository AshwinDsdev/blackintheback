/**
 * Injectable script for console to override loan search functionality
 * Copy and paste this entire script into the browser console
 */
(function() {
  // Initialize storedNumbersSet if it doesn't exist
  if (!window.storedNumbersSet) {
    window.storedNumbersSet = new Set();
    console.log("Created empty storedNumbersSet");
  }

  // Function to find the search form and loan number input
  function findSearchElements() {
    return {
      searchForm: document.querySelector('#search-loan-form') || document.querySelector('form'),
      loanNumberInput: document.querySelector('#LoanNumber') || document.querySelector('input[type="text"]'),
      searchButton: document.querySelector('button[type="submit"]') || document.querySelector('input[type="submit"]')
    };
  }

  // Function to create or get error message container
  function getErrorMessageContainer() {
    let errorDiv = document.querySelector('#errorMessageSearch');
    
    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.id = 'errorMessageSearch';
      errorDiv.style.color = '#dc3545';
      errorDiv.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
      errorDiv.style.padding = '10px';
      errorDiv.style.borderRadius = '5px';
      errorDiv.style.marginTop = '10px';
      errorDiv.style.display = 'none';
      
      const { searchForm } = findSearchElements();
      if (searchForm) {
        searchForm.after(errorDiv);
      } else {
        // If no form found, add to body
        document.body.appendChild(errorDiv);
      }
    }
    
    return errorDiv;
  }

  // Function to show error message
  function showErrorMessage(message) {
    const errorDiv = getErrorMessageContainer();
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }

  // Function to hide error message
  function hideErrorMessage() {
    const errorDiv = getErrorMessageContainer();
    errorDiv.style.display = 'none';
  }

  // Function to check if loan number is in storedNumbersSet
  function isLoanNumberProvisioned(loanNumber) {
    if (!loanNumber) return false;
    
    loanNumber = loanNumber.trim();
    
    // Direct match
    if (window.storedNumbersSet.has(loanNumber)) {
      return true;
    }
    
    // Try as a number if it's numeric
    if (/^\d+$/.test(loanNumber)) {
      const numericValue = Number(loanNumber);
      if (window.storedNumbersSet.has(numericValue)) {
        return true;
      }
    }
    
    // Try as a string if stored as number
    if (!isNaN(loanNumber)) {
      const stringValue = String(loanNumber);
      if (window.storedNumbersSet.has(stringValue)) {
        return true;
      }
    }
    
    // Check by iterating through the set (for case-insensitive or partial matches)
    let isMatch = false;
    window.storedNumbersSet.forEach((num) => {
      const storedStr = String(num).toLowerCase();
      const currentStr = String(loanNumber).toLowerCase();
      
      if (storedStr === currentStr || 
          storedStr.includes(currentStr) || 
          currentStr.includes(storedStr)) {
        isMatch = true;
      }
    });
    
    return isMatch;
  }

  // Function to handle search form submission
  function handleSearchSubmit(event) {
    const { loanNumberInput } = findSearchElements();
    
    if (loanNumberInput) {
      const loanNumber = loanNumberInput.value.trim();
      
      if (loanNumber && !isLoanNumberProvisioned(loanNumber)) {
        event.preventDefault();
        event.stopPropagation();
        showErrorMessage('You are not provisioned for this loan');
        return false;
      } else {
        hideErrorMessage();
      }
    }
  }

  // Function to handle input changes
  function handleInputChange() {
    const { loanNumberInput } = findSearchElements();
    
    if (loanNumberInput) {
      const loanNumber = loanNumberInput.value.trim();
      
      if (loanNumber && !isLoanNumberProvisioned(loanNumber)) {
        showErrorMessage('You are not provisioned for this loan');
      } else {
        hideErrorMessage();
      }
    }
  }

  // Set up event listeners
  function setupEventListeners() {
    const { searchForm, loanNumberInput, searchButton } = findSearchElements();
    
    if (searchForm) {
      searchForm.addEventListener('submit', handleSearchSubmit);
      console.log("Added submit listener to search form");
    }
    
    // We're removing the input event listener since we only want to check on search
    
    if (searchButton && !searchForm) {
      searchButton.addEventListener('click', function(event) {
        handleSearchSubmit(event);
      });
      console.log("Added click listener to search button");
    } else if (searchButton) {
      // Add click listener to search button even if there's a form
      searchButton.addEventListener('click', function(event) {
        handleSearchSubmit(event);
      });
      console.log("Added click listener to search button (with form)");
    }
  }

  // Override any existing search functionality
  function overrideExistingFunctionality() {
    // If there's an existing filterTable function, override it
    if (window.filterTable) {
      const originalFilterTable = window.filterTable;
      window.filterTable = function() {
        // We'll only check for loan provisioning when the function is called from a search button click
        // This prevents showing the error message during other filter operations
        const isFromSearchButton = arguments.length > 0 && arguments[0] && arguments[0].type === 'click';
        
        if (isFromSearchButton) {
          const { loanNumberInput } = findSearchElements();
          
          if (loanNumberInput) {
            const loanNumber = loanNumberInput.value.trim();
            
            if (loanNumber && !isLoanNumberProvisioned(loanNumber)) {
              showErrorMessage('You are not provisioned for this loan');
              return false;
            } else {
              hideErrorMessage();
            }
          }
        }
        
        return originalFilterTable.apply(this, arguments);
      };
      console.log("Overrode existing filterTable function");
    }
  }

  // Initialize when DOM is ready
  function initialize() {
    setupEventListeners();
    overrideExistingFunctionality();
    
    // Make sure any error messages are hidden initially
    hideErrorMessage();
    
    console.log("Loan search override initialized");
    
    // For testing: log the current storedNumbersSet
    console.log("Current storedNumbersSet contents:");
    window.storedNumbersSet.forEach(num => {
      console.log(`- ${num} (${typeof num})`);
    });
  }

  // Run initialization immediately
  initialize();

  // Also set up a MutationObserver to handle dynamically loaded content
  const observer = new MutationObserver(function(mutations) {
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        setupEventListeners();
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Expose test function to console
  window.testLoanProvisioning = function(loanNumber) {
    const isProvisioned = isLoanNumberProvisioned(loanNumber);
    console.log(`Loan ${loanNumber} is ${isProvisioned ? 'provisioned' : 'not provisioned'}`);
    return isProvisioned;
  };

  // Add some test data if storedNumbersSet is empty
  if (window.storedNumbersSet.size === 0) {
    console.log("Adding test loan numbers to storedNumbersSet");
    ['12345', '67890', '11111', '22222'].forEach(num => {
      window.storedNumbersSet.add(num);
    });
  }

  console.log("Loan Search Override Script Injected Successfully!");
})();