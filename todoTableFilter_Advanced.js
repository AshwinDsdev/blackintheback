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
    return function (...args) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  }

  // Track if an operation is in progress to prevent overlapping executions
  let operationInProgress = false;

  // Create debounced versions of key functions to prevent multiple rapid executions
  function createDebouncedFunction(func, wait) {
    const debouncedFunc = debounce(function (...args) {
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

  // Function to update the total count display and pagination
  function updateTableInfo(visibleCount, isExactSearch = false) {
    // Find the table container
    const tableContainer = document.querySelector('.table-responsive, .table-container, .content-area');
    
    if (isExactSearch) {
      // Hide all table-related elements
      if (tableContainer) {
        tableContainer.style.display = 'none';
      }
      return;
    } else {
      // Show table container
      if (tableContainer) {
        tableContainer.style.display = '';
      }

      // Update count display
      let countDisplay = null;
      const spans = document.querySelectorAll('div span');
      for (const span of spans) {
        if (span.textContent.includes('Showing')) {
          countDisplay = span;
          break;
        }
      }

      if (countDisplay) {
        countDisplay.textContent = `Showing 1 to ${visibleCount} of ${visibleCount} entries`;
        logDebug(`Updated total count display to show ${visibleCount} entries`);
      } else {
        logDebug('Could not find count display element');
      }

      // Update pagination
      const pagination = document.querySelector('.pagination');
      if (pagination) {
        // Remove all page items except Previous and Next
        const pageItems = pagination.querySelectorAll('.page-item');
        pageItems.forEach(item => {
          if (!item.querySelector('a').textContent.includes('Previous') && 
              !item.querySelector('a').textContent.includes('Next')) {
            item.remove();
          }
        });

        // Add page numbers based on visible count
        if (visibleCount > 0) {
          const nextItem = pagination.querySelector('.page-item:last-child');
          if (nextItem) {
            // Add page 1 as active
            const page1 = document.createElement('li');
            page1.className = 'page-item active';
            const page1Link = document.createElement('a');
            page1Link.className = 'page-link';
            page1Link.href = '#';
            page1Link.textContent = '1';
            page1.appendChild(page1Link);
            nextItem.parentNode.insertBefore(page1, nextItem);

            // Update Previous button state
            const prevItem = pagination.querySelector('.page-item:first-child');
            if (prevItem) {
              prevItem.classList.add('disabled');
            }
          }
        } else {
          // If no visible items, disable both Previous and Next
          const prevItem = pagination.querySelector('.page-item:first-child');
          const nextItem = pagination.querySelector('.page-item:last-child');
          if (prevItem) prevItem.classList.add('disabled');
          if (nextItem) nextItem.classList.add('disabled');
        }
      }
    }
  }

  // Main filtering function
  function filterTable() {
    logDebug("Starting filterTable function");

    // First try to find the table by ID
    let loanTable = document.getElementById("todoTable");
    if (loanTable) {
      loanTable = loanTable.querySelector("tbody") || loanTable;
    } else {
      // If not found by ID, use the more general function
      loanTable = findLoanTable();
    }

    if (!loanTable) {
      console.error("Loan table not found");
      return;
    }

    // Store all rows in memory if not already stored
    if (!window.storedTableRows) {
      window.storedTableRows = Array.from(loanTable.querySelectorAll("tr")).filter(row => !row.querySelector("th"));
    }

    // Check if exact search is selected
    const isExactSearch = document.getElementById('Filter_LoanExactSearch')?.checked || false;
    const loanNumber = document.getElementById('Filter_LoanNumber')?.value?.trim() || '';

    // If exact search is selected, always clear the table
    if (isExactSearch) {
        // Clear the table
        while (loanTable.firstChild) {
            loanTable.removeChild(loanTable.firstChild);
        }
        // Hide table and related elements
        updateTableInfo(0, true);
        // Only show message if loan number is entered
        if (loanNumber) {
            if (storedNumbers.has(loanNumber)) {
                showMessage("Loan is provisioned to user", "info");
            } else {
                showMessage("Loan is not provisioned to user", "warning");
            }
        } else {
            showMessage("Please enter a loan number for exact search", "info");
        }
        return;
    }

    // For non-exact search, ALWAYS filter based on storedNumbersSet
    logDebug(`Found ${window.storedTableRows.length} rows in the table`);

    let removedCount = 0;
    let visibleCount = 0;
    let restrictedLoans = [];

    // Find the header row - it might be in the table or in a thead
    const headerRow =
      loanTable.closest("table").querySelector("thead tr") ||
      loanTable.closest("table").querySelector("tr:first-child");

    const servicerColumnIndex = findServicerColumnIndex(headerRow);
    logDebug(`Servicer column index: ${servicerColumnIndex}`);

    // First clear the table
    while (loanTable.firstChild) {
      loanTable.removeChild(loanTable.firstChild);
    }

    // Then add back only the rows that match
    window.storedTableRows.forEach((row, index) => {
      const cells = row.querySelectorAll("td");
      if (cells.length === 0) {
        return;
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
            logDebug(`Found loan number via data attribute/class: ${servicerValue}`);
            break;
          }
        }
      }

      // Method 2: Use the identified column index
      if (!servicerValue && servicerColumnIndex >= 0 && cells.length > servicerColumnIndex) {
        servicerValue = extractLoanNumber(cells[servicerColumnIndex].textContent);
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

        if (isMatch) {
          loanTable.appendChild(row);
          visibleCount++;
          logDebug(`Showing row with loan: ${servicerValue}`);
        } else {
          removedCount++;
          restrictedLoans.push(servicerValue);
          logDebug(`Hiding row with loan: ${servicerValue}`);
        }
      } else {
        removedCount++;
        logDebug(`No loan number found in row ${index}, keeping hidden`);
      }
    });

    logDebug(`Filtering complete: ${visibleCount} visible, ${removedCount} hidden`);

    // Update the total count display and pagination
    updateTableInfo(visibleCount, isExactSearch);

    // Show appropriate message based on filtering results
    if (visibleCount === 0 && removedCount > 0) {
      showMessage("No loans found matching your access permissions.", "info");
    } else if (removedCount > 0) {
      showMessage(
        `Showing ${visibleCount} loans you have access to. Some results were filtered due to access restrictions.`,
        "info"
      );
    } else {
      showMessage("", "info"); // Clear any existing message
    }

    return { visibleCount, removedCount, restrictedLoans };
  }

  // Function to update table visibility based on exact search
  function updateTableVisibility() {
    const isExactSearch = document.getElementById('Filter_LoanExactSearch')?.checked || false;
    const loanNumber = document.getElementById('Filter_LoanNumber')?.value?.trim() || '';
    const todoTable = document.getElementById('todoTable');
    const noDataMsg = document.getElementById('nodata');

    if (isExactSearch) {
      // Always clear the table when exact search is selected
      if (todoTable) {
        const tbody = todoTable.querySelector('tbody') || todoTable;
        while (tbody.firstChild) {
          tbody.removeChild(tbody.firstChild);
        }
      }
      if (noDataMsg) {
        noDataMsg.style.display = 'block';
      }
    } else {
      // For non-exact search, show the table
      if (todoTable && noDataMsg) {
        todoTable.style.display = 'block';
        noDataMsg.style.display = 'none';
      }
    }
  }

  // Initialize the script
  function initialize() {
    // Wait for the DOM to be fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupEventListeners);
    } else {
      setupEventListeners();
    }
  }

  // Set up event listeners
  function setupEventListeners() {
    const exactSearchCheckbox = document.getElementById('Filter_LoanExactSearch');
    const loanNumberInput = document.getElementById('Filter_LoanNumber');
    const applyFilterButton = document.getElementById('applyFilter');

    if (exactSearchCheckbox) {
      exactSearchCheckbox.addEventListener('change', function() {
        updateTableVisibility();
        if (!this.checked) {
          setTimeout(filterTable, 100); // Add small delay to ensure DOM is ready
        }
      });
    }

    if (loanNumberInput) {
      loanNumberInput.addEventListener('input', function() {
        updateTableVisibility();
        if (!document.getElementById('Filter_LoanExactSearch').checked) {
          setTimeout(filterTable, 100); // Add small delay to ensure DOM is ready
        }
      });
    }

    if (applyFilterButton) {
      applyFilterButton.addEventListener('click', function() {
        updateTableVisibility();
        setTimeout(filterTable, 100); // Add small delay to ensure DOM is ready
      });
    }
  }

  // Start the initialization
  initialize();
})();
