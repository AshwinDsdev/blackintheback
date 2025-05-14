/**
 * @fileoverview Loan Filter Script for Loansphere
 * @description This script filters loan information based on user permissions.
 * It hides unauthorized loan numbers and provides a secure browsing experience.
 * Copy and paste this entire script into the browser console
 * Updated with approach similar to msi-loan-ext.js
 */
(function () {
  // Prevent multiple injections
  if (window.loanFilterInjected) {
    console.log("Loan filter already injected, skipping...");
    return;
  }
  window.loanFilterInjected = true;

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
      document.body.style.opacity = val ? 1 : 0;
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

  // ########## CORE FUNCTIONALITY ##########
  // Constants
  const FILTER_INTERVAL_MS = 2000;
  const EXTENSION_ID = "afkpnpkodeiolpnfnbdokgkclljpgmcm";

  // Track processed elements to avoid redundant operations
  const processedElements = new WeakSet();
  const processedBrands = new WeakSet();

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
   */
  async function waitForListener(maxRetries = 20, initialDelay = 100) {
    return new Promise((resolve, reject) => {
      if (
        typeof chrome === "undefined" ||
        !chrome.runtime ||
        !chrome.runtime.sendMessage
      ) {
        console.warn(
          "❌ Chrome extension API not available. No loans will be allowed."
        );
        // Show the page if Chrome extension API is not available
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
   */
  async function checkNumbersBatch(numbers) {
    return new Promise((resolve, reject) => {
      try {
        if (
          typeof chrome === "undefined" ||
          !chrome.runtime ||
          !chrome.runtime.sendMessage
        ) {
          console.warn(
            "Chrome extension API not available. No loans will be allowed."
          );
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
    const startTime = Date.now();
    const endTime = options.maxTime ? startTime + options.maxTime : null;
    const intervalId = setInterval(async () => {
      try {
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
      } catch (error) {
        console.error("Error in onValueChange:", error);
        clearInterval(intervalId);
      }
    }, 500);

    return intervalId;
  }

  // Function to find the search form and loan number input
  function findSearchElements() {
    return {
      searchForm:
        document.querySelector("#search-loan-form") ||
        document.querySelector("form"),
      loanNumberInput:
        document.querySelector("#LoanNumber") ||
        document.querySelector('input[type="text"]'),
      searchButton:
        document.querySelector('button[type="submit"]') ||
        document.querySelector('input[type="submit"]'),
    };
  }

  // Create unallowed element similar to reference_filter.js
  function createUnallowedElement() {
    // Check if element already exists to prevent duplicates
    const existing = document.getElementById("loanNotProvisioned");
    if (existing) return existing;

    const unallowed = document.createElement("div");
    unallowed.id = "loanNotProvisioned";
    unallowed.appendChild(
      document.createTextNode("Loan is not provisioned to the user")
    );
    unallowed.style.color = "#dc3545";
    unallowed.style.backgroundColor = "rgba(220, 53, 69, 0.1)";
    unallowed.style.padding = "10px";
    unallowed.style.borderRadius = "5px";
    unallowed.style.marginTop = "10px";
    unallowed.style.display = "flex";
    unallowed.style.justifyContent = "center";
    unallowed.style.alignItems = "center";
    unallowed.style.fontWeight = "bold";
    unallowed.style.position = "relative";
    unallowed.style.zIndex = "1";

    return unallowed;
  }

  /**
   * @async
   * @function isLoanNumberAllowed
   * @description Checks if a loan number is allowed for the current user
   * @param {string} loanNumber - The loan number to check
   * @returns {Promise<boolean>} Promise that resolves to true if the loan number is allowed, false otherwise
   */
  async function isLoanNumberAllowed(loanNumber) {
    try {
      if (!loanNumber) return false;

      loanNumber = loanNumber.trim();

      // First check the cache
      if (
        allowedLoansCache.isCacheValid() &&
        allowedLoansCache.isAllowed(loanNumber)
      ) {
        return true;
      }

      // Then try to check with the extension
      const allowedNumbers = await checkNumbersBatch([loanNumber]);

      // Add to cache for future reference
      allowedLoansCache.addLoans(allowedNumbers);

      return allowedNumbers.includes(loanNumber);
    } catch (error) {
      console.warn("Failed to check loan access, assuming not allowed:", error);
      return false;
    }
  }

  // ########## UI COMPONENTS ##########
  // ViewElement class similar to reference_filter.js
  class ViewElement {
    constructor() {
      this.searchElements = findSearchElements();
      this.unallowed = createUnallowedElement();
      this.unallowedParent = this.searchElements.searchForm
        ? this.searchElements.searchForm.parentElement
        : document.body;
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
      const existing = document.getElementById("loanNotProvisioned");
      if (existing) existing.remove();
    }
  }

  // ########## EVENT HANDLERS ##########
  // Function to handle search form submission
  async function handleSearchSubmit(event) {
    const { loanNumberInput } = findSearchElements();
    const viewElement = new ViewElement();

    if (loanNumberInput) {
      const loanNumber = loanNumberInput.value.trim();

      if (loanNumber) {
        // Prevent default action until we check if the loan is provisioned
        if (event) {
          event.preventDefault();
          event.stopPropagation();
        }

        // Check if loan is provisioned
        const isAllowed = await isLoanNumberAllowed(loanNumber);

        if (!isAllowed) {
          viewElement.showUnallowed();
          return false;
        } else {
          viewElement.hideUnallowed();

          // If it was a form submission, resubmit the form
          if (
            event &&
            event.type === "submit" &&
            event.target.tagName === "FORM"
          ) {
            setTimeout(() => {
              event.target.submit();
            }, 100);
          }

          // If it was a button click, click the button again
          if (
            event &&
            event.type === "click" &&
            (event.target.tagName === "BUTTON" ||
              event.target.tagName === "INPUT")
          ) {
            setTimeout(() => {
              event.target.click();
            }, 100);
          }
        }
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
        const handler = function (e) {
          handleSearchSubmit(e);
        };
        eventHandlers.set(searchForm, handler);
        searchForm.addEventListener("submit", handler);
        console.log("Added submit listener to search form");
      }
    }

    if (searchButton) {
      // Only add listener if not already added
      if (!eventHandlers.has(searchButton)) {
        const handler = function (e) {
          handleSearchSubmit(e);
        };
        eventHandlers.set(searchButton, handler);
        searchButton.addEventListener("click", handler);
        console.log("Added click listener to search button");
      }
    }
  }

  // Override any existing search functionality
  function overrideExistingFunctionality() {
    // If there's an existing filterTable function, override it
    if (window.filterTable && !window.originalFilterTable) {
      window.originalFilterTable = window.filterTable;
      window.filterTable = async function () {
        // We'll only check for loan provisioning when the function is called from a search button click
        const isFromSearchButton =
          arguments.length > 0 && arguments[0] && arguments[0].type === "click";

        if (isFromSearchButton) {
          const { loanNumberInput } = findSearchElements();
          const viewElement = new ViewElement();

          if (loanNumberInput) {
            const loanNumber = loanNumberInput.value.trim();

            if (loanNumber) {
              const isAllowed = await isLoanNumberAllowed(loanNumber);
              if (!isAllowed) {
                viewElement.showUnallowed();
                return false;
              } else {
                viewElement.hideUnallowed();
              }
            }
          }
        }

        return window.originalFilterTable.apply(this, arguments);
      };
      console.log("Overrode existing filterTable function");
    }
  }

  // ########## URL CHANGE MONITORING ##########
  // Monitor URL changes similar to reference_filter.js
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

        // Show the page after processing
        pageUtils.showPage(true);
      }
    );
  }

  // ########## INITIALIZATION ##########
  // Initialize when DOM is ready
  async function initialize() {
    try {
      // Wait for the extension listener to be available
      const listenerAvailable = await waitForListener();
      if (!listenerAvailable) {
        console.warn("Listener not available, skipping initialization.");
        return;
      }
      setupEventListeners();
      overrideExistingFunctionality();
      setupUrlChangeMonitoring();

      // Make sure any error messages are hidden initially
      const viewElement = new ViewElement();
      viewElement.hideUnallowed();

      console.log("Loan search override initialized");

      // Show the page after initialization
      pageUtils.showPage(true);
    } catch (error) {
      console.error("Error during initialization:", error);
      // Show the page even if there's an error
      pageUtils.showPage(true);
    }
  }

  // Set up a MutationObserver with debouncing to prevent excessive callbacks
  let debounceTimer = null;
  const observer = new MutationObserver(function (mutations) {
    // Debounce to prevent excessive calls
    if (debounceTimer) clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
      // Check if any relevant elements were added
      const formAdded = mutations.some(
        (mutation) =>
          mutation.type === "childList" &&
          Array.from(mutation.addedNodes).some(
            (node) =>
              node.nodeType === 1 &&
              (node.tagName === "FORM" ||
                (node.querySelector &&
                  node.querySelector(
                    'form, input[type="text"], button[type="submit"]'
                  )))
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
    attributes: true,
    attributeFilter: ["value", "style", "class", "display"],
  });

  // Expose test function to console
  window.testLoanProvisioning = async function (loanNumber) {
    const isAllowed = await isLoanNumberAllowed(loanNumber);
    console.log(
      `Loan ${loanNumber} is ${isAllowed ? "allowed" : "not allowed"}`
    );
    return isAllowed;
  };

  // Run initialization immediately
  initialize();

  console.log("Loan Search Override Script Injected Successfully!");
})();
