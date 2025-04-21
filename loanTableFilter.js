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

  function findLoanTable() {
    const possibleTables = [
      document.querySelector(".new-ui-table.striped tbody"),
      document.querySelector("table.striped tbody"),
      document.querySelector("table tbody"),
    ];

    for (const table of possibleTables) {
      if (table) return table;
    }

    return null;
  }

  function isExactSearch() {
    const exactSearchCheckbox = document.querySelector('#IsExactSearch');
    return exactSearchCheckbox && exactSearchCheckbox.checked;
  }

  function getLoanType() {
    const loanTypeSelect = document.querySelector('#LoanTypeCd');
    return loanTypeSelect ? loanTypeSelect.value : null;
  }

  function getLoanNumber() {
    const loanNumberInput = document.querySelector('#LoanNumber');
    return loanNumberInput ? loanNumberInput.value.trim() : null;
  }

  function showRestrictedMessage() {
    const errorMessageDiv = document.querySelector('#errorMessageSearch');
    if (errorMessageDiv) {
      errorMessageDiv.textContent = 'You are not provisioned for this loan';
      errorMessageDiv.style.display = 'block';
    }
  }

  function hideRestrictedMessage() {
    const errorMessageDiv = document.querySelector('#errorMessageSearch');
    if (errorMessageDiv) {
      errorMessageDiv.style.display = 'none';
    }
  }

  function updatePaginationInfo(visibleCount) {
    const paginationInfo = document.querySelector('.pagination-info');
    if (paginationInfo) {
      paginationInfo.textContent = `Showing ${visibleCount} of ${visibleCount} records`;
    }
  }

  function filterTable() {
    const loanTable = findLoanTable();

    if (!loanTable) {
      console.error("Loan table not found");
      return;
    }

    const rows = loanTable.querySelectorAll("tr");
    let removedCount = 0;
    let visibleCount = 0;

    // Get current search parameters
    const loanNumber = getLoanNumber();
    const loanType = getLoanType();
    const isExact = isExactSearch();

    // Check if this is a single loan search
    const isSingleLoanSearch = loanNumber && loanType;

    rows.forEach((row) => {
      let loanValue = null;

      // Find the loan number cell (first cell in the row)
      const loanCell = row.querySelector("td:first-child");
      if (loanCell) {
        // Find the div containing the selected loan type
        const loanTypeDivs = loanCell.querySelectorAll("div.flex");
        for (const div of loanTypeDivs) {
          const label = div.querySelector("div:first-child");
          const value = div.querySelector("div.ml-2");
          
          if (label && value && 
              ((loanType === 'Servicer' && label.textContent.trim() === 'Servicer:') ||
               (loanType === 'Investor' && label.textContent.trim() === 'Investor:'))) {
            loanValue = value.textContent.trim();
            break;
          }
        }
      }

      if (loanValue) {
        console.log(`Checking ${loanType} value: "${loanValue}"`);
        console.log(`Type of loanValue: ${typeof loanValue}`);
        console.log(`Length of loanValue: ${loanValue.length}`);

        let isMatch = false;

        // Direct match
        if (storedNumbers.has(loanValue)) {
          isMatch = true;
          console.log(`Direct match found for "${loanValue}"`);
        }

        // Try as a number if it's numeric
        if (!isMatch && /^\d+$/.test(loanValue)) {
          const numericValue = Number(loanValue);
          if (storedNumbers.has(numericValue)) {
            isMatch = true;
            console.log(`Numeric match found for ${numericValue}`);
          }
        }

        // Try as a string if stored as number
        if (!isMatch && !isNaN(loanValue)) {
          const stringValue = String(loanValue);
          if (storedNumbers.has(stringValue)) {
            isMatch = true;
            console.log(`String match found for "${stringValue}"`);
          }
        }

        // Check by iterating through the set (for case-insensitive or partial matches)
        if (!isMatch) {
          storedNumbers.forEach((num) => {
            const storedStr = String(num).toLowerCase();
            const currentStr = String(loanValue).toLowerCase();

            if (
              storedStr === currentStr ||
              storedStr.includes(currentStr) ||
              currentStr.includes(storedStr)
            ) {
              isMatch = true;
              console.log(`Fuzzy match found: "${loanValue}" matches "${num}"`);
            }
          });
        }

        if (!isMatch) {
          row.style.display = "none";
          removedCount++;
        } else {
          row.style.display = "";
          visibleCount++;
        }
      }
    });

    // Handle special cases for single loan search
    if (isSingleLoanSearch) {
      if (visibleCount === 0) {
        showRestrictedMessage();
      } else {
        hideRestrictedMessage();
      }
    } else {
      hideRestrictedMessage();
    }

    // Update pagination info
    updatePaginationInfo(visibleCount);

    console.log(`Filtered out ${removedCount} rows that were not in storedNumbersSet`);
  }

  function extractLoanNumber(text) {
    let number = text.trim();
    
    // Extract number after "Servicer:" or "Investor:"
    if (number.includes("Servicer:")) {
      number = number.split("Servicer:")[1].trim();
    } else if (number.includes("Investor:")) {
      number = number.split("Investor:")[1].trim();
    }

    // Extract numeric part if needed
    if (!/^\d+$/.test(number)) {
      const numericMatch = number.match(/\d+/);
      if (numericMatch) {
        number = numericMatch[0];
      }
    }

    return number;
  }

  filterTable();

  const tableContainer = findLoanTable()?.closest("table") || document.querySelector(".new-ui-table.striped") || document.querySelector("table");

  if (tableContainer) {
    const observer = new MutationObserver((mutations) => {
      console.log("Table mutation detected, reapplying filter");
      filterTable();
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

  // Add event listeners for search form changes
  const searchForm = document.querySelector('#search-loan-form');
  if (searchForm) {
    const loanNumberInput = searchForm.querySelector('#LoanNumber');
    const loanTypeSelect = searchForm.querySelector('#LoanTypeCd');
    const exactSearchCheckbox = searchForm.querySelector('#IsExactSearch');

    if (loanNumberInput) {
      loanNumberInput.addEventListener('input', filterTable);
    }
    if (loanTypeSelect) {
      loanTypeSelect.addEventListener('change', filterTable);
    }
    if (exactSearchCheckbox) {
      exactSearchCheckbox.addEventListener('change', filterTable);
    }
  }
})();
