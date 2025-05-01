/**
 * Injectable script for console to override loan search functionality
 * Copy and paste this entire script into the browser console
 * Updated with approach similar to msi-loan-ext.js
 */
(function() {
  // Prevent multiple injections
  if (window.loanFilterInjected) {
    console.log("Loan filter already injected, skipping...");
    return;
  }
  window.loanFilterInjected = true;

  // ########## CORE FUNCTIONALITY ##########
  // Initialize storedNumbersSet if it doesn't exist
  if (!window.storedNumbersSet) {
    window.storedNumbersSet = new Set();
    console.log("Created empty storedNumbersSet");
  }

  // Function to wait for value changes, similar to onValueChange in msi-loan-ext.js
  function onValueChange(evalFunction, callback, options = {}) {
    let lastValue = undefined;
    const startTime = new Date().getTime();
    const endTime = options.maxTime ? startTime + options.maxTime : null;
    const intervalId = setInterval(() => {
      try {
        const currentTime = new Date().getTime();
        if (endTime && currentTime > endTime) {
          clearInterval(intervalId);
          return;
        }
        
        const newValue = evalFunction();
        if (newValue === '') newValue = null;
    
        if (lastValue === newValue) return;
        lastValue = newValue;
    
        callback(newValue, lastValue);
      } catch (error) {
        console.error("Error in onValueChange:", error);
        clearInterval(intervalId);
      }
    }, 1000); // Increased interval to reduce CPU usage
    
    return intervalId;
  }

  // Function to find the search form and loan number input
  function findSearchElements() {
    return {
      searchForm: document.querySelector('#search-loan-form') || document.querySelector('form'),
      loanNumberInput: document.querySelector('#LoanNumber') || document.querySelector('input[type="text"]'),
      searchButton: document.querySelector('button[type="submit"]') || document.querySelector('input[type="submit"]')
    };
  }

  // Create unallowed element similar to msi-loan-ext.js
  function createUnallowedElement() {
    // Check if element already exists to prevent duplicates
    const existing = document.getElementById('loanNotProvisioned');
    if (existing) return existing;
    
    const unallowed = document.createElement("div");
    unallowed.id = "loanNotProvisioned";
    unallowed.appendChild(document.createTextNode("You are not provisioned for this loan"));
    unallowed.style.color = '#dc3545';
    unallowed.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
    unallowed.style.padding = '10px';
    unallowed.style.borderRadius = '5px';
    unallowed.style.marginTop = '10px';
    unallowed.style.display = 'flex';
    unallowed.style.justifyContent = 'center';
    unallowed.style.alignItems = 'center';
    unallowed.style.fontWeight = 'bold';
    
    return unallowed;
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

  // ########## UI COMPONENTS ##########
  // ViewElement class similar to msi-loan-ext.js
  class ViewElement {
    constructor() {
      this.searchElements = findSearchElements();
      this.unallowed = createUnallowedElement();
      this.unallowedParent = this.searchElements.searchForm ? 
        this.searchElements.searchForm.parentElement : 
        document.body;
    }

    showUnallowed() {
      // Remove any existing unallowed elements first
      this.hideUnallowed();
      
      // Add the unallowed element
      if (this.searchElements.searchForm) {
        this.searchElements.searchForm.after(this.unallowed);
      } else {
        this.unallowedParent.appendChild(this.unallowed);
      }
    }

    hideUnallowed() {
      const existing = document.getElementById('loanNotProvisioned');
      if (existing) existing.remove();
    }
  }

  // ########## EVENT HANDLERS ##########
  // Function to handle search form submission
  function handleSearchSubmit(event) {
    const { loanNumberInput } = findSearchElements();
    const viewElement = new ViewElement();
    
    if (loanNumberInput) {
      const loanNumber = loanNumberInput.value.trim();
      
      if (loanNumber && !isLoanNumberProvisioned(loanNumber)) {
        if (event) {
          event.preventDefault();
          event.stopPropagation();
        }
        viewElement.showUnallowed();
        return false;
      } else {
        viewElement.hideUnallowed();
      }
    }
  }

  // Store references to event handlers to avoid duplicates
  const eventHandlers = new WeakMap();

  // Set up event listeners without cloning elements
  function setupEventListeners() {
    const { searchForm, searchButton } = findSearchElements();
    
    // Prevent infinite loops by checking if we've already set up listeners
    if (window.listenersSetup) return;
    window.listenersSetup = true;
    
    if (searchForm) {
      // Only add listener if not already added
      if (!eventHandlers.has(searchForm)) {
        const handler = function(e) { handleSearchSubmit(e); };
        eventHandlers.set(searchForm, handler);
        searchForm.addEventListener('submit', handler);
        console.log("Added submit listener to search form");
      }
    }
    
    if (searchButton) {
      // Only add listener if not already added
      if (!eventHandlers.has(searchButton)) {
        const handler = function(e) { handleSearchSubmit(e); };
        eventHandlers.set(searchButton, handler);
        searchButton.addEventListener('click', handler);
        console.log("Added click listener to search button");
      }
    }
  }

  // Override any existing search functionality
  function overrideExistingFunctionality() {
    // If there's an existing filterTable function, override it
    if (window.filterTable && !window.originalFilterTable) {
      window.originalFilterTable = window.filterTable;
      window.filterTable = function() {
        // We'll only check for loan provisioning when the function is called from a search button click
        const isFromSearchButton = arguments.length > 0 && arguments[0] && arguments[0].type === 'click';
        
        if (isFromSearchButton) {
          const { loanNumberInput } = findSearchElements();
          const viewElement = new ViewElement();
          
          if (loanNumberInput) {
            const loanNumber = loanNumberInput.value.trim();
            
            if (loanNumber && !isLoanNumberProvisioned(loanNumber)) {
              viewElement.showUnallowed();
              return false;
            } else {
              viewElement.hideUnallowed();
            }
          }
        }
        
        return window.originalFilterTable.apply(this, arguments);
      };
      console.log("Overrode existing filterTable function");
    }
  }

  // ########## URL CHANGE MONITORING ##########
  // Monitor URL changes similar to msi-loan-ext.js
  let urlMonitorId = null;
  function setupUrlChangeMonitoring() {
    // Clear any existing monitor
    if (urlMonitorId) {
      clearInterval(urlMonitorId);
    }
    
    urlMonitorId = onValueChange(
      () => document.location.href, 
      (newUrl) => {
        console.log("URL changed to:", newUrl);
        
        // Reset UI elements
        const viewElement = new ViewElement();
        viewElement.hideUnallowed();
        
        // Allow setting up listeners again on URL change
        window.listenersSetup = false;
        
        // Set up event listeners for the new page
        setupEventListeners();
        overrideExistingFunctionality();
      }
    );
  }

  // ########## INITIALIZATION ##########
  // Initialize when DOM is ready
  function initialize() {
    try {
      setupEventListeners();
      overrideExistingFunctionality();
      setupUrlChangeMonitoring();
      
      // Make sure any error messages are hidden initially
      const viewElement = new ViewElement();
      viewElement.hideUnallowed();
      
      console.log("Loan search override initialized");
      
      // For testing: log the current storedNumbersSet
      console.log("Current storedNumbersSet contents:");
      window.storedNumbersSet.forEach(num => {
        console.log(`- ${num} (${typeof num})`);
      });
    } catch (error) {
      console.error("Error during initialization:", error);
    }
  }

  // Run initialization immediately
  initialize();

  // Set up a MutationObserver with debouncing to prevent excessive callbacks
  let debounceTimer = null;
  const observer = new MutationObserver(function(mutations) {
    // Debounce to prevent excessive calls
    if (debounceTimer) clearTimeout(debounceTimer);
    
    debounceTimer = setTimeout(() => {
      // Check if any relevant elements were added
      const formAdded = mutations.some(mutation => 
        mutation.type === 'childList' && 
        Array.from(mutation.addedNodes).some(node => 
          node.nodeType === 1 && (
            node.tagName === 'FORM' || 
            node.querySelector && node.querySelector('form, input[type="text"], button[type="submit"]')
          )
        )
      );
      
      if (formAdded) {
        window.listenersSetup = false; // Reset so we can set up listeners again
        setupEventListeners();
      }
    }, 500);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false
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
  }

  console.log("Loan Search Override Script Injected Successfully!");
})();