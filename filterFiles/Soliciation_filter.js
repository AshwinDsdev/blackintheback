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
   * @description Waits for the Chrome extension listener to be available (optimized)
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

        console.log(`🔄 Sending ping attempt ${attempts + 1}/${maxRetries}...`);

        chrome.runtime.sendMessage(
          EXTENSION_ID,
          { type: "ping" },
          (response) => {
            if (response?.result === "pong") {
              console.log("✅ Listener detected!");
              clearTimeout(timeoutId);
              resolve(true);
            } else {
              console.warn("❌ No listener detected, retrying...");
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
   * @description Checks if the user has access to a batch of loan numbers (optimized)
   * @param {string[]} numbers - Array of loan numbers to check
   * @returns {Promise<string[]>} Promise that resolves to an array of allowed loan numbers
   */
  async function checkNumbersBatch(numbers) {
    return new Promise((resolve, reject) => {
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
          } else if (response?.error) {
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

  /**
   * @function createUnallowedElement
   * @description Creates an element to show when a loan is not allowed (optimized)
   */
  function createUnallowedElement() {
    // Check if element already exists to prevent duplicates
    const existing = document.getElementById("loanNotProvisioned");
    if (existing) return existing;

    const unallowed = document.createElement("div");
    unallowed.id = "loanNotProvisioned";
    unallowed.appendChild(
      document.createTextNode("You are not provisioned for this loan.")
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
   * @function createLoader
   * @description Creates loader styles for better user experience (from prodFilter)
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
   * @description Creates the loader element (from prodFilter)
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
   * @description Shows the loader (from prodFilter)
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
   * @description Hides the loader (from prodFilter)
   */
  function hideLoader() {
    const loader = document.getElementById("loaderOverlay");
    if (loader) {
      loader.classList.add("hidden");
      setTimeout(() => loader.remove(), 300);
    }
  }

  /**
   * @async
   * @function isLoanNumberAllowed
   * @description Checks if a loan number is allowed for the current user (optimized)
   * @param {string} loanNumber - The loan number to check
   * @returns {Promise<boolean>} Promise that resolves to true if the loan number is allowed, false otherwise
   */
  async function isLoanNumberAllowed(loanNumber) {
    try {
      if (!loanNumber?.trim()) return false;

      loanNumber = loanNumber.trim();

      // First check the cache for O(1) lookup
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

      // Use Set for O(1) lookup instead of array includes
      return new Set(allowedNumbers).has(loanNumber);
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
  // Function to handle search form submission (optimized)
  async function handleSearchSubmit(event) {
    const { loanNumberInput } = findSearchElements();
    const viewElement = new ViewElement();

    if (loanNumberInput?.value?.trim()) {
      const loanNumber = loanNumberInput.value.trim();

      // Prevent default action until we check if the loan is provisioned
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }

      // Show loader during validation
      showLoader();

      try {
        // Check if loan is provisioned
        const isAllowed = await isLoanNumberAllowed(loanNumber);

        hideLoader();

        if (!isAllowed) {
          viewElement.showUnallowed();
          return false;
        } else {
          viewElement.hideUnallowed();

          // Use more efficient timeout handling
          const resubmitDelay = 50; // Reduced delay for better UX

          // If it was a form submission, resubmit the form
          if (
            event &&
            event.type === "submit" &&
            event.target.tagName === "FORM"
          ) {
            setTimeout(() => {
              event.target.submit();
            }, resubmitDelay);
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
            }, resubmitDelay);
          }
        }
      } catch (error) {
        hideLoader();
        console.error("Error in handleSearchSubmit:", error);
        // Show error state but don't block the form
        viewElement.showUnallowed();
        return false;
      }
    }
  }

  // Store references to event handlers to avoid duplicates (optimized)
  const eventHandlers = new WeakMap();

  // Set up event listeners without cloning elements (optimized)
  function setupEventListeners() {
    const { searchForm, searchButton } = findSearchElements();

    // Prevent infinite loops by checking if we've already set up listeners
    if (window.listenersSetup) return;
    window.listenersSetup = true;

    // Use more efficient event handler attachment
    if (searchForm && !eventHandlers.has(searchForm)) {
      const handler = (e) => handleSearchSubmit(e);
      eventHandlers.set(searchForm, handler);
      searchForm.addEventListener("submit", handler, { passive: false });
    }

    if (searchButton && !eventHandlers.has(searchButton)) {
      const handler = (e) => handleSearchSubmit(e);
      eventHandlers.set(searchButton, handler);
      searchButton.addEventListener("click", handler, { passive: false });
    }
  }

  // Override any existing search functionality (optimized)
  function overrideExistingFunctionality() {
    // If there's an existing filterTable function, override it
    if (window.filterTable && !window.originalFilterTable) {
      window.originalFilterTable = window.filterTable;
      window.filterTable = async function () {
        // More efficient argument checking
        const isFromSearchButton =
          arguments.length > 0 && arguments[0]?.type === "click";

        if (isFromSearchButton) {
          const { loanNumberInput } = findSearchElements();
          const viewElement = new ViewElement();

          if (loanNumberInput?.value?.trim()) {
            const loanNumber = loanNumberInput.value.trim();
            
            showLoader();
            try {
              const isAllowed = await isLoanNumberAllowed(loanNumber);
              hideLoader();
              
              if (!isAllowed) {
                viewElement.showUnallowed();
                return false;
              } else {
                viewElement.hideUnallowed();
              }
            } catch (error) {
              hideLoader();
              console.error("Error in overridden filterTable:", error);
              viewElement.showUnallowed();
              return false;
            }
          }
        }

        return window.originalFilterTable.apply(this, arguments);
      };
    }
  }

  // ########## URL CHANGE MONITORING ##########
  // Monitor URL changes similar to reference_filter.js (optimized)
  let urlMonitorId = null;
  function setupUrlChangeMonitoring() {
    // Clear any existing monitor
    if (urlMonitorId) {
      clearInterval(urlMonitorId);
    }

    urlMonitorId = onValueChange(
      () => document.location.href,
      (newUrl) => {
        // Hide loader and reset UI elements efficiently
        hideLoader();
        const viewElement = new ViewElement();
        viewElement.hideUnallowed();

        // Allow setting up listeners again on URL change
        window.listenersSetup = false;

        // Use requestAnimationFrame for better performance
        requestAnimationFrame(() => {
          setupEventListeners();
          overrideExistingFunctionality();
          pageUtils.showPage(true);
        });
      }
    );
  }

  // ########## INITIALIZATION ##########
  // Initialize when DOM is ready (optimized)
  async function initialize() {
    showLoader();
    
    try {
      // Wait for the extension listener to be available
      const listenerAvailable = await waitForListener();
      if (!listenerAvailable) {
        console.warn("Listener not available, skipping initialization.");
        hideLoader();
        pageUtils.showPage(true);
        return;
      }
      
      // Batch initialization for better performance
      setupEventListeners();
      overrideExistingFunctionality();
      setupUrlChangeMonitoring();

      // Make sure any error messages are hidden initially
      const viewElement = new ViewElement();
      viewElement.hideUnallowed();

      hideLoader();
      // Show the page after initialization
      pageUtils.showPage(true);
    } catch (error) {
      console.error("Error during initialization:", error);
      hideLoader();
      // Show the page even if there's an error
      pageUtils.showPage(true);
    }
  }

  // Set up a MutationObserver with optimized debouncing (from prodFilter patterns)
  let debounceTimer = null;
  const observer = new MutationObserver(function (mutations) {
    // More efficient debouncing
    if (debounceTimer) return;

    debounceTimer = setTimeout(() => {
      // More efficient mutation checking
      const formAdded = mutations.some(
        (mutation) =>
          mutation.type === "childList" &&
          Array.from(mutation.addedNodes).some(
            (node) =>
              node.nodeType === 1 &&
              (node.tagName === "FORM" ||
                node.querySelector?.('form, input[type="text"], button[type="submit"]'))
          )
      );

      if (formAdded) {
        window.listenersSetup = false; // Reset so we can set up listeners again
        requestAnimationFrame(() => {
          setupEventListeners();
        });
      }
      
      debounceTimer = null;
    }, 300); // Reduced timeout for better responsiveness
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["value", "style", "class", "display"],
  });

  window.testLoanProvisioning = async function (loanNumber) {
    const isAllowed = await isLoanNumberAllowed(loanNumber);
    return isAllowed;
  };

  // Run initialization immediately
  initialize();
})();
