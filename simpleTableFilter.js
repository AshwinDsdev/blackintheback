(function() {
  // Check if storedNumbersSet exists
  if (!window.storedNumbersSet || !(window.storedNumbersSet instanceof Set)) {
    console.error("window.storedNumbersSet is not defined or not a Set object");
    return;
  }

  const storedNumbers = window.storedNumbersSet;
  console.log(`Loaded storedNumbersSet with ${storedNumbers.size} entries`);

  // Function to monitor value changes (similar to msi-loan-ext.js)
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
    
    return intervalId;
  }

  // Function to extract loan number from text
  function extractLoanNumber(text) {
    if (!text) return null;
    
    // Try to extract a loan number using various patterns
    const loanMatch = text.match(/(?:Loan|Account|#)[:\s]*(\d+)/i);
    if (loanMatch && loanMatch[1]) {
      return loanMatch[1].trim();
    }
    
    // If no specific pattern, look for any number with 5+ digits
    const numberMatch = text.match(/\b(\d{5,})\b/);
    if (numberMatch && numberMatch[1]) {
      return numberMatch[1].trim();
    }
    
    return null;
  }

  // Create a class for handling the filter message
  class FilterMessage {
    constructor() {
      this.messageId = 'filter-message';
      this.removeExisting();
    }

    removeExisting() {
      const existingMsg = document.getElementById(this.messageId);
      if (existingMsg) {
        existingMsg.remove();
      }
    }

    show(visibleCount, totalAvailable) {
      this.removeExisting();
      
      // Create a new message
      const msgDiv = document.createElement('div');
      msgDiv.id = this.messageId;
      msgDiv.style.padding = '10px 15px';
      msgDiv.style.margin = '10px 0';
      msgDiv.style.borderRadius = '4px';
      msgDiv.style.backgroundColor = '#d4edda';
      msgDiv.style.color = '#155724';
      msgDiv.style.border = '1px solid #c3e6cb';
      msgDiv.style.fontWeight = 'bold';
      msgDiv.style.textAlign = 'center';
      
      msgDiv.textContent = `Filtering complete! Showing ${visibleCount} loans you have access to (${totalAvailable} available).`;
      
      // Find a place to insert the message
      const loanTable = this.findTableContainer();
      if (loanTable) {
        const tableContainer = loanTable.closest('table');
        if (tableContainer && tableContainer.parentNode) {
          tableContainer.parentNode.insertBefore(msgDiv, tableContainer);
        } else {
          document.body.insertBefore(msgDiv, document.body.firstChild);
        }
      } else {
        document.body.insertBefore(msgDiv, document.body.firstChild);
      }
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        if (msgDiv.parentNode) {
          msgDiv.remove();
        }
      }, 5000);
    }

    findTableContainer() {
      // Try various selectors to find the table
      const tableSelectors = [
        ".todo-table tbody",
        ".workflow-table tbody",
        ".task-table tbody",
        "table.striped tbody",
        "table tbody"
      ];
      
      for (const selector of tableSelectors) {
        const table = document.querySelector(selector);
        if (table) {
          return table;
        }
      }
      
      // If no tbody found, try to find any table
      const anyTable = document.querySelector("table");
      if (anyTable) {
        // Try to find or create tbody
        let tbody = anyTable.querySelector("tbody");
        if (!tbody) {
          // If no tbody exists, use the table itself
          return anyTable;
        }
        return tbody;
      }
      
      return null;
    }
  }

  // Create a class for handling the loan table
  class LoanTableHandler {
    constructor(storedNumbers) {
      this.storedNumbers = storedNumbers;
      this.filterMessage = new FilterMessage();
      this.filteringApplied = false;
    }

    findLoanTable() {
      // Try various selectors to find the table
      const tableSelectors = [
        ".todo-table tbody",
        ".workflow-table tbody",
        ".task-table tbody",
        "table.striped tbody",
        "table tbody"
      ];
      
      for (const selector of tableSelectors) {
        const table = document.querySelector(selector);
        if (table) {
          return table;
        }
      }
      
      // If no tbody found, try to find any table
      const anyTable = document.querySelector("table");
      if (anyTable) {
        // Try to find or create tbody
        let tbody = anyTable.querySelector("tbody");
        if (!tbody) {
          // If no tbody exists, use the table itself
          return anyTable;
        }
        return tbody;
      }
      
      return null;
    }

    isLoanNumberAllowed(loanNumber) {
      if (!loanNumber) return false;
      
      // Check if this loan number is in our set
      if (this.storedNumbers.has(loanNumber)) {
        return true;
      }
      
      // Try numeric comparison
      if (/^\d+$/.test(loanNumber)) {
        const numericValue = Number(loanNumber);
        if (this.storedNumbers.has(numericValue)) {
          return true;
        }
      }
      
      // Try string comparison
      const stringValue = String(loanNumber);
      if (this.storedNumbers.has(stringValue)) {
        return true;
      }
      
      // Try partial matches
      for (const num of this.storedNumbers) {
        const storedStr = String(num).toLowerCase();
        const currentStr = String(loanNumber).toLowerCase();
        
        if (storedStr === currentStr || 
            storedStr.includes(currentStr) || 
            currentStr.includes(storedStr)) {
          return true;
        }
      }
      
      return false;
    }

    filterTable() {
      // Set flag to indicate filtering has been applied
      this.filteringApplied = true;
      
      const loanTable = this.findLoanTable();
      if (!loanTable) {
        console.error("Loan table not found");
        return;
      }
  
      console.log(`Filtering table with ${this.storedNumbers.size} allowed loan numbers`);
  
      const rows = loanTable.querySelectorAll("tr");
      let removedCount = 0;
      let visibleCount = 0;
  
      // Process each row
      rows.forEach((row) => {
        const cells = row.querySelectorAll("td");
        if (cells.length === 0) return; // Skip header rows
        
        let loanNumber = null;
        
        // Try to find a loan number in any cell
        for (const cell of cells) {
          const extractedNumber = extractLoanNumber(cell.textContent);
          if (extractedNumber) {
            loanNumber = extractedNumber;
            break;
          }
        }
        
        if (loanNumber) {
          const isAllowed = this.isLoanNumberAllowed(loanNumber);
          
          // Show or hide the row
          if (isAllowed) {
            row.style.display = "";
            visibleCount++;
          } else {
            row.style.display = "none";
            removedCount++;
          }
        }
      });
      
      console.log(`Filtering complete. Removed: ${removedCount}, Visible: ${visibleCount}`);
      
      // Show a message about the filtering
      this.filterMessage.show(visibleCount, this.storedNumbers.size);
    }
  }

  // Create a class for handling the filter button
  class FilterButtonHandler {
    constructor(loanTableHandler) {
      this.loanTableHandler = loanTableHandler;
      this.buttonAttached = false;
    }

    findElementsWithText(selector, text) {
      const elements = document.querySelectorAll(selector);
      return Array.from(elements).filter(el => 
        el.textContent.toLowerCase().includes(text.toLowerCase())
      );
    }

    findFilterButton() {
      // Try to find the button using various selectors
      const buttonSelectors = [
        '#applyFilter',
        'button:contains("Apply Filter")',
        'input[value*="Apply Filter"]',
        'button:contains("Filter")',
        'input[value*="Filter"]',
        '.filter-button',
        '#filterBtn'
      ];
      
      let filterButton = null;
      
      // Try each selector
      for (const selector of buttonSelectors) {
        if (selector.includes(':contains(')) {
          // Handle custom contains selector
          const [baseSelector, textToFind] = selector.split(':contains(');
          const text = textToFind.replace(/["')]/g, '');
          const elements = this.findElementsWithText(baseSelector, text);
          if (elements.length > 0) {
            filterButton = elements[0];
            break;
          }
        } else {
          // Standard selector
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            filterButton = elements[0];
            break;
          }
        }
      }
      
      // If still not found, try any button with "filter" in its text
      if (!filterButton) {
        const allButtons = document.querySelectorAll('button, input[type="button"], input[type="submit"]');
        for (const btn of allButtons) {
          if ((btn.textContent && btn.textContent.toLowerCase().includes('filter')) || 
              (btn.value && btn.value.toLowerCase().includes('filter'))) {
            filterButton = btn;
            break;
          }
        }
      }

      return filterButton;
    }

    attachToFilterButton() {
      const filterButton = this.findFilterButton();
      
      // If we found a button, attach our handler
      if (filterButton) {
        console.log('Found filter button:', filterButton.outerHTML);
        
        // Only attach once
        if (filterButton._filterHandlerAttached) {
          return true;
        }
        
        // Mark as attached
        filterButton._filterHandlerAttached = true;
        
        // Add click handler
        filterButton.addEventListener('click', () => {
          // Show loading state
          const originalText = filterButton.textContent || filterButton.value;
          const originalDisabled = filterButton.disabled;
          
          if (filterButton.tagName === 'INPUT') {
            filterButton.value = 'Filtering...';
          } else {
            filterButton.textContent = 'Filtering...';
          }
          filterButton.disabled = true;
          
          // Apply filtering after a short delay
          setTimeout(() => {
            try {
              this.loanTableHandler.filterTable();
            } catch (err) {
              console.error('Error during filtering:', err);
            }
            
            // Reset button state
            if (filterButton.tagName === 'INPUT') {
              filterButton.value = originalText;
            } else {
              filterButton.textContent = originalText;
            }
            filterButton.disabled = originalDisabled;
          }, 100);
        });
        
        console.log('Successfully attached filter handler to button');
        return true;
      }
      
      console.log('Could not find filter button');
      return false;
    }

    tryAttachWithRetry() {
      // Try immediately
      this.buttonAttached = this.attachToFilterButton();
      
      // Try again after a delay
      setTimeout(() => {
        if (!this.buttonAttached) {
          this.buttonAttached = this.attachToFilterButton();
        }
      }, 1000);
      
      // Try one more time after a longer delay
      setTimeout(() => {
        if (!this.buttonAttached) {
          this.buttonAttached = this.attachToFilterButton();
          
          if (!this.buttonAttached) {
            console.log('Could not find filter button after multiple attempts');
          }
        }
      }, 3000);
    }
  }

  // Create a class for handling DOM changes
  class DomChangeObserver {
    constructor(loanTableHandler, filterButtonHandler) {
      this.loanTableHandler = loanTableHandler;
      this.filterButtonHandler = filterButtonHandler;
      this.observer = null;
    }

    startObserving() {
      // Create a MutationObserver to watch for DOM changes
      this.observer = new MutationObserver((mutations) => {
        // Check if we need to attach to the filter button
        if (!this.filterButtonHandler.buttonAttached) {
          this.filterButtonHandler.buttonAttached = this.filterButtonHandler.attachToFilterButton();
        }
      });

      // Start observing
      this.observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }

    stopObserving() {
      if (this.observer) {
        this.observer.disconnect();
      }
    }
  }

  // Initialize the application
  function initializeApp() {
    // Create the loan table handler
    const loanTableHandler = new LoanTableHandler(storedNumbers);
    
    // Create the filter button handler
    const filterButtonHandler = new FilterButtonHandler(loanTableHandler);
    
    // Try to attach to the filter button with retry
    filterButtonHandler.tryAttachWithRetry();
    
    // Create and start the DOM observer
    const domObserver = new DomChangeObserver(loanTableHandler, filterButtonHandler);
    domObserver.startObserving();
    
    // Monitor URL changes (similar to msi-loan-ext.js)
    onValueChange(() => document.location.href, async (newVal, oldVal) => {
      if (newVal !== oldVal) {
        console.log(`URL changed from ${oldVal} to ${newVal}`);
        
        // Reset button attached flag to try again with the new page
        filterButtonHandler.buttonAttached = false;
        
        // Try to attach to the filter button again
        setTimeout(() => {
          filterButtonHandler.tryAttachWithRetry();
        }, 500);
      }
    });
    
    console.log('Filter script initialized. Waiting for Apply Filter button to be clicked.');
  }

  // Start the application
  initializeApp();
})();