/**
 * @fileoverview Todo Table Filter Script
 * @description This script filters todo table entries based on allowed loan numbers.
 * @version 3.0.0
 */
(function () {
  // Immediate test logging
  console.log('=== SCRIPT LOADED ===');
  console.log('Testing script execution...');
  console.log('Current URL:', window.location.href);
  console.log('Document ready state:', document.readyState);

  // Constants
  const DEBUG_MODE = false;
  const FILTER_INTERVAL_MS = 2000;
  const ALLOWED_ROWS_CLASS = 'offshore-allowed-row';
  const HIDDEN_ROWS_CLASS = 'offshore-hidden-row';
  const EXTENSION_ID = 'afkpnpkodeiolpnfnbdokgkclljpgmcm';

  // State management
  let isFiltering = false;
  let lastFilteredLoans = new Set();
  let filterTimeout = null;
  let unallowedElement = null;

  // Debug logging
  function debugLog(...args) {
    if (DEBUG_MODE) {
      console.log('%c[TodoFilter Debug]', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 2px;', ...args);
      // Also log to regular console for backup
      console.log('[TodoFilter Debug]', ...args);
    }
  }


  // Import utility functions for page visibility control
  const pageUtils = {
    /**
     * @function togglePageOpacity
     * @description Sets the page opacity. It can be used to show and hide the page content.
     * @param {number} val - The value in-between 0 and 1.
     */
    togglePageOpacity: function (val) {
      document.body.style.opacity = val;
    },

    /**
     * @function showPage
     * @description Shows or hides the page.
     * @param {boolean} val - The value can be true or false.
     */
    showPage: function (val) {
      if (val) {
        // When showing the page, remove the !important style
        const styleTag = document.getElementById("page-transition-style");
        if (styleTag) {
          styleTag.textContent = "body { transition: opacity 0.3s ease; }";
        }
        // Set opacity to 1 to show the page
        document.body.style.opacity = 1;
      } else {
        // When hiding, make sure it's hidden with !important
        const styleTag = document.getElementById("page-transition-style");
        if (styleTag) {
          styleTag.textContent =
            "body { opacity: 0 !important; transition: opacity 0.3s ease; }";
        } else {
          // If the style tag doesn't exist yet, set opacity directly
          document.body.style.opacity = 0;
        }
      }
    },

    /**
     * @function togglePageDisplay
     * @description Sets the page display. It can be used to show and hide the page content.
     * @param {string} val - The value can be 'block' or 'none'.
     */
    togglePageDisplay: function (val) {
      document.body.style.display = val;
    },

    /**
     * @function getElementByXPath
     * @description Get an element by its XPath.
     * @param {string} xpath - The XPath of the element.
     * @param {Document} [context=document] - The context in which to search for the XPath.
     * @returns {Element|null} The first element matching the XPath, or null if no match is found.
     */
    getElementByXPath: function (xpath, context = document) {
      const result = document.evaluate(
        xpath,
        context,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      );
      return result.singleNodeValue;
    },
  };

  /**
   * @function logDebug
   * @description Logs debug messages if DEBUG_MODE is enabled
   */
  function logDebug(...args) {
    if (DEBUG_MODE) {
      console.log("[TodoFilter]", ...args);
    }
  }

  /**
   * @function extractLoanNumber
   * @description Extracts a loan number from text
   */
  function extractLoanNumber(text) {
    if (!text) return null;
    const loanMatch = text.match(/(?:Loan|Account|#)[:\s]*(\d+)/i);
    if (loanMatch && loanMatch[1]) {
      return loanMatch[1].trim();
    }
    const numberMatch = text.match(/\b(\d{5,})\b/);
    if (numberMatch && numberMatch[1]) {
      return numberMatch[1].trim();
    }
    return null;
  }

  /**
   * @function waitForListener
   * @description Waits for the extension listener to be ready
   */
  async function waitForListener(maxRetries = 20, initialDelay = 100) {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      let delay = initialDelay;
      let timeoutId;

      function sendPing() {
        if (attempts >= maxRetries) {
          console.warn("❌ No listener detected after maximum retries.");
          clearTimeout(timeoutId)
          reject(new Error("Listener not found"));
          return;
        }

        console.log(`🔄 Sending ping attempt ${attempts + 1}/${maxRetries}...`);

        chrome.runtime.sendMessage(EXTENSION_ID,
          {
            type: 'ping',
          },
          (response) => {
            if (response?.result === 'pong') {
              console.log("✅ Listener detected!");
              clearTimeout(timeoutId);
              resolve(true);
            } else {
              console.warn("❌ No listener detected, retrying...");
              timeoutId = setTimeout(() => {
                attempts++;
                delay *= 2; // Exponential backoff (100ms → 200ms → 400ms...)
                sendPing();
              }, delay);
            }
          }
        );
      }

      sendPing(); // Start the first attempt
    });
  }

  /**
   * @function checkNumbersBatch
   * @description Checks which loan numbers are allowed using the extension
   */
  async function checkNumbersBatch(numbers) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(EXTENSION_ID,
        {
          type: 'queryLoans',
          loanIds: numbers
        },
        (response) => {
          if (chrome.runtime.lastError) {
            return reject(chrome.runtime.lastError.message);
          } else if (response.error) {
            return reject(response.error);
          }

          const available = Object.keys(response.result).filter(key => response.result[key]);
          resolve(available);
        }
      );
    });
  }

  /**
   * @function addFilterStyles
   * @description Adds necessary styles to the document
   */
  function addFilterStyles() {
    if (!document.getElementById("offshore-filter-styles")) {
      const style = document.createElement("style");
      style.id = "offshore-filter-styles";
      style.textContent = `
        .${HIDDEN_ROWS_CLASS} { 
          display: none !important; 
        }
        .${ALLOWED_ROWS_CLASS} {
          display: table-row !important;
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * @function debounce
   * @description Debounces a function call
   */
  function debounce(func, wait) {
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(filterTimeout);
        func(...args);
      };
      clearTimeout(filterTimeout);
      filterTimeout = setTimeout(later, wait);
    };
  }

  /**
   * @function getLoanNumberFromRow
   * @description Gets loan number from a table row using different possible selectors
   */
  function getLoanNumberFromRow(row) {
    // Try data-loan attribute first
    const dataLoan = row.getAttribute('data-loan');
    if (dataLoan) {
      return dataLoan.trim();
    }

    // Try first cell content
    const firstCell = row.querySelector("td:first-child");
    if (firstCell) {
      const loanNumber = extractLoanNumber(firstCell.textContent);
      if (loanNumber) {
        return loanNumber;
      }
    }

    return null;
  }

  /**
   * @function enforceFiltering
   * @description Enforces filtering on the table rows only
   */
  function enforceFiltering() {
    pageUtils.showPage(false);

    if (isFiltering) {
      pageUtils.showPage(true);
      return;
    }

    // Try both table selectors
    const tables = [
      document.querySelector("table.new-ui-table.striped.heading-highlighted.border.shadow-regular"),
      document.querySelector("#todoTable table.table")
    ].filter(Boolean);

    if (tables.length === 0) {
      pageUtils.showPage(true);
      return;
    }

    tables.forEach(table => {
      const rows = table.querySelectorAll("tbody tr");
      rows.forEach(row => {
        const loanNumber = getLoanNumberFromRow(row);
        if (loanNumber) {
          if (lastFilteredLoans.has(loanNumber)) {
            row.classList.add(ALLOWED_ROWS_CLASS);
            row.classList.remove(HIDDEN_ROWS_CLASS);
          } else {
            row.classList.add(HIDDEN_ROWS_CLASS);
            row.classList.remove(ALLOWED_ROWS_CLASS);
          }
        }
      });
    });

    pageUtils.showPage(true);
  }

  /**
   * @function filterTodoTable
   * @description Filters todo table entries based on allowed loan numbers
   */
  async function filterTodoTable() {
    if (isFiltering) return;
    isFiltering = true;

    try {
      // Try both table selectors
      const tables = [
        document.querySelector("table.new-ui-table.striped.heading-highlighted.border.shadow-regular"),
        document.querySelector("#todoTable table.table")
      ].filter(Boolean);

      if (tables.length === 0) {
        logDebug("No target tables found");
        pageUtils.showPage(true);
        return;
      }

      const loanNumbers = [];
      const rowMap = new Map();

      tables.forEach(table => {
        const rows = table.querySelectorAll("tbody tr");
        rows.forEach((row, index) => {
          const loanNumber = getLoanNumberFromRow(row);
          if (loanNumber) {
            loanNumbers.push(loanNumber);
            rowMap.set(loanNumber, row);
            logDebug(`Found loan number: ${loanNumber} in row ${index}`);
          }
        });
      });

      if (!loanNumbers.length) {
        logDebug("No loan numbers found in tables");
        pageUtils.showPage(true);
        return;
      }

      const allowedNumbers = await checkNumbersBatch(loanNumbers);
      logDebug(`Received ${allowedNumbers.length} allowed loan numbers: ${allowedNumbers.join(", ")}`);

      lastFilteredLoans = new Set(allowedNumbers);

      rowMap.forEach((row, loanNumber) => {
        if (allowedNumbers.includes(loanNumber)) {
          row.classList.add(ALLOWED_ROWS_CLASS);
          row.classList.remove(HIDDEN_ROWS_CLASS);
        } else {
          row.classList.add(HIDDEN_ROWS_CLASS);
          row.classList.remove(ALLOWED_ROWS_CLASS);
        }
      });

      addFilterStyles();
      pageUtils.showPage(true);

    } catch (error) {
      console.error("Error filtering todo table:", error);
      pageUtils.showPage(true);
    } finally {
      isFiltering = false;
      setTimeout(() => {
        pageUtils.showPage(true);
      }, 500);
    }
  }

  /**
   * @function createUnallowedElement
   * @description Creates an element to show when a loan is not allowed
   */
  function createUnallowedElement() {
    const unallowed = document.createElement("span");
    unallowed.appendChild(document.createTextNode("Loan is not provisioned to the user"));
    unallowed.className = "body";
    unallowed.style.cssText = `
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100px;
      font-size: 20px;
      font-weight: bold;
      color: black;
      position: relative;
      z-index: -1;
    `;
    return unallowed;
  }

  /**
   * @function showUnallowedMessage
   * @description Shows the unallowed message and hides the table
   */
  function showUnallowedMessage() {
    debugLog('Attempting to show unallowed message');

    try {
      // Remove any existing unallowed element
      if (unallowedElement) {
        debugLog('Removing existing unallowed element');
        unallowedElement.remove();
        unallowedElement = null;
      }

      // Create new unallowed element
      unallowedElement = createUnallowedElement();
      debugLog('Created new unallowed element');

      // Find the todo table container
      const todoTable = document.querySelector('#todoTable');
      debugLog('Todo table found:', !!todoTable);

      if (todoTable) {
        debugLog('Hiding todo table');
        todoTable.style.display = 'none';
      }

      // Always append to body regardless of table presence
      document.body.appendChild(unallowedElement);
      debugLog('Appended unallowed message to body');

      // Force a reflow to ensure the message is visible
      unallowedElement.offsetHeight;
      debugLog('Message should be visible now');

      // Add a style tag to ensure the message stays on top
      const styleTag = document.createElement('style');
      styleTag.textContent = `
        .offshore-unallowed-message {
          position: fixed !important;
          z-index: 999999 !important;
          display: flex !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
      `;
      document.head.appendChild(styleTag);
      debugLog('Added style tag for message visibility');

    } catch (error) {
      console.error('Error showing unallowed message:', error);
      debugLog('Error showing unallowed message:', error);
    }
  }

  /**
   * @function hideUnallowedMessage
   * @description Hides the unallowed message and shows the table
   */
  function hideUnallowedMessage() {
    debugLog('Attempting to hide unallowed message');

    try {
      if (unallowedElement) {
        debugLog('Removing unallowed element');
        unallowedElement.remove();
        unallowedElement = null;
      }

      const todoTable = document.querySelector('#todoTable');
      if (todoTable) {
        debugLog('Showing todo table');
        todoTable.style.display = 'block';
      } else {
        debugLog('Todo table not found');
      }
    } catch (error) {
      console.error('Error hiding unallowed message:', error);
      debugLog('Error hiding unallowed message:', error);
    }
  }

  /**
   * @function handleExactSearch
   * @description Handles exact search filter functionality
   */
  async function handleExactSearch() {
    console.log('=== SETTING UP EXACT SEARCH ===');
    
    // Get the elements we know exist
    const exactSearchCheckbox = document.querySelector('#Filter_LoanExactSearch');
    const loanNumberInput = document.querySelector('#Filter_LoanNumber');

    console.log('Found elements:', {
      exactSearchCheckbox: !!exactSearchCheckbox,
      loanNumberInput: !!loanNumberInput
    });

    if (!exactSearchCheckbox || !loanNumberInput) {
      console.error('Required elements not found');
      return;
    }

    // Function to handle the exact search check
    async function performExactSearch() {
      console.log('=== PERFORMING EXACT SEARCH ===');
      
      const loanNumber = loanNumberInput.value.trim();
      console.log('Checking loan number:', loanNumber);
      
      try {
        const allowedNumbers = await checkNumbersBatch([loanNumber]);
        console.log('Allowed numbers:', allowedNumbers);
        
        if (!allowedNumbers.includes(loanNumber)) {
          console.log('Loan number not allowed, showing message');
          
          // Remove any existing message first
          const existingMessage = document.querySelector('.offshore-unallowed-message');
          if (existingMessage) {
            existingMessage.remove();
            console.log('Removed existing message');
          }

          // Create and show message using the same styling as msi-loan-ext.js
          const message = createUnallowedElement();
          message.className = 'offshore-unallowed-message';
          
          // Add to body and force reflow
          document.body.appendChild(message);
          message.offsetHeight; // Force reflow
          console.log('Message element added to body:', message);
          
          // Hide the table
          const todoTable = document.querySelector('#todoTable');
          if (todoTable) {
            todoTable.style.display = 'none';
            console.log('Table hidden');
          } else {
            console.log('Table not found');
          }

          // Prevent the form from submitting
          return false;
        } else {
          console.log('Loan number allowed, hiding message');
          // Remove any existing message
          const existingMessage = document.querySelector('.offshore-unallowed-message');
          if (existingMessage) {
            existingMessage.remove();
            console.log('Existing message removed');
          }
          
          // Show the table
          const todoTable = document.querySelector('#todoTable');
          if (todoTable) {
            todoTable.style.display = 'block';
            console.log('Table shown');
          }
          
          filterTodoTable();
          return true;
        }
      } catch (error) {
        console.error('Error checking loan number:', error);
        return true;
      }
    }

    // Add change handler to exact search checkbox - only to handle unchecking
    exactSearchCheckbox.addEventListener('change', () => {
      console.log('Exact search checkbox changed:', exactSearchCheckbox.checked);
      if (!exactSearchCheckbox.checked) {
        // Remove any existing message
        const existingMessage = document.querySelector('.offshore-unallowed-message');
        if (existingMessage) {
          existingMessage.remove();
          console.log('Message removed');
        }

        // Show the table
        const todoTable = document.querySelector('#todoTable');
        if (todoTable) {
          todoTable.style.display = 'block';
          console.log('Table shown');
        }
      }
    });

    // Handle the apply filter button click
    const applyFilterButton = document.querySelector('#applyFilter');
    if (applyFilterButton) {
      console.log('Found apply filter button, adding click handler');
      applyFilterButton.addEventListener('click', async (e) => {
        console.log('Apply filter button clicked');
        console.log('Checkbox checked:', exactSearchCheckbox.checked);
        console.log('Loan number value:', loanNumberInput.value);

        if (exactSearchCheckbox.checked && loanNumberInput.value.trim()) {
          console.log('Exact search is checked and loan number is entered');
          const shouldSubmit = await performExactSearch();

          if (!shouldSubmit) {
            console.log('Preventing form submission due to unallowed loan');
            e.preventDefault();
            e.stopPropagation();
            return false;
          }
        }
      });
    }

    // Also handle form submission
    const form = document.querySelector('#todo-filter');
    if (form) {
      console.log('Found form, adding submit handler');
      form.addEventListener('submit', async (e) => {
        console.log('Form submitted');
        if (exactSearchCheckbox.checked && loanNumberInput.value.trim()) {
          console.log('Exact search is checked and loan number is entered');
          const shouldSubmit = await performExactSearch();

          if (!shouldSubmit) {
            console.log('Preventing form submission due to unallowed loan');
            e.preventDefault();
            e.stopPropagation();
            return false;
          }
        }
      });
    }

    console.log('=== EXACT SEARCH SETUP COMPLETE ===');
  }

  // Create debounced versions of our functions
  const debouncedFilter = debounce(filterTodoTable, 500);
  const debouncedEnforce = debounce(enforceFiltering, 500);

  /**
   * @function init
   * @description Initializes the todo table filter
   */
  async function init() {
    console.log('=== INITIALIZING SCRIPT ===');
    debugLog('Initializing todo table filter');
    pageUtils.showPage(false);

    try {
      console.log('1. Waiting for extension listener');
      await waitForListener();
      
      console.log('2. Adding filter styles');
      addFilterStyles();
      
      console.log('3. Running initial filter');
      await filterTodoTable();

      console.log('4. Initializing exact search handler');
      debugLog('Initializing exact search handler');
      await handleExactSearch();
      debugLog('Exact search handler initialized');

      console.log('5. Setting up mutation observer');
      // Set up mutation observer with debouncing
      const observer = new MutationObserver((mutations) => {
        // Check if changes are in either table
        const shouldFilter = mutations.some(mutation => {
          const target = mutation.target;
          return target.closest("table.new-ui-table.striped.heading-highlighted.border.shadow-regular") ||
                 target.closest("#todoTable table.table");
        });

        if (shouldFilter) {
          debugLog('Table changes detected, triggering filter');
          debouncedFilter();
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });

      console.log('6. Setting up interval');
      // Set up interval with debouncing
      setInterval(() => {
        if (!isFiltering) {
          debouncedEnforce();
        }
      }, FILTER_INTERVAL_MS);

      console.log('=== INITIALIZATION COMPLETE ===');
      debugLog('Initialization complete');

    } catch (error) {
      console.error('Error initializing todo table filter:', error);
      debugLog('Error initializing:', error);
      pageUtils.showPage(true);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    console.log('DOM still loading, waiting for DOMContentLoaded');
    document.addEventListener('DOMContentLoaded', init);
  } else {
    console.log('DOM already loaded, initializing immediately');
    init();
  }
})();

