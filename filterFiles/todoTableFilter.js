/**
 * @fileoverview Todo Table Filter Script
 * @description This script filters todo table entries based on user permissions.
 * It hides unauthorized loan numbers and provides a secure browsing experience.
 * @version 2.0.0
 */
(function () {
  // Import utility functions for page visibility control
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

  // Constants
  const DEBUG_MODE = true;
  const EXTENSION_ID = "afkpnpkodeiolpnfnbdokgkclljpgmcm";

  /**
   * @function logDebug
   * @description Logs debug messages if DEBUG_MODE is enabled
   * @param {...any} args - Arguments to log
   */
  function logDebug(...args) {
    if (DEBUG_MODE) {
      console.log("[TodoFilter]", ...args);
    }
  }

  logDebug("Initializing Todo Table Filter");

  // Flag to track if filtering has been applied
  let filteringApplied = false;

  /**
   * @async
   * @function waitForListener
   * @description Waits for the Chrome extension listener to be available
   * @param {number} [maxRetries=20] - Maximum number of retry attempts
   * @param {number} [initialDelay=100] - Initial delay in milliseconds between retries
   * @returns {Promise<boolean>} Promise that resolves to true if listener is available, false otherwise
   */
  async function waitForListener(maxRetries = 20, initialDelay = 100) {
    return new Promise((resolve, reject) => {
      if (
        typeof chrome === "undefined" ||
        !chrome.runtime ||
        !chrome.runtime.sendMessage
      ) {
        console.warn(
          "❌ Chrome extension API not available. Running in standalone mode."
        );
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
          reject(new Error("Listener not found"));
          return;
        }

        try {
          chrome.runtime.sendMessage(
            EXTENSION_ID,
            { type: "ping" },
            (response) => {
              if (chrome.runtime.lastError) {
                console.warn(
                  "Chrome extension error:",
                  chrome.runtime.lastError
                );
                attempts++;
                if (attempts >= maxRetries) {
                  reject(new Error("Chrome extension error"));
                  return;
                }
                timeoutId = setTimeout(sendPing, delay);
                return;
              }

              if (response?.result === "pong") {
                clearTimeout(timeoutId);
                resolve(true);
              } else {
                timeoutId = setTimeout(() => {
                  attempts++;
                  delay *= 2;
                  sendPing();
                }, delay);
              }
            }
          );
        } catch (error) {
          console.error("Error sending message to extension:", error);
          resolve(false);
        }
      }

      sendPing();
    });
  }

  /**
   * @async
   * @function checkNumbersBatch
   * @description Checks if the user has access to a batch of loan numbers
   * @param {string[]} numbers - Array of loan numbers to check
   * @returns {Promise<string[]>} Promise that resolves to an array of allowed loan numbers
   * @throws {Error} If there's an error communicating with the extension
   * @example
   * // Example usage of the function
   * const allowedNumbers = await checkNumbersBatch(['12345', '67890']);
   */
  async function checkNumbersBatch(numbers) {
    return new Promise((resolve, reject) => {
      try {
        if (
          typeof chrome === "undefined" ||
          !chrome.runtime ||
          !chrome.runtime.sendMessage
        ) {
          // If Chrome extension API is not available, use empty array
          console.warn("Chrome extension API not available for loan number check");
          resolve([]);
          return;
        }

        chrome.runtime.sendMessage(
          EXTENSION_ID,
          {
            type: "queryLoans",
            loanIds: numbers,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              return reject(chrome.runtime.lastError.message);
            } else if (response && response.error) {
              return reject(response.error);
            }

            const available = Object.keys(response.result).filter(
              (key) => response.result[key]
            );
            
            // Add allowed loans to cache
            allowedLoansCache.addLoans(available);
            
            resolve(available);
          }
        );
      } catch (error) {
        console.error("Error in checkNumbersBatch:", error);
        resolve([]);
      }
    });
  }

  /**
   * @function onValueChange
   * @description Sets up an interval to monitor changes to a value and triggers a callback when changes are detected
   * @param {Function} evalFunction - Function that returns the value to monitor
   * @param {Function} callback - Function to call when the value changes
   * @param {Object} [options={}] - Options for the monitoring
   * @returns {number} Interval ID that can be used to clear the interval
   */
  function onValueChange(evalFunction, callback, options = {}) {
    let lastValue = undefined;
    const startTime = new Date().getTime();
    const endTime = options.maxTime ? startTime + options.maxTime : null;
    const intervalId = setInterval(async () => {
      try {
        const currentTime = new Date().getTime();
        if (endTime && currentTime > endTime) {
          clearInterval(intervalId);
          return;
        }
        let newValue = await evalFunction();
        if (newValue === "") newValue = null;

        if (lastValue === newValue) return;
        lastValue = newValue;

        await callback(newValue, lastValue);
      } catch (error) {
        console.error("Error in onValueChange:", error);
      }
    }, 500);

    return intervalId;
  }

  /**
   * @function createUnallowedElement
   * @description Creates a DOM element to display when a loan is not provisioned to the user
   * @returns {HTMLElement} The created element
   */
  function createUnallowedElement() {
    const unallowed = document.createElement("div");
    unallowed.id = "offshore-access-message";
    unallowed.className = "warning";
    unallowed.appendChild(
      document.createTextNode("Loan is not provisioned to the user")
    );
    unallowed.style.display = "flex";
    unallowed.style.justifyContent = "center";
    unallowed.style.alignItems = "center";
    unallowed.style.padding = "10px 15px";
    unallowed.style.margin = "10px 0";
    unallowed.style.borderRadius = "4px";
    unallowed.style.fontWeight = "bold";
    unallowed.style.textAlign = "center";
    unallowed.style.backgroundColor = "#fff3cd";
    unallowed.style.color = "#856404";
    unallowed.style.border = "1px solid #ffeeba";
    unallowed.style.position = "relative";
    unallowed.style.zIndex = "1";

    return unallowed;
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
   * @function getLoanNumber
   * @description Extracts the loan number from a view element
   * @param {HTMLElement} viewElement - The element containing the loan number
   * @returns {string|null} The loan number if found, null otherwise
   */
  function getLoanNumber(viewElement) {
    const loanNumberCell = viewElement.querySelector(
      "table tr td a.bright-green.ng-binding"
    );
    return loanNumberCell && loanNumberCell.textContent.trim();
  }

  /**
   * @async
   * @function waitForLoanNumber
   * @description Waits for a loan number to appear in the DOM
   * @returns {Promise<ViewElement>} Promise that resolves to a ViewElement when a loan number is found
   * @example
   * // Example usage of the function
   * const viewElement = await waitForLoanNumber();
   */
  function waitForLoanNumber() {
    return new Promise((resolve) => {
      const observer = new MutationObserver((mutationsList, observer) => {
        const viewElement = new ViewElement();
        if (viewElement.element) {
          const loanNumber = getLoanNumber(viewElement.element);
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
   * @function extractLoanNumber
   * @description Extracts a loan number from text
   * @param {string} text - The text to extract from
   * @returns {string|null} The extracted loan number or null if none found
   */
  function extractLoanNumber(text) {
    if (!text) return null;

    // Try to extract a loan number using various patterns
    const loanMatch = text.match(/(?:Loan|Account|#)[:\s]*(\d+)/i);
    if (loanMatch && loanMatch[1]) {
      return loanMatch[1].trim();
    }

    // If no specific pattern, look for any number with 5+ digits
    const numberMatch = text.match(/\b(\d{5,})\b/);
    if (numberMatch && numberMatch[1]) {
      return numberMatch[1].trim();
    }

    return null;
  }

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
   * @function isLoanNumberAllowed
   * @description Checks if a loan number is allowed by querying the extension
   * @param {string} loanNumber - The loan number to check
   * @returns {Promise<boolean>} Promise that resolves to true if the loan number is allowed, false otherwise
   */
  async function isLoanNumberAllowed(loanNumber) {
    if (!loanNumber) return false;

    // Check cache first
    if (allowedLoansCache.isAllowed(loanNumber)) {
      logDebug(`Cache match found for: ${loanNumber}`);
      return true;
    }

    try {
      // Query the extension for this loan number
      const allowedNumbers = await checkNumbersBatch([loanNumber]);
      return allowedNumbers.includes(loanNumber);
    } catch (error) {
      console.error("Error checking loan number:", error);
      return false;
    }
  }

  /**
   * @async
   * @function filterLoanView
   * @description Filters a loan view based on user permissions
   * @param {ViewElement} viewElement - The view element to filter
   * @returns {Promise<void>}
   */
  async function filterLoanView(viewElement) {
    const loanNumber = getLoanNumber(viewElement.element);
    if (!loanNumber) {
      logDebug("No loan number found in view element");
      return;
    }

    logDebug(`Checking loan number: ${loanNumber}`);
    
    try {
      const isAllowed = await isLoanNumberAllowed(loanNumber);
      
      if (isAllowed) {
        logDebug(`Loan ${loanNumber} is allowed`);
        viewElement.add();
      } else {
        logDebug(`Loan ${loanNumber} is not allowed`);
        viewElement.remove();
      }
    } catch (error) {
      console.error(`Error filtering loan view for ${loanNumber}:`, error);
      // Show the view element in case of error
      viewElement.add();
    }
  }

  /**
   * @async
   * @function filterTodoTable
   * @description Filters todo table entries based on user permissions
   * @returns {Promise<void>}
   */
  async function filterTodoTable() {
    const todoTable = document.querySelector("table.table");
    if (!todoTable) {
      logDebug("Todo table not found");
      return;
    }

    const rows = todoTable.querySelectorAll("tbody tr");
    if (!rows.length) {
      logDebug("No rows found in todo table");
      return;
    }

    logDebug(`Found ${rows.length} rows in todo table`);

    // Collect all loan numbers from the table
    const loanNumbers = [];
    const rowMap = new Map();

    rows.forEach((row) => {
      const loanNumberCell = row.querySelector("td:nth-child(1)");
      if (loanNumberCell) {
        const loanNumber = extractLoanNumber(loanNumberCell.textContent);
        if (loanNumber) {
          loanNumbers.push(loanNumber);
          rowMap.set(loanNumber, row);
        }
      }
    });

    if (!loanNumbers.length) {
      logDebug("No loan numbers found in todo table");
      return;
    }

    logDebug(`Found ${loanNumbers.length} loan numbers in todo table`);

    try {
      // Check all loan numbers in a batch
      const allowedNumbers = await checkNumbersBatch(loanNumbers);
      
      logDebug(`Received ${allowedNumbers.length} allowed loan numbers`);

      // Hide rows with unauthorized loan numbers
      rowMap.forEach((row, loanNumber) => {
        if (!allowedNumbers.includes(loanNumber)) {
          logDebug(`Hiding row for loan number: ${loanNumber}`);
          row.style.display = "none";
        }
      });

      filteringApplied = true;
    } catch (error) {
      console.error("Error filtering todo table:", error);
    } finally {
      // Show the page after filtering
      pageUtils.showPage(true);
    }
  }

  /**
   * @async
   * @function init
   * @description Initializes the todo table filter
   * @returns {Promise<void>}
   */
  async function init() {
    try {
      // Wait for the extension listener to be available
      const listenerAvailable = await waitForListener();
      
      if (!listenerAvailable) {
        logDebug("Extension listener not available, showing page without filtering");
        pageUtils.showPage(true);
        return;
      }

      // Filter the todo table
      await filterTodoTable();

      // Set up a mutation observer to detect changes to the todo table
      const observer = new MutationObserver(async () => {
        if (!filteringApplied) {
          await filterTodoTable();
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      // Set up an interval to periodically check for changes
      setInterval(async () => {
        if (!filteringApplied) {
          await filterTodoTable();
        }
      }, 2000);

      // Set up a listener for URL changes
      onValueChange(
        () => window.location.href,
        async () => {
          logDebug("URL changed, resetting filtering");
          filteringApplied = false;
          allowedLoansCache.clear();
          pageUtils.showPage(false);
          await filterTodoTable();
        }
      );

      // Handle individual loan views
      waitForLoanNumber().then(async (viewElement) => {
        await filterLoanView(viewElement);
      });

    } catch (error) {
      console.error("Error initializing todo table filter:", error);
      pageUtils.showPage(true);
    }
  }

  // Initialize the filter
  init();
})();