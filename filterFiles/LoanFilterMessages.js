/**
 * @fileoverview Loan Filter Script for Loansphere
 * @description This script filters loan information based on user permissions.
 * It hides unauthorized loan numbers and provides a secure browsing experience.
 * @author Loansphere Team
 * @version 1.0.0
 */

(function () {
  // ########## PAGE UTILITIES ##########
  // Import utility functions from ui-hider-until-load.js
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

  // ########## CORE UTILITIES ##########
  // Ensure Bootstrap is loaded
  function ensureBootstrapLoaded() {
    return new Promise((resolve, reject) => {
      // Check if Bootstrap is already loaded
      if (typeof bootstrap !== "undefined" && bootstrap.Modal) {
        resolve();
        return;
      }

      // Load Bootstrap CSS if not already loaded
      if (!document.querySelector('link[href*="bootstrap"]')) {
        const bootstrapCSS = document.createElement("link");
        bootstrapCSS.rel = "stylesheet";
        bootstrapCSS.href =
          "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css";
        bootstrapCSS.integrity =
          "sha384-T3c6CoIi6uLrA9TneNEoa7RxnatzjcDSCmG1MXxSR1GAsXEV/Dwwykc2MPK8M2HN";
        bootstrapCSS.crossOrigin = "anonymous";
        document.head.appendChild(bootstrapCSS);
      }

      // Load Bootstrap Icons if not already loaded
      if (!document.querySelector('link[href*="bootstrap-icons"]')) {
        const bootstrapIcons = document.createElement("link");
        bootstrapIcons.rel = "stylesheet";
        bootstrapIcons.href =
          "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css";
        document.head.appendChild(bootstrapIcons);
      }

      // Load Bootstrap JS if not already loaded
      if (typeof bootstrap === "undefined" || !bootstrap.Modal) {
        const bootstrapJS = document.createElement("script");
        bootstrapJS.src =
          "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js";
        bootstrapJS.integrity =
          "sha384-C6RzsynM9kWDrMNeT87bh95OGNyZPhcTNXj1NW7RuBCsyN/o0jlpcV8Qyq46cDfL";
        bootstrapJS.crossOrigin = "anonymous";
        bootstrapJS.onload = resolve;
        bootstrapJS.onerror = reject;
        document.body.appendChild(bootstrapJS);
      }
    });
  }

  /**
   * @constant {string} EXTENSION_ID
   * @description Chrome extension ID for communication
   */
  const EXTENSION_ID = "afkpnpkodeiolpnfnbdokgkclljpgmcm";

  /**
   * @function onValueChange
   * @description Sets up an interval to monitor changes to a value and triggers a callback when changes are detected
   * @param {Function} evalFunction - Function that returns the value to monitor
   * @param {Function} callback - Function to call when the value changes
   * @param {Object} [options={}] - Options for the monitoring
   * @param {number} [options.maxTime] - Maximum time in milliseconds to monitor for changes
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
    }, 500);
    return intervalId;
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

  // ########## UI COMPONENTS ##########
  /**
   * @function createUnallowedElement
   * @description Creates a DOM element to display when a loan is not provisioned to the user
   * @returns {HTMLElement} The created element
   */
  function createUnallowedElement() {
    const unallowed = document.createElement("div");
    unallowed.appendChild(
      document.createTextNode("You are not provisioned to access this loan")
    );
    unallowed.className = "access-denied-message";
    unallowed.style.display = "flex";
    unallowed.style.justifyContent = "center";
    unallowed.style.alignItems = "center";
    unallowed.style.height = "100px";
    unallowed.style.fontSize = "20px";
    unallowed.style.fontWeight = "bold";
    unallowed.style.color = "red";
    unallowed.style.position = "relative";
    unallowed.style.zIndex = "1";
    unallowed.style.backgroundColor = "#f8d7da";
    unallowed.style.padding = "20px";
    unallowed.style.borderRadius = "5px";
    unallowed.style.margin = "20px 0";
    unallowed.style.border = "1px solid #f5c6cb";

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
      // Find the main content element that contains loan details
      this.element = this.findMainContentElement();
      this.parent = this.element && this.element.parentElement;
      this.unallowed = createUnallowedElement();
      this.unallowedParent =
        document.querySelector("body") || document.documentElement;
    }

    /**
     * @method findMainContentElement
     * @description Finds the main content element containing loan details
     * @returns {HTMLElement|null} The main content element or null if not found
     */
    findMainContentElement() {
      // Look for the loan number in the specific HTML structure
      const loanLabelElements = document.querySelectorAll(".fieldLabel");

      for (const labelElement of loanLabelElements) {
        if (labelElement.textContent.trim() === "Loan Number:") {
          // Get the container that holds the loan details
          return (
            labelElement.closest(".container") ||
            labelElement.closest(".content") ||
            labelElement.closest("main") ||
            labelElement.closest("div")
          );
        }
      }

      return null;
    }

    /**
     * @method remove
     * @description Removes the loan element and shows the unallowed message
     */
    remove() {
      if (this.element) {
        // Store original display style
        this.originalDisplay = this.element.style.display;
        // Hide the element
        this.element.style.display = "none";
        // Add the unallowed message
        if (this.parent) {
          this.parent.insertBefore(this.unallowed, this.element);
        } else {
          this.unallowedParent.appendChild(this.unallowed);
        }
      }
    }

    /**
     * @method add
     * @description Adds the loan element back and removes the unallowed message
     */
    add() {
      if (this.element) {
        // Remove the unallowed message
        if (this.unallowed.parentNode) {
          this.unallowed.remove();
        }
        // Restore the element
        this.element.style.display = this.originalDisplay || "";
      }
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
   * @function getLoanNumber
   * @description Extracts the loan number from a view element
   * @param {HTMLElement} viewElement - The element containing the loan number
   * @returns {string|null} The loan number if found, null otherwise
   */
  function getLoanNumber(viewElement) {
    // Look for the loan number in the specific HTML structure
    const loanLabelElements = document.querySelectorAll(".fieldLabel");

    for (const labelElement of loanLabelElements) {
      if (labelElement.textContent.trim() === "Loan Number:") {
        // Get the next sibling span with class "field normal-font"
        const loanNumberElement =
          labelElement.parentElement.querySelector(".field.normal-font");
        if (loanNumberElement) {
          return loanNumberElement.textContent.trim();
        }
      }
    }

    // If not found, try alternative methods
    const loanNumberCell = viewElement.querySelector(
      "table tr td a.bright-green.ng-binding"
    );
    if (loanNumberCell) {
      return loanNumberCell.textContent.trim();
    }

    return null;
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
      if (
        allowedLoansCache.isCacheValid() &&
        allowedLoansCache.isAllowed(loanNumber)
      ) {
        return true;
      }

      const allowedNumbers = await checkNumbersBatch([loanNumber]);
      allowedLoansCache.addLoans(allowedNumbers);

      return allowedNumbers.includes(loanNumber);
    } catch (error) {
      console.warn("Failed to check loan access, assuming not allowed");
      return false;
    }
  }

  /**
   * @function showErrorModal
   * @description Shows an error modal with a custom message
   * @param {string} message - The error message to display
   */
  function showErrorModal(message) {
    // Remove any existing modal with the same ID
    const existingModal = document.getElementById("errorModal");
    if (existingModal) {
      existingModal.remove();
    }

    // Create modal HTML
    const modalHTML = `
    <div class="modal fade" id="errorModal" tabindex="-1" aria-labelledby="errorModalLabel" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header bg-warning">
                    <h5 class="modal-title" id="errorModalLabel">Error</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="d-flex align-items-center">
                        <i class="bi bi-exclamation-circle-fill text-warning me-3" style="font-size: 2rem;"></i>
                        <p class="mb-0">${message}</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-primary" onclick="location.reload()">Refresh Page</button>
                </div>
            </div>
        </div>
    </div>
    `;

    // Append modal to body
    document.body.insertAdjacentHTML("beforeend", modalHTML);

    // Get the modal element
    const modalElement = document.getElementById("errorModal");

    // Initialize the Bootstrap modal
    const modal = new bootstrap.Modal(modalElement);

    // Show the modal
    modal.show();
  }

  // ########## MAIN FUNCTIONALITY ##########
  /**
   * @function processPage
   * @description Processes the current page to check loan access
   */
  async function processPage() {
    try {
      // Ensure Bootstrap is loaded
      await ensureBootstrapLoaded();

      // Wait for loan number to appear
      const viewElement = new ViewElement();
      if (!viewElement.element) {
        // No loan details found, show the page
        pageUtils.showPage(true);
        return;
      }

      const loanNumber = getLoanNumber(viewElement.element);
      if (!loanNumber) {
        console.log("No loan number found on this page.");
        pageUtils.showPage(true);
        return;
      }

      console.log(`Found loan number: ${loanNumber}`);

      // Hide content initially
      viewElement.remove();

      // Check if the loan number is allowed
      const isAllowed = await isLoanNumberAllowed(loanNumber);

      if (isAllowed) {
        console.log(`Loan number ${loanNumber} is valid and you have access.`);
        viewElement.add();
        pageUtils.showPage(true);
      } else {
        console.error(
          `Loan number ${loanNumber} is not in the provisioned set.`
        );
        // The unallowed message is already shown by viewElement.remove()
        // Just keep the page visible so the message can be seen
        pageUtils.showPage(true);
      }
    } catch (error) {
      console.error("Error processing page:", error);
      showErrorModal(
        "An error occurred while validating loan access. Please try again later."
      );
      pageUtils.showPage(true);
    }
  }

  /**
   * @function initializeFilter
   * @description Initializes the loan filter
   * @returns {Promise<Object>} Promise that resolves to an initialization result object
   */
  async function initializeFilter() {
    try {
      // Ensure Bootstrap is loaded
      await ensureBootstrapLoaded();

      // Try to connect to the extension
      const listenerAvailable = await waitForListener().catch(() => false);

      // Set up URL change monitoring
      const urlChangeIntervalId = onValueChange(
        () => document.location.href,
        async (newUrl) => {
          // Hide the page during navigation
          pageUtils.showPage(false);

          // Check if the URL contains loan-related paths
          if (
            newUrl &&
            (newUrl.includes("loan") ||
              newUrl.includes("application") ||
              newUrl.includes("details") ||
              newUrl.includes("view"))
          ) {
            console.log(
              "URL changed to loan-related page, validating access..."
            );
            await processPage();
          } else {
            // For non-loan pages, just show the content
            pageUtils.showPage(true);
          }
        }
      );

      return {
        success: true,
        listenerAvailable,
        intervalId: urlChangeIntervalId,
      };
    } catch (error) {
      console.error("Error initializing loan filter:", error);
      // Show the page even if initialization fails
      pageUtils.showPage(true);
      return { success: false, error };
    }
  }

  // Initialize the filter and start processing
  const initPromise = initializeFilter();

  // Process the current page
  initPromise
    .then(() => {
      processPage();
    })
    .catch((error) => {
      console.error("Failed to initialize loan filter:", error);
      pageUtils.showPage(true);
    });

  // Cleanup function for when the script is unloaded
  window.__cleanupLoanFilter = function () {
    // Ensure page is visible when cleaning up
    pageUtils.showPage(true);

    initPromise
      .then((initResult) => {
        if (initResult && initResult.success && initResult.intervalId) {
          clearInterval(initResult.intervalId);
        }
        console.log("Loan Filter Script cleaned up");
      })
      .catch((error) => {
        console.error("Error during cleanup:", error);
      });
  };
})();
