/**
 * @fileoverview Advanced Todo Table Filter Script
 * @description This script filters todo table entries based on user permissions.
 * It hides unauthorized loan numbers and provides a secure browsing experience.
 * @version 2.0.0
 */
(function () {
  // Immediately hide the page to prevent unauthorized content from being visible
  document.body.style.opacity = 0;

  // Add a style tag to ensure the page stays hidden until we're ready
  const initialStyle = document.createElement("style");
  initialStyle.textContent = "body { opacity: 0 !important; }";
  document.head.appendChild(initialStyle);

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

  // Hide the page immediately to prevent unauthorized loan numbers from being visible
  pageUtils.showPage(false);

  // Constants
  const DEBUG_MODE = false; // Set to false to reduce console logs

  // Suppress non-critical console warnings in production
  if (!DEBUG_MODE) {
    const originalWarn = console.warn;
    console.warn = function (...args) {
      // Only show critical warnings
      if (
        args[0] &&
        typeof args[0] === "string" &&
        (args[0].includes("Critical") || args[0].includes("Error"))
      ) {
        originalWarn.apply(console, args);
      }
    };
  }
  const EXTENSION_ID = "afkpnpkodeiolpnfnbdokgkclljpgmcm";
  const OBSERVER_DEBOUNCE_TIME = 500; // Debounce time for observers in milliseconds

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

  logDebug("Initializing TodoFilter with Chrome extension integration");

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
        // Do NOT show the page here - we'll handle visibility in the filterTable function
        // pageUtils.showPage(false); // Keep the page hidden
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
          // Do NOT show the page here - we'll handle visibility in the filterTable function
          // pageUtils.showPage(false); // Keep the page hidden
          resolve(false); // Resolve with false instead of rejecting
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
                  // Do NOT show the page here - we'll handle visibility in the filterTable function
                  // pageUtils.showPage(false); // Keep the page hidden
                  resolve(false); // Resolve with false instead of rejecting
                  return;
                }
                timeoutId = setTimeout(sendPing, delay);
                return;
              }

              if (response?.result === "pong") {
                clearTimeout(timeoutId);
                logDebug("Successfully connected to Chrome extension");
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
          // Do NOT show the page here - we'll handle visibility in the filterTable function
          // pageUtils.showPage(false); // Keep the page hidden
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
   */
  async function checkNumbersBatch(numbers) {
    return new Promise((resolve, reject) => {
      try {
        // Check if we already have these numbers in cache
        if (allowedLoansCache.isCacheValid()) {
          const cachedNumbers = numbers.filter((num) =>
            allowedLoansCache.isAllowed(num)
          );
          if (cachedNumbers.length > 0) {
            logDebug(`Using ${cachedNumbers.length} cached loan numbers`);
            resolve(cachedNumbers);
            return;
          }
        }

        if (
          typeof chrome === "undefined" ||
          !chrome.runtime ||
          !chrome.runtime.sendMessage
        ) {
          // If Chrome extension API is not available, show error and return empty array
          console.error("Chrome extension API not available");
          pageUtils.showPage(true);
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
              console.error("Chrome runtime error:", chrome.runtime.lastError);
              pageUtils.showPage(true);
              return reject(chrome.runtime.lastError.message);
            } else if (response && response.error) {
              console.error("Response error:", response.error);
              pageUtils.showPage(true);
              return reject(response.error);
            }

            const available = Object.keys(response.result).filter(
              (key) => response.result[key]
            );

            // Add to cache
            allowedLoansCache.addLoans(available);

            logDebug(
              `Received ${available.length} allowed loan numbers out of ${numbers.length} requested`
            );
            resolve(available);
          }
        );
      } catch (error) {
        console.error("Error in checkNumbersBatch:", error);
        // Show page and return empty array on error
        pageUtils.showPage(true);
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

  // Add a debounce function to prevent multiple rapid executions
  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  }

  // Add CSS styles for messages
  function addCustomStyles() {
    try {
      // Check if styles already exist
      if (document.getElementById("offshore-custom-styles")) {
        return;
      }

      // Create a style element
      const styleElement = document.createElement("style");
      styleElement.id = "offshore-custom-styles";
      styleElement.type = "text/css";

      // Define the CSS as a string
      const cssText = `
        /* Message styles */
        #offshore-access-message {
          padding: 10px 15px;
          margin: 10px 0;
          border-radius: 4px;
          font-weight: bold;
          text-align: center;
        }
        #offshore-access-message.warning {
          background-color: #fff3cd;
          color: #856404;
          border: 1px solid #ffeeba;
        }
        #offshore-access-message.info {
          background-color: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        /* Hidden row styles - ensure they stay hidden */
        .offshore-hidden-row {
          display: none !important;
          visibility: hidden !important;
          height: 0 !important;
          overflow: hidden !important;
          opacity: 0 !important;
          position: absolute !important;
          left: -9999px !important;
        }
      `;

      styleElement.textContent = cssText;

      // Add the style element to the document head
      document.head.appendChild(styleElement);

      logDebug("Added custom styles for offshore access features");
    } catch (err) {
      console.error("Error adding custom styles:", err);
    }
  }

  // Add the custom styles
  addCustomStyles();

  // Function to wait for an element to appear in the DOM
  function waitForElement(
    selector,
    callback,
    maxAttempts = 20,
    interval = 300
  ) {
    let attempts = 0;

    const checkElement = () => {
      const element = document.querySelector(selector);
      if (element) {
        callback(element);
        return;
      }

      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(checkElement, interval);
      } else {
        console.error(
          `Failed to find element: ${selector} after ${maxAttempts} attempts`
        );
      }
    };

    checkElement();
  }

  // Function to wait for loan table to appear, similar to waitForLoanNumber in msi-loan-ext.js
  function waitForLoanTable() {
    return new Promise((resolve) => {
      // Make sure the page is hidden while waiting for the table
      pageUtils.showPage(false);

      // Set a timeout to resolve even if table is not found
      const timeoutId = setTimeout(() => {
        logDebug("Timeout waiting for loan table, proceeding anyway");
        observer.disconnect();
        resolve(null);
        // Do NOT show the page here - we'll handle visibility in the filterTable function
        // pageUtils.showPage(false); // Keep the page hidden
      }, 10000); // 10 second timeout

      const observer = new MutationObserver((mutationsList, observer) => {
        const loanTable = findLoanTable();
        if (loanTable) {
          clearTimeout(timeoutId);
          observer.disconnect(); // Stop observing
          resolve(loanTable);
        }
      });

      // Use more specific observation parameters to reduce overhead
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false,
      });

      // Also check immediately in case the table is already there
      const loanTable = findLoanTable();
      if (loanTable) {
        clearTimeout(timeoutId);
        observer.disconnect();
        resolve(loanTable);
      }
    });
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
   * @class TableViewElement
   * @description Class to manage the visibility of table rows and display messages
   */
  class TableViewElement {
    /**
     * @constructor
     * @param {HTMLElement} tableElement - The table element to manage
     */
    constructor(tableElement) {
      this.element = tableElement;
      this.parent = this.element && this.element.parentElement;
      this.originalRows = Array.from(
        this.element.querySelectorAll("tr")
      ).filter((row) => !row.querySelector("th"));
      this.unallowed = createUnallowedElement();
      this.messageParent =
        document.querySelector(
          ".content-area, main, #main-content, .content-details, .section-details"
        ) || document.body;
    }

    /**
     * @method hideRow
     * @description Hides a table row
     * @param {HTMLElement} row - The row to hide
     */
    hideRow(row) {
      if (row) {
        // Force the row to be hidden with !important to override any other styles
        row.style.setProperty("display", "none", "important");

        // Add a class for additional hiding mechanism
        row.classList.add("offshore-hidden-row");

        // Log for debugging
        logDebug(`Hiding row: ${row.outerHTML.substring(0, 50)}...`);
      }
    }

    /**
     * @method showRow
     * @description Shows a table row
     * @param {HTMLElement} row - The row to show
     */
    showRow(row) {
      if (row) {
        // Remove the display property entirely
        row.style.removeProperty("display");

        // Remove the hiding class
        row.classList.remove("offshore-hidden-row");

        // Log for debugging
        logDebug(`Showing row: ${row.outerHTML.substring(0, 50)}...`);
      }
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
  }

  // Enhanced function to find the loan table with more selectors for Advanced version
  function findLoanTable() {
    // Log all tables for debugging
    const allTables = document.querySelectorAll("table");
    logDebug(`Found ${allTables.length} tables on the page`);

    // First try to find by ID - most reliable
    const todoTable = document.getElementById("todoTable");
    if (todoTable) {
      logDebug(`Found table by ID: todoTable`);
      return todoTable.querySelector("tbody") || todoTable;
    }

    // Try to identify tables by their structure or content
    for (let i = 0; i < allTables.length; i++) {
      const table = allTables[i];
      logDebug(`Table ${i} - ID: ${table.id}, Class: ${table.className}`);

      // Check if this table contains loan-related data
      const headerRow =
        table.querySelector("thead tr") ||
        table.querySelector("tr:first-child");
      if (headerRow) {
        const headerCells = headerRow.querySelectorAll("th, td");
        let headerTexts = [];
        headerCells.forEach((cell) =>
          headerTexts.push(cell.textContent.trim())
        );
        logDebug(`Table ${i} headers: ${headerTexts.join(", ")}`);

        // Check if headers contain loan-related terms
        const loanRelatedHeaders = [
          "Loan",
          "Account",
          "Servicer",
          "ID",
          "Task",
          "Queue",
          "Status",
        ];
        const hasLoanHeaders = loanRelatedHeaders.some((term) =>
          headerTexts.some((text) => text.includes(term))
        );

        if (hasLoanHeaders) {
          logDebug(`Found potential loan table: Table ${i}`);
          return table.querySelector("tbody") || table;
        }
      }
    }

    // If we couldn't identify by content, try standard selectors
    const possibleTables = [
      document.querySelector(".todo-table tbody"),
      document.querySelector(".workflow-table tbody"),
      document.querySelector(".task-table tbody"),
      document.querySelector(".new-ui-table.striped tbody"),
      document.querySelector("table.striped tbody"),
      // Advanced version specific selectors
      document.querySelector(".advanced-todo-table tbody"),
      document.querySelector("#todoTable tbody"),
      document.querySelector("#advancedTodoTable tbody"),
      document.querySelector(".bb-table tbody"),
      document.querySelector(".content-details table tbody"),
      // Generic fallbacks
      document.querySelector("table.table tbody"),
      document.querySelector("table tbody"),
    ];

    for (const table of possibleTables) {
      if (table) {
        logDebug(
          `Found table using selector: ${
            table.parentElement.className || table.parentElement.id
          }`
        );
        return table;
      }
    }

    logDebug("No loan table found");
    return null;
  }

  // Enhanced function to find the column containing loan numbers
  function findServicerColumnIndex(headerRow) {
    if (!headerRow) {
      logDebug("No header row provided");
      return -1;
    }

    const headerCells = headerRow.querySelectorAll("th, td");
    logDebug(`Found ${headerCells.length} header cells`);

    const possibleHeaders = [
      "Servicer",
      "Loan",
      "Loan Number",
      "Loan #",
      "Account",
      "Account Number",
      "ID",
      "Task ID",
      "Reference",
      "Reference Number",
    ];

    for (let i = 0; i < headerCells.length; i++) {
      const headerText = headerCells[i].textContent.trim();
      logDebug(`Header ${i}: "${headerText}"`);

      for (const possibleHeader of possibleHeaders) {
        if (headerText.includes(possibleHeader)) {
          logDebug(
            `Found potential loan number column: "${headerText}" at index ${i}`
          );
          return i;
        }
      }
    }

    // If no exact match, look for any header that might contain numeric IDs
    for (let i = 0; i < headerCells.length; i++) {
      const headerText = headerCells[i].textContent.trim().toLowerCase();
      if (
        headerText.includes("id") ||
        headerText.includes("number") ||
        headerText.includes("#")
      ) {
        logDebug(`Found potential ID column: "${headerText}" at index ${i}`);
        return i;
      }
    }

    logDebug("No servicer column found");
    return -1;
  }

  // Enhanced function to extract loan numbers from text
  function extractLoanNumber(text) {
    if (!text) return null;

    text = text.trim();

    // Try to extract after a label
    const labelMatch =
      /(?:Servicer|Loan|Account|ID|Task|Reference)(?:\s*#|\s*:|\s*Number|\s*ID)?\s*([^\s,;]+)/i.exec(
        text
      );
    if (labelMatch && labelMatch[1]) {
      logDebug(`Extracted after label: "${labelMatch[1]}"`);
      return labelMatch[1].trim();
    }

    // If it's just a number, use it directly
    if (/^\d+$/.test(text)) {
      logDebug(`Using numeric text directly: "${text}"`);
      return text;
    }

    // Extract any numeric part
    const numericMatch = text.match(/\d+/);
    if (numericMatch) {
      logDebug(`Extracted numeric part: "${numericMatch[0]}" from "${text}"`);
      return numericMatch[0];
    }

    return text;
  }

  // Function to create and display a message banner
  function showMessage(message, type = "info") {
    // Remove any existing message
    const existingMessage = document.getElementById("offshore-access-message");
    if (existingMessage) {
      existingMessage.remove();
    }

    // Create message element
    const messageEl = document.createElement("div");
    messageEl.id = "offshore-access-message";
    messageEl.className = type;
    messageEl.textContent = message;

    // Insert at the top of the table or content area
    const tableContainer = findLoanTable()?.closest("table");
    if (tableContainer) {
      tableContainer.parentNode.insertBefore(messageEl, tableContainer);
    } else {
      // Fallback - insert at top of content area
      const contentArea = document.querySelector(
        ".content-area, main, #main-content, .content-details, .section-details"
      );
      if (contentArea) {
        contentArea.insertBefore(messageEl, contentArea.firstChild);
      } else {
        // Last resort - append to body
        document.body.appendChild(messageEl);
      }
    }

    return messageEl;
  }

  // Function to handle table visibility for exact search
  function handleTableVisibility(isExactSearch = false) {
    // Find the table container
    const tableContainer = document.querySelector(
      ".table-responsive, .table-container, .content-area"
    );

    if (isExactSearch) {
      // Hide all table-related elements
      if (tableContainer) {
        tableContainer.style.display = "none";
      }
      return;
    } else {
      // Show table container
      if (tableContainer) {
        tableContainer.style.display = "";
      }
    }
  }

  /**
   * @async
   * @function filterTable
   * @description Main function to filter the table based on user permissions
   * @returns {Promise<Object>} Object containing counts of visible and removed rows
   */
  async function filterTable() {
    logDebug("Starting filterTable function");

    // Make sure the page is hidden before we start filtering
    pageUtils.showPage(false);

    try {
      // Check if we're in standalone mode (no Chrome extension)
      const isStandaloneMode =
        typeof chrome === "undefined" ||
        !chrome.runtime ||
        !chrome.runtime.sendMessage;

      // If we're in standalone mode, we'll still proceed but with limited functionality
      if (isStandaloneMode) {
        console.warn("Running in standalone mode with limited functionality");
      }

      // Wait for the loan table to appear in the DOM
      const loanTable = await waitForLoanTable();

      if (!loanTable) {
        console.error("Loan table not found");
        // Show the page even if we couldn't find the table
        pageUtils.showPage(true);
        return;
      }

      // Create a TableViewElement to manage the table
      const tableView = new TableViewElement(loanTable);

      // Check if exact search is selected
      const isExactSearch =
        document.getElementById("Filter_LoanExactSearch")?.checked || false;
      const loanNumber =
        document.getElementById("Filter_LoanNumber")?.value?.trim() || "";

      // If exact search is selected, handle it separately
      if (isExactSearch && loanNumber) {
        logDebug(`Handling exact search for loan number: ${loanNumber}`);

        // Hide all rows
        tableView.originalRows.forEach((row) => {
          tableView.hideRow(row);
        });

        // Check if the loan number is in the allowed set using checkNumbersBatch
        logDebug(`Checking if loan number ${loanNumber} is allowed...`);
        const isAllowed = await isLoanNumberAllowed(loanNumber);
        logDebug(
          `Loan number ${loanNumber} is ${
            isAllowed ? "allowed" : "not allowed"
          }`
        );

        // Get the table body
        const tableBody =
          loanTable.closest("table").querySelector("tbody") || loanTable;
        logDebug(`Found table body: ${tableBody ? "Yes" : "No"}`);

        // Clear existing rows for exact search
        while (tableBody.firstChild) {
          tableBody.removeChild(tableBody.firstChild);
        }

        if (isAllowed) {
          logDebug(
            `Loan number ${loanNumber} is allowed, creating row to display it`
          );
          // Create a new row to show the allowed loan number
          const newRow = document.createElement("tr");

          // Get the number of columns from the header row
          const headerRow =
            loanTable.closest("table").querySelector("thead tr") ||
            loanTable.closest("table").querySelector("tr:first-child");
          const columnCount = headerRow
            ? headerRow.querySelectorAll("th, td").length
            : 1;
          logDebug(`Table has ${columnCount} columns`);

          // Create a cell for the loan number
          const loanCell = document.createElement("td");
          loanCell.textContent = loanNumber;
          newRow.appendChild(loanCell);

          // Fill the rest of the row with empty cells
          for (let i = 1; i < columnCount; i++) {
            const emptyCell = document.createElement("td");
            emptyCell.textContent = "-";
            newRow.appendChild(emptyCell);
          }

          // Add the row to the table
          tableBody.appendChild(newRow);
          logDebug(`Added row with loan number ${loanNumber} to the table`);

          // Remove any existing unallowed elements
          const existingUnallowed = document.getElementById(
            "offshore-access-message"
          );
          if (existingUnallowed) {
            existingUnallowed.remove();
          }

          tableView.showMessage("Loan is provisioned to user", "info");
        } else {
          logDebug(
            `Loan number ${loanNumber} is not allowed, showing unallowed element`
          );
          // Create and show the unallowed element
          const unallowedElement = createUnallowedElement();

          // Clear any existing unallowed elements
          const existingUnallowed = document.getElementById(
            "offshore-access-message"
          );
          if (existingUnallowed) {
            existingUnallowed.remove();
          }

          // Add the unallowed element to the table container
          const tableContainer = loanTable.closest("table").parentElement;
          if (tableContainer) {
            tableContainer.appendChild(unallowedElement);
            logDebug(`Added unallowed element to table container`);
          } else {
            // Fallback if table container not found
            const contentArea = document.querySelector(
              ".content-area, main, #main-content"
            );
            if (contentArea) {
              contentArea.appendChild(unallowedElement);
              logDebug(`Added unallowed element to content area`);
            } else {
              document.body.appendChild(unallowedElement);
              logDebug(`Added unallowed element to body`);
            }
          }

          tableView.showMessage("Loan is not provisioned to user", "warning");
        }

        // Handle table visibility for exact search
        handleTableVisibility(true);

        // Show the page after processing
        pageUtils.showPage(true);
        logDebug(
          `Exact search processing complete for loan number: ${loanNumber}`
        );
        return;
      } else if (isExactSearch) {
        tableView.showMessage(
          "Please enter a loan number for exact search",
          "info"
        );
        handleTableVisibility(true);

        // Show the page after processing
        pageUtils.showPage(true);
        return;
      }

      // For non-exact search, filter based on permissions
      logDebug(`Processing ${tableView.originalRows.length} rows in the table`);

      let removedCount = 0;
      let visibleCount = 0;
      let restrictedLoans = [];

      // Find the header row - it might be in the table or in a thead
      const headerRow =
        loanTable.closest("table").querySelector("thead tr") ||
        loanTable.closest("table").querySelector("tr:first-child");

      const servicerColumnIndex = findServicerColumnIndex(headerRow);
      logDebug(`Servicer column index: ${servicerColumnIndex}`);

      // Collect all loan numbers first for batch checking
      const loanNumbersMap = new Map(); // Maps loan numbers to their rows

      // Process each row to extract loan numbers
      for (const row of tableView.originalRows) {
        const cells = row.querySelectorAll("td");
        if (cells.length === 0) {
          continue;
        }

        let servicerValue = null;

        // Method 1: Check for data attributes or specific classes
        for (let i = 0; i < cells.length; i++) {
          const cell = cells[i];
          if (
            cell.getAttribute("data-column") === "Servicer" ||
            cell.getAttribute("data-column") === "Loan" ||
            cell.getAttribute("data-column") === "LoanNumber" ||
            cell.classList.contains("servicer-column") ||
            cell.classList.contains("loan-column") ||
            cell.classList.contains("loan-number-column") ||
            cell.textContent.includes("Servicer:") ||
            cell.textContent.includes("Loan:") ||
            cell.textContent.includes("Account:") ||
            cell.textContent.includes("Task ID:") ||
            cell.textContent.includes("Reference:")
          ) {
            servicerValue = extractLoanNumber(cell.textContent);
            if (servicerValue) {
              logDebug(
                `Found loan number via data attribute/class: ${servicerValue}`
              );
              break;
            }
          }
        }

        // Method 2: Use the identified column index
        if (
          !servicerValue &&
          servicerColumnIndex >= 0 &&
          cells.length > servicerColumnIndex
        ) {
          servicerValue = extractLoanNumber(
            cells[servicerColumnIndex].textContent
          );
          if (servicerValue) {
            logDebug(`Found loan number via column index: ${servicerValue}`);
          }
        }

        // Method 3: Look for numeric patterns in any cell
        if (!servicerValue) {
          for (let i = 0; i < cells.length; i++) {
            const cellText = cells[i].textContent.trim();
            if (
              /^\d{5,}$/.test(cellText) ||
              /Loan\s*#?\s*\d+/i.test(cellText)
            ) {
              servicerValue = extractLoanNumber(cellText);
              if (servicerValue) {
                logDebug(
                  `Found loan number via pattern matching: ${servicerValue}`
                );
                break;
              }
            }
          }
        }

        // Method 4: Look for any cell with a number that might be a loan ID
        if (!servicerValue) {
          for (let i = 0; i < cells.length; i++) {
            const cellText = cells[i].textContent.trim();
            const numMatch = cellText.match(/\d{4,}/);
            if (numMatch) {
              servicerValue = numMatch[0];
              logDebug(
                `Found potential loan number via numeric pattern: ${servicerValue}`
              );
              break;
            }
          }
        }

        if (servicerValue) {
          // Store the row with its loan number for batch processing
          if (!loanNumbersMap.has(servicerValue)) {
            loanNumbersMap.set(servicerValue, []);
          }
          loanNumbersMap.get(servicerValue).push(row);
        } else {
          // Hide rows without loan numbers
          tableView.hideRow(row);
          removedCount++;
          logDebug(`No loan number found in row, keeping hidden`);
        }
      }

      // Get all unique loan numbers for batch checking
      const uniqueLoanNumbers = Array.from(loanNumbersMap.keys());
      logDebug(
        `Found ${uniqueLoanNumbers.length} unique loan numbers to check`
      );

      if (uniqueLoanNumbers.length > 0) {
        try {
          // Try to use the extension API for batch checking
          const allowedNumbers = await checkNumbersBatch(uniqueLoanNumbers);

          // Add to cache for future reference
          allowedLoansCache.addLoans(allowedNumbers);

          // Process each loan number
          for (const [loanNumber, rows] of loanNumbersMap.entries()) {
            const isAllowed = allowedNumbers.includes(loanNumber);

            for (const row of rows) {
              if (isAllowed) {
                tableView.showRow(row);
                visibleCount++;
                logDebug(`Showing row with loan: ${loanNumber}`);
              } else {
                tableView.hideRow(row);
                removedCount++;
                if (!restrictedLoans.includes(loanNumber)) {
                  restrictedLoans.push(loanNumber);
                }
                logDebug(`Hiding row with loan: ${loanNumber}`);
              }
            }
          }
        } catch (error) {
          // Fallback to individual checking if batch check fails
          logDebug(
            `Batch check failed, falling back to individual checks: ${error.message}`
          );

          for (const [loanNumber, rows] of loanNumbersMap.entries()) {
            const isAllowed = checkLoanAccess(loanNumber);

            for (const row of rows) {
              if (isAllowed) {
                tableView.showRow(row);
                visibleCount++;
                logDebug(`Showing row with loan: ${loanNumber}`);
              } else {
                tableView.hideRow(row);
                removedCount++;
                if (!restrictedLoans.includes(loanNumber)) {
                  restrictedLoans.push(loanNumber);
                }
                logDebug(`Hiding row with loan: ${loanNumber}`);
              }
            }
          }
        }
      }

      logDebug(
        `Filtering complete: ${visibleCount} visible, ${removedCount} hidden`
      );

      // Handle table visibility
      handleTableVisibility(isExactSearch);

      // Force a re-check of all hidden rows to ensure they're properly hidden
      const forceReapplyHiding = () => {
        // Get all rows with the offshore-hidden-row class
        const hiddenRows = document.querySelectorAll(".offshore-hidden-row");
        logDebug(`Re-checking ${hiddenRows.length} hidden rows`);

        // Force them to be hidden again
        hiddenRows.forEach((row) => {
          row.style.setProperty("display", "none", "important");
          row.style.setProperty("visibility", "hidden", "important");
        });

        // Also check for any rows that should be hidden but aren't
        for (const loanNumber of restrictedLoans) {
          const rows = loanNumbersMap.get(loanNumber) || [];
          for (const row of rows) {
            if (row.style.display !== "none") {
              logDebug(
                `Found row that should be hidden but isn't: ${loanNumber}`
              );
              row.style.setProperty("display", "none", "important");
              row.classList.add("offshore-hidden-row");
            }
          }
        }
      };

      // Run the re-check
      forceReapplyHiding();

      // Schedule another check after a short delay to catch any late rendering
      setTimeout(forceReapplyHiding, 100);

      // Show the page after processing
      pageUtils.showPage(true);

      return { visibleCount, removedCount, restrictedLoans };
    } catch (error) {
      console.error("Error in filterTable:", error);

      // Make sure the page is shown even if there's an error
      pageUtils.showPage(true);

      return { visibleCount: 0, removedCount: 0, restrictedLoans: [] };
    }
  }

  /**
   * @function checkLoanAccess
   * @description Checks if a loan number is allowed using cache only
   * @param {string} loanNumber - The loan number to check
   * @returns {boolean} True if the loan number is allowed, false otherwise
   */
  function checkLoanAccess(loanNumber) {
    if (!loanNumber) return false;

    // Check cache only - all actual checks should go through checkNumbersBatch
    if (allowedLoansCache.isAllowed(loanNumber)) {
      logDebug(`Cache match found for: ${loanNumber}`);
      return true;
    }

    return false;
  }

  /**
   * @async
   * @function isLoanNumberAllowed
   * @description Checks if a loan number is allowed using checkNumbersBatch
   * @param {string} loanNumber - The loan number to check
   * @returns {Promise<boolean>} Promise that resolves to true if the loan number is allowed, false otherwise
   */
  async function isLoanNumberAllowed(loanNumber) {
    try {
      logDebug(`isLoanNumberAllowed: Checking loan number ${loanNumber}`);

      // First check local cache
      if (allowedLoansCache.isAllowed(loanNumber)) {
        logDebug(
          `isLoanNumberAllowed: Loan number ${loanNumber} found in cache`
        );
        return true;
      }

      // Check with checkNumbersBatch (which will communicate with the extension)
      logDebug(
        `isLoanNumberAllowed: Checking loan number ${loanNumber} with checkNumbersBatch`
      );
      const allowedNumbers = await checkNumbersBatch([loanNumber]);
      logDebug(
        `isLoanNumberAllowed: checkNumbersBatch returned ${allowedNumbers.length} allowed numbers`
      );

      // Add to cache for future reference
      if (allowedNumbers.length > 0) {
        allowedLoansCache.addLoans(allowedNumbers);
      }

      return allowedNumbers.includes(loanNumber);
    } catch (error) {
      console.warn("Failed to check loan access:", error);
      // If there's an error, we assume the loan is not allowed
      return false;
    }
  }

  // Function to update table visibility based on exact search
  function updateTableVisibility() {
    const isExactSearch =
      document.getElementById("Filter_LoanExactSearch")?.checked || false;
    const loanNumber =
      document.getElementById("Filter_LoanNumber")?.value?.trim() || "";
    const todoTable = document.getElementById("todoTable");
    const noDataMsg = document.getElementById("nodata");

    if (isExactSearch && !loanNumber) {
      // Clear the table when exact search is selected but no loan number is entered
      if (todoTable) {
        const tbody = todoTable.querySelector("tbody") || todoTable;
        while (tbody.firstChild) {
          tbody.removeChild(tbody.firstChild);
        }
      }
      if (noDataMsg) {
        noDataMsg.style.display = "block";
      }

      // Remove any existing unallowed elements
      const existingUnallowed = document.getElementById(
        "offshore-access-message"
      );
      if (existingUnallowed) {
        existingUnallowed.remove();
      }
    } else if (isExactSearch && loanNumber) {
      // When exact search is selected with a loan number, the table will be handled by filterTable
      // Just make sure the noDataMsg is hidden
      if (noDataMsg) {
        noDataMsg.style.display = "none";
      }
      if (todoTable) {
        todoTable.style.display = "block";
      }
    } else {
      // For non-exact search, show the table
      if (todoTable && noDataMsg) {
        todoTable.style.display = "block";
        noDataMsg.style.display = "none";
      }

      // Remove any existing unallowed elements
      const existingUnallowed = document.getElementById(
        "offshore-access-message"
      );
      if (existingUnallowed) {
        existingUnallowed.remove();
      }
    }
  }

  // Monitor URL changes to detect page navigation, similar to msi-loan-ext.js
  function monitorPageChanges() {
    // Hide the page immediately to prevent unauthorized loan numbers from being visible
    pageUtils.showPage(false);

    // Keep track of the observer to avoid multiple instances
    let tableObserver = null;

    // Monitor URL changes
    onValueChange(
      () => document.location.href,
      async (newUrl, oldUrl) => {
        if (newUrl === oldUrl) return;

        // Hide the page immediately when URL changes
        pageUtils.showPage(false);

        logDebug(`URL changed to: ${newUrl}`);

        // Wait a moment for the page to load
        setTimeout(async () => {
          // Run the filter on the new page
          await filterTable();
        }, 500);
      },
      { maxTime: 3600000 } // 1 hour max monitoring time
    );

    // Create a more efficient observer for table changes
    const observeTableChanges = () => {
      // Disconnect any existing observer
      if (tableObserver) {
        tableObserver.disconnect();
      }

      // Find tables to observe specifically instead of the entire body
      const tables = document.querySelectorAll("table");

      if (tables.length === 0) {
        // If no tables found, observe the body but with a more specific filter
        tableObserver = new MutationObserver(
          debounce(async (mutations) => {
            // Check if any tables were added
            const tableAdded = mutations.some(
              (mutation) =>
                mutation.type === "childList" &&
                Array.from(mutation.addedNodes).some(
                  (node) =>
                    node.nodeName === "TABLE" ||
                    (node.nodeType === 1 && node.querySelector("table"))
                )
            );

            if (tableAdded) {
              // Hide the page while processing
              pageUtils.showPage(false);

              logDebug("Table added to DOM, reapplying filter");
              await filterTable();

              // Re-observe with the new table structure
              observeTableChanges();
            }
          }, OBSERVER_DEBOUNCE_TIME)
        );

        tableObserver.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: false,
          characterData: false,
        });
      } else {
        // Observe each table directly for more efficient monitoring
        tableObserver = new MutationObserver(
          debounce(async (mutations) => {
            // Only process if there are actual changes to the table content
            const hasTableChanges = mutations.some(
              (mutation) =>
                mutation.type === "childList" &&
                (mutation.target.tagName === "TABLE" ||
                  mutation.target.tagName === "TBODY" ||
                  mutation.target.tagName === "TR")
            );

            if (hasTableChanges) {
              // Hide the page while processing
              pageUtils.showPage(false);

              logDebug("Table content changed, reapplying filter");
              await filterTable();
            }
          }, OBSERVER_DEBOUNCE_TIME)
        );

        // Observe each table individually
        tables.forEach((table) => {
          tableObserver.observe(table, {
            childList: true,
            subtree: true,
            attributes: false,
            characterData: false,
          });
        });
      }
    };

    // Start observing tables
    observeTableChanges();
  }

  /**
   * @async
   * @function initialize
   * @description Initializes the script and sets up event listeners
   */
  async function initialize() {
    // Make sure the page is hidden during initialization
    pageUtils.showPage(false);

    try {
      // Update the CSS rule to allow for a smooth transition when we show the page
      const style = document.createElement("style");
      style.id = "page-transition-style";
      style.textContent =
        "body { opacity: 0 !important; transition: opacity 0.3s ease; }";

      // Remove any existing initial style
      const initialStyle = document.querySelector("style:not([id])");
      if (initialStyle) {
        initialStyle.remove();
      }

      document.head.appendChild(style);

      // Wait for the extension listener to be available
      // await waitForListener();

      // Wait for the DOM to be fully loaded
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", async () => {
          await setupEventListeners();
          // Start monitoring page changes
          monitorPageChanges();
          // Run the initial filter
          await filterTable();
        });
      } else {
        await setupEventListeners();
        // Start monitoring page changes
        monitorPageChanges();
        // Run the initial filter
        await filterTable();
      }

      logDebug("Todo Table Filter initialized successfully");
    } catch (error) {
      console.error("Error during initialization:", error);
      // Show the page even if there's an error
      pageUtils.showPage(true);
    }
  }

  /**
   * @async
   * @function setupEventListeners
   * @description Sets up event listeners for form elements
   */
  async function setupEventListeners() {
    const exactSearchCheckbox = document.getElementById(
      "Filter_LoanExactSearch"
    );
    const loanNumberInput = document.getElementById("Filter_LoanNumber");
    const applyFilterButton = document.getElementById("applyFilter");

    if (exactSearchCheckbox) {
      exactSearchCheckbox.addEventListener("change", async function () {
        // Hide the page while filtering
        pageUtils.showPage(false);
        await filterTable(); // filterTable will show the page when done
      });
    }

    if (loanNumberInput) {
      // Use the onValueChange approach for input monitoring
      onValueChange(
        () => loanNumberInput.value,
        async (newValue) => {
          if (newValue !== undefined) {
            // Hide the page while filtering
            pageUtils.showPage(false);
            await filterTable(); // filterTable will show the page when done
          }
        }
      );
    }

    if (applyFilterButton) {
      applyFilterButton.addEventListener("click", async function (event) {
        // Prevent default form submission if it's a button in a form
        event.preventDefault();

        // Log the current state
        const isExactSearch =
          document.getElementById("Filter_LoanExactSearch")?.checked || false;
        const loanNumber =
          document.getElementById("Filter_LoanNumber")?.value?.trim() || "";
        logDebug(
          `Apply Filter clicked - Exact Search: ${isExactSearch}, Loan Number: ${loanNumber}`
        );

        // Hide the page while filtering
        pageUtils.showPage(false);

        // Update table visibility first
        updateTableVisibility();

        // Run the filter
        logDebug("Running filterTable...");
        await filterTable(); // filterTable will show the page when done
        logDebug("filterTable completed");
      });
    }
  }

  // Set up a cleanup function to handle page unload
  window.addEventListener("beforeunload", function () {
    // Clear any intervals or timeouts
    if (typeof urlMonitorId === "number") {
      clearInterval(urlMonitorId);
    }

    // Clear any observers
    if (typeof observer === "object" && observer.disconnect) {
      observer.disconnect();
    }

    logDebug("Todo Table Filter cleanup complete");
  });

  // Start the initialization
  initialize();
})();
