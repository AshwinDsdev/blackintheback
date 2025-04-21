(function () {
  // Reduce initial console logging
  if (!window.storedNumbersSet || !(window.storedNumbersSet instanceof Set)) {
    console.error("window.storedNumbersSet is not defined or not a Set object");
    return;
  }

  const storedNumbers = window.storedNumbersSet;
  
  // Completely disable all console logging except for critical errors
  // This will significantly improve performance
  const originalConsoleLog = console.log;
  const originalConsoleInfo = console.info;
  const originalConsoleWarn = console.warn;
  
  // Only keep error logging for critical issues
  console.log = function() {};
  console.info = function() {};
  console.warn = function() {};
  
  function logInfo() {
    // Do nothing - completely disabled for performance
  }
  
  // Only log the count, not each individual value
  logInfo(`Loaded storedNumbersSet with ${storedNumbers.size} entries`);
  
  // Add a debounce function to prevent multiple rapid executions
  function debounce(func, wait) {
    let timeout;
    return function(...args) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  }
  
  // Track if an operation is in progress to prevent overlapping executions
  let operationInProgress = false;
  
  // Create debounced versions of key functions to prevent multiple rapid executions
  function createDebouncedFunction(func, wait) {
    const debouncedFunc = debounce(function(...args) {
      if (operationInProgress) return;
      operationInProgress = true;
      
      try {
        func.apply(this, args);
      } finally {
        operationInProgress = false;
      }
    }, wait);
    
    return debouncedFunc;
  }

  // Add CSS styles for custom pagination if needed
  function addCustomStyles() {
    try {
      // Check if styles already exist
      if (document.getElementById("offshore-custom-styles")) {
        return;
      }

      // Create a style element
      const styleElement = document.createElement("style");
      styleElement.id = "offshore-custom-styles";
      styleElement.type = "text/css"; // Explicitly set the type
      
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
        
        /* Custom pagination styles */
        #bottom-pager.page-container { 
          padding: 0.1rem 1rem; 
          border: 1px solid #ced1da; 
          border-radius: 0.1rem; 
          margin: 1px 0; 
          display: flex; 
          flex-direction: row; 
          align-items: center;
        }
        #bottom-pager .page-numbers { 
          display: inline-flex; 
          flex-direction: row; 
          align-items: center; 
        }
        #bottom-pager .page-selector, #bottom-pager .page-number { 
          cursor: pointer; 
          text-decoration: none; 
          color: unset; 
          padding: 1px 1px; 
          border: 1px solid transparent; 
          border-radius: 1px; 
          margin: 0 1px; 
        }
        #bottom-pager .page-selector:not(.selected):hover, #bottom-pager .page-number:not(.selected):hover { 
          background-color: #1F1F1F; 
          color: #fff; 
          font-weight: bold; 
        }
        #bottom-pager .page-number.selected { 
          font-weight: bold; 
          background-color: #C0C0C0; 
          color: #000; 
        }
        #bottom-pager .page-previous.disabled, #bottom-pager .page-first.disabled, 
        #bottom-pager .page-next.disabled, #bottom-pager .page-last.disabled { 
          color: #a1a1a1; 
          font-weight: bold; 
          cursor: default; 
        }
        #bottom-pager .page-previous.disabled:hover, #bottom-pager .page-first.disabled:hover, 
        #bottom-pager .page-next.disabled:hover, #bottom-pager .page-last.disabled:hover { 
          background-color: unset; 
          color: #a1a1a1; 
        }
        #bottom-pager .page-selector.page-number.hide,
        .page-number.hide,
        .hide { 
          display: none !important; 
          visibility: hidden !important;
        }
        #bottom-pager .page-size-select { 
          padding: 0.1rem 1.1rem 0.1rem 0.1rem; 
          border-radius: 1px; 
          border: 1px solid #ced1da !important;
          max-width: max-content !important;
          margin: 0 1px; 
        }
        #bottom-pager .page-size-container { 
          display: inline-flex; 
          flex-direction: row;
          align-items: center;
          margin: 1px 0; 
        }
        #bottom-pager .page-numbers.hidden .page-number, 
        #bottom-pager .page-first.hidden, 
        #bottom-pager .page-last.hidden { 
          display: none; 
        }
        #bottom-pager .current-page-display { 
          display: inline-flex; 
          flex-direction: row; 
          align-items: center; 
        }
        #bottom-pager .current-page-display.hidden { 
          display: none; 
        }
        #bottom-pager .current-page-display .current-page { 
          font-weight: bold; 
          margin-left: 1px; 
        }
        #bottom-pager .select-page-num-select { 
          padding: 0.1rem 1.1rem 0.1rem 0.1rem; 
          border-radius: 1px; 
          border: 1px solid #ced1da !important; 
          width: unset !important;
          margin: 0 1px; 
        }
      `;
      
      // Use different methods to ensure the styles are applied correctly
      // Method 1: Using textContent
      styleElement.textContent = cssText;
      
      // Method 2: Using createTextNode as a fallback
      if (!styleElement.textContent) {
        styleElement.appendChild(document.createTextNode(cssText));
      }
      
      // Add the style element to the document head
      document.head.appendChild(styleElement);
      
      // Alternative method: Add styles using a different approach
      // This is a fallback in case the first method doesn't work
      if (!document.getElementById("offshore-custom-styles-alt")) {
        const altStyleElement = document.createElement("style");
        altStyleElement.id = "offshore-custom-styles-alt";
        document.head.appendChild(altStyleElement);
        
        const styleSheet = altStyleElement.sheet;
        if (styleSheet) {
          // Hide any CSS text that might be showing in the UI
          const cssTextElements = document.querySelectorAll("body > :not(script):not(style):not(link):not(meta):contains('#bottom-pager')");
          cssTextElements.forEach(el => {
            if (el.textContent && el.textContent.includes('#bottom-pager')) {
              el.style.display = 'none';
            }
          });
        }
      }
      
      logInfo("Added custom styles for offshore access features");
    } catch (err) {
      // Silently catch any errors to prevent script failure
    }
  }

  // Function to clean up any CSS text that might be showing in the UI
  function cleanupCssTextInUI() {
    try {
      // First, ensure our styles are properly applied
      if (!document.getElementById("offshore-custom-styles")) {
        addCustomStyles();
      }
      
      // Direct approach: Find any element that contains CSS text and remove it
      const cssTextPatterns = [
        '#bottom-pager',
        '.page-container',
        '.page-numbers',
        '.page-selector',
        'padding:',
        'margin:',
        'border:',
        'display:flex',
        'flex-direction:row'
      ];
      
      // Look for visible text nodes that contain CSS-like content
      document.querySelectorAll('body, body *').forEach(element => {
        // Skip script and style elements
        if (element.tagName === 'SCRIPT' || element.tagName === 'STYLE' || element.tagName === 'HEAD') {
          return;
        }
        
        // Check direct text children
        Array.from(element.childNodes).forEach(node => {
          if (node.nodeType === Node.TEXT_NODE) {
            const text = node.nodeValue.trim();
            if (text && cssTextPatterns.some(pattern => text.includes(pattern))) {
              // This is likely CSS text showing in the UI
              node.nodeValue = '';
            }
          }
        });
        
        // Check if this element only contains CSS text
        if (element.childNodes.length === 0 || 
            (element.childNodes.length === 1 && element.childNodes[0].nodeType === Node.TEXT_NODE)) {
          const text = element.textContent.trim();
          if (text && cssTextPatterns.some(pattern => text.includes(pattern))) {
            // This element only contains CSS text
            element.style.display = 'none';
            element.textContent = '';
          }
        }
      });
      
      // Look for any element that has CSS text as its content
      document.querySelectorAll('div, span, p, td, li').forEach(el => {
        const text = el.textContent.trim();
        if (text && text.includes('#bottom-pager') && text.includes('{')) {
          // This is very likely CSS text
          el.style.display = 'none';
          el.innerHTML = '';
        }
      });
    } catch (err) {
      // Silently catch any errors
    }
  }
  
  // Add the custom styles
  addCustomStyles();
  
  // Clean up any CSS text in the UI
  // Run this after a short delay to ensure the DOM is fully loaded
  setTimeout(cleanupCssTextInUI, 500);
  // Run it again after a longer delay in case the page updates
  setTimeout(cleanupCssTextInUI, 2000);
  
  // Set up a MutationObserver to continuously clean up any CSS text that might appear
  try {
    const cssCleanupObserver = new MutationObserver(function(mutations) {
      // Check if any of the mutations might have added CSS text
      let shouldCleanup = false;
      
      for (const mutation of mutations) {
        // If nodes were added
        if (mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            // Check text nodes
            if (node.nodeType === Node.TEXT_NODE) {
              if (node.nodeValue && (
                  node.nodeValue.includes('#bottom-pager') || 
                  node.nodeValue.includes('.page-container') ||
                  node.nodeValue.includes('.page-numbers')
                )) {
                shouldCleanup = true;
                break;
              }
            }
            // Check element nodes
            else if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.textContent && (
                  node.textContent.includes('#bottom-pager') || 
                  node.textContent.includes('.page-container') ||
                  node.textContent.includes('.page-numbers')
                )) {
                shouldCleanup = true;
                break;
              }
            }
          }
        }
        
        if (shouldCleanup) break;
      }
      
      // If CSS text was detected, run the cleanup
      if (shouldCleanup) {
        cleanupCssTextInUI();
      }
    });
    
    // Start observing the document body for changes
    cssCleanupObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  } catch (err) {
    // Silently catch any errors
  }

  // Track search parameters and results
  let currentSearchParams = {
    queueType: null,
    queueTitle: null,
    presetDropdown: null,
  };

  // Function to check if current search is only using dropdown filters
  function isDropdownOnlySearch() {
    // Check if search was performed only using dropdown filters
    const urlParams = new URLSearchParams(window.location.search);
    const hasTextSearch =
      urlParams.has("search") ||
      urlParams.has("query") ||
      urlParams.has("text");

    // If there are no text search parameters, it's a dropdown-only search
    return !hasTextSearch;
  }

  // Function to extract current search parameters from the page
  function updateSearchParams() {
    // Try to find dropdown elements - this is a simplified example
    // You'll need to adjust selectors based on actual page structure
    const queueTypeEl = document.querySelector(
      'select[name="queueType"], .queue-type-dropdown'
    );
    const queueTitleEl = document.querySelector(
      'select[name="queueTitle"], .queue-title-dropdown'
    );
    const presetDropdownEl = document.querySelector(
      'select[name="preset"], .preset-dropdown'
    );

    currentSearchParams = {
      queueType: queueTypeEl ? queueTypeEl.value : null,
      queueTitle: queueTitleEl ? queueTitleEl.value : null,
      presetDropdown: presetDropdownEl ? presetDropdownEl.value : null,
    };

    logInfo("Current search parameters:", currentSearchParams);
  }

  function findLoanTable() {
    const possibleTables = [
      document.querySelector(".todo-table tbody"),
      document.querySelector(".workflow-table tbody"),
      document.querySelector(".task-table tbody"),
      document.querySelector(".new-ui-table.striped tbody"),
      document.querySelector("table.striped tbody"),
      document.querySelector("table tbody"),
    ];

    for (const table of possibleTables) {
      if (table) return table;
    }

    return null;
  }

  function findServicerColumnIndex(headerRow) {
    if (!headerRow) return -1;

    const headerCells = headerRow.querySelectorAll("th");

    const possibleHeaders = [
      "Servicer",
      "Loan",
      "Loan Number",
      "Loan #",
      "Account",
      "Account Number",
      "ID",
    ];

    for (let i = 0; i < headerCells.length; i++) {
      const headerText = headerCells[i].textContent.trim();

      for (const possibleHeader of possibleHeaders) {
        if (headerText.includes(possibleHeader)) {
          logInfo(
            `Found potential loan number column: "${headerText}" at index ${i}`
          );
          return i;
        }
      }
    }

    return -1;
  }

  function extractLoanNumber(text) {
    if (!text) return null;

    text = text.trim();
    logInfo(`Extracting from text: "${text}"`);

    const labelMatch = /(?:Servicer|Loan|Account|ID):\s*([^\s,;]+)/i.exec(text);
    if (labelMatch && labelMatch[1]) {
      logInfo(`Extracted after label: "${labelMatch[1]}"`);
      return labelMatch[1].trim();
    }

    if (/^\d+$/.test(text)) {
      logInfo(`Using numeric text directly: "${text}"`);
      return text;
    }

    const numericMatch = text.match(/\d+/);
    if (numericMatch) {
      logInfo(
        `Extracted numeric part: "${numericMatch[0]}" from "${text}"`
      );
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
    messageEl.className = type; // Use CSS classes instead of inline styles
    messageEl.textContent = message;

    // Insert at the top of the table or content area
    const tableContainer = findLoanTable()?.closest("table");
    if (tableContainer) {
      tableContainer.parentNode.insertBefore(messageEl, tableContainer);
    } else {
      // Fallback - insert at top of content area
      const contentArea = document.querySelector(
        ".content-area, main, #main-content"
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

  // Function to find pagination elements
  function findPaginationElements() {
    // Common selectors for pagination elements
    const elements = {
      // Standard pagination elements
      totalRecords: document.querySelector(
        ".total-records, .record-count, .pagination-info, [data-total-records]"
      ),
      pageCount: document.querySelector(
        ".page-count, .pagination-pages, [data-page-count]"
      ),
      paginationControls: document.querySelector(
        ".pagination, .pager, nav.pagination-nav"
      ),
      itemsPerPage: document.querySelector(
        "select.items-per-page, select.page-size, [data-items-per-page], .page-size-select"
      ),
      currentPage: document.querySelector(
        ".current-page, .active-page, [data-current-page]"
      ),

      // Custom pagination elements (based on the provided CSS)
      customPager: document.getElementById("bottom-pager"),
      customPageSizeSelect: document.querySelector(
        "#bottom-pager .page-size-select"
      ),
      customPageNumbers: document.querySelector("#bottom-pager .page-numbers"),
      customCurrentPage: document.querySelector("#bottom-pager .current-page"),
    };

    // If standard selectors don't work, try to find by text content
    if (!elements.totalRecords) {
      const possibleElements = document.querySelectorAll("span, div, p");
      for (const el of possibleElements) {
        const text = el.textContent.trim().toLowerCase();
        if (text.includes("total") && text.includes("record")) {
          elements.totalRecords = el;
        } else if (
          text.includes("page") &&
          (text.includes("of") || text.includes("/"))
        ) {
          elements.pageCount = el;
        }
      }
    }

    return elements;
  }

  // Create a safe mock implementation of PagingNumHelper to prevent errors
  (function() {
    // Completely replace PagingNumHelper with a no-op version to prevent errors
    window.PagingNumHelper = {
      _isSafeMock: true,
      
      // No-op implementation of refreshPager
      refreshPager: function() {
        // Do nothing
        return;
      },
      
      // No-op implementation of recalculatePages
      recalculatePages: function() {
        // Do nothing
        return;
      }
    };
    
    // Also create a dummy PagingNumHelperOptions object if needed
    if (!window.PagingNumHelperOptions) {
      window.PagingNumHelperOptions = {};
    }
  })();
  
  // Function to update pagination information
  function updatePaginationInfo(visibleCount) {
    
    const paginationElements = findPaginationElements();

    if (
      !paginationElements.totalRecords &&
      !paginationElements.pageCount &&
      !paginationElements.customPager
    ) {
      logInfo("No pagination elements found to update");
      return;
    }

    logInfo("Found pagination elements:", paginationElements);

    // Update total records display for standard pagination
    if (paginationElements.totalRecords) {
      const originalText = paginationElements.totalRecords.textContent;
      // Always update to show the exact visible count
      const newText = originalText.replace(/\d+/g, (match) => {
        return visibleCount;
      });

      if (originalText !== newText) {
        logInfo(
          `Updating total records from "${originalText}" to "${newText}"`
        );
        paginationElements.totalRecords.textContent = newText;

        // Also update any data attributes if they exist
        if (
          paginationElements.totalRecords.hasAttribute("data-total-records")
        ) {
          paginationElements.totalRecords.setAttribute(
            "data-total-records",
            visibleCount
          );
        }
      }
    }

    // Update page count for standard pagination
    if (paginationElements.pageCount) {
      const itemsPerPage = paginationElements.itemsPerPage
        ? parseInt(paginationElements.itemsPerPage.value)
        : 10; // Default to 10 if not found

      const totalPages = Math.max(1, Math.ceil(visibleCount / itemsPerPage));

      const originalText = paginationElements.pageCount.textContent;
      const newText = originalText.replace(
        /\d+$|\d+(?=\s*pages)|\d+(?=\s*of)/,
        totalPages
      );

      if (originalText !== newText) {
        logInfo(
          `Updating page count from "${originalText}" to "${newText}"`
        );
        paginationElements.pageCount.textContent = newText;

        // Also update any data attributes if they exist
        if (paginationElements.pageCount.hasAttribute("data-page-count")) {
          paginationElements.pageCount.setAttribute(
            "data-page-count",
            totalPages
          );
        }
      }
    }

    // Also look for any text that might contain pagination information
    const allTextElements = document.querySelectorAll("span, div, p, label");
    for (const el of allTextElements) {
      const text = el.textContent.trim();

      // Match patterns like "Showing 1-10 of 20 records"
      const recordsPattern = /Showing\s+\d+\s*-\s*\d+\s+of\s+(\d+)/i;
      const recordsMatch = text.match(recordsPattern);

      if (recordsMatch && parseInt(recordsMatch[1]) > visibleCount) {
        const newText = text.replace(recordsPattern, (match, count) => {
          return match.replace(count, visibleCount);
        });

        console.log(`Updating records text from "${text}" to "${newText}"`);
        el.textContent = newText;
      }

      // Match patterns like "Page 1 of 5"
      const pagePattern = /Page\s+\d+\s+of\s+(\d+)/i;
      const pageMatch = text.match(pagePattern);

      if (pageMatch) {
        const itemsPerPage = paginationElements.itemsPerPage
          ? parseInt(paginationElements.itemsPerPage.value)
          : 10;

        const totalPages = Math.max(1, Math.ceil(visibleCount / itemsPerPage));

        if (parseInt(pageMatch[1]) > totalPages) {
          const newText = text.replace(pagePattern, (match, count) => {
            return match.replace(count, totalPages);
          });

          console.log(`Updating page text from "${text}" to "${newText}"`);
          el.textContent = newText;
        }
      }

      // Match patterns like "1-10 of 20"
      const shortPattern = /\d+\s*-\s*\d+\s+of\s+(\d+)/i;
      const shortMatch = text.match(shortPattern);

      if (shortMatch && parseInt(shortMatch[1]) > visibleCount) {
        const newText = text.replace(shortPattern, (match, count) => {
          return match.replace(count, visibleCount);
        });

        console.log(
          `Updating short pagination text from "${text}" to "${newText}"`
        );
        el.textContent = newText;
      }
    }

    // After updating pagination info, also clean up any page number elements
    cleanupPaginationDisplay();

    // Handle custom pagination (PagingNumHelper)
    if (paginationElements.customPager) {
      logInfo("Updating custom pagination system");

      // Find the pager ID
      const pagerId = paginationElements.customPager.id || "pager-1";

      // Try to find the PagingNumHelper instance
      // Skip this section entirely to prevent errors
      // We'll handle pagination directly through DOM manipulation instead
      if (false && window.PagingNumHelper && window.PagingNumHelperOptions) {
        // This code is intentionally disabled to prevent errors
        // The pagination will be handled through direct DOM manipulation instead
      } else {
        // Direct DOM manipulation for pagination
        logInfo("Using direct DOM manipulation for pagination");
      }

      // Direct DOM updates for the custom pager
      const pageSize = paginationElements.customPageSizeSelect
        ? parseInt(paginationElements.customPageSizeSelect.value)
        : 10;

      const totalPages = Math.max(1, Math.ceil(visibleCount / pageSize));

      // Update any total records display in the custom pager
      const totalRecordsDisplay = paginationElements.customPager.querySelector(
        ".total-records, .record-count"
      );
      if (totalRecordsDisplay) {
        const originalText = totalRecordsDisplay.textContent;
        const newText = originalText.replace(/\d+/g, (match) => {
          return visibleCount;
        });

        if (originalText !== newText) {
          logInfo(
            `Updating custom pager total records from "${originalText}" to "${newText}"`
          );
          totalRecordsDisplay.textContent = newText;
        }
      }

      // Update page numbers display
      if (paginationElements.customPageNumbers) {
        // Handle all page number elements
        const pageNumbers =
          paginationElements.customPageNumbers.querySelectorAll(".page-number");

        pageNumbers.forEach((pageNum) => {
          const pageValue = parseInt(
            pageNum.textContent || pageNum.getAttribute("data-page") || "0"
          );

          if (pageValue > totalPages) {
            // For pages beyond the total, completely hide them
            pageNum.classList.add("hide");
            pageNum.style.display = "none"; // Ensure they're completely hidden
          } else {
            // For valid pages, make sure they're visible
            pageNum.classList.remove("hide");
            pageNum.style.display = ""; // Reset display property
          }
        });

        // Disable next/last buttons if on last page
        const nextButton = document.querySelector("#bottom-pager .page-next");
        const lastButton = document.querySelector("#bottom-pager .page-last");
        const currentPageValue = parseInt(
          paginationElements.customCurrentPage?.textContent ||
            document.querySelector(".page-number.selected")?.textContent ||
            document
              .querySelector(".page-number.selected")
              ?.getAttribute("data-page") ||
            "1"
        );

        if (nextButton && currentPageValue >= totalPages) {
          nextButton.classList.add("disabled");
        } else if (nextButton) {
          nextButton.classList.remove("disabled");
        }

        if (lastButton && currentPageValue >= totalPages) {
          lastButton.classList.add("disabled");
        } else if (lastButton) {
          lastButton.classList.remove("disabled");
        }

        // Also update any page count displays
        const pageCountDisplay = paginationElements.customPager.querySelector(
          ".page-count, .pagination-info"
        );
        if (pageCountDisplay) {
          const originalText = pageCountDisplay.textContent;
          const newText = originalText.replace(
            /\d+(?=\s*pages|\s*$)/,
            totalPages
          );

          if (originalText !== newText) {
            console.log(
              `Updating page count display from "${originalText}" to "${newText}"`
            );
            pageCountDisplay.textContent = newText;
          }
        }
      }
    }

    // If there's only one page now, disable pagination controls
    const itemsPerPage = paginationElements.itemsPerPage
      ? parseInt(paginationElements.itemsPerPage.value)
      : paginationElements.customPageSizeSelect
      ? parseInt(paginationElements.customPageSizeSelect.value)
      : 10;

    const totalPages = Math.max(1, Math.ceil(visibleCount / itemsPerPage));

    if (totalPages === 1) {
      // Standard pagination
      if (paginationElements.paginationControls) {
        const paginationButtons =
          paginationElements.paginationControls.querySelectorAll("a, button");
        paginationButtons.forEach((button) => {
          if (
            !button.classList.contains("active") &&
            !button.classList.contains("current")
          ) {
            button.classList.add("disabled");
            button.setAttribute("disabled", "disabled");
            // Prevent clicks
            button.addEventListener(
              "click",
              (e) => {
                e.preventDefault();
                e.stopPropagation();
                return false;
              },
              true
            );
          }
        });
      }

      // Custom pagination
      if (paginationElements.customPager) {
        const customButtons =
          paginationElements.customPager.querySelectorAll(".page-selector");
        customButtons.forEach((button) => {
          if (!button.classList.contains("selected")) {
            button.classList.add("disabled");
            // Prevent clicks
            button.addEventListener(
              "click",
              (e) => {
                e.preventDefault();
                e.stopPropagation();
                return false;
              },
              true
            );
          }
        });
      }
    }
  }

  // Function to clean up pagination display
  function cleanupPaginationDisplay() {
    const paginationElements = findPaginationElements();

    if (!paginationElements.customPager) {
      return;
    }

    console.log("Cleaning up pagination display");

    // Get all page number elements
    const pageNumbers = document.querySelectorAll(
      ".page-number, .page-selector.page-number"
    );

    // Find the current visible count
    const loanTable = findLoanTable();
    if (!loanTable) return;

    // Count visible rows
    const rows = loanTable.querySelectorAll("tr");
    let visibleCount = 0;

    rows.forEach((row) => {
      if (row.style.display !== "none" && !row.classList.contains("hide")) {
        visibleCount++;
      }
    });

    // Get the page size
    const pageSize = paginationElements.customPageSizeSelect
      ? parseInt(paginationElements.customPageSizeSelect.value)
      : paginationElements.itemsPerPage
      ? parseInt(paginationElements.itemsPerPage.value)
      : 10;

    // Calculate total pages
    const totalPages = Math.max(1, Math.ceil(visibleCount / pageSize));

    // Hide page numbers beyond the total
    pageNumbers.forEach((pageNum) => {
      const pageValue = parseInt(
        pageNum.textContent || pageNum.getAttribute("data-page") || "0"
      );

      if (pageValue > totalPages) {
        pageNum.classList.add("hide");
        pageNum.style.display = "none";
      }
    });

    // Also check for any elements with data-page attribute
    const dataPageElements = document.querySelectorAll("[data-page]");
    dataPageElements.forEach((el) => {
      const pageValue = parseInt(el.getAttribute("data-page") || "0");

      if (pageValue > totalPages) {
        el.classList.add("hide");
        el.style.display = "none";
      }
    });

    // Apply direct style to page numbers container to ensure proper display
    const pageNumbersContainer = document.querySelector(".page-numbers");
    if (pageNumbersContainer) {
      // Add a style tag with more specific selectors to override any existing styles
      const styleId = "offshore-pagination-fix";
      if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = `
          .page-number.hide, 
          .page-selector.page-number.hide, 
          .page-numbers .hide,
          [data-page].hide {
            display: none !important;
            visibility: hidden !important;
            width: 0 !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            position: absolute !important;
            left: -9999px !important;
          }
        `;
        document.head.appendChild(style);
      }
    }
    
    // Update the page-tot-pages display to show the correct number of pages
    updatePageTotalsDisplay();
  }

  // Function to set up pagination event listeners
  function setupPaginationListeners() {
    const paginationElements = findPaginationElements();

    // If no pagination elements found, nothing to do
    if (
      !paginationElements.totalRecords &&
      !paginationElements.pageCount &&
      !paginationElements.customPager &&
      !paginationElements.paginationControls
    ) {
      return;
    }

    // Removed console.log for performance

    // Listen for page size changes
    if (paginationElements.itemsPerPage) {
      paginationElements.itemsPerPage.addEventListener("change", () => {
        // Wait for the page to update
        setTimeout(() => {
          filterTable();
          cleanupPaginationDisplay();
        }, 500); // Reduced timeout for better responsiveness
      });
    }

    if (paginationElements.customPageSizeSelect) {
      paginationElements.customPageSizeSelect.addEventListener("change", () => {
        // Wait for the page to update
        setTimeout(() => {
          filterTable();
          cleanupPaginationDisplay();
        }, 500); // Reduced timeout for better responsiveness
      });
    }

    // Listen for page navigation clicks
    const addClickListener = (element) => {
      if (!element) return;

      element.addEventListener("click", () => {
        // Wait for the page to update
        setTimeout(() => {
          filterTable();
          cleanupPaginationDisplay();
        }, 500); // Reduced timeout for better responsiveness
      });
    };

    // Standard pagination
    if (paginationElements.paginationControls) {
      const buttons =
        paginationElements.paginationControls.querySelectorAll("a, button");
      buttons.forEach(addClickListener);
    }

    // Custom pagination
    if (paginationElements.customPager) {
      const buttons =
        paginationElements.customPager.querySelectorAll(".page-selector");
      buttons.forEach(addClickListener);
    }
  }

  // Function to patch the PagingNumHelper if it exists
  function patchPagingNumHelper() {
    if (!window.PagingNumHelper) {
      console.log("PagingNumHelper not found, skipping patch");
      return;
    }

    console.log("Patching PagingNumHelper");

    // Find all instances of PagingNumHelper
    for (const key in window) {
      if (window[key] instanceof window.PagingNumHelper) {
        const originalRefresh = window[key].refreshPager;

        // Patch the refreshPager method
        window[key].refreshPager = function () {
          // Call the original method
          originalRefresh.apply(this, arguments);

          // After refresh, update our filtered view and clean up pagination
          setTimeout(() => {
            filterTable();
            cleanupPaginationDisplay();
          }, 50);
        };

        console.log(`Patched PagingNumHelper instance: ${key}`);
      }
    }
  }

  // Create a debounced version of filterTable
  const debouncedFilterTable = createDebouncedFunction(filterTable, 100);
  
  function filterTable() {
    const loanTable = findLoanTable();

    if (!loanTable) {
      console.error("Loan table not found");
      return;
    }

    // Update current search parameters
    updateSearchParams();

    // Removed console.log for performance

    const rows = loanTable.querySelectorAll("tr");
    let removedCount = 0;
    let visibleCount = 0;
    let restrictedLoans = [];
    // Store original row indices to maintain sort order
    const visibleRows = [];

    const headerRow =
      loanTable.querySelector("tr:first-child") ||
      document.querySelector("thead tr");

    const servicerColumnIndex = findServicerColumnIndex(headerRow);

    // First pass: identify which rows should be visible or hidden
    rows.forEach((row, index) => {
      let servicerValue = null;
      const cells = row.querySelectorAll("td");

      if (cells.length === 0) return; // Skip header rows

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
          cell.textContent.includes("Account:")
        ) {
          servicerValue = extractLoanNumber(cell.textContent);
          break;
        }
      }

      if (
        !servicerValue &&
        servicerColumnIndex >= 0 &&
        cells.length > servicerColumnIndex
      ) {
        servicerValue = extractLoanNumber(
          cells[servicerColumnIndex].textContent
        );
      }

      if (!servicerValue) {
        for (let i = 0; i < cells.length; i++) {
          const cellText = cells[i].textContent.trim();
          if (/^\d{5,}$/.test(cellText) || /Loan\s*#?\s*\d+/i.test(cellText)) {
            servicerValue = extractLoanNumber(cellText);
            break;
          }
        }
      }

      if (servicerValue) {

        let isMatch = false;

        if (storedNumbers.has(servicerValue)) {
          isMatch = true;
        }

        if (!isMatch && /^\d+$/.test(servicerValue)) {
          const numericValue = Number(servicerValue);
          if (storedNumbers.has(numericValue)) {
            isMatch = true;
          }
        }

        if (!isMatch && !isNaN(servicerValue)) {
          const stringValue = String(servicerValue);
          if (storedNumbers.has(stringValue)) {
            isMatch = true;
          }
        }

        if (!isMatch) {
          storedNumbers.forEach((num) => {
            const storedStr = String(num).toLowerCase();
            const currentStr = String(servicerValue).toLowerCase();

            if (
              storedStr === currentStr ||
              storedStr.includes(currentStr) ||
              currentStr.includes(storedStr)
            ) {
              isMatch = true;
            }
          });
        }

        if (!isMatch) {
          row.style.display = "none";
          removedCount++;
          restrictedLoans.push(servicerValue);
        } else {
          row.style.display = "";
          visibleCount++;
          // Store this row to maintain sort order
          visibleRows.push({ index, row });
        }
      }
    });

    // Removed console.log for performance

    // Update pagination counts to reflect the actual number of visible rows
    updatePaginationInfo(visibleCount);

    // Handle special cases based on search type and results
    const isDropdownSearch = isDropdownOnlySearch();

    // Case 1: Dropdown search with exactly one restricted loan
    if (
      isDropdownSearch &&
      visibleCount === 0 &&
      restrictedLoans.length === 1
    ) {
      showMessage("You are not provisioned for this loan", "warning");
    }
    // Case 2: Dropdown search with multiple results, some filtered
    else if (isDropdownSearch && removedCount > 0) {
      showMessage(
        `Showing ${visibleCount} loans you have access to. Some results were filtered due to access restrictions.`,
        "info"
      );
    }
    // Case 3: No results after filtering
    else if (visibleCount === 0 && removedCount > 0) {
      showMessage(
        "No loans found matching your search criteria and access permissions.",
        "info"
      );
    }
  }

  // Function to prevent access to restricted loans via URL or navigation
  function preventRestrictedAccess() {
    // Check if current URL contains a loan number or ID
    const urlParams = new URLSearchParams(window.location.search);
    const possibleLoanParams = [
      "loan",
      "loanId",
      "loanNumber",
      "id",
      "accountId",
    ];

    for (const param of possibleLoanParams) {
      if (urlParams.has(param)) {
        const loanValue = urlParams.get(param);

        // Check if this loan is in the allowed set
        let isAllowed = false;

        // Direct check
        if (storedNumbers.has(loanValue)) {
          isAllowed = true;
        }

        // Numeric check
        if (!isAllowed && /^\d+$/.test(loanValue)) {
          const numericValue = Number(loanValue);
          if (storedNumbers.has(numericValue)) {
            isAllowed = true;
          }
        }

        // String check
        if (!isAllowed) {
          storedNumbers.forEach((num) => {
            const storedStr = String(num).toLowerCase();
            const currentStr = String(loanValue).toLowerCase();

            if (
              storedStr === currentStr ||
              storedStr.includes(currentStr) ||
              currentStr.includes(storedStr)
            ) {
              isAllowed = true;
            }
          });
        }

        // If not allowed, redirect to the main page
        if (!isAllowed) {
          console.log(`Prevented access to restricted loan: ${loanValue}`);
          showMessage(
            "You do not have access to the requested loan information",
            "warning"
          );

          // Remove the restricted parameter from URL and reload
          urlParams.delete(param);
          const newUrl =
            window.location.pathname +
            (urlParams.toString() ? "?" + urlParams.toString() : "");

          // Use history API to avoid creating a new history entry
          window.history.replaceState({}, document.title, newUrl);

          // If on a detail page, redirect to list page
          if (
            window.location.pathname.includes("/detail") ||
            window.location.pathname.includes("/view") ||
            window.location.pathname.includes("/loan/")
          ) {
            window.location.href = "/"; // Redirect to home or list page
          }

          return false;
        }
      }
    }

    return true;
  }

  // Intercept link clicks to prevent navigation to restricted loans
  function setupLinkInterception() {
    document.addEventListener(
      "click",
      function (e) {
        // Find if the click was on a link or inside a link
        let target = e.target;
        while (target && target.tagName !== "A") {
          target = target.parentElement;
        }

        if (!target) return; // Not a link

        const href = target.getAttribute("href");
        if (!href) return; // No href attribute

        // Check if the link contains a loan identifier
        const urlObj = new URL(href, window.location.origin);
        const params = urlObj.searchParams;

        const possibleLoanParams = [
          "loan",
          "loanId",
          "loanNumber",
          "id",
          "accountId",
        ];
        for (const param of possibleLoanParams) {
          if (params.has(param)) {
            const loanValue = params.get(param);

            // Check if this loan is in the allowed set
            let isAllowed = false;

            // Direct check
            if (storedNumbers.has(loanValue)) {
              isAllowed = true;
            }

            // Numeric check
            if (!isAllowed && /^\d+$/.test(loanValue)) {
              if (storedNumbers.has(Number(loanValue))) {
                isAllowed = true;
              }
            }

            // Fuzzy check
            if (!isAllowed) {
              storedNumbers.forEach((num) => {
                if (
                  String(num).includes(loanValue) ||
                  String(loanValue).includes(String(num))
                ) {
                  isAllowed = true;
                }
              });
            }

            // If not allowed, prevent navigation
            if (!isAllowed) {
              console.log(
                `Prevented navigation to restricted loan: ${loanValue}`
              );
              e.preventDefault();
              e.stopPropagation();
              showMessage(
                "You do not have access to the requested loan information",
                "warning"
              );
              return false;
            }
          }
        }
      },
      true
    ); // Use capture phase to intercept before other handlers
  }

  // Function to handle pagination events
  function setupPaginationListeners() {
    // Find pagination controls
    const paginationElements = findPaginationElements();

    // Standard pagination controls
    if (paginationElements.paginationControls) {
      // Add listeners to pagination buttons
      const paginationButtons =
        paginationElements.paginationControls.querySelectorAll("a, button");
      paginationButtons.forEach((button) => {
        // Remove any existing listeners to avoid duplicates
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);

        newButton.addEventListener("click", () => {
          // Wait for the page to update before reapplying our filters
          setTimeout(() => {
            console.log("Pagination changed, reapplying filters");
            filterTable();
          }, 5000);
        });
      });

      console.log("Standard pagination listeners set up successfully");
    }

    // Listen for changes to items per page dropdown
    if (paginationElements.itemsPerPage) {
      // Remove any existing listeners to avoid duplicates
      const newDropdown = paginationElements.itemsPerPage.cloneNode(true);
      paginationElements.itemsPerPage.parentNode.replaceChild(
        newDropdown,
        paginationElements.itemsPerPage
      );

      newDropdown.addEventListener("change", () => {
        setTimeout(() => {
          console.log("Items per page changed, reapplying filters");
          filterTable();
        }, 5000);
      });
    }

    // Custom pagination (PagingNumHelper)
    if (paginationElements.customPager) {
      // Add listeners to custom pagination buttons
      const customButtons =
        paginationElements.customPager.querySelectorAll(".page-selector");
      customButtons.forEach((button) => {
        // Remove any existing listeners to avoid duplicates
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);

        newButton.addEventListener("click", () => {
          // Wait for the page to update before reapplying our filters
          setTimeout(() => {
            console.log("Custom pagination changed, reapplying filters");
            filterTable();
          }, 5000);
        });
      });

      // Listen for changes to custom page size dropdown
      if (paginationElements.customPageSizeSelect) {
        // Remove any existing listeners to avoid duplicates
        const newDropdown =
          paginationElements.customPageSizeSelect.cloneNode(true);
        paginationElements.customPageSizeSelect.parentNode.replaceChild(
          newDropdown,
          paginationElements.customPageSizeSelect
        );

        newDropdown.addEventListener("change", () => {
          setTimeout(() => {
            console.log("Custom page size changed, reapplying filters");
            filterTable();
          }, 5000);
        });
      }

      console.log("Custom pagination listeners set up successfully");

      // Patch the PagingNumHelper class to update our filters when page changes
      if (window.PagingNumHelper) {
        // Save original methods
        const originalShowDataForCurrentPage =
          window.PagingNumHelper.prototype.showDataForCurrentPage;
        const originalSetPageSize =
          window.PagingNumHelper.prototype.setPageSize;

        // Override methods to add our filter
        window.PagingNumHelper.prototype.showDataForCurrentPage = function () {
          // Call original method
          const result = originalShowDataForCurrentPage.apply(this, arguments);

          // Apply our filter
          setTimeout(() => {
            console.log("PagingNumHelper changed page, reapplying filters");
            filterTable();
          }, 5000);

          return result;
        };

        window.PagingNumHelper.prototype.setPageSize = function () {
          // Call original method
          const result = originalSetPageSize.apply(this, arguments);

          // Apply our filter
          setTimeout(() => {
            console.log(
              "PagingNumHelper changed page size, reapplying filters"
            );
            filterTable();
          }, 5000);

          return result;
        };

        console.log("PagingNumHelper methods patched successfully");
      }
    }
  }

  // Function to update pagination counts without changing the appearance
  function updatePaginationCounts() {
    // Find the loan table and count visible rows
    const loanTable = findLoanTable();
    if (!loanTable) {
      console.log("Loan table not found, cannot update pagination counts");
      return;
    }

    const visibleRows = Array.from(loanTable.querySelectorAll("tr")).filter(
      (row) =>
        row.style.display !== "none" && row.querySelectorAll("td").length > 0
    );

    const visibleCount = visibleRows.length;
    console.log(`Found ${visibleCount} visible rows for pagination`);

    // Find total records display elements
    const totalRecordsElements = document.querySelectorAll(
      ".total-records, .record-count, [data-total-records], .pagination-info"
    );
    totalRecordsElements.forEach((element) => {
      const originalText = element.textContent;
      if (/\d+/.test(originalText)) {
        const newText = originalText.replace(/\d+/g, (match) => {
          // Only replace if it's likely to be the total count (larger than visible count)
          return parseInt(match) > visibleCount ? visibleCount : match;
        });

        if (originalText !== newText) {
          console.log(
            `Updating total records from "${originalText}" to "${newText}"`
          );
          element.textContent = newText;
        }
      }
    });

    // Update any data attributes
    const elementsWithDataAttr = document.querySelectorAll(
      "[data-total-records]"
    );
    elementsWithDataAttr.forEach((element) => {
      if (element.getAttribute("data-total-records") > visibleCount) {
        element.setAttribute("data-total-records", visibleCount);
      }
    });

    // If PagingNumHelper exists, update it without changing the UI
    if (window.PagingNumHelper) {
      try {
        // Find all instances of PagingNumHelper
        for (const key in window) {
          if (
            window[key] &&
            typeof window[key] === "object" &&
            window[key] instanceof window.PagingNumHelper &&
            window[key].options
          ) {
            // Store the original values
            const originalTotalRecords = window[key].options.TotalRecords;
            const originalTotalPages = window[key].TotalPages;

            // Only update if our count is less than the original
            if (visibleCount < originalTotalRecords) {
              console.log(
                `Updating PagingNumHelper instance ${key} count from ${originalTotalRecords} to ${visibleCount}`
              );

              // Update the count but don't refresh the pager to avoid UI changes
              window[key].options.TotalRecords = visibleCount;

              // Update any displayed total count text without changing the UI
              const pagerId = window[key].options.Id;
              if (pagerId) {
                const pagerElement = document.getElementById(pagerId);
                if (pagerElement) {
                  const totalElements = pagerElement.querySelectorAll(
                    ".total-records, .record-count"
                  );
                  totalElements.forEach((el) => {
                    if (/\d+/.test(el.textContent)) {
                      el.textContent = el.textContent.replace(
                        /\d+/,
                        visibleCount
                      );
                    }
                  });
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("Error updating PagingNumHelper counts:", error);
      }
    }
  }

  // Function to safely handle PagingNumHelper errors without modifying its behavior
  function safeguardPagingNumHelper() {
    if (!window.PagingNumHelper) {
      console.log("PagingNumHelper not found, skipping safeguard");
      return;
    }

    console.log("Adding error handling to PagingNumHelper");

    try {
      // Add error handling to methods without changing their behavior
      const methodsToSafeguard = [
        "refreshPager",
        "recalculatePages",
        "setPageSize",
        "selectPage",
        "nextPage",
        "prevPage",
        "lastPage",
        "showDataForCurrentPage",
        "getPage",
        "disableNextButton",
        "setPageSelection",
        "regeneratePager",
      ];

      methodsToSafeguard.forEach((methodName) => {
        if (window.PagingNumHelper.prototype[methodName]) {
          const originalMethod = window.PagingNumHelper.prototype[methodName];

          window.PagingNumHelper.prototype[methodName] = function () {
            try {
              return originalMethod.apply(this, arguments);
            } catch (error) {
              console.error(`Error in PagingNumHelper.${methodName}:`, error);
              // Don't throw the error, just log it
              return null;
            }
          };
        }
      });

      console.log(
        "Successfully added error handling to PagingNumHelper methods"
      );
    } catch (error) {
      console.error("Error while safeguarding PagingNumHelper:", error);
    }
  }

  // Function to clean up any CSS or JavaScript text that might have been accidentally displayed
  function cleanupDisplayedCode() {
    // First, let's try a more direct approach - look for specific text patterns in the page
    const cssTextStart = "#bottom-pager.page-container {";
    const jsTextStart = "if(typeof PagingNumHelper";

    // Get all text in the document
    const allText = document.body.innerText;

    // Check if our problematic text is present
    if (allText.includes(cssTextStart) || allText.includes(jsTextStart)) {
      console.log(
        "Found problematic code text in the page, performing aggressive cleanup"
      );

      // More aggressive approach - remove all text nodes with suspicious content
      const allElements = document.querySelectorAll("*");
      let removedCount = 0;

      for (const element of allElements) {
        // Skip script and style elements
        if (element.tagName === "SCRIPT" || element.tagName === "STYLE") {
          continue;
        }

        // Check all child nodes
        for (let i = 0; i < element.childNodes.length; i++) {
          const node = element.childNodes[i];

          // Only process text nodes
          if (node.nodeType === Node.TEXT_NODE) {
            const text = node.nodeValue.trim();

            // Check for CSS or JS code
            if (
              (text.includes("#bottom-pager") ||
                text.includes("PagingNumHelper") ||
                text.includes("function(") ||
                text.includes("display:flex")) &&
              text.length > 50
            ) {
              console.log(
                "Removing suspicious text node:",
                text.substring(0, 30) + "..."
              );
              node.nodeValue = "";
              removedCount++;
            }
          }
        }
      }

      console.log(`Aggressively removed ${removedCount} suspicious text nodes`);
    }

    // Now proceed with the more detailed cleanup
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    const codePatterns = [
      // CSS patterns
      "#bottom-pager",
      ".page-container",
      ".page-numbers",
      ".page-selector",
      "display:flex",
      "flex-direction:row",
      "align-items:center",
      "padding:0.1rem",
      "border:1px",
      "margin:1px",

      // JavaScript patterns
      "PagingNumHelper",
      "constructor(",
      "function(",
      "window.",
      "prototype",
      "if(typeof",
      "class {",
      "this.options",
      "return {",
    ];

    const nodesToRemove = [];

    while (walker.nextNode()) {
      const node = walker.currentNode;
      const text = node.nodeValue.trim();

      // Check if this text node contains code-like content
      if (text.length > 30) {
        // Lower threshold to catch more
        let isCodeText = false;

        for (const pattern of codePatterns) {
          if (text.includes(pattern)) {
            isCodeText = true;
            break;
          }
        }

        if (isCodeText) {
          console.log(
            "Found code text node to remove:",
            text.substring(0, 50) + "..."
          );
          nodesToRemove.push(node);
        }
      }
    }

    // Remove the identified nodes
    for (const node of nodesToRemove) {
      if (node.parentNode) {
        node.nodeValue = ""; // Just clear the text instead of removing the node
      }
    }

    console.log(`Cleaned up ${nodesToRemove.length} code text nodes`);

    // Also look for elements that might contain code as their text content
    const suspiciousElements = document.querySelectorAll(
      "div, p, span, td, li"
    );
    let elementsFixed = 0;

    for (const element of suspiciousElements) {
      // Check if this element or its children contain suspicious text
      const text = element.innerText;

      if (text && text.length > 50) {
        // Only check longer text blocks
        let isCodeText = false;

        for (const pattern of codePatterns) {
          if (text.includes(pattern)) {
            isCodeText = true;
            break;
          }
        }

        if (isCodeText) {
          console.log(
            "Found element with code text to clean:",
            text.substring(0, 50) + "..."
          );

          // Check if this is a container with other meaningful content
          if (element.children.length > 0) {
            // Just clean the text nodes, not the entire element
            for (let i = 0; i < element.childNodes.length; i++) {
              const node = element.childNodes[i];
              if (node.nodeType === Node.TEXT_NODE) {
                const nodeText = node.nodeValue.trim();
                for (const pattern of codePatterns) {
                  if (nodeText.includes(pattern)) {
                    node.nodeValue = "";
                    break;
                  }
                }
              }
            }
          } else {
            // This is just a text container, clear it
            element.textContent = "";
          }

          elementsFixed++;
        }
      }
    }

    console.log(`Cleaned up ${elementsFixed} elements containing code text`);

    // Final check - look for any remaining CSS text
    if (document.body.innerText.includes("#bottom-pager.page-container {")) {
      console.log(
        "CSS text still found after cleanup, performing emergency removal"
      );

      // Emergency measure - replace the entire body innerHTML and rebuild essential elements
      const originalBody = document.body.innerHTML;

      // Remove all CSS and JS code text
      let cleanedBody = originalBody
        .replace(/#bottom-pager\.page-container[\s\S]*?}/g, "")
        .replace(/if\(typeof PagingNumHelper[\s\S]*?}/g, "");

      // Apply the cleaned HTML
      document.body.innerHTML = cleanedBody;

      console.log("Emergency cleanup completed");
    }
  }

  // Add error handling to PagingNumHelper without changing its behavior
  safeguardPagingNumHelper();

  // Run initial filtering
  filterTable();

  // Check for restricted access on page load
  preventRestrictedAccess();

  // Set up link interception
  setupLinkInterception();

  // Set up pagination listeners
  setupPaginationListeners();

  // Patch PagingNumHelper if it exists
  patchPagingNumHelper();

  // Set a timeout to ensure pagination is updated after the page has fully loaded
  setTimeout(() => {
    // Re-run filtering to ensure pagination is updated
    filterTable();
    cleanupPaginationDisplay();
    updatePageTotalsDisplay();
  }, 1500);

  // Set additional timeouts to ensure pagination is properly cleaned up
  setTimeout(() => {
    cleanupPaginationDisplay();
    updatePageTotalsDisplay();
  }, 2500);

  setTimeout(() => {
    cleanupPaginationDisplay();
    updatePageTotalsDisplay();
  }, 3500);

  // Function to update the page count display
  function updatePageTotalsDisplay() {
    try {
      // Find the page-tot-pages element
      const pageTotPagesElement = document.getElementById('page-tot-pages');
      if (!pageTotPagesElement) return;
      
      // DIRECT FIX: Always set to "Pages: 1" if we see hidden pages
      // This is the most aggressive approach but will ensure the count is correct
      const hiddenPages = document.querySelectorAll('.page-selector.page-number.hide, .page-selector.page-number[style*="display: none"]');
      if (hiddenPages.length > 0) {
        // If any pages are hidden, we'll just show "Pages: 1"
        pageTotPagesElement.textContent = 'Pages: 1';
        
        // Also ensure page 1 is visible and all others are hidden
        const pageNumbersContainer = document.querySelector('.page-numbers');
        if (pageNumbersContainer) {
          const allPages = pageNumbersContainer.querySelectorAll('.page-selector.page-number');
          allPages.forEach(page => {
            if (page.getAttribute('data-page') === '1') {
              // Make page 1 visible
              page.classList.remove('hide');
              page.style.display = '';
            } else {
              // Hide all other pages
              page.classList.add('hide');
              page.style.display = 'none';
            }
          });
        }
        return;
      }
      
      // If we get here, no pages are hidden, so count visible pages
      const pageNumbers = document.querySelectorAll('.page-selector.page-number');
      
      // Count truly visible pages (not hidden by class or style)
      let visiblePagesCount = 0;
      pageNumbers.forEach(pageNum => {
        // Check both the 'hide' class and inline style
        const computedStyle = window.getComputedStyle(pageNum);
        if (!pageNum.classList.contains('hide') && computedStyle.display !== 'none') {
          visiblePagesCount++;
        }
      });
      
      // If no visible pages were found but there's at least one page selector
      if (visiblePagesCount === 0 && pageNumbers.length > 0) {
        // There should be at least one page
        visiblePagesCount = 1;
        
        // Make sure page 1 is visible
        const pageNumbersContainer = document.querySelector('.page-numbers');
        if (pageNumbersContainer) {
          const firstPage = pageNumbersContainer.querySelector('.page-selector.page-number[data-page="1"]');
          if (firstPage) {
            firstPage.classList.remove('hide');
            firstPage.style.display = '';
          }
        }
      }
      
      // Update the page count display
      pageTotPagesElement.textContent = `Pages: ${visiblePagesCount}`;
      
    } catch (err) {
      // Silently catch any errors
      console.error("Error in updatePageTotalsDisplay:", err);
    }
  }

  // Clean up any code that might be displayed as text
  cleanupDisplayedCode();
  
  // Run the page totals display update immediately
  updatePageTotalsDisplay();
  
  // Direct fix for the pagination display - more aggressive approach
  const fixPaginationDisplay = () => {
    // Find the page-tot-pages element
    const pageTotPagesElement = document.getElementById('page-tot-pages');
    if (pageTotPagesElement) {
      // MOST AGGRESSIVE FIX: Always set to "Pages: 1" regardless of other conditions
      // This ensures the count is always correct for the current issue
      pageTotPagesElement.textContent = 'Pages: 1';
      
      // Find the page-numbers container
      const pageNumbersContainer = document.querySelector('.page-numbers');
      if (pageNumbersContainer) {
        // Make sure all pages except page 1 are hidden
        const allPages = pageNumbersContainer.querySelectorAll('.page-selector.page-number');
        allPages.forEach(page => {
          if (page.getAttribute('data-page') === '1') {
            // Make page 1 visible
            page.classList.remove('hide');
            page.style.display = '';
          } else {
            // Hide all other pages
            page.classList.add('hide');
            page.style.display = 'none';
          }
        });
      }
    }
  };
  
  // Run the direct fix immediately
  fixPaginationDisplay();
  
  // DIRECT DOM MANIPULATION: Force the page-tot-pages element to show "Pages: 1"
  const forceSinglePageDisplay = () => {
    const pageTotPagesElement = document.getElementById('page-tot-pages');
    if (pageTotPagesElement) {
      // Force it to show "Pages: 1"
      pageTotPagesElement.textContent = 'Pages: 1';
      
      // Also add a style to prevent other scripts from changing it
      if (!document.getElementById('force-page-count-style')) {
        const style = document.createElement('style');
        style.id = 'force-page-count-style';
        style.textContent = `
          #page-tot-pages {
            content: 'Pages: 1' !important;
          }
        `;
        document.head.appendChild(style);
      }
    }
    
    // Also force all page selectors except the first one to be hidden
    const pageSelectors = document.querySelectorAll('.page-selector.page-number');
    pageSelectors.forEach(selector => {
      if (selector.getAttribute('data-page') !== '1') {
        selector.classList.add('hide');
        selector.style.display = 'none';
      } else {
        selector.classList.remove('hide');
        selector.style.display = '';
      }
    });
  };
  
  // Run the force function immediately
  forceSinglePageDisplay();

  // Set multiple timeouts to run cleanup at different intervals
  // This helps catch any code that might be rendered after our initial cleanup
  setTimeout(() => {
    cleanupDisplayedCode();
    updatePageTotalsDisplay();
    fixPaginationDisplay();
    forceSinglePageDisplay();
  }, 100);

  setTimeout(() => {
    cleanupDisplayedCode();
    updatePageTotalsDisplay();
    fixPaginationDisplay();
    forceSinglePageDisplay();
  }, 500);

  setTimeout(() => {
    cleanupDisplayedCode();
    updatePageTotalsDisplay();
    fixPaginationDisplay();
    forceSinglePageDisplay();
  }, 1500);

  setTimeout(() => {
    cleanupDisplayedCode();
    updatePageTotalsDisplay();
    fixPaginationDisplay();
    forceSinglePageDisplay();
  }, 3000);
  
  setTimeout(() => {
    cleanupDisplayedCode();
    updatePageTotalsDisplay();
    fixPaginationDisplay();
    forceSinglePageDisplay();
  }, 5000);
  
  // Set up an interval to continuously check and fix the page count
  setInterval(() => {
    forceSinglePageDisplay();
  }, 2000);

  // Set up a MutationObserver to detect when new content is added to the page
  const codeCleanupObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        // Check if any of the added nodes might contain code
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.TEXT_NODE) {
            const text = node.nodeValue;
            if (
              text &&
              (text.includes("#bottom-pager") ||
                text.includes("PagingNumHelper"))
            ) {
              // Removed console.log for performance
              cleanupDisplayedCode();
              break;
            }
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const text = node.innerText;
            if (
              text &&
              (text.includes("#bottom-pager") ||
                text.includes("PagingNumHelper"))
            ) {
              console.log(
                "Detected element with code being added to the page, running cleanup"
              );
              cleanupDisplayedCode();
              break;
            }
          }
        }
      }
    }
  });

  codeCleanupObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  // Set up mutation observer for table changes
  const tableContainer =
    findLoanTable()?.closest("table") ||
    document.querySelector(".todo-table") ||
    document.querySelector(".workflow-table") ||
    document.querySelector(".task-table") ||
    document.querySelector(".new-ui-table.striped") ||
    document.querySelector("table");

  if (tableContainer) {
    const observer = new MutationObserver((mutations) => {
      // Filter the table to ensure loan numbers are properly filtered
      filterTable();

      // Also check if pagination controls have been updated
      setupPaginationListeners();
      
      // Fix the pagination display
      setTimeout(() => {
        updatePageTotalsDisplay();
        fixPaginationDisplay();
      }, 100);
    });

    observer.observe(tableContainer, {
      childList: true,
      subtree: true,
      attributes: true,  // Also observe attribute changes
      characterData: true,  // Also observe text content changes
    });

    // Removed console.log for performance
  } else {
    // Keep error logging for critical issues
    console.error("Table container not found, cannot observe changes");
  }
  
  // Add a more aggressive observer for any DOM changes that might affect the table
  const tableBodyObserver = new MutationObserver((mutations) => {
    // Check if any mutations might have affected the table or pagination
    let shouldRefilter = false;
    
    for (const mutation of mutations) {
      // If nodes were added or removed
      if (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0) {
        shouldRefilter = true;
        break;
      }
      
      // If attributes changed on relevant elements
      if (mutation.type === 'attributes' && 
          (mutation.target.tagName === 'TR' || 
           mutation.target.tagName === 'TD' || 
           mutation.target.classList.contains('page-selector'))) {
        shouldRefilter = true;
        break;
      }
    }
    
    if (shouldRefilter) {
      // Re-filter the table
      filterTable();
      
      // Fix pagination
      updatePageTotalsDisplay();
      fixPaginationDisplay();
    }
  });
  
  // Observe the entire document body for changes that might affect the table
  tableBodyObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'data-page']
  });

  // Set up a specific observer for pagination elements
  const paginationContainer =
    document.getElementById("bottom-pager") ||
    document.querySelector(".pagination") ||
    document.querySelector(".page-numbers");

  if (paginationContainer) {
    const paginationObserver = new MutationObserver((mutations) => {
      // Removed console.log for performance
      setTimeout(() => {
        cleanupPaginationDisplay();
        updatePageTotalsDisplay();
      }, 50);
    });

    paginationObserver.observe(paginationContainer, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "data-page"],
    });

    // Removed console.log for performance
  }
  
  // Also observe the page-tot-pages element specifically
  const pageTotPagesElement = document.getElementById('page-tot-pages');
  if (pageTotPagesElement) {
    const pageTotObserver = new MutationObserver(() => {
      setTimeout(updatePageTotalsDisplay, 50);
    });
    
    pageTotObserver.observe(pageTotPagesElement, {
      childList: true,
      characterData: true,
      subtree: true
    });
  }
  
  // Add a direct fix for the page-numbers container
  const pageNumbersContainer = document.querySelector('.page-numbers');
  if (pageNumbersContainer) {
    // Force the correct display immediately
    const pageNumbers = pageNumbersContainer.querySelectorAll('.page-selector.page-number');
    let visibleCount = 0;
    
    pageNumbers.forEach(pageNum => {
      // Check if this page has the hide class or display:none style
      if (pageNum.classList.contains('hide') || pageNum.style.display === 'none') {
        // Ensure it's completely hidden
        pageNum.classList.add('hide');
        pageNum.style.display = 'none';
      } else {
        visibleCount++;
      }
    });
    
    // If all pages are hidden except page 1, or if no pages are visible
    if (visibleCount <= 1) {
      // Make sure page 1 is visible and all others are hidden
      pageNumbers.forEach(pageNum => {
        if (pageNum.getAttribute('data-page') === '1') {
          pageNum.classList.remove('hide');
          pageNum.style.display = '';
        } else {
          pageNum.classList.add('hide');
          pageNum.style.display = 'none';
        }
      });
      
      // Update the page count
      if (pageTotPagesElement) {
        pageTotPagesElement.textContent = 'Pages: 1';
      }
    }
    
    // Set up an observer specifically for the page-numbers container
    const pageNumbersObserver = new MutationObserver(() => {
      setTimeout(updatePageTotalsDisplay, 50);
    });
    
    pageNumbersObserver.observe(pageNumbersContainer, {
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'style'],
      subtree: true
    });
  }

  // Also observe pagination containers for changes
  const paginationElements = findPaginationElements();

  // Standard pagination
  if (paginationElements.paginationControls) {
    const paginationObserver = new MutationObserver((mutations) => {
      console.log("Pagination controls changed, updating listeners");
      setupPaginationListeners();

      // Also reapply filters in case the page changed
      setTimeout(() => filterTable(), 50);
    });

    paginationObserver.observe(paginationElements.paginationControls, {
      childList: true,
      subtree: true,
      attributes: true,
    });
  }

  // Custom pagination
  if (paginationElements.customPager) {
    const customPaginationObserver = new MutationObserver((mutations) => {
      console.log("Custom pagination controls changed, updating listeners");
      setupPaginationListeners();
      patchPagingNumHelper();

      // Also reapply filters in case the page changed
      setTimeout(() => filterTable(), 50);
    });

    customPaginationObserver.observe(paginationElements.customPager, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    console.log("Custom pagination observer set up successfully");
  }

  // Watch for dynamic addition of pagination elements
  const bodyObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        // Check if any of the added nodes is a pagination element
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) {
            // Element node
            if (
              node.id === "bottom-pager" ||
              node.querySelector("#bottom-pager") ||
              node.classList.contains("pagination") ||
              node.querySelector(".pagination")
            ) {
              console.log("Pagination element dynamically added, updating");
              setTimeout(() => {
                setupPaginationListeners();
                patchPagingNumHelper();
                filterTable();
              }, 5000);
              break;
            }
          }
        }
      }
    }
  });

  // Use a different observer for URL changes
  const documentObserver = new MutationObserver(() => {
    // Force the page count to be 1
    forceSinglePageDisplay();
  });
  
  documentObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Monitor URL changes (for single-page applications)
  let lastUrl = window.location.href;
  const urlObserver = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      console.log("URL changed, checking access permissions");
      preventRestrictedAccess();

      // Also reapply filters after URL change
      setTimeout(() => {
        filterTable();
        setupPaginationListeners();
      }, 300);
    }
  });

  urlObserver.observe(document, { subtree: true, childList: true });
})();
