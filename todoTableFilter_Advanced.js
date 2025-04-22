(function () {
  // Reduce initial console logging
  if (!window.storedNumbersSet || !(window.storedNumbersSet instanceof Set)) {
    console.error("window.storedNumbersSet is not defined or not a Set object");
    return;
  }

  const storedNumbers = window.storedNumbersSet;
  
  // Keep minimal logging for debugging
  const DEBUG_MODE = true;
  
  function logDebug(...args) {
    if (DEBUG_MODE) {
      console.log("[TodoFilter]", ...args);
    }
  }
  
  logDebug(`Loaded storedNumbersSet with ${storedNumbers.size} entries`);
  
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
  function waitForElement(selector, callback, maxAttempts = 10, interval = 500) {
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
        console.error(`Failed to find element: ${selector} after ${maxAttempts} attempts`);
      }
    };
    
    checkElement();
  }

  // Enhanced function to find the loan table with more selectors for Advanced version
  function findLoanTable() {
    // Log all tables for debugging
    const allTables = document.querySelectorAll("table");
    logDebug(`Found ${allTables.length} tables on the page`);
    
    // Try to identify tables by their structure or content
    for (let i = 0; i < allTables.length; i++) {
      const table = allTables[i];
      logDebug(`Table ${i} - ID: ${table.id}, Class: ${table.className}`);
      
      // Check if this table contains loan-related data
      const headerRow = table.querySelector("thead tr") || table.querySelector("tr:first-child");
      if (headerRow) {
        const headerCells = headerRow.querySelectorAll("th, td");
        let headerTexts = [];
        headerCells.forEach(cell => headerTexts.push(cell.textContent.trim()));
        logDebug(`Table ${i} headers: ${headerTexts.join(", ")}`);
        
        // Check if headers contain loan-related terms
        const loanRelatedHeaders = ["Loan", "Account", "Servicer", "ID", "Task", "Queue", "Status"];
        const hasLoanHeaders = loanRelatedHeaders.some(term => 
          headerTexts.some(text => text.includes(term))
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
      document.querySelector("table tbody")
    ];

    for (const table of possibleTables) {
      if (table) {
        logDebug(`Found table using selector: ${table.parentElement.className || table.parentElement.id}`);
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
      "Reference Number"
    ];

    for (let i = 0; i < headerCells.length; i++) {
      const headerText = headerCells[i].textContent.trim();
      logDebug(`Header ${i}: "${headerText}"`);

      for (const possibleHeader of possibleHeaders) {
        if (headerText.includes(possibleHeader)) {
          logDebug(`Found potential loan number column: "${headerText}" at index ${i}`);
          return i;
        }
      }
    }

    // If no exact match, look for any header that might contain numeric IDs
    for (let i = 0; i < headerCells.length; i++) {
      const headerText = headerCells[i].textContent.trim().toLowerCase();
      if (headerText.includes("id") || headerText.includes("number") || headerText.includes("#")) {
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
    const labelMatch = /(?:Servicer|Loan|Account|ID|Task|Reference)(?:\s*#|\s*:|\s*Number|\s*ID)?\s*([^\s,;]+)/i.exec(text);
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

  // Enhanced function to find pagination elements
  function findPaginationElements() {
    // Common selectors for pagination elements
    const elements = {
      // Standard pagination elements
      totalRecords: document.querySelector(
        ".total-records, .record-count, .pagination-info, [data-total-records], .showing-entries"
      ),
      pageCount: document.querySelector(
        ".page-count, .pagination-pages, [data-page-count], #page-tot-pages"
      ),
      paginationControls: document.querySelector(
        ".pagination, .pager, nav.pagination-nav, .pagination-container, .paging-control"
      ),
      itemsPerPage: document.querySelector(
        "select.items-per-page, select.page-size, [data-items-per-page], .page-size-select, select[name='pageSize']"
      ),
      currentPage: document.querySelector(
        ".current-page, .active-page, [data-current-page], .page-number.selected"
      ),

      // Custom pagination elements
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
        } else if (
          text.includes("showing") && 
          (text.includes("entries") || text.includes("records"))
        ) {
          elements.totalRecords = el;
        }
      }
    }

    logDebug("Pagination elements found:", 
      Object.keys(elements).filter(key => elements[key] !== null && elements[key] !== undefined)
    );

    return elements;
  }

  // Function to update pagination information
  function updatePaginationInfo(visibleCount) {
    const paginationElements = findPaginationElements();
    
    logDebug(`Updating pagination for ${visibleCount} visible rows`);

    // Update total records count for standard pagination
    if (paginationElements.totalRecords) {
      const originalText = paginationElements.totalRecords.textContent;
      
      // Different patterns for different pagination formats
      let newText = originalText;
      
      // Pattern: "Total: X records"
      if (/Total:\s*\d+\s*records?/i.test(originalText)) {
        newText = originalText.replace(/\d+(?=\s*records?)/, visibleCount);
      } 
      // Pattern: "Showing X entries"
      else if (/Showing\s+\d+\s+entries/i.test(originalText)) {
        newText = originalText.replace(/\d+(?=\s+entries)/, visibleCount);
      }
      // Pattern: "X records"
      else if (/\d+\s*records?/i.test(originalText)) {
        newText = originalText.replace(/\d+(?=\s*records?)/, visibleCount);
      }
      // Pattern: "Showing 1-10 of X entries"
      else if (/Showing\s+\d+\s*-\s*\d+\s+of\s+\d+/i.test(originalText)) {
        newText = originalText.replace(/of\s+\d+/, `of ${visibleCount}`);
      }
      // Pattern: "X items"
      else if (/\d+\s*items?/i.test(originalText)) {
        newText = originalText.replace(/\d+(?=\s*items?)/, visibleCount);
      }
      // Generic number replacement (last resort)
      else {
        const numbers = originalText.match(/\d+/g);
        if (numbers && numbers.length > 0) {
          // Replace the largest number (assuming it's the total)
          const largestNumber = Math.max(...numbers.map(n => parseInt(n)));
          newText = originalText.replace(new RegExp(largestNumber), visibleCount);
        }
      }

      if (originalText !== newText) {
        logDebug(`Updating total records from "${originalText}" to "${newText}"`);
        paginationElements.totalRecords.textContent = newText;

        // Also update any data attributes if they exist
        if (paginationElements.totalRecords.hasAttribute("data-total-records")) {
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
      let newText = originalText;
      
      // Pattern: "Pages: X"
      if (/Pages:\s*\d+/i.test(originalText)) {
        newText = originalText.replace(/\d+$/, totalPages);
      }
      // Pattern: "Page X of Y"
      else if (/Page\s+\d+\s+of\s+\d+/i.test(originalText)) {
        newText = originalText.replace(/of\s+\d+/, `of ${totalPages}`);
      }
      // Pattern: "X pages"
      else if (/\d+\s*pages?/i.test(originalText)) {
        newText = originalText.replace(/\d+(?=\s*pages?)/, totalPages);
      }
      // Generic number replacement (last resort)
      else {
        const numbers = originalText.match(/\d+/g);
        if (numbers && numbers.length > 0) {
          // Replace the largest number (assuming it's the total pages)
          const largestNumber = Math.max(...numbers.map(n => parseInt(n)));
          newText = originalText.replace(new RegExp(largestNumber), totalPages);
        }
      }

      if (originalText !== newText) {
        logDebug(`Updating page count from "${originalText}" to "${newText}"`);
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

        logDebug(`Updating records text from "${text}" to "${newText}"`);
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

          logDebug(`Updating page text from "${text}" to "${newText}"`);
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

        logDebug(`Updating short pagination text from "${text}" to "${newText}"`);
        el.textContent = newText;
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
      'select[name="queueType"], .queue-type-dropdown, select[name="Filter.QueueType"]'
    );
    const queueTitleEl = document.querySelector(
      'select[name="queueTitle"], .queue-title-dropdown, select[name="Filter.QueueTitle"]'
    );
    const presetDropdownEl = document.querySelector(
      'select[name="preset"], .preset-dropdown, select[name="Filter.Preset"]'
    );

    const searchParams = {
      queueType: queueTypeEl ? queueTypeEl.value : null,
      queueTitle: queueTitleEl ? queueTitleEl.value : null,
      presetDropdown: presetDropdownEl ? presetDropdownEl.value : null,
    };

    logDebug("Current search parameters:", searchParams);
    return searchParams;
  }

  // Main filtering function
  function filterTable() {
    logDebug("Starting filterTable function");
    
    const loanTable = findLoanTable();

    if (!loanTable) {
      console.error("Loan table not found");
      return;
    }

    // Update current search parameters
    const currentSearchParams = updateSearchParams();

    const rows = loanTable.querySelectorAll("tr");
    logDebug(`Found ${rows.length} rows in the table`);
    
    let removedCount = 0;
    let visibleCount = 0;
    let restrictedLoans = [];
    
    // Store original row indices to maintain sort order
    const visibleRows = [];

    const headerRow =
      loanTable.querySelector("tr:first-child") ||
      document.querySelector("thead tr");

    const servicerColumnIndex = findServicerColumnIndex(headerRow);
    logDebug(`Servicer column index: ${servicerColumnIndex}`);

    // First pass: identify which rows should be visible or hidden
    rows.forEach((row, index) => {
      let servicerValue = null;
      const cells = row.querySelectorAll("td");

      if (cells.length === 0) {
        // Skip header rows
        return;
      }

      // Try multiple methods to find the loan number
      
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
            logDebug(`Found loan number via data attribute/class: ${servicerValue}`);
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
          if (/^\d{5,}$/.test(cellText) || /Loan\s*#?\s*\d+/i.test(cellText)) {
            servicerValue = extractLoanNumber(cellText);
            if (servicerValue) {
              logDebug(`Found loan number via pattern matching: ${servicerValue}`);
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
            logDebug(`Found potential loan number via numeric pattern: ${servicerValue}`);
            break;
          }
        }
      }

      if (servicerValue) {
        let isMatch = false;

        // Direct match
        if (storedNumbers.has(servicerValue)) {
          isMatch = true;
          logDebug(`Direct match found for: ${servicerValue}`);
        }

        // Numeric match
        if (!isMatch && /^\d+$/.test(servicerValue)) {
          const numericValue = Number(servicerValue);
          if (storedNumbers.has(numericValue)) {
            isMatch = true;
            logDebug(`Numeric match found for: ${servicerValue}`);
          }
        }

        // String match
        if (!isMatch && !isNaN(servicerValue)) {
          const stringValue = String(servicerValue);
          if (storedNumbers.has(stringValue)) {
            isMatch = true;
            logDebug(`String match found for: ${servicerValue}`);
          }
        }

        // Partial match
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
              logDebug(`Partial match found: ${storedStr} contains/matches ${currentStr}`);
            }
          });
        }

        if (!isMatch) {
          row.style.display = "none";
          removedCount++;
          restrictedLoans.push(servicerValue);
          logDebug(`Hiding row with loan: ${servicerValue}`);
        } else {
          row.style.display = "";
          visibleCount++;
          // Store this row to maintain sort order
          visibleRows.push({ index, row });
          logDebug(`Showing row with loan: ${servicerValue}`);
        }
      } else {
        // If we couldn't find a loan number, keep the row visible
        row.style.display = "";
        visibleCount++;
        logDebug(`No loan number found in row ${index}, keeping visible`);
      }
    });

    logDebug(`Filtering complete: ${visibleCount} visible, ${removedCount} hidden`);

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
    
    return { visibleCount, removedCount, restrictedLoans };
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
      "taskId",
      "referenceId"
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
          logDebug(`Prevented access to restricted loan: ${loanValue}`);
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
    document.addEventListener("click", function (e) {
      // Check if the click was on a link
      let target = e.target;
      while (target && target !== document) {
        if (target.tagName === "A") {
          const href = target.getAttribute("href");
          if (href) {
            // Check if the link contains a loan ID parameter
            try {
              const url = new URL(href, window.location.origin);
              const params = url.searchParams;
              
              const possibleLoanParams = [
                "loan",
                "loanId",
                "loanNumber",
                "id",
                "accountId",
                "taskId",
                "referenceId"
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
                  
                  // If not allowed, prevent navigation
                  if (!isAllowed) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    logDebug(`Prevented navigation to restricted loan: ${loanValue}`);
                    showMessage(
                      "You do not have access to the requested loan information",
                      "warning"
                    );
                    
                    return false;
                  }
                }
              }
            } catch (err) {
              // If URL parsing fails, just continue
              logDebug("Error parsing URL:", err);
            }
          }
          break;
        }
        target = target.parentNode;
      }
    }, true);
  }

  // Function to set up pagination listeners
  function setupPaginationListeners() {
    const paginationElements = findPaginationElements();

    // Listen for changes to items per page
    if (paginationElements.itemsPerPage) {
      paginationElements.itemsPerPage.addEventListener("change", () => {
        setTimeout(() => {
          filterTable();
        }, 100);
      });
    }

    if (paginationElements.customPageSizeSelect) {
      paginationElements.customPageSizeSelect.addEventListener("change", () => {
        setTimeout(() => {
          filterTable();
        }, 100);
      });
    }

    // Listen for page navigation clicks
    const addClickListener = (element) => {
      if (!element) return;

      element.addEventListener("click", () => {
        // Wait for the page to update
        setTimeout(() => {
          filterTable();
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
      logDebug("PagingNumHelper not found, skipping patch");
      return;
    }

    logDebug("Patching PagingNumHelper");

    // Find all instances of PagingNumHelper
    for (const key in window) {
      if (window[key] instanceof window.PagingNumHelper) {
        const originalRefresh = window[key].refreshPager;

        // Patch the refreshPager method
        window[key].refreshPager = function () {
          // Call the original method
          originalRefresh.apply(this, arguments);

          // After refresh, update our filtered view
          setTimeout(() => {
            filterTable();
          }, 50);
        };

        logDebug(`Patched PagingNumHelper instance: ${key}`);
      }
    }
  }

  // Create a debounced version of filterTable
  const debouncedFilterTable = createDebouncedFunction(filterTable, 100);

  // Function to handle dynamic content loading
  function setupMutationObservers() {
    // Watch for changes to the table content
    const tableObserver = new MutationObserver((mutations) => {
      let shouldFilter = false;
      
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          shouldFilter = true;
          break;
        }
      }
      
      if (shouldFilter) {
        logDebug("Table content changed, reapplying filter");
        setTimeout(() => filterTable(), 100);
      }
    });
    
    // Find the table or its container
    const loanTable = findLoanTable();
    if (loanTable) {
      tableObserver.observe(loanTable, {
        childList: true,
        subtree: true
      });
      logDebug("Set up table content observer");
    }
    
    // Watch for changes to the pagination
    const paginationElements = findPaginationElements();
    if (paginationElements.paginationControls) {
      const paginationObserver = new MutationObserver(() => {
        logDebug("Pagination controls changed, reapplying filter");
        setTimeout(() => filterTable(), 100);
      });
      
      paginationObserver.observe(paginationElements.paginationControls, {
        childList: true,
        subtree: true,
        attributes: true
      });
      logDebug("Set up pagination observer");
    }
    
    // Watch for overall DOM changes that might indicate new content
    const bodyObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length) {
          // Check if any tables were added
          for (const node of mutation.addedNodes) {
            if (node.nodeType === 1) { // Element node
              if (node.tagName === 'TABLE' || node.querySelector('table')) {
                logDebug("New table added to DOM, reapplying filter");
                setTimeout(() => filterTable(), 300);
                break;
              }
            }
          }
        }
      }
    });
    
    bodyObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
    logDebug("Set up body observer for new tables");
  }

  // Function to wait for the page to be fully loaded
  function waitForPageLoad() {
    if (document.readyState === 'complete') {
      initializeFiltering();
    } else {
      window.addEventListener('load', initializeFiltering);
    }
  }

  // Main initialization function
  function initializeFiltering() {
    logDebug("Initializing loan filtering");
    
    // First check if we need to prevent access based on URL
    preventRestrictedAccess();
    
    // Set up link interception
    setupLinkInterception();
    
    // Try to find the loan table
    const loanTable = findLoanTable();
    
    if (loanTable) {
      logDebug("Found loan table, applying initial filter");
      filterTable();
      
      // Set up pagination listeners
      setupPaginationListeners();
      
      // Patch PagingNumHelper if it exists
      patchPagingNumHelper();
      
      // Set up mutation observers for dynamic content
      setupMutationObservers();
    } else {
      logDebug("Loan table not found, will try again later");
      
      // Wait for the table to appear
      waitForElement("table", () => {
        logDebug("Table found after waiting, applying filter");
        filterTable();
        setupPaginationListeners();
        patchPagingNumHelper();
        setupMutationObservers();
      });
    }
    
    // Set additional timeouts to ensure filtering is applied after any dynamic content loads
    setTimeout(() => {
      filterTable();
    }, 1000);
    
    setTimeout(() => {
      filterTable();
    }, 3000);
  }
  
  // Start the initialization process
  waitForPageLoad();
  
  // Expose some functions for debugging
  window.offshoreFilter = {
    filter: filterTable,
    debug: () => {
      const tables = document.querySelectorAll('table');
      console.log(`Found ${tables.length} tables on the page:`);
      tables.forEach((table, i) => {
        console.log(`Table ${i}:`, {
          id: table.id,
          class: table.className,
          rows: table.rows.length,
          headers: Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim())
        });
      });
      return "Debug info logged to console";
    }
  };
})();