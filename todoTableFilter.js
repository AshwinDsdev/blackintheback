(function () {
  console.log("window.storedNumbersSet:", window.storedNumbersSet);
  if (!window.storedNumbersSet || !(window.storedNumbersSet instanceof Set)) {
    console.error("window.storedNumbersSet is not defined or not a Set object");
    return;
  }

  const storedNumbers = window.storedNumbersSet;

  console.log("Contents of storedNumbersSet:");
  storedNumbers.forEach((value) => {
    console.log(`- "${value}" (type: ${typeof value})`);
  });
  
  // Add CSS styles for custom pagination if needed
  function addCustomStyles() {
    // Check if styles already exist
    if (document.getElementById('offshore-custom-styles')) {
      return;
    }
    
    const styleElement = document.createElement('style');
    styleElement.id = 'offshore-custom-styles';
    styleElement.textContent = `
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
      
      /* Custom pagination styles (if needed) */
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
      #bottom-pager .page-selector.page-number.hide { 
        display: none; 
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
    
    document.head.appendChild(styleElement);
    console.log("Added custom styles for offshore access features");
  }
  
  // Add the custom styles
  addCustomStyles();

  // Track search parameters and results
  let currentSearchParams = {
    queueType: null,
    queueTitle: null,
    presetDropdown: null
  };

  // Function to check if current search is only using dropdown filters
  function isDropdownOnlySearch() {
    // Check if search was performed only using dropdown filters
    const urlParams = new URLSearchParams(window.location.search);
    const hasTextSearch = urlParams.has('search') || urlParams.has('query') || urlParams.has('text');
    
    // If there are no text search parameters, it's a dropdown-only search
    return !hasTextSearch;
  }

  // Function to extract current search parameters from the page
  function updateSearchParams() {
    // Try to find dropdown elements - this is a simplified example
    // You'll need to adjust selectors based on actual page structure
    const queueTypeEl = document.querySelector('select[name="queueType"], .queue-type-dropdown');
    const queueTitleEl = document.querySelector('select[name="queueTitle"], .queue-title-dropdown');
    const presetDropdownEl = document.querySelector('select[name="preset"], .preset-dropdown');

    currentSearchParams = {
      queueType: queueTypeEl ? queueTypeEl.value : null,
      queueTitle: queueTitleEl ? queueTitleEl.value : null,
      presetDropdown: presetDropdownEl ? presetDropdownEl.value : null
    };

    console.log("Current search parameters:", currentSearchParams);
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
          console.log(
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
    console.log(`Extracting from text: "${text}"`);

    const labelMatch = /(?:Servicer|Loan|Account|ID):\s*([^\s,;]+)/i.exec(text);
    if (labelMatch && labelMatch[1]) {
      console.log(`Extracted after label: "${labelMatch[1]}"`);
      return labelMatch[1].trim();
    }

    if (/^\d+$/.test(text)) {
      console.log(`Using numeric text directly: "${text}"`);
      return text;
    }

    const numericMatch = text.match(/\d+/);
    if (numericMatch) {
      console.log(
        `Extracted numeric part: "${numericMatch[0]}" from "${text}"`
      );
      return numericMatch[0];
    }

    return text;
  }

  // Function to create and display a message banner
  function showMessage(message, type = 'info') {
    // Remove any existing message
    const existingMessage = document.getElementById('offshore-access-message');
    if (existingMessage) {
      existingMessage.remove();
    }

    // Create message element
    const messageEl = document.createElement('div');
    messageEl.id = 'offshore-access-message';
    messageEl.className = type; // Use CSS classes instead of inline styles
    messageEl.textContent = message;
    
    // Insert at the top of the table or content area
    const tableContainer = findLoanTable()?.closest('table');
    if (tableContainer) {
      tableContainer.parentNode.insertBefore(messageEl, tableContainer);
    } else {
      // Fallback - insert at top of content area
      const contentArea = document.querySelector('.content-area, main, #main-content');
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
      totalRecords: document.querySelector('.total-records, .record-count, .pagination-info, [data-total-records]'),
      pageCount: document.querySelector('.page-count, .pagination-pages, [data-page-count]'),
      paginationControls: document.querySelector('.pagination, .pager, nav.pagination-nav'),
      itemsPerPage: document.querySelector('select.items-per-page, select.page-size, [data-items-per-page], .page-size-select'),
      currentPage: document.querySelector('.current-page, .active-page, [data-current-page]'),
      
      // Custom pagination elements (based on the provided CSS)
      customPager: document.getElementById('bottom-pager'),
      customPageSizeSelect: document.querySelector('#bottom-pager .page-size-select'),
      customPageNumbers: document.querySelector('#bottom-pager .page-numbers'),
      customCurrentPage: document.querySelector('#bottom-pager .current-page')
    };
    
    // If standard selectors don't work, try to find by text content
    if (!elements.totalRecords) {
      const possibleElements = document.querySelectorAll('span, div, p');
      for (const el of possibleElements) {
        const text = el.textContent.trim().toLowerCase();
        if (text.includes('total') && text.includes('record')) {
          elements.totalRecords = el;
        } else if (text.includes('page') && (text.includes('of') || text.includes('/'))) {
          elements.pageCount = el;
        }
      }
    }
    
    return elements;
  }
  
  // Function to update pagination information
  function updatePaginationInfo(visibleCount) {
    const paginationElements = findPaginationElements();
    
    if (!paginationElements.totalRecords && !paginationElements.pageCount && !paginationElements.customPager) {
      console.log("No pagination elements found to update");
      return;
    }
    
    console.log("Found pagination elements:", paginationElements);
    
    // Update total records display for standard pagination
    if (paginationElements.totalRecords) {
      const originalText = paginationElements.totalRecords.textContent;
      const newText = originalText.replace(/\d+/g, (match) => {
        // Only replace if it's likely to be the total count (larger than visible count)
        return parseInt(match) > visibleCount ? visibleCount : match;
      });
      
      if (originalText !== newText) {
        console.log(`Updating total records from "${originalText}" to "${newText}"`);
        paginationElements.totalRecords.textContent = newText;
        
        // Also update any data attributes if they exist
        if (paginationElements.totalRecords.hasAttribute('data-total-records')) {
          paginationElements.totalRecords.setAttribute('data-total-records', visibleCount);
        }
      }
    }
    
    // Update page count for standard pagination
    if (paginationElements.pageCount) {
      const itemsPerPage = paginationElements.itemsPerPage ? 
        parseInt(paginationElements.itemsPerPage.value) : 10; // Default to 10 if not found
      
      const totalPages = Math.max(1, Math.ceil(visibleCount / itemsPerPage));
      
      const originalText = paginationElements.pageCount.textContent;
      const newText = originalText.replace(/\d+$|\d+(?=\s*pages)|\d+(?=\s*of)/, totalPages);
      
      if (originalText !== newText) {
        console.log(`Updating page count from "${originalText}" to "${newText}"`);
        paginationElements.pageCount.textContent = newText;
        
        // Also update any data attributes if they exist
        if (paginationElements.pageCount.hasAttribute('data-page-count')) {
          paginationElements.pageCount.setAttribute('data-page-count', totalPages);
        }
      }
    }
    
    // Handle custom pagination (PagingNumHelper)
    if (paginationElements.customPager) {
      console.log("Updating custom pagination system");
      
      // Find the pager ID
      const pagerId = paginationElements.customPager.id || 'pager-1';
      
      // Try to find the PagingNumHelper instance
      if (window.PagingNumHelper && window.PagingNumHelperOptions) {
        // Find all instances of PagingNumHelper in the global scope
        for (const key in window) {
          if (window[key] instanceof window.PagingNumHelper) {
            console.log(`Found PagingNumHelper instance: ${key}`);
            
            // Update the total records
            if (window[key].options && window[key].options.TotalRecords !== undefined) {
              console.log(`Updating TotalRecords from ${window[key].options.TotalRecords} to ${visibleCount}`);
              window[key].options.TotalRecords = visibleCount;
              
              // Recalculate pages
              if (typeof window[key].refreshPager === 'function') {
                window[key].refreshPager();
                console.log("Refreshed pager with new total records count");
              }
            }
          }
        }
      }
      
      // Direct DOM updates for the custom pager
      const pageSize = paginationElements.customPageSizeSelect ? 
        parseInt(paginationElements.customPageSizeSelect.value) : 10;
      
      const totalPages = Math.max(1, Math.ceil(visibleCount / pageSize));
      
      // Update page numbers display
      if (paginationElements.customPageNumbers) {
        // Remove existing page numbers
        const pageNumbers = paginationElements.customPageNumbers.querySelectorAll('.page-number:not(.selected)');
        pageNumbers.forEach(pageNum => {
          if (parseInt(pageNum.textContent) > totalPages) {
            pageNum.classList.add('hide');
          } else {
            pageNum.classList.remove('hide');
          }
        });
        
        // Disable next/last buttons if on last page
        const nextButton = document.querySelector('#bottom-pager .page-next');
        const lastButton = document.querySelector('#bottom-pager .page-last');
        
        if (nextButton && parseInt(paginationElements.customCurrentPage?.textContent || '1') >= totalPages) {
          nextButton.classList.add('disabled');
        }
        
        if (lastButton && parseInt(paginationElements.customCurrentPage?.textContent || '1') >= totalPages) {
          lastButton.classList.add('disabled');
        }
      }
    }
    
    // If there's only one page now, disable pagination controls
    const itemsPerPage = paginationElements.itemsPerPage ? 
      parseInt(paginationElements.itemsPerPage.value) : 
      (paginationElements.customPageSizeSelect ? 
        parseInt(paginationElements.customPageSizeSelect.value) : 10);
    
    const totalPages = Math.max(1, Math.ceil(visibleCount / itemsPerPage));
    
    if (totalPages === 1) {
      // Standard pagination
      if (paginationElements.paginationControls) {
        const paginationButtons = paginationElements.paginationControls.querySelectorAll('a, button');
        paginationButtons.forEach(button => {
          if (!button.classList.contains('active') && !button.classList.contains('current')) {
            button.classList.add('disabled');
            button.setAttribute('disabled', 'disabled');
            // Prevent clicks
            button.addEventListener('click', e => {
              e.preventDefault();
              e.stopPropagation();
              return false;
            }, true);
          }
        });
      }
      
      // Custom pagination
      if (paginationElements.customPager) {
        const customButtons = paginationElements.customPager.querySelectorAll('.page-selector');
        customButtons.forEach(button => {
          if (!button.classList.contains('selected')) {
            button.classList.add('disabled');
            // Prevent clicks
            button.addEventListener('click', e => {
              e.preventDefault();
              e.stopPropagation();
              return false;
            }, true);
          }
        });
      }
    }
  }

  function filterTable() {
    const loanTable = findLoanTable();

    if (!loanTable) {
      console.error("Loan table not found");
      return;
    }

    // Update current search parameters
    updateSearchParams();
    
    console.log(
      `Filtering table with ${storedNumbers.size} stored loan numbers`
    );

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
    console.log(`Servicer column index: ${servicerColumnIndex}`);

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
          console.log(`Found by attribute/class: "${servicerValue}"`);
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
        console.log(`Found by column index: "${servicerValue}"`);
      }

      if (!servicerValue) {
        for (let i = 0; i < cells.length; i++) {
          const cellText = cells[i].textContent.trim();
          if (/^\d{5,}$/.test(cellText) || /Loan\s*#?\s*\d+/i.test(cellText)) {
            servicerValue = extractLoanNumber(cellText);
            console.log(`Found by pattern matching: "${servicerValue}"`);
            break;
          }
        }
      }

      if (servicerValue) {
        console.log(
          `Checking value: "${servicerValue}" (${typeof servicerValue})`
        );

        let isMatch = false;

        if (storedNumbers.has(servicerValue)) {
          isMatch = true;
          console.log(`Direct match found for "${servicerValue}"`);
        }

        if (!isMatch && /^\d+$/.test(servicerValue)) {
          const numericValue = Number(servicerValue);
          if (storedNumbers.has(numericValue)) {
            isMatch = true;
            console.log(`Numeric match found for ${numericValue}`);
          }
        }

        if (!isMatch && !isNaN(servicerValue)) {
          const stringValue = String(servicerValue);
          if (storedNumbers.has(stringValue)) {
            isMatch = true;
            console.log(`String match found for "${stringValue}"`);
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
              console.log(
                `Fuzzy match found: "${servicerValue}" matches "${num}"`
              );
            }
          });
        }

        if (!isMatch) {
          console.log(
            `No match found - Hiding row with value: ${servicerValue}`
          );
          row.style.display = "none";
          removedCount++;
          restrictedLoans.push(servicerValue);
        } else {
          console.log(`Match found - Keeping row with value: ${servicerValue}`);
          row.style.display = "";
          visibleCount++;
          // Store this row to maintain sort order
          visibleRows.push({ index, row });
        }
      }
    });

    console.log(
      `Filtered out ${removedCount} rows that were not in storedNumbersSet`
    );
    
    // Update pagination counts without changing the appearance
    updatePaginationCounts();
    
    // Handle special cases based on search type and results
    const isDropdownSearch = isDropdownOnlySearch();
    
    // Case 1: Dropdown search with exactly one restricted loan
    if (isDropdownSearch && visibleCount === 0 && restrictedLoans.length === 1) {
      showMessage("You are not provisioned for this loan", "warning");
    } 
    // Case 2: Dropdown search with multiple results, some filtered
    else if (isDropdownSearch && removedCount > 0) {
      showMessage(`Showing ${visibleCount} loans you have access to. Some results were filtered due to access restrictions.`, "info");
    }
    // Case 3: No results after filtering
    else if (visibleCount === 0 && removedCount > 0) {
      showMessage("No loans found matching your search criteria and access permissions.", "info");
    }
  }

  // Function to prevent access to restricted loans via URL or navigation
  function preventRestrictedAccess() {
    // Check if current URL contains a loan number or ID
    const urlParams = new URLSearchParams(window.location.search);
    const possibleLoanParams = ['loan', 'loanId', 'loanNumber', 'id', 'accountId'];
    
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
            
            if (storedStr === currentStr || storedStr.includes(currentStr) || currentStr.includes(storedStr)) {
              isAllowed = true;
            }
          });
        }
        
        // If not allowed, redirect to the main page
        if (!isAllowed) {
          console.log(`Prevented access to restricted loan: ${loanValue}`);
          showMessage("You do not have access to the requested loan information", "warning");
          
          // Remove the restricted parameter from URL and reload
          urlParams.delete(param);
          const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
          
          // Use history API to avoid creating a new history entry
          window.history.replaceState({}, document.title, newUrl);
          
          // If on a detail page, redirect to list page
          if (window.location.pathname.includes('/detail') || 
              window.location.pathname.includes('/view') || 
              window.location.pathname.includes('/loan/')) {
            window.location.href = '/'; // Redirect to home or list page
          }
          
          return false;
        }
      }
    }
    
    return true;
  }

  // Intercept link clicks to prevent navigation to restricted loans
  function setupLinkInterception() {
    document.addEventListener('click', function(e) {
      // Find if the click was on a link or inside a link
      let target = e.target;
      while (target && target.tagName !== 'A') {
        target = target.parentElement;
      }
      
      if (!target) return; // Not a link
      
      const href = target.getAttribute('href');
      if (!href) return; // No href attribute
      
      // Check if the link contains a loan identifier
      const urlObj = new URL(href, window.location.origin);
      const params = urlObj.searchParams;
      
      const possibleLoanParams = ['loan', 'loanId', 'loanNumber', 'id', 'accountId'];
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
              if (String(num).includes(loanValue) || String(loanValue).includes(String(num))) {
                isAllowed = true;
              }
            });
          }
          
          // If not allowed, prevent navigation
          if (!isAllowed) {
            console.log(`Prevented navigation to restricted loan: ${loanValue}`);
            e.preventDefault();
            e.stopPropagation();
            showMessage("You do not have access to the requested loan information", "warning");
            return false;
          }
        }
      }
    }, true); // Use capture phase to intercept before other handlers
  }

  // Function to handle pagination events
  function setupPaginationListeners() {
    // Find pagination controls
    const paginationElements = findPaginationElements();
    
    // Standard pagination controls
    if (paginationElements.paginationControls) {
      // Add listeners to pagination buttons
      const paginationButtons = paginationElements.paginationControls.querySelectorAll('a, button');
      paginationButtons.forEach(button => {
        // Remove any existing listeners to avoid duplicates
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        newButton.addEventListener('click', () => {
          // Wait for the page to update before reapplying our filters
          setTimeout(() => {
            console.log("Pagination changed, reapplying filters");
            filterTable();
          }, 100);
        });
      });
      
      console.log("Standard pagination listeners set up successfully");
    }
    
    // Listen for changes to items per page dropdown
    if (paginationElements.itemsPerPage) {
      // Remove any existing listeners to avoid duplicates
      const newDropdown = paginationElements.itemsPerPage.cloneNode(true);
      paginationElements.itemsPerPage.parentNode.replaceChild(newDropdown, paginationElements.itemsPerPage);
      
      newDropdown.addEventListener('change', () => {
        setTimeout(() => {
          console.log("Items per page changed, reapplying filters");
          filterTable();
        }, 100);
      });
    }
    
    // Custom pagination (PagingNumHelper)
    if (paginationElements.customPager) {
      // Add listeners to custom pagination buttons
      const customButtons = paginationElements.customPager.querySelectorAll('.page-selector');
      customButtons.forEach(button => {
        // Remove any existing listeners to avoid duplicates
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        newButton.addEventListener('click', () => {
          // Wait for the page to update before reapplying our filters
          setTimeout(() => {
            console.log("Custom pagination changed, reapplying filters");
            filterTable();
          }, 100);
        });
      });
      
      // Listen for changes to custom page size dropdown
      if (paginationElements.customPageSizeSelect) {
        // Remove any existing listeners to avoid duplicates
        const newDropdown = paginationElements.customPageSizeSelect.cloneNode(true);
        paginationElements.customPageSizeSelect.parentNode.replaceChild(newDropdown, paginationElements.customPageSizeSelect);
        
        newDropdown.addEventListener('change', () => {
          setTimeout(() => {
            console.log("Custom page size changed, reapplying filters");
            filterTable();
          }, 100);
        });
      }
      
      console.log("Custom pagination listeners set up successfully");
      
      // Patch the PagingNumHelper class to update our filters when page changes
      if (window.PagingNumHelper) {
        // Save original methods
        const originalShowDataForCurrentPage = window.PagingNumHelper.prototype.showDataForCurrentPage;
        const originalSetPageSize = window.PagingNumHelper.prototype.setPageSize;
        
        // Override methods to add our filter
        window.PagingNumHelper.prototype.showDataForCurrentPage = function() {
          // Call original method
          const result = originalShowDataForCurrentPage.apply(this, arguments);
          
          // Apply our filter
          setTimeout(() => {
            console.log("PagingNumHelper changed page, reapplying filters");
            filterTable();
          }, 100);
          
          return result;
        };
        
        window.PagingNumHelper.prototype.setPageSize = function() {
          // Call original method
          const result = originalSetPageSize.apply(this, arguments);
          
          // Apply our filter
          setTimeout(() => {
            console.log("PagingNumHelper changed page size, reapplying filters");
            filterTable();
          }, 100);
          
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
    
    const visibleRows = Array.from(loanTable.querySelectorAll("tr"))
      .filter(row => row.style.display !== "none" && row.querySelectorAll("td").length > 0);
    
    const visibleCount = visibleRows.length;
    console.log(`Found ${visibleCount} visible rows for pagination`);
    
    // Find total records display elements
    const totalRecordsElements = document.querySelectorAll('.total-records, .record-count, [data-total-records], .pagination-info');
    totalRecordsElements.forEach(element => {
      const originalText = element.textContent;
      if (/\d+/.test(originalText)) {
        const newText = originalText.replace(/\d+/g, (match) => {
          // Only replace if it's likely to be the total count (larger than visible count)
          return parseInt(match) > visibleCount ? visibleCount : match;
        });
        
        if (originalText !== newText) {
          console.log(`Updating total records from "${originalText}" to "${newText}"`);
          element.textContent = newText;
        }
      }
    });
    
    // Update any data attributes
    const elementsWithDataAttr = document.querySelectorAll('[data-total-records]');
    elementsWithDataAttr.forEach(element => {
      if (element.getAttribute('data-total-records') > visibleCount) {
        element.setAttribute('data-total-records', visibleCount);
      }
    });
    
    // If PagingNumHelper exists, update it without changing the UI
    if (window.PagingNumHelper) {
      try {
        // Find all instances of PagingNumHelper
        for (const key in window) {
          if (window[key] && typeof window[key] === 'object' && 
              window[key] instanceof window.PagingNumHelper && 
              window[key].options) {
            
            // Store the original values
            const originalTotalRecords = window[key].options.TotalRecords;
            const originalTotalPages = window[key].TotalPages;
            
            // Only update if our count is less than the original
            if (visibleCount < originalTotalRecords) {
              console.log(`Updating PagingNumHelper instance ${key} count from ${originalTotalRecords} to ${visibleCount}`);
              
              // Update the count but don't refresh the pager to avoid UI changes
              window[key].options.TotalRecords = visibleCount;
              
              // Update any displayed total count text without changing the UI
              const pagerId = window[key].options.Id;
              if (pagerId) {
                const pagerElement = document.getElementById(pagerId);
                if (pagerElement) {
                  const totalElements = pagerElement.querySelectorAll('.total-records, .record-count');
                  totalElements.forEach(el => {
                    if (/\d+/.test(el.textContent)) {
                      el.textContent = el.textContent.replace(/\d+/, visibleCount);
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
        'refreshPager', 'recalculatePages', 'setPageSize', 'selectPage', 
        'nextPage', 'prevPage', 'lastPage', 'showDataForCurrentPage', 
        'getPage', 'disableNextButton', 'setPageSelection', 'regeneratePager'
      ];
      
      methodsToSafeguard.forEach(methodName => {
        if (window.PagingNumHelper.prototype[methodName]) {
          const originalMethod = window.PagingNumHelper.prototype[methodName];
          
          window.PagingNumHelper.prototype[methodName] = function() {
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
      
      console.log("Successfully added error handling to PagingNumHelper methods");
    } catch (error) {
      console.error("Error while safeguarding PagingNumHelper:", error);
    }
  }
  
  // Function to clean up any CSS or JavaScript text that might have been accidentally displayed
  function cleanupDisplayedCode() {
    // First, let's try a more direct approach - look for specific text patterns in the page
    const cssTextStart = '#bottom-pager.page-container {';
    const jsTextStart = 'if(typeof PagingNumHelper';
    
    // Get all text in the document
    const allText = document.body.innerText;
    
    // Check if our problematic text is present
    if (allText.includes(cssTextStart) || allText.includes(jsTextStart)) {
      console.log("Found problematic code text in the page, performing aggressive cleanup");
      
      // More aggressive approach - remove all text nodes with suspicious content
      const allElements = document.querySelectorAll('*');
      let removedCount = 0;
      
      for (const element of allElements) {
        // Skip script and style elements
        if (element.tagName === 'SCRIPT' || element.tagName === 'STYLE') {
          continue;
        }
        
        // Check all child nodes
        for (let i = 0; i < element.childNodes.length; i++) {
          const node = element.childNodes[i];
          
          // Only process text nodes
          if (node.nodeType === Node.TEXT_NODE) {
            const text = node.nodeValue.trim();
            
            // Check for CSS or JS code
            if ((text.includes('#bottom-pager') || 
                 text.includes('PagingNumHelper') ||
                 text.includes('function(') ||
                 text.includes('display:flex')) && 
                text.length > 50) {
              
              console.log("Removing suspicious text node:", text.substring(0, 30) + "...");
              node.nodeValue = '';
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
      '#bottom-pager',
      '.page-container',
      '.page-numbers',
      '.page-selector',
      'display:flex',
      'flex-direction:row',
      'align-items:center',
      'padding:0.1rem',
      'border:1px',
      'margin:1px',
      
      // JavaScript patterns
      'PagingNumHelper',
      'constructor(',
      'function(',
      'window.',
      'prototype',
      'if(typeof',
      'class {',
      'this.options',
      'return {'
    ];
    
    const nodesToRemove = [];
    
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const text = node.nodeValue.trim();
      
      // Check if this text node contains code-like content
      if (text.length > 30) { // Lower threshold to catch more
        let isCodeText = false;
        
        for (const pattern of codePatterns) {
          if (text.includes(pattern)) {
            isCodeText = true;
            break;
          }
        }
        
        if (isCodeText) {
          console.log("Found code text node to remove:", text.substring(0, 50) + "...");
          nodesToRemove.push(node);
        }
      }
    }
    
    // Remove the identified nodes
    for (const node of nodesToRemove) {
      if (node.parentNode) {
        node.nodeValue = ''; // Just clear the text instead of removing the node
      }
    }
    
    console.log(`Cleaned up ${nodesToRemove.length} code text nodes`);
    
    // Also look for elements that might contain code as their text content
    const suspiciousElements = document.querySelectorAll('div, p, span, td, li');
    let elementsFixed = 0;
    
    for (const element of suspiciousElements) {
      // Check if this element or its children contain suspicious text
      const text = element.innerText;
      
      if (text && text.length > 50) { // Only check longer text blocks
        let isCodeText = false;
        
        for (const pattern of codePatterns) {
          if (text.includes(pattern)) {
            isCodeText = true;
            break;
          }
        }
        
        if (isCodeText) {
          console.log("Found element with code text to clean:", text.substring(0, 50) + "...");
          
          // Check if this is a container with other meaningful content
          if (element.children.length > 0) {
            // Just clean the text nodes, not the entire element
            for (let i = 0; i < element.childNodes.length; i++) {
              const node = element.childNodes[i];
              if (node.nodeType === Node.TEXT_NODE) {
                const nodeText = node.nodeValue.trim();
                for (const pattern of codePatterns) {
                  if (nodeText.includes(pattern)) {
                    node.nodeValue = '';
                    break;
                  }
                }
              }
            }
          } else {
            // This is just a text container, clear it
            element.textContent = '';
          }
          
          elementsFixed++;
        }
      }
    }
    
    console.log(`Cleaned up ${elementsFixed} elements containing code text`);
    
    // Final check - look for any remaining CSS text
    if (document.body.innerText.includes('#bottom-pager.page-container {')) {
      console.log("CSS text still found after cleanup, performing emergency removal");
      
      // Emergency measure - replace the entire body innerHTML and rebuild essential elements
      const originalBody = document.body.innerHTML;
      
      // Remove all CSS and JS code text
      let cleanedBody = originalBody.replace(/#bottom-pager\.page-container[\s\S]*?}/g, '')
                                   .replace(/if\(typeof PagingNumHelper[\s\S]*?}/g, '');
      
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
  
  // Clean up any code that might be displayed as text
  cleanupDisplayedCode();
  
  // Set multiple timeouts to run cleanup at different intervals
  // This helps catch any code that might be rendered after our initial cleanup
  setTimeout(() => {
    cleanupDisplayedCode();
  }, 100);
  
  setTimeout(() => {
    cleanupDisplayedCode();
  }, 500);
  
  setTimeout(() => {
    cleanupDisplayedCode();
  }, 1000);
  
  // Set up a MutationObserver to detect when new content is added to the page
  const codeCleanupObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        // Check if any of the added nodes might contain code
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.TEXT_NODE) {
            const text = node.nodeValue;
            if (text && (text.includes('#bottom-pager') || text.includes('PagingNumHelper'))) {
              console.log("Detected code being added to the page, running cleanup");
              cleanupDisplayedCode();
              break;
            }
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const text = node.innerText;
            if (text && (text.includes('#bottom-pager') || text.includes('PagingNumHelper'))) {
              console.log("Detected element with code being added to the page, running cleanup");
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
    characterData: true
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
      console.log("Table mutation detected, reapplying filter");
      filterTable();
      
      // Also check if pagination controls have been updated
      setupPaginationListeners();
    });

    observer.observe(tableContainer, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false,
    });

    console.log("Table observer set up successfully");
  } else {
    console.error("Table container not found, cannot observe changes");
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
      attributes: true
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
      attributes: true
    });
    
    console.log("Custom pagination observer set up successfully");
  }
  
  // Watch for dynamic addition of pagination elements
  const bodyObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        // Check if any of the added nodes is a pagination element
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) { // Element node
            if (node.id === 'bottom-pager' || 
                node.querySelector('#bottom-pager') ||
                node.classList.contains('pagination') ||
                node.querySelector('.pagination')) {
              console.log("Pagination element dynamically added, updating");
              setTimeout(() => {
                setupPaginationListeners();
                patchPagingNumHelper();
                filterTable();
              }, 100);
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
