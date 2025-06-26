/**
 * @fileoverview Todo Table Filter Script
 * @description This script filters todo table entries based on allowed loan numbers.
 * @version 3.0.0
 */
(function () {
  // Constants
  const DEBUG_MODE = false;
  const FILTER_INTERVAL_MS = 2000;
  const ALLOWED_ROWS_CLASS = "offshore-allowed-row";
  const HIDDEN_ROWS_CLASS = "offshore-hidden-row";
  const EXTENSION_ID = "afkpnpkodeiolpnfnbdokgkclljpgmcm";

  // State management
  let isFiltering = false;
  let lastFilteredLoans = new Set();
  let filterTimeout = null;
  let unallowedElement = null;

  // Debug logging
  function debugLog(...args) {
    if (DEBUG_MODE) {
      console.log(
        "%c[TodoFilter Debug]",
        "background: #4CAF50; color: white; padding: 2px 5px; border-radius: 2px;",
        ...args
      );
      // Also log to regular console for backup
      console.log("[TodoFilter Debug]", ...args);
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
   * @function createLoader
   * @description Creates loader styles for better user experience
   */
  function createLoader() {
    if (!document.getElementById("loader-styles")) {
      const style = document.createElement("style");
      style.id = "loader-styles";
      style.textContent = `
        #loaderOverlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(255, 255, 255, 0.95);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          transition: opacity 0.3s ease;
        }
        .spinner {
          width: 60px;
          height: 60px;
          border: 6px solid #ccc;
          border-top-color: #2b6cb0;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to {transform: rotate(360deg);}
        }
        #loaderOverlay.hidden {
          opacity: 0;
          pointer-events: none;
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * @function createLoaderElement
   * @description Creates the loader element
   */
  function createLoaderElement() {
    const loader = document.createElement("div");
    loader.id = "loaderOverlay";
    const spinner = document.createElement("div");
    spinner.className = "spinner";
    loader.appendChild(spinner);
    return loader;
  }

  /**
   * @function showLoader
   * @description Shows the loader
   */
  function showLoader() {
    createLoader();
    if (!document.getElementById("loaderOverlay")) {
      const loader = createLoaderElement();
      document.body.appendChild(loader);
    }
  }

  /**
   * @function hideLoader
   * @description Hides the loader
   */
  function hideLoader() {
    const loader = document.getElementById("loaderOverlay");
    if (loader) {
      loader.classList.add("hidden");
      setTimeout(() => loader.remove(), 300);
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
      if (
        typeof chrome === "undefined" ||
        !chrome.runtime ||
        !chrome.runtime.sendMessage
      ) {
        console.warn(
          "❌ Chrome extension API not available. Running in standalone mode."
        );
        pageUtils.showPage(true);
        resolve(false);
        return;
      }

      let attempts = 0;
      let delay = initialDelay;
      let timeoutId;

      function sendPing() {
        if (attempts >= maxRetries) {
          console.warn("❌ No listener detected after maximum retries.");
          clearTimeout(timeoutId);
          reject(new Error("Listener not found"));
          return;
        }

        debugLog(`🔄 Sending ping attempt ${attempts + 1}/${maxRetries}...`);

        chrome.runtime.sendMessage(
          EXTENSION_ID,
          { type: "ping" },
          (response) => {
            if (response?.result === "pong") {
              debugLog("✅ Listener detected!");
              clearTimeout(timeoutId);
              resolve(true);
            } else {
              debugLog("❌ No listener detected, retrying...");
              timeoutId = setTimeout(() => {
                attempts++;
                delay *= 2; // Exponential backoff
                sendPing();
              }, delay);
            }
          }
        );
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
   */
  async function checkNumbersBatch(numbers) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        EXTENSION_ID,
        {
          type: "queryLoans",
          loanIds: numbers,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            return reject(chrome.runtime.lastError.message);
          } else if (response.error) {
            return reject(response.error);
          }

          const available = Object.keys(response.result).filter(
            (key) => response.result[key]
          );
          resolve(available);
        }
      );
    });
  }

  /**
   * @function addFilterStyles
   * @description Adds necessary styles to the document (optimized)
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
        .offshore-unallowed-message {
          position: fixed !important;
          top: 50% !important;
          left: 50% !important;
          transform: translate(-50%, -50%) !important;
          z-index: 999999 !important;
          background: white !important;
          padding: 20px !important;
          border: 2px solid #ccc !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
          display: flex !important;
          visibility: visible !important;
          opacity: 1 !important;
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
   * @description Gets loan number from a table row using different possible selectors (optimized)
   */
  function getLoanNumberFromRow(row) {
    // Try data-loan attribute first (most efficient)
    const dataLoan = row.getAttribute("data-loan");
    if (dataLoan) {
      return dataLoan.trim();
    }

    // Try first cell content with early return
    const firstCell = row.querySelector("td:first-child");
    if (firstCell?.textContent) {
      const loanNumber = extractLoanNumber(firstCell.textContent);
      if (loanNumber) {
        return loanNumber;
      }
    }

    // Try second cell as fallback (common pattern)
    const secondCell = row.querySelector("td:nth-child(2)");
    if (secondCell?.textContent) {
      const loanNumber = extractLoanNumber(secondCell.textContent);
      if (loanNumber) {
        return loanNumber;
      }
    }

    return null;
  }

  /**
   * @function enforceFiltering
   * @description Enforces filtering on the table rows only (optimized)
   */
  function enforceFiltering() {
    if (isFiltering) return;

    pageUtils.showPage(false);

    // Use cached selectors for better performance
    const tables = [
      document.querySelector(
        "table.new-ui-table.striped.heading-highlighted.border.shadow-regular"
      ),
      document.querySelector("#todoTable table.table"),
    ].filter(Boolean);

    if (tables.length === 0) {
      pageUtils.showPage(true);
      return;
    }

    // Use fragment to minimize DOM reflows
    tables.forEach((table) => {
      const rows = table.querySelectorAll("tbody tr");
      const fragment = document.createDocumentFragment();

      rows.forEach((row) => {
        const loanNumber = getLoanNumberFromRow(row);
        if (loanNumber) {
          // Use toggle for better performance
          const isAllowed = lastFilteredLoans.has(loanNumber);
          row.classList.toggle(ALLOWED_ROWS_CLASS, isAllowed);
          row.classList.toggle(HIDDEN_ROWS_CLASS, !isAllowed);
        }
      });
    });

    pageUtils.showPage(true);
  }

  /**
   * @function filterTodoTable
   * @description Filters todo table entries based on allowed loan numbers (optimized)
   */
  async function filterTodoTable() {
    if (isFiltering) return;
    isFiltering = true;

    try {
      showLoader();

      // Cache table selectors for better performance
      const tables = [
        document.querySelector(
          "table.new-ui-table.striped.heading-highlighted.border.shadow-regular"
        ),
        document.querySelector("#todoTable table.table"),
      ].filter(Boolean);

      if (tables.length === 0) {
        hideLoader();
        pageUtils.showPage(true);
        return;
      }

      const loanNumbers = [];
      const rowMap = new Map();

      // Use more efficient loop structure
      tables.forEach((table) => {
        const rows = table.querySelectorAll("tbody tr");
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const loanNumber = getLoanNumberFromRow(row);
          if (loanNumber) {
            loanNumbers.push(loanNumber);
            rowMap.set(loanNumber, row);
          }
        }
      });

      if (!loanNumbers.length) {
        hideLoader();
        pageUtils.showPage(true);
        return;
      }

      const allowedNumbers = await checkNumbersBatch(loanNumbers);
      // Use Set for O(1) lookups
      const allowedSet = new Set(allowedNumbers);
      lastFilteredLoans = allowedSet;

      // Batch DOM updates for better performance
      rowMap.forEach((row, loanNumber) => {
        const isAllowed = allowedSet.has(loanNumber);
        row.classList.toggle(ALLOWED_ROWS_CLASS, isAllowed);
        row.classList.toggle(HIDDEN_ROWS_CLASS, !isAllowed);
      });

      addFilterStyles();
      hideLoader();
      pageUtils.showPage(true);
    } catch (error) {
      console.error("Error filtering todo table:", error);
      hideLoader();
      pageUtils.showPage(true);
    } finally {
      isFiltering = false;
      // Reduced timeout for better responsiveness
      setTimeout(() => {
        pageUtils.showPage(true);
      }, 200);
    }
  }

  /**
   * @function createUnallowedElement
   * @description Creates an element to show when a loan is not allowed
   */
  function createUnallowedElement() {
    const unallowed = document.createElement("span");
    unallowed.appendChild(
      document.createTextNode("You are not provisioned for this loan.")
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
    return unallowed;
  }

  /**
   * @function showUnallowedMessage
   * @description Shows the unallowed message and hides the table
   */
  function showUnallowedMessage() {
    try {
      // Remove any existing unallowed element
      if (unallowedElement) {
        unallowedElement.remove();
        unallowedElement = null;
      }

      // Create new unallowed element
      unallowedElement = createUnallowedElement();

      // Find the todo table container
      const todoTable = document.querySelector("#todoTable");

      if (todoTable) {
        todoTable.style.display = "none";
      }

      // Always append to body regardless of table presence
      document.body.appendChild(unallowedElement);

      // Force a reflow to ensure the message is visible
      unallowedElement.offsetHeight;

      // Add a style tag to ensure the message stays on top
      const styleTag = document.createElement("style");
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
    } catch (error) {
      console.error("Error showing unallowed message:", error);
    }
  }

  /**
   * @function hideUnallowedMessage
   * @description Hides the unallowed message and shows the table
   */
  function hideUnallowedMessage() {
    try {
      if (unallowedElement) {
        unallowedElement.remove();
        unallowedElement = null;
      }

      const todoTable = document.querySelector("#todoTable");
      if (todoTable) {
        todoTable.style.display = "block";
      } else {
        debugLog("Todo table not found");
      }
    } catch (error) {
      console.error("Error hiding unallowed message:", error);
    }
  }

  /**
   * @function handleExactSearch
   * @description Handles exact search filter functionality
   */
  async function handleExactSearch() {
    // Get the elements we know exist
    const exactSearchCheckbox = document.querySelector(
      "#Filter_LoanExactSearch"
    );
    const loanNumberInput = document.querySelector("#Filter_LoanNumber");

    if (!exactSearchCheckbox || !loanNumberInput) {
      console.error("Required elements not found");
      return;
    }

    // Function to handle the exact search check
    async function performExactSearch() {
      const loanNumber = loanNumberInput.value.trim();

      try {
        const allowedNumbers = await checkNumbersBatch([loanNumber]);

        if (!allowedNumbers.includes(loanNumber)) {
          console.log("Loan number not allowed, showing message");

          // Remove any existing message first
          const existingMessage = document.querySelector(
            ".offshore-unallowed-message"
          );
          if (existingMessage) {
            existingMessage.remove();
          }

          // Create and show message using the same styling as msi-loan-ext.js
          const message = createUnallowedElement();
          message.className = "offshore-unallowed-message";

          // Add to body and force reflow
          document.body.appendChild(message);
          message.offsetHeight; // Force reflow

          // Hide the table
          const todoTable = document.querySelector("#todoTable");
          if (todoTable) {
            todoTable.style.display = "none";
          } else {
            console.log("Table not found");
          }

          // Prevent the form from submitting
          return false;
        } else {
          // Remove any existing message
          const existingMessage = document.querySelector(
            ".offshore-unallowed-message"
          );
          if (existingMessage) {
            existingMessage.remove();
            console.log("Existing message removed");
          }

          // Show the table
          const todoTable = document.querySelector("#todoTable");
          if (todoTable) {
            todoTable.style.display = "block";
          }

          filterTodoTable();
          return true;
        }
      } catch (error) {
        console.error("Error checking loan number:", error);
        return true;
      }
    }

    // Add change handler to exact search checkbox - only to handle unchecking
    exactSearchCheckbox.addEventListener("change", () => {
      if (!exactSearchCheckbox.checked) {
        // Remove any existing message
        const existingMessage = document.querySelector(
          ".offshore-unallowed-message"
        );
        if (existingMessage) {
          existingMessage.remove();
          console.log("Message removed");
        }

        // Show the table
        const todoTable = document.querySelector("#todoTable");
        if (todoTable) {
          todoTable.style.display = "block";
          console.log("Table shown");
        }
      }
    });

    // Handle the apply filter button click
    const applyFilterButton = document.querySelector("#applyFilter");
    if (applyFilterButton) {
      applyFilterButton.addEventListener("click", async (e) => {
        if (exactSearchCheckbox.checked && loanNumberInput.value.trim()) {
          const shouldSubmit = await performExactSearch();

          if (!shouldSubmit) {
            e.preventDefault();
            e.stopPropagation();
            return false;
          }
        }
      });
    }

    // Also handle form submission
    const form = document.querySelector("#todo-filter");
    if (form) {
      form.addEventListener("submit", async (e) => {
        if (exactSearchCheckbox.checked && loanNumberInput.value.trim()) {
          const shouldSubmit = await performExactSearch();

          if (!shouldSubmit) {
            e.preventDefault();
            e.stopPropagation();
            return false;
          }
        }
      });
    }
  }

  // Create debounced versions of our functions (optimized timing)
  const debouncedFilter = debounce(filterTodoTable, 300);
  const debouncedEnforce = debounce(enforceFiltering, 200);

  /**
   * @function init
   * @description Initializes the todo table filter (optimized)
   */
  async function init() {
    showLoader();
    pageUtils.showPage(false);

    try {
      const listenerAvailable = await waitForListener();

      if (listenerAvailable) {
        console.log("✅ Extension listener connected successfully");
      } else {
        console.warn(
          "⚠️ Extension listener not available, running in limited mode"
        );
        hideLoader();
        pageUtils.showPage(true);
        return;
      }

      addFilterStyles();

      await filterTodoTable();

      await handleExactSearch();

      // More efficient mutation observer with throttling
      let observerTimeout;
      const observer = new MutationObserver((mutations) => {
        if (observerTimeout) return;

        const shouldFilter = mutations.some((mutation) => {
          const target = mutation.target;
          return (
            target.closest(
              "table.new-ui-table.striped.heading-highlighted.border.shadow-regular"
            ) || target.closest("#todoTable table.table")
          );
        });

        if (shouldFilter) {
          observerTimeout = setTimeout(() => {
            debouncedFilter();
            observerTimeout = null;
          }, 100);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["style", "class"],
      });

      // More efficient interval checking
      setInterval(() => {
        if (!isFiltering && document.hasFocus()) {
          debouncedEnforce();
        }
      }, FILTER_INTERVAL_MS);

      hideLoader();
    } catch (error) {
      console.error("Error initializing todo table filter:", error);
      hideLoader();
      pageUtils.showPage(true);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    console.log("DOM already loaded, initializing immediately");
    init();
  }
})();
