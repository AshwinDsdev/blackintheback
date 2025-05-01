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

  // Function to monitor value changes, similar to msi-loan-ext.js approach
  function onValueChange(
    evalFunction,
    callback,
    options = {}
  ) {
    let lastValue = undefined;
    const startTime = new Date().getTime();
    const endTime = options.maxTime ? startTime + options.maxTime : null;
    const intervalId = setInterval(async () => {
      const currentTime = new Date().getTime();
      if (endTime && currentTime > endTime) {
        clearInterval(intervalId);
        return;
      }
      let newValue = await evalFunction();
      if (newValue === '') newValue = null;
  
      if (lastValue === newValue) return;
      lastValue = newValue;
  
      await callback(newValue, lastValue);
    }, 500);
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
  
  // Function to wait for loan table to appear, similar to waitForLoanNumber in msi-loan-ext.js
  function waitForLoanTable() {
    return new Promise((resolve) => {
      const observer = new MutationObserver((mutationsList, observer) => {
        const loanTable = findLoanTable();
        if (loanTable) {
          observer.disconnect(); // Stop observing
          resolve(loanTable);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      // Also check immediately in case the table is already there
      const loanTable = findLoanTable();
      if (loanTable) {
        observer.disconnect();
        resolve(loanTable);
      }
    });
  }
  
  // Create a ViewElement class similar to msi-loan-ext.js
  class TableViewElement {
    constructor(tableElement) {
      this.element = tableElement;
      this.parent = this.element && this.element.parentElement;
      this.originalRows = Array.from(this.element.querySelectorAll("tr")).filter(row => !row.querySelector("th"));
      this.hiddenMessage = this.createHiddenMessage();
      this.messageParent = document.querySelector(".content-area, main, #main-content, .content-details, .section-details") || document.body;
    }
    
    createHiddenMessage() {
      const message = document.createElement("div");
      message.id = "offshore-access-message";
      message.className = "warning";
      message.textContent = "Loan is not provisioned to the user";
      message.style.display = "none";
      return message;
    }

    hideRow(row) {
      if (row && row.parentElement) {
        row.style.display = "none";
      }
    }
    
    showRow(row) {
      if (row) {
        row.style.display = "";
      }
    }
    
    showMessage(text, type = "info") {
      // Remove any existing message
      const existingMessage = document.getElementById("offshore-access-message");
      if (existingMessage) {
        existingMessage.remove();
      }
      
      this.hiddenMessage.textContent = text;
      this.hiddenMessage.className = type;
      this.hiddenMessage.style.display = "block";
      this.messageParent.insertBefore(this.hiddenMessage, this.messageParent.firstChild);
    }
    
    hideMessage() {
      this.hiddenMessage.style.display = "none";
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

  // Main filtering function using the approach from msi-loan-ext.js
  async function filterTable() {
    logDebug("Starting filterTable function");

    // Wait for the loan table to appear in the DOM
    const loanTable = await waitForLoanTable();
    
    if (!loanTable) {
      console.error("Loan table not found");
      return;
    }
    
    // Create a TableViewElement to manage the table
    const tableView = new TableViewElement(loanTable);
    
    // Check if exact search is selected
    const isExactSearch = document.getElementById('Filter_LoanExactSearch')?.checked || false;
    const loanNumber = document.getElementById('Filter_LoanNumber')?.value?.trim() || '';

    // If exact search is selected, handle it separately
    if (isExactSearch && loanNumber) {
      // Hide all rows
      tableView.originalRows.forEach(row => {
        tableView.hideRow(row);
      });
      
      // Check if the loan number is in the allowed set
      if (storedNumbers.has(loanNumber)) {
        tableView.showMessage("Loan is provisioned to user", "info");
      } else {
        tableView.showMessage("Loan is not provisioned to user", "warning");
      }
      
      // Update table info
      updateTableInfo(0, true);
      return;
    } else if (isExactSearch) {
      tableView.showMessage("Please enter a loan number for exact search", "info");
      updateTableInfo(0, true);
      return;
    }

    // For non-exact search, filter based on storedNumbersSet
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

    // Process each row
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
        // Check if this loan number is allowed using the approach from msi-loan-ext.js
        const isAllowed = await checkLoanAccess(servicerValue);
        
        if (isAllowed) {
          tableView.showRow(row);
          visibleCount++;
          logDebug(`Showing row with loan: ${servicerValue}`);
        } else {
          tableView.hideRow(row);
          removedCount++;
          restrictedLoans.push(servicerValue);
          logDebug(`Hiding row with loan: ${servicerValue}`);
        }
      } else {
        tableView.hideRow(row);
        removedCount++;
        logDebug(`No loan number found in row, keeping hidden`);
      }
    }

    logDebug(`Filtering complete: ${visibleCount} visible, ${removedCount} hidden`);

    // Update the total count display and pagination
    updateTableInfo(visibleCount, isExactSearch);

    // Show appropriate message based on filtering results
    if (visibleCount === 0 && removedCount > 0) {
      tableView.showMessage("No loans found matching your access permissions.", "info");
    } else if (removedCount > 0) {
      tableView.showMessage(
        `Showing ${visibleCount} loans you have access to. Some results were filtered due to access restrictions.`,
        "info"
      );
    } else {
      tableView.hideMessage(); // Clear any existing message
    }

    return { visibleCount, removedCount, restrictedLoans };
  }
  
  // Function to check if a loan number is allowed, similar to checkNumbersBatch in msi-loan-ext.js
  async function checkLoanAccess(loanNumber) {
    if (!loanNumber) return false;
    
    // Direct match
    if (storedNumbers.has(loanNumber)) {
      logDebug(`Direct match found for: ${loanNumber}`);
      return true;
    }

    // Numeric match
    if (/^\d+$/.test(loanNumber)) {
      const numericValue = Number(loanNumber);
      if (storedNumbers.has(numericValue)) {
        logDebug(`Numeric match found for: ${loanNumber}`);
        return true;
      }
    }

    // String match
    if (!isNaN(loanNumber)) {
      const stringValue = String(loanNumber);
      if (storedNumbers.has(stringValue)) {
        logDebug(`String match found for: ${loanNumber}`);
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
        logDebug(`Partial match found: ${storedStr} contains/matches ${currentStr}`);
        return true;
      }
    }
    
    return false;
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
  
  // Monitor URL changes to detect page navigation, similar to msi-loan-ext.js
  function monitorPageChanges() {
    // Monitor URL changes
    onValueChange(() => document.location.href, async (newUrl, oldUrl) => {
      if (newUrl === oldUrl) return;
      
      logDebug(`URL changed to: ${newUrl}`);
      
      // Wait a moment for the page to load
      setTimeout(async () => {
        // Run the filter on the new page
        await filterTable();
      }, 500);
    });
    
    // Monitor DOM changes that might indicate table updates
    const observer = new MutationObserver(debounce(async (mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && 
            (mutation.target.tagName === 'TABLE' || 
             mutation.target.tagName === 'TBODY' ||
             mutation.target.closest('table'))) {
          logDebug('Table content changed, reapplying filter');
          await filterTable();
          break;
        }
      }
    }, 500));
    
    // Start observing the document with the configured parameters
    observer.observe(document.body, { 
      childList: true, 
      subtree: true 
    });
  }

  // Initialize the script
  async function initialize() {
    // Wait for the DOM to be fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupEventListeners);
    } else {
      await setupEventListeners();
    }
    
    // Start monitoring page changes
    monitorPageChanges();
    
    // Run the initial filter
    await filterTable();
  }

  // Set up event listeners
  async function setupEventListeners() {
    const exactSearchCheckbox = document.getElementById('Filter_LoanExactSearch');
    const loanNumberInput = document.getElementById('Filter_LoanNumber');
    const applyFilterButton = document.getElementById('applyFilter');

    if (exactSearchCheckbox) {
      exactSearchCheckbox.addEventListener('change', async function() {
        await filterTable(); // Directly call filterTable which handles visibility
      });
    }

    if (loanNumberInput) {
      // Use the onValueChange approach for input monitoring
      onValueChange(
        () => loanNumberInput.value,
        async (newValue) => {
          if (newValue !== undefined) {
            await filterTable();
          }
        }
      );
    }

    if (applyFilterButton) {
      applyFilterButton.addEventListener('click', async function() {
        await filterTable();
      });
    }
  }

  // Start the initialization
  initialize();
})();
