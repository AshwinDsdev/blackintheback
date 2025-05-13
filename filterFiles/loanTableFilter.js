/**
 * @fileoverview Loan Filter Script for Loansphere
 * @description This script filters loan information based on user permissions.
 * It hides unauthorized loan numbers and provides a secure browsing experience.
 * @version 1.0.0
 */

(function () {
  // Import utility functions for page manipulation
  const pageUtils = {
    /**
     * @function togglePageOpacity
     * @description Sets the page opacity. It can be used to show and hide the page content.
     * @param {number} val - The value in-between 0 and 1.
     * @example
     * // Example usage of the function
     * togglePageOpacity(0.5);
     */
    togglePageOpacity: function (val) {
      document.body.style.opacity = val;
    },
    
    /**
     * @function showPage
     * @description Shows or hides the page.
     * @param {boolean} val - The value can be true or false.
     * @example
     * // Example usage of the function
     * showPage(false);
     */
    showPage: function (val) {
      document.body.style.opacity = val ? 1 : 0;
    },
    
    /**
     * @function togglePageDisplay
     * @description Sets the page display. It can be used to show and hide the page content.
     * @param {string} val - The value can be 'block' or 'none'.
     * @example
     * // Example usage of the function
     * togglePageDisplay('none');
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

  // Hide the page immediately to prevent unauthorized loan numbers from being visible
  pageUtils.showPage(false);

  /**
   * @constant {string} EXTENSION_ID
   * @description Chrome extension ID for communication
   */
  const EXTENSION_ID = "aohkahamdobpjgbkmplobobejbjnigof";
  
  /**
   * @constant {number} FILTER_INTERVAL_MS
   * @description Interval in milliseconds for periodic filtering
   */
  const FILTER_INTERVAL_MS = 2000;
  
  /**
   * @constant {WeakSet} processedElements
   * @description Set to track elements that have already been processed
   */
  const processedElements = new WeakSet();

  /**
   * @constant {Object} allowedLoansCache
   * @description Cache for storing allowed loan numbers to reduce API calls
   */
  const allowedLoansCache = {
    /**
     * @property {Set} loans
     * @description Set of allowed loan numbers
     */
    loans: new Set(),
    
    /**
     * @property {number} lastUpdated
     * @description Timestamp of the last cache update
     */
    lastUpdated: 0,
    
    /**
     * @property {number} cacheTimeout
     * @description Cache timeout in milliseconds (5 minutes)
     */
    cacheTimeout: 5 * 60 * 1000,

    /**
     * @method isAllowed
     * @description Checks if a loan number is in the cache
     * @param {string} loanNumber - The loan number to check
     * @returns {boolean} True if the loan number is allowed, false otherwise
     */
    isAllowed(loanNumber) {
      return this.loans.has(loanNumber);
    },

    /**
     * @method addLoans
     * @description Adds loan numbers to the cache
     * @param {string[]} loanNumbers - Array of loan numbers to add
     */
    addLoans(loanNumbers) {
      loanNumbers.forEach((loan) => this.loans.add(loan));
      this.lastUpdated = Date.now();
    },

    /**
     * @method isCacheValid
     * @description Checks if the cache is still valid
     * @returns {boolean} True if the cache is valid, false otherwise
     */
    isCacheValid() {
      return (
        this.lastUpdated > 0 &&
        Date.now() - this.lastUpdated < this.cacheTimeout
      );
    },

    /**
     * @method clear
     * @description Clears the cache
     */
    clear() {
      this.loans.clear();
      this.lastUpdated = 0;
    },
  };

  /**
   * @async
   * @function waitForListener
   * @description Waits for the Chrome extension listener to be available
   * @param {number} [maxRetries=20] - Maximum number of retry attempts
   * @param {number} [initialDelay=100] - Initial delay in milliseconds between retries
   * @returns {Promise<boolean>} Promise that resolves to true if listener is available, false otherwise
   * @throws {Error} If listener is not found after maximum retries
   */
  async function waitForListener(maxRetries = 20, initialDelay = 100) {
    return new Promise((resolve, reject) => {
      // Check if chrome and chrome.runtime are available
      if (typeof chrome === 'undefined' || typeof chrome.runtime === 'undefined') {
        console.warn("❌ Chrome extension API not available. Running in standalone mode.");
        // Show the page if Chrome extension API is not available
        pageUtils.showPage(true);
        resolve(false);
        return;
      }
      
      let attempts = 0;
      let delay = initialDelay;
      let timeoutId;

      /**
       * @function sendPing
       * @description Sends a ping message to the extension and handles the response
       * @private
       */
      function sendPing() {
        if (attempts >= maxRetries) {
          console.warn("❌ No listener detected after maximum retries.");
          clearTimeout(timeoutId);
          pageUtils.showPage(true);
          reject(new Error("Listener not found"));
          return;
        }

        console.log(`🔄 Sending ping attempt ${attempts + 1}/${maxRetries}...`);
        try {
          chrome.runtime.sendMessage(
            EXTENSION_ID,
            { type: "ping" },
            (response) => {
              if (chrome.runtime.lastError) {
                console.warn("Chrome runtime error:", chrome.runtime.lastError);
                attempts++;
                if (attempts >= maxRetries) {
                  pageUtils.showPage(true);
                  reject(new Error("Chrome extension error"));
                  return;
                }
                timeoutId = setTimeout(sendPing, delay);
                return;
              }
              
              if (response?.result === "pong") {
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
        } catch (error) {
          console.error("Error sending message:", error);
          pageUtils.showPage(true);
          resolve(false);
        }
      }

      sendPing(); // Start the first attempt
    });
  }

  /**
   * @async
   * @function checkNumbersBatch
   * @description Checks if the user has access to a batch of loan numbers
   * @param {string[]} numbers - Array of loan numbers to check
   * @returns {Promise<string[]>} Promise that resolves to an array of allowed loan numbers
   * @throws {Error} If there's an error communicating with the extension
   */
  async function checkNumbersBatch(numbers) {
    return new Promise((resolve, reject) => {
      if (typeof chrome === 'undefined' || typeof chrome.runtime === 'undefined') {
        console.warn("❌ Chrome extension API not available. Assuming all loans are allowed.");
        resolve(numbers);
        return;
      }
      
      try {
        chrome.runtime.sendMessage(
          EXTENSION_ID,
          {
            type: "queryLoans",
            loanIds: numbers,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              return reject(chrome.runtime.lastError.message);
            } else if (response?.error) {
              return reject(response.error);
            }

            const available = Object.keys(response?.result || {}).filter(
              (key) => response.result[key]
            );
            
            // Add allowed loans to cache
            allowedLoansCache.addLoans(available);
            
            resolve(available);
          }
        );
      } catch (error) {
        console.error("Error sending message:", error);
        reject(error);
      }
    });
  }

  /**
   * @function onValueChange
   * @description Sets up an interval to monitor changes to a value and triggers a callback when changes are detected
   * @param {Function} evalFunction - Function that returns the value to monitor
   * @param {Function} callback - Function to call when the value changes
   * @param {Object} [options={}] - Options for the monitoring
   * @param {number} [options.maxTime] - Maximum time in milliseconds to monitor for changes
   * @param {number} [options.interval=500] - Interval in milliseconds between checks
   * @returns {number} Interval ID that can be used to clear the interval
   */
  function onValueChange(evalFunction, callback, options = {}) {
    let lastValue = undefined;
    const startTime = Date.now();
    const endTime = options.maxTime ? startTime + options.maxTime : null;
    const intervalId = setInterval(async () => {
      const currentTime = Date.now();
      if (endTime && currentTime > endTime) {
        clearInterval(intervalId);
        return;
      }
      let newValue = await evalFunction();
      if (newValue === "") newValue = null;

      if (lastValue === newValue) return;
      lastValue = newValue;

      await callback(newValue, lastValue);
    }, options.interval || 500);

    return intervalId;
  }

  /**
   * @function createUnallowedElement
   * @description Creates a DOM element to display when a loan is not provisioned to the user
   * @returns {HTMLElement} The created element
   */
  function createUnallowedElement() {
    const unallowed = document.createElement("span");
    unallowed.appendChild(
      document.createTextNode("Loan is not provisioned to the user")
    );
    unallowed.className = "body";
    unallowed.style.display = "flex";
    unallowed.style.justifyContent = "center";
    unallowed.style.alignItems = "center";
    unallowed.style.height = "100px";
    unallowed.style.fontSize = "20px";
    unallowed.style.fontWeight = "bold";
    unallowed.style.color = "black";
    unallowed.style.position = "relative";
    unallowed.style.zIndex = "-1";
    return unallowed;
  }

  /**
   * @class SearchGridElement
   * @description Class to manage the search grid view
   */
  class SearchGridElement {
    /**
     * @constructor
     * @description Creates a new SearchGridElement instance
     */
    constructor() {
      this.searchGrid = document.querySelector("#searchGrid");
      this.errorMessageDiv = document.querySelector("#errorMessageSearch");
    }

    /**
     * @method hide
     * @description Hides the search grid
     */
    hide() {
      if (this.searchGrid) {
        this.searchGrid.style.display = "none";
      }
    }

    /**
     * @method show
     * @description Shows the search grid
     */
    show() {
      if (this.searchGrid) {
        this.searchGrid.style.display = "block";
      }
    }

    /**
     * @method showRestrictedMessage
     * @description Shows the restricted message
     */
    showRestrictedMessage() {
      if (this.errorMessageDiv) {
        this.errorMessageDiv.textContent =
          "Loan is not provisioned to the user";
        this.errorMessageDiv.style.display = "block";
      }
    }

    /**
     * @method hideRestrictedMessage
     * @description Hides the restricted message
     */
    hideRestrictedMessage() {
      if (this.errorMessageDiv) {
        this.errorMessageDiv.style.display = "none";
      }
    }
  }

  /**
   * @class ViewElement
   * @description Class to manage the visibility of loan information elements
   */
  class ViewElement {
    /**
     * @constructor
     * @description Creates a new ViewElement instance
     */
    constructor() {
      this.element = document.querySelector(".col-md-12 .body");
      this.parent = this.element && this.element.parentElement;
      this.unallowed = createUnallowedElement();
      this.unallowedParent = document.querySelector("nav");
    }

    /**
     * @method remove
     * @description Removes the loan element and shows the unallowed message
     */
    remove() {
      if (this.element) {
        this.element.remove();
        this.unallowedParent.appendChild(this.unallowed);
      }
    }

    /**
     * @method add
     * @description Adds the loan element back and removes the unallowed message
     */
    add() {
      if (this.parent) {
        this.unallowed.remove();
        this.parent.appendChild(this.element);
      }
    }
  }

  /**
   * @function findLoanTable
   * @description Finds the loan table in the DOM
   * @returns {HTMLElement|null} The loan table element if found, null otherwise
   */
  function findLoanTable() {
    const possibleTables = [
      document.querySelector(".new-ui-table.striped tbody"),
      document.querySelector("table.striped tbody"),
      document.querySelector("table tbody"),
    ];

    for (const table of possibleTables) {
      if (table) return table;
    }

    return null;
  }

  /**
   * @function isExactSearch
   * @description Checks if exact search is selected
   * @returns {boolean} True if exact search is selected, false otherwise
   */
  function isExactSearch() {
    const exactSearchCheckbox = document.querySelector("#IsExactSearch");
    return exactSearchCheckbox && exactSearchCheckbox.checked;
  }

  /**
   * @function getLoanType
   * @description Gets the selected loan type
   * @returns {string|null} The selected loan type if found, null otherwise
   */
  function getLoanType() {
    const loanTypeSelect = document.querySelector("#LoanTypeCd");
    return loanTypeSelect ? loanTypeSelect.value : null;
  }

  /**
   * @function getLoanNumber
   * @description Gets the entered loan number
   * @returns {string|null} The entered loan number if found, null otherwise
   */
  function getLoanNumber() {
    const loanNumberInput = document.querySelector("#LoanNumber");
    return loanNumberInput ? loanNumberInput.value.trim() : null;
  }

  /**
   * @function getLoanNumber
   * @description Extracts the loan number from a view element
   * @param {HTMLElement} viewElement - The element containing the loan number
   * @returns {string|null} The loan number if found, null otherwise
   */
  function getLoanNumberFromView(viewElement) {
    const loanNumberCell = viewElement.querySelector(
      "table tr td a.bright-green.ng-binding"
    );
    return loanNumberCell && loanNumberCell.textContent.trim();
  }

  /**
   * @function updatePaginationInfo
   * @description Updates the pagination information
   * @param {number} visibleCount - The number of visible records
   */
  function updatePaginationInfo(visibleCount) {
    const paginationInfo = document.querySelector(".pagination-info");
    if (paginationInfo) {
      paginationInfo.textContent = `Showing ${visibleCount} of ${visibleCount} records`;
    }
  }

  /**
   * @function extractLoanNumber
   * @description Extracts a loan number from text
   * @param {string} text - The text to extract the loan number from
   * @returns {string} The extracted loan number
   */
  function extractLoanNumber(text) {
    let number = text.trim();

    // Extract number after "Servicer:" or "Investor:"
    if (number.includes("Servicer:")) {
      number = number.split("Servicer:")[1].trim();
    } else if (number.includes("Investor:")) {
      number = number.split("Investor:")[1].trim();
    }

    // Extract numeric part if needed
    if (!/^\d+$/.test(number)) {
      const numericMatch = number.match(/\d+/);
      if (numericMatch) {
        number = numericMatch[0];
      }
    }

    return number;
  }

  /**
   * @async
   * @function isLoanNumberProvisioned
   * @description Checks if a loan number is provisioned to the user
   * @param {string} loanNumber - The loan number to check
   * @returns {Promise<boolean>} Promise that resolves to true if the loan number is provisioned, false otherwise
   */
  async function isLoanNumberProvisioned(loanNumber) {
    if (!loanNumber) return false;
    
    try {
      // First check the cache
      if (allowedLoansCache.isAllowed(loanNumber)) {
        return true;
      }
      
      // If not in cache, check with the extension
      const allowedNumbers = await checkNumbersBatch([loanNumber]);
      return allowedNumbers.includes(loanNumber);
    } catch (error) {
      console.error("Error checking if loan number is provisioned:", error);
      return false;
    }
  }

  /**
   * @async
   * @function waitForLoanNumber
   * @description Waits for a loan number to appear in the DOM
   * @returns {Promise<ViewElement>} Promise that resolves to a ViewElement when a loan number is found
   */
  function waitForLoanNumber() {
    return new Promise((resolve) => {
      const observer = new MutationObserver((mutationsList, observer) => {
        const viewElement = new ViewElement();
        if (viewElement.element) {
          const loanNumber = getLoanNumberFromView(viewElement.element);
          if (loanNumber) {
            observer.disconnect();
            resolve(viewElement);
          }
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    });
  }

  /**
   * @async
   * @function filterTable
   * @description Filters the loan table based on user permissions
   */
  async function filterTable() {
    const loanTable = findLoanTable();

    if (!loanTable) {
      console.error("Loan table not found");
      return;
    }

    const rows = loanTable.querySelectorAll("tr");
    let removedCount = 0;
    let visibleCount = 0;

    // Get current search parameters
    const loanNumber = getLoanNumber();
    const loanType = getLoanType();
    const isExact = isExactSearch();

    console.log(
      `Filtering table - isExact: ${isExact}, loanNumber: ${loanNumber}, loanType: ${loanType}`
    );

    // Collect all loan numbers to check in batch
    const loanNumbersToCheck = [];
    rows.forEach((row) => {
      const loanCell = row.querySelector("td:first-child");
      if (loanCell) {
        const loanTypeDivs = loanCell.querySelectorAll("div.flex");
        for (const div of loanTypeDivs) {
          const label = div.querySelector("div:first-child");
          const value = div.querySelector("div.ml-2");

          if (
            label &&
            value &&
            ((loanType === "Servicer" &&
              label.textContent.trim() === "Servicer:") ||
              (loanType === "Investor" &&
                label.textContent.trim() === "Investor:"))
          ) {
            const loanValue = value.textContent.trim();
            if (loanValue) {
              loanNumbersToCheck.push(loanValue);
            }
            break;
          }
        }
      }
    });

    // Check all loan numbers in batch
    let allowedLoanNumbers = [];
    try {
      // Filter out loan numbers that are already in cache
      const uncachedLoanNumbers = loanNumbersToCheck.filter(
        (num) => !allowedLoansCache.isAllowed(num)
      );
      
      if (uncachedLoanNumbers.length > 0) {
        const newAllowedNumbers = await checkNumbersBatch(uncachedLoanNumbers);
        allowedLoanNumbers = [...newAllowedNumbers];
      }
      
      // Add cached loan numbers
      loanNumbersToCheck.forEach((num) => {
        if (allowedLoansCache.isAllowed(num) && !allowedLoanNumbers.includes(num)) {
          allowedLoanNumbers.push(num);
        }
      });
    } catch (error) {
      console.error("Error checking loan numbers:", error);
      // Show the page even if there's an error
      pageUtils.showPage(true);
      return;
    }

    // Now filter the table
    rows.forEach((row) => {
      let loanValue = null;

      // Find the loan number cell (first cell in the row)
      const loanCell = row.querySelector("td:first-child");
      if (loanCell) {
        // Find the div containing the selected loan type
        const loanTypeDivs = loanCell.querySelectorAll("div.flex");
        for (const div of loanTypeDivs) {
          const label = div.querySelector("div:first-child");
          const value = div.querySelector("div.ml-2");

          if (
            label &&
            value &&
            ((loanType === "Servicer" &&
              label.textContent.trim() === "Servicer:") ||
              (loanType === "Investor" &&
                label.textContent.trim() === "Investor:"))
          ) {
            loanValue = value.textContent.trim();
            break;
          }
        }
      }

      if (loanValue) {
        // Check if this loan value is allowed
        const isAllowed = allowedLoanNumbers.includes(loanValue);
        
        // First check: Is the loan allowed? (Always required)
        if (!isAllowed) {
          row.style.display = "none";
          removedCount++;
          return; // Skip to next row
        }

        let isMatch = false;

        // For exact search with a loan number, check if it matches
        if (isExact && loanNumber) {
          // Check if the loan number matches the search criteria
          if (
            loanValue.includes(loanNumber) ||
            loanNumber.includes(loanValue) ||
            loanValue.toLowerCase() === loanNumber.toLowerCase()
          ) {
            isMatch = true;
          }
        } else {
          // For non-exact search or no loan number, consider it a match
          // But still only show loans that are allowed (already checked above)
          isMatch = true;
        }

        if (!isMatch) {
          row.style.display = "none";
          removedCount++;
        } else {
          row.style.display = "";
          visibleCount++;
        }
      } else {
        // If no loan value found for the selected type, hide the row
        row.style.display = "none";
        removedCount++;
      }
    });

    // Update pagination info
    updatePaginationInfo(visibleCount);

    console.log(
      `Filtered out ${removedCount} rows, showing ${visibleCount} rows`
    );
    
    // Show the page now that filtering is complete
    pageUtils.showPage(true);
  }

  /**
   * @async
   * @function handleFormSubmission
   * @description Handles form submission
   * @param {Event} event - The form submission event
   * @returns {boolean} False to prevent default form submission if needed
   */
  async function handleFormSubmission(event) {
    // Hide the page while processing
    pageUtils.showPage(false);
    
    const searchGridElement = new SearchGridElement();
    const isExact = isExactSearch();
    const loanNumber = getLoanNumber();
    const loanType = getLoanType();

    console.log(
      `Submit clicked - isExact: ${isExact}, loanNumber: ${loanNumber}, loanType: ${loanType}`
    );

    if (isExact && loanNumber && loanType) {
      console.log(
        `Exact search selected for loan number: ${loanNumber}, type: ${loanType}`
      );

      // Check if the loan number is provisioned
      const isProvisioned = await isLoanNumberProvisioned(loanNumber);
      
      if (!isProvisioned) {
        console.log(`Loan number ${loanNumber} is not provisioned to the user`);
        searchGridElement.showRestrictedMessage();
        searchGridElement.hide();

        // Prevent the default form submission
        if (event) {
          event.preventDefault();
        }
        
        // Show the page now that processing is complete
        pageUtils.showPage(true);
        return false;
      } else {
        console.log(`Loan number ${loanNumber} is provisioned to the user`);
        searchGridElement.hideRestrictedMessage();
        searchGridElement.show();

        // Apply filtering
        await filterTable();
      }
    } else {
      // For non-exact search, show the grid and apply filtering
      searchGridElement.hideRestrictedMessage();
      searchGridElement.show();

      // Apply filtering to show only provisioned loans
      await filterTable();

      console.log("Non-exact search: Showing only provisioned loans");
    }
    
    // Show the page now that processing is complete
    pageUtils.showPage(true);
  }

  /**
   * @async
   * @function initializeScript
   * @description Initializes the script
   */
  async function initializeScript() {
    try {
      // Wait for the extension listener
      await waitForListener();
      
      // Set up the initial filtering
      await filterTable();

      // Set up mutation observer for the table
      const tableContainer =
        findLoanTable()?.closest("table") ||
        document.querySelector(".new-ui-table.striped") ||
        document.querySelector("table");
        
      if (tableContainer) {
        const observer = new MutationObserver((mutations) => {
          console.log("Table mutation detected, reapplying filter");
          filterTable();
        });

        observer.observe(tableContainer, {
          childList: true,
          subtree: true,
          attributes: false,
          characterData: false,
        });

        console.log("Table observer set up successfully");
      } else {
        console.error("Table container not found, cannot observe changes");
      }

      // Set up event listeners using the onValueChange approach
      const searchForm = document.querySelector("#search-loan-form");
      if (searchForm) {
        // Monitor changes to the form inputs
        onValueChange(
          () => getLoanNumber(),
          (newValue) => {
            if (!isExactSearch()) {
              filterTable();
            }
          }
        );

        onValueChange(
          () => getLoanType(),
          (newValue) => {
            if (!isExactSearch()) {
              filterTable();
            }
          }
        );

        onValueChange(
          () => isExactSearch(),
          (newValue) => {
            if (!newValue) {
              filterTable();
            }
          }
        );

        // Add event listener to the submit button
        const submitButton = document.querySelector("#btnSubmit");
        if (submitButton) {
          console.log("Found submit button, adding event listener");
          submitButton.addEventListener("click", handleFormSubmission);
        } else {
          console.error("Submit button not found");
        }
      }

      // Monitor URL changes
      onValueChange(
        () => document.location.href,
        async (newVal) => {
          console.log(`URL changed to: ${newVal}`);
          
          // Check if we're on a loan detail page
          if (newVal.includes("#/bidApproveReject")) {
            pageUtils.showPage(false);
            const viewElement = await waitForLoanNumber();
            viewElement.remove();

            async function addIfAllowed() {
              const loanNumber = getLoanNumberFromView(viewElement.element);
              const isProvisioned = await isLoanNumberProvisioned(loanNumber);
              if (isProvisioned) {
                viewElement.add();
              }
              pageUtils.showPage(true);
            }

            await addIfAllowed();
          } else {
            // Re-apply filtering when URL changes to other pages
            setTimeout(() => filterTable(), 500);
          }
        }
      );
      
      // Show the page now that initialization is complete
      pageUtils.showPage(true);
    } catch (error) {
      console.error("Error during initialization:", error);
      // Show the page even if there's an error
      pageUtils.showPage(true);
    }
  }

  // Initialize the script
  initializeScript();
})();
