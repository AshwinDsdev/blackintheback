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

  // Check if storedNumbersSet exists
  if (!window.storedNumbersSet || !(window.storedNumbersSet instanceof Set)) {
    console.error("window.storedNumbersSet is not defined or not a Set object");
    // Show the page since we can't proceed
    pageUtils.showPage(true);
    return;
  }

  const storedNumbers = window.storedNumbersSet;

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

  logDebug(`Loaded storedNumbersSet with ${storedNumbers.size} entries`);

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
          // If Chrome extension API is not available, use storedNumbers
          const available = numbers.filter((num) => isLoanNumberAllowed(num));
          resolve(available);
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
            resolve(available);
          }
        );
      } catch (error) {
        console.error("Error in checkNumbersBatch:", error);
        // Fallback to storedNumbers
        const available = numbers.filter((num) => isLoanNumberAllowed(num));
        resolve(available);
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
   * @function isLoanNumberAllowed
   * @description Checks if a loan number is allowed using local storedNumbers
   * @param {string} loanNumber - The loan number to check
   * @returns {boolean} True if the loan number is allowed, false otherwise
   */
  function isLoanNumberAllowed(loanNumber) {
    if (!loanNumber) return false;

    // Check cache first
    if (allowedLoansCache.isAllowed(loanNumber)) {
      logDebug(`Cache match found for: ${loanNumber}`);
      return true;
    }

    // Direct match
    if (storedNumbers.has(loanNumber)) {
      logDebug(`Direct match found for: ${loanNumber}`);
      allowedLoansCache.addLoans([loanNumber]);
      return true;
    }

    // Numeric match
    if (/^\d+$/.test(loanNumber)) {
      const numericValue = Number(loanNumber);
      if (storedNumbers.has(numericValue)) {
        logDebug(`Numeric match found for: ${loanNumber}`);
        allowedLoansCache.addLoans([loanNumber]);
        return true;
      }
    }

    // String match
    if (!isNaN(loanNumber)) {
      const stringValue = String(loanNumber);
      if (storedNumbers.has(stringValue)) {
        logDebug(`String match found for: ${loanNumber}`);
        allowedLoansCache.addLoans([loanNumber]);
        return true;
      }
    }

    // Partial match
    for (const num of storedNumbers) {
      const storedStr = String(num).toLowerCase();
      const currentStr = String(loanNumber).toLowerCase();

      if (
        storedStr === currentStr ||
        storedStr.includes(currentStr) ||
        currentStr.includes(storedStr)
      ) {
        logDebug(
          `Partial match found: ${storedStr} contains/matches ${currentStr}`
        );
        allowedLoansCache.addLoans([loanNumber]);
        return true;
      }
    }

    return false;
  }

  /**
   * @async
   * @function checkLoanAccess
   * @description Checks if a loan number is allowed using both local and extension checks
   * @param {string} loanNumber - The loan number to check
   * @returns {Promise<boolean>} Promise that resolves to true if the loan number is allowed, false otherwise
   */
  async function checkLoanAccess(loanNumber) {
    try {
      // First check local cache and storedNumbers
      if (
        allowedLoansCache.isAllowed(loanNumber) ||
        isLoanNumberAllowed(loanNumber)
      ) {
        return true;
      }

      // Then try to check with the extension
      const allowedNumbers = await checkNumbersBatch([loanNumber]);

      // Add to cache for future reference
      allowedLoansCache.addLoans(allowedNumbers);

      return allowedNumbers.includes(loanNumber);
    } catch (error) {
      console.warn("Failed to check loan access, falling back to local check");
      return isLoanNumberAllowed(loanNumber);
    }
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
   * @class LoanTableHandler
   * @description Class to handle table elements and filtering
   */
  class LoanTableHandler {
    /**
     * @constructor
     */
    constructor() {
      this.table = this.findLoanTable();
      this.rows = this.table
        ? Array.from(this.table.querySelectorAll("tr"))
        : [];
      this.visibleCount = 0;
      this.totalCount = this.rows.length;
      this.removedCount = 0;
      this.loanNumberCache = new Map(); // Cache loan numbers by row
      this.unallowed = createUnallowedElement();
      this.messageParent =
        document.querySelector(
          ".content-area, main, #main-content, .content-details, .section-details"
        ) || document.body;
    }

    // Find the loan table
    findLoanTable() {
      // Try various selectors to find the table
      const tableSelectors = [
        ".todo-table tbody",
        ".workflow-table tbody",
        ".task-table tbody",
        "table.striped tbody",
        "table tbody",
      ];

      for (const selector of tableSelectors) {
        const table = document.querySelector(selector);
        if (table) {
          return table;
        }
      }

      // If no tbody found, try to find any table
      const anyTable = document.querySelector("table");
      if (anyTable) {
        // Try to find or create tbody
        let tbody = anyTable.querySelector("tbody");
        if (!tbody) {
          // If no tbody exists, use the table itself
          return anyTable;
        }
        return tbody;
      }

      return null;
    }

    // Get loan number from a row
    getLoanNumberFromRow(row) {
      // Check cache first
      if (this.loanNumberCache.has(row)) {
        return this.loanNumberCache.get(row);
      }

      const cells = row.querySelectorAll("td");
      if (cells.length === 0) return null; // Skip header rows

      let loanNumber = null;

      // Try to find a loan number in any cell
      for (const cell of cells) {
        const extractedNumber = extractLoanNumber(cell.textContent);
        if (extractedNumber) {
          loanNumber = extractedNumber;
          break;
        }
      }

      // Cache the result
      this.loanNumberCache.set(row, loanNumber);
      return loanNumber;
    }

    /**
     * @method isLoanNumberAllowed
     * @description Checks if a loan number is allowed
     * @param {string} loanNumber - The loan number to check
     * @returns {boolean} True if the loan number is allowed, false otherwise
     */
    isLoanNumberAllowed(loanNumber) {
      return isLoanNumberAllowed(loanNumber);
    }

    /**
     * @method showMessage
     * @description Shows a message to the user
     * @param {string} text - The message text
     * @param {string} [type="info"] - The message type (info, warning, etc.)
     */
    showMessage(text, type = "info") {
      // Remove any existing message
      const existingMessage = document.getElementById(
        "offshore-access-message"
      );
      if (existingMessage) {
        existingMessage.remove();
      }

      this.unallowed.textContent = text;
      this.unallowed.className = type;
      this.unallowed.style.display = "block";
      this.messageParent.insertBefore(
        this.unallowed,
        this.messageParent.firstChild
      );
    }

    /**
     * @method hideMessage
     * @description Hides the message
     */
    hideMessage() {
      const existingMessage = document.getElementById(
        "offshore-access-message"
      );
      if (existingMessage) {
        existingMessage.style.display = "none";
      }
    }

    // Filter the table
    filterTable() {
      if (!this.table) {
        console.error("Loan table not found");
        return;
      }

      console.log(
        `Filtering table with ${storedNumbers.size} allowed loan numbers`
      );

      this.visibleCount = 0;
      this.removedCount = 0;

      // Store the original table parent and next sibling to reinsert it later
      const tableParent = this.table.parentNode;
      const nextSibling = this.table.nextSibling;

      // Create a document fragment to work with the rows without affecting the live DOM
      const fragment = document.createDocumentFragment();
      fragment.appendChild(this.table.cloneNode(false)); // Clone the table without its children

      // Process each row
      this.rows.forEach((row) => {
        const cells = row.querySelectorAll("td");
        if (cells.length === 0) {
          // This is a header row, always keep it
          const clonedRow = row.cloneNode(true);
          fragment.firstChild.appendChild(clonedRow);
          return;
        }

        const loanNumber = this.getLoanNumberFromRow(row);

        if (loanNumber) {
          const isAllowed = this.isLoanNumberAllowed(loanNumber);

          // Clone the row and add it to our fragment
          const clonedRow = row.cloneNode(true);

          // Show or hide the row
          if (isAllowed) {
            clonedRow.style.display = "";
            this.visibleCount++;
            fragment.firstChild.appendChild(clonedRow);
          } else {
            this.removedCount++;
            // Don't add non-matching rows to the fragment
          }
        } else {
          // If no loan number found, keep the row visible
          const clonedRow = row.cloneNode(true);
          fragment.firstChild.appendChild(clonedRow);
          this.visibleCount++;
        }
      });

      console.log(
        `Filtering complete. Removed: ${this.removedCount}, Visible: ${this.visibleCount}`
      );

      // Set flag to indicate filtering has been applied
      filteringApplied = true;

      // Replace the original table with our filtered version
      if (tableParent) {
        // Remove the original table
        this.table.remove();

        // Insert the new filtered table
        if (nextSibling) {
          tableParent.insertBefore(fragment.firstChild, nextSibling);
        } else {
          tableParent.appendChild(fragment.firstChild);
        }

        // Update the table reference
        this.table =
          tableParent.querySelector("tbody") ||
          tableParent.querySelector("table");
        this.rows = this.table
          ? Array.from(this.table.querySelectorAll("tr"))
          : [];
      }

      // Update pagination and total count information
      updatePaginationAndCount(
        this.visibleCount,
        this.removedCount + this.visibleCount
      );

      // Show a message about the filtering
      showFilterMessage(this.visibleCount);
      
      // Show the page now that filtering is complete
      pageUtils.showPage(true);
    }
  }

  // Function to update pagination and total count information
  function updatePaginationAndCount(visibleCount, totalCount) {
    console.log(
      `Updating pagination and count: Visible=${visibleCount}, Total=${totalCount}`
    );

    // Update total count displays
    updateTotalCountDisplays(visibleCount, totalCount);

    // Update pagination elements
    updatePaginationElements(visibleCount);
  }

  // Function to update total count displays
  function updateTotalCountDisplays(visibleCount, totalCount) {
    // Check for specific count elements in your page
    const countElements = [
      // Add specific IDs or classes that show count information
      { selector: "#total-records", regex: /\d+/ },
      { selector: "#records-count", regex: /\d+/ },
      { selector: ".total-items", regex: /\d+/ },
      { selector: ".records-showing", regex: /\d+/ },
    ];

    // Update specific count elements
    countElements.forEach((item) => {
      const elements = document.querySelectorAll(item.selector);
      elements.forEach((el) => {
        const originalText = el.textContent;
        el.textContent = el.textContent.replace(item.regex, visibleCount);
        console.log(
          `Updated specific count element: ${originalText} -> ${el.textContent}`
        );
      });
    });

    // Common patterns for total count displays
    const countPatterns = [
      // Look for elements containing text like "Showing 1-10 of 100 entries"
      {
        selector:
          ".dataTables_info, .showing-entries, .count-display, .results-count, .pagination-info",
        update: (el) => {
          if (el.textContent.match(/showing|entries|results|records|items/i)) {
            // Extract the pattern: "Showing X to Y of Z entries"
            const match = el.textContent.match(
              /showing\s+\d+\s+to\s+\d+\s+of\s+\d+/i
            );
            if (match) {
              const originalText = el.textContent;
              // Replace just the total number
              el.textContent = originalText.replace(
                /of\s+\d+/i,
                `of ${visibleCount}`
              );
              console.log(
                `Updated count display: ${originalText} -> ${el.textContent}`
              );
            } else {
              el.textContent = `Showing 1 to ${visibleCount} of ${visibleCount} entries`;
            }
          }
        },
      },

      // Look for simple count displays like "Total: 100"
      {
        selector: ".total-count, .count, .total, .record-count",
        update: (el) => {
          if (el.textContent.match(/total|count|records|results|items/i)) {
            const originalText = el.textContent;
            el.textContent = el.textContent.replace(/\d+/, visibleCount);
            console.log(
              `Updated simple count: ${originalText} -> ${el.textContent}`
            );
          }
        },
      },
    ];

    // Try each pattern
    countPatterns.forEach((pattern) => {
      try {
        const elements = document.querySelectorAll(pattern.selector);
        elements.forEach(pattern.update);
      } catch (err) {
        console.error(
          `Error updating count with pattern ${pattern.selector}:`,
          err
        );
      }
    });

    // Look for any element that might contain count information
    const countRegexes = [
      {
        regex: /(\d+)\s*(results|entries|records|items|loans|accounts)/i,
        replace: `${visibleCount} $2`,
      },
      {
        regex: /showing\s+(\d+)\s+to\s+(\d+)\s+of\s+\d+/i,
        replace: `showing 1 to ${visibleCount} of ${visibleCount}`,
      },
      { regex: /total\s*:\s*\d+/i, replace: `Total: ${visibleCount}` },
      { regex: /found\s+\d+\s+items/i, replace: `found ${visibleCount} items` },
    ];

    // Apply each regex to potential elements
    countRegexes.forEach((regexItem) => {
      const possibleCountElements = Array.from(
        document.querySelectorAll("div, span, p")
      ).filter((el) => regexItem.regex.test(el.textContent));

      possibleCountElements.forEach((el) => {
        const originalText = el.textContent;
        el.textContent = el.textContent.replace(
          regexItem.regex,
          regexItem.replace
        );
        console.log(
          `Updated possible count element: ${originalText} -> ${el.textContent}`
        );
      });
    });
  }

  // Function to update pagination elements
  function updatePaginationElements(visibleCount) {
    // Update the total pages indicator
    const totalPagesSpan = document.getElementById("page-tot-pages");
    if (totalPagesSpan) {
      const originalText = totalPagesSpan.textContent;
      totalPagesSpan.textContent = "Pages: 1";
      console.log(
        `Updated total pages: ${originalText} -> ${totalPagesSpan.textContent}`
      );
    }

    // Handle the specific page-numbers div
    const pageNumbersDiv = document.querySelector(".page-numbers");
    if (pageNumbersDiv) {
      console.log("Found page-numbers div, updating pagination");

      // Get all page number links
      const pageLinks = pageNumbersDiv.querySelectorAll(
        ".page-selector.page-number"
      );

      // If we have only one page or few items, keep only the first page link
      if (visibleCount <= 10) {
        // First, make sure all page links have the correct numbers (1, 2, 3, 4)
        pageLinks.forEach((link, index) => {
          // Set the correct page number text
          link.textContent = (index + 1).toString();
        });

        // Then, keep only the first page and hide others
        pageLinks.forEach((link, index) => {
          if (index === 0) {
            // Keep only the first page and make sure it's selected
            link.classList.add("selected");
            link.setAttribute("data-page", "1");
            link.textContent = "1";
            link.style.display = "";
          } else {
            // Remove other page links
            link.style.display = "none";
          }
        });
        console.log("Updated page-numbers div: showing only page 1");
      } else {
        // If we have more items, still update all links
        pageLinks.forEach((link, index) => {
          // First fix the page numbers
          link.textContent = (index + 1).toString();

          if (index === 0) {
            // Make first page selected
            link.classList.add("selected");
            link.setAttribute("data-page", "1");
            link.style.display = "";
          } else {
            // Hide other pages
            link.style.display = "none";
          }
        });
      }
    }

    // Find standard pagination elements (for other pagination types)
    const paginationElements = document.querySelectorAll(
      '.pagination, .pager, nav[aria-label*="pagination"], ul.page-numbers'
    );

    paginationElements.forEach((pagination) => {
      // Skip if this is the page-numbers div we already handled
      if (pagination.classList.contains("page-numbers")) {
        return;
      }

      // If we have no visible items or just a few, we might want to hide pagination
      if (visibleCount <= 10) {
        pagination.style.display = "none";
        console.log("Hiding pagination as there are few visible items");
        return;
      }

      // Otherwise, we might want to update the page numbers
      const pageItems = pagination.querySelectorAll("li, a, span.page-numbers");

      // Keep only first page active, disable others
      pageItems.forEach((item, index) => {
        // Remove all active/current classes
        item.classList.remove("active", "current", "selected");

        // If this is a page number (not prev/next/etc)
        if (/^\d+$/.test(item.textContent.trim())) {
          const pageNum = parseInt(item.textContent.trim());

          // Make first page active
          if (pageNum === 1) {
            item.classList.add("active", "current", "selected");

            // If it's a link, update aria attributes
            if (item.tagName === "A") {
              item.setAttribute("aria-current", "page");
            }
          } else {
            // Hide or disable other pages
            if (item.tagName === "A") {
              item.setAttribute("aria-disabled", "true");
              item.style.pointerEvents = "none";
              item.style.opacity = "0.5";
            } else if (item.tagName === "LI") {
              item.style.display = "none";
            }
          }
        }

        // Disable next/last buttons
        if (item.textContent.match(/next|last|»|›/i)) {
          item.classList.add("disabled");
          if (item.tagName === "A") {
            item.setAttribute("aria-disabled", "true");
            item.style.pointerEvents = "none";
            item.style.opacity = "0.5";
          }
        }
      });

      console.log("Updated pagination elements");
    });

    // Update any other page number indicators
    const pageIndicators = document.querySelectorAll(
      ".page-number:not(.page-selector), .current-page"
    );
    pageIndicators.forEach((indicator) => {
      indicator.textContent = "1";
      console.log("Reset page indicator to page 1");
    });
  }

  // Function to show a message after filtering
  function showFilterMessage(visibleCount) {
    // Remove any existing message
    const existingMsg = document.getElementById("filter-message");
    if (existingMsg) {
      existingMsg.remove();
    }

    // Create a new message
    const msgDiv = document.createElement("div");
    msgDiv.id = "filter-message";
    msgDiv.style.padding = "10px 15px";
    msgDiv.style.margin = "10px 0";
    msgDiv.style.borderRadius = "4px";
    msgDiv.style.backgroundColor = "#d4edda";
    msgDiv.style.color = "#155724";
    msgDiv.style.border = "1px solid #c3e6cb";
    msgDiv.style.fontWeight = "bold";
    msgDiv.style.textAlign = "center";
    msgDiv.style.position = "fixed";
    msgDiv.style.top = "10px";
    msgDiv.style.left = "50%";
    msgDiv.style.transform = "translateX(-50%)";
    msgDiv.style.zIndex = "9999";
    msgDiv.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
    msgDiv.style.maxWidth = "80%";

    msgDiv.textContent = `Filtering complete! Showing ${visibleCount} loans you have access to (${storedNumbers.size} available).`;

    // Add the message to the body
    document.body.appendChild(msgDiv);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (msgDiv.parentNode) {
        msgDiv.remove();
      }
    }, 5000);
  }

  // Function to create an unallowed element message (similar to reference file)
  function createUnallowedElement() {
    const unallowed = document.createElement("div");
    unallowed.appendChild(
      document.createTextNode(
        "Loans not provisioned to the user have been hidden"
      )
    );
    unallowed.className = "filter-message";
    unallowed.style.padding = "10px 15px";
    unallowed.style.margin = "10px 0";
    unallowed.style.borderRadius = "4px";
    unallowed.style.backgroundColor = "#f8d7da";
    unallowed.style.color = "#721c24";
    unallowed.style.border = "1px solid #f5c6cb";
    unallowed.style.fontWeight = "bold";
    unallowed.style.textAlign = "center";

    return unallowed;
  }

  // Function to handle URL changes and filter automatically
  function setupUrlChangeMonitoring() {
    let lastUrl = document.location.href;
    let filteringInProgress = false;

    // Monitor URL changes
    onValueChange(
      () => document.location.href,
      async (newUrl) => {
        // Skip if we're already filtering or if the URL hasn't really changed
        // (sometimes hash changes don't require refiltering)
        if (
          filteringInProgress ||
          (newUrl && lastUrl && newUrl.split("#")[0] === lastUrl.split("#")[0])
        ) {
          return;
        }

        lastUrl = newUrl;
        console.log(`URL changed to: ${newUrl}`);

        // Wait a moment for the page to load
        setTimeout(() => {
          // Check if page is fully loaded
          if (document.readyState !== "complete") {
            console.log("Page not fully loaded yet, waiting...");
            return;
          }

          // Check if we have a table to filter
          const tableHandler = new LoanTableHandler();
          if (!tableHandler.table || tableHandler.rows.length === 0) {
            console.log("No suitable table found for filtering");
            return;
          }

          // Check if we have any loan numbers in the table
          let hasLoanNumbers = false;
          for (let i = 0; i < Math.min(5, tableHandler.rows.length); i++) {
            const row = tableHandler.rows[i];
            const loanNumber = tableHandler.getLoanNumberFromRow(row);
            if (loanNumber) {
              hasLoanNumbers = true;
              break;
            }
          }

          if (!hasLoanNumbers) {
            console.log(
              "No loan numbers detected in table, skipping automatic filtering"
            );
            return;
          }

          // All checks passed, apply filtering
          console.log(
            "Found loan table with loan numbers, applying filter automatically"
          );
          filteringInProgress = true;

          try {
            tableHandler.filterTable();
          } catch (err) {
            console.error("Error during automatic filtering:", err);
          } finally {
            filteringInProgress = false;
          }
        }, 1500);
      },
      { maxTime: 3600000 }
    ); // Monitor for up to 1 hour
  }

  // Function to find and attach to the Apply Filter button
  function attachToFilterButton() {
    // Try to find the button using various selectors
    const buttonSelectors = [
      "#applyFilter",
      'button:contains("Apply Filter")',
      'input[value*="Apply Filter"]',
      'button:contains("Filter")',
      'input[value*="Filter"]',
      ".filter-button",
      "#filterBtn",
    ];

    let filterButton = null;

    // Helper function to find elements containing text
    function findElementsWithText(selector, text) {
      const elements = document.querySelectorAll(selector);
      return Array.from(elements).filter((el) =>
        el.textContent.toLowerCase().includes(text.toLowerCase())
      );
    }

    // Try each selector
    for (const selector of buttonSelectors) {
      if (selector.includes(":contains(")) {
        // Handle custom contains selector
        const [baseSelector, textToFind] = selector.split(":contains(");
        const text = textToFind.replace(/["')]/g, "");
        const elements = findElementsWithText(baseSelector, text);
        if (elements.length > 0) {
          filterButton = elements[0];
          break;
        }
      } else {
        // Standard selector
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          filterButton = elements[0];
          break;
        }
      }
    }

    // If still not found, try any button with "filter" in its text
    if (!filterButton) {
      const allButtons = document.querySelectorAll(
        'button, input[type="button"], input[type="submit"]'
      );
      for (const btn of allButtons) {
        if (
          (btn.textContent &&
            btn.textContent.toLowerCase().includes("filter")) ||
          (btn.value && btn.value.toLowerCase().includes("filter"))
        ) {
          filterButton = btn;
          break;
        }
      }
    }

    // If we found a button, attach our handler
    if (filterButton) {
      console.log("Found filter button:", filterButton.outerHTML);

      // Only attach once
      if (filterButton._filterHandlerAttached) {
        return true;
      }

      // Mark as attached
      filterButton._filterHandlerAttached = true;

      // Add click handler
      filterButton.addEventListener("click", function (event) {
        // Prevent default form submission behavior
        event.preventDefault();
        event.stopPropagation();

        // Show loading state
        const originalText = filterButton.textContent || filterButton.value;
        const originalDisabled = filterButton.disabled;

        if (filterButton.tagName === "INPUT") {
          filterButton.value = "Filtering...";
        } else {
          filterButton.textContent = "Filtering...";
        }
        filterButton.disabled = true;

        // Apply filtering after a short delay
        setTimeout(() => {
          try {
            const tableHandler = new LoanTableHandler();
            tableHandler.filterTable();
          } catch (err) {
            console.error("Error during filtering:", err);
          }

          // Reset button state
          if (filterButton.tagName === "INPUT") {
            filterButton.value = originalText;
          } else {
            filterButton.textContent = originalText;
          }
          filterButton.disabled = originalDisabled;
        }, 100);

        // Return false to prevent form submission
        return false;
      });

      console.log("Successfully attached filter handler to button");
      return true;
    }

    console.log("Could not find filter button");
    return false;
  }

  /**
   * @function setupUrlChangeMonitoring
   * @description Sets up monitoring for URL changes to apply filtering on navigation
   */
  function setupUrlChangeMonitoring() {
    onValueChange(() => document.location.href, async (newVal) => {
      if (!newVal.includes("#/bidApproveReject")) return;

      const viewElement = await waitForLoanNumber();
      viewElement.remove();

      async function addIfAllowed() {
        const loanNumber = getLoanNumber(viewElement.element);
        const allowedNumbers = await checkNumbersBatch([loanNumber]);
        if (allowedNumbers.includes(loanNumber)) {
          viewElement.add();
        }
      }

      await waitForListener();
      await addIfAllowed();
    });
  }

  // Initialize the script
  function initialize() {
    console.log("Initializing loan filter script");

    // Set up URL change monitoring (similar to reference file)
    setupUrlChangeMonitoring();

    // Try to attach to filter button
    let buttonAttached = false;

    // Try immediately
    buttonAttached = attachToFilterButton();

    // Try again after a delay
    setTimeout(() => {
      if (!buttonAttached) {
        buttonAttached = attachToFilterButton();
      }

      // If we still don't have a button, try to filter automatically
      if (!buttonAttached && !filteringApplied) {
        console.log("No filter button found, applying filter automatically");
        const tableHandler = new LoanTableHandler();
        if (tableHandler.table) {
          tableHandler.filterTable();
        }
      }
    }, 1000);

    // Try one more time after a longer delay
    setTimeout(() => {
      if (!buttonAttached) {
        buttonAttached = attachToFilterButton();
      }

      // If we still don't have a button and haven't filtered, try again
      if (!buttonAttached && !filteringApplied) {
        console.log("Still no filter button, applying filter automatically");
        const tableHandler = new LoanTableHandler();
        if (tableHandler.table) {
          tableHandler.filterTable();
        }
      }
    }, 3000);
  }

  // Start the script
  initialize();
})();
