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

  // Create a class to manage the search grid view, similar to ViewElement in the reference
  class SearchGridElement {
    constructor() {
      this.searchGrid = document.querySelector("#searchGrid");
      this.errorMessageDiv = document.querySelector("#errorMessageSearch");
    }

    hide() {
      if (this.searchGrid) {
        this.searchGrid.style.display = "none";
      }
    }

    show() {
      if (this.searchGrid) {
        this.searchGrid.style.display = "block";
      }
    }

    showRestrictedMessage() {
      if (this.errorMessageDiv) {
        this.errorMessageDiv.textContent =
          "Loan is not provisioned to the user";
        this.errorMessageDiv.style.display = "block";
      }
    }

    hideRestrictedMessage() {
      if (this.errorMessageDiv) {
        this.errorMessageDiv.style.display = "none";
      }
    }
  }

  // Function to monitor value changes, similar to onValueChange in the reference
  function onValueChange(evalFunction, callback, options = {}) {
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
      if (newValue === "") newValue = null;

      if (lastValue === newValue) return;
      lastValue = newValue;

      await callback(newValue, lastValue);
    }, options.interval || 500);

    return intervalId;
  }

  // Function to find the loan table
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

  // Function to check if exact search is selected
  function isExactSearch() {
    const exactSearchCheckbox = document.querySelector("#IsExactSearch");
    return exactSearchCheckbox && exactSearchCheckbox.checked;
  }

  // Function to get the loan type
  function getLoanType() {
    const loanTypeSelect = document.querySelector("#LoanTypeCd");
    return loanTypeSelect ? loanTypeSelect.value : null;
  }

  // Function to get the loan number
  function getLoanNumber() {
    const loanNumberInput = document.querySelector("#LoanNumber");
    return loanNumberInput ? loanNumberInput.value.trim() : null;
  }

  // Function to update pagination info
  function updatePaginationInfo(visibleCount) {
    const paginationInfo = document.querySelector(".pagination-info");
    if (paginationInfo) {
      paginationInfo.textContent = `Showing ${visibleCount} of ${visibleCount} records`;
    }
  }

  // Function to extract loan number from text
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

  // Function to check if a loan number exists in storedNumbersSet
  function isLoanNumberProvisioned(loanNumber) {
    if (!loanNumber) return false;

    // Direct match
    if (storedNumbers.has(loanNumber)) {
      return true;
    }

    // Try as a number if it's numeric
    if (/^\d+$/.test(loanNumber)) {
      const numericValue = Number(loanNumber);
      if (storedNumbers.has(numericValue)) {
        return true;
      }
    }

    // Try as a string if stored as number
    if (!isNaN(loanNumber)) {
      const stringValue = String(loanNumber);
      if (storedNumbers.has(stringValue)) {
        return true;
      }
    }

    // Check by iterating through the set (for case-insensitive or partial matches)
    let isMatch = false;
    storedNumbers.forEach((num) => {
      const storedStr = String(num).toLowerCase();
      const currentStr = String(loanNumber).toLowerCase();

      if (
        storedStr === currentStr ||
        storedStr.includes(currentStr) ||
        currentStr.includes(storedStr)
      ) {
        isMatch = true;
      }
    });

    return isMatch;
  }

  // Function to filter the table
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

    console.log(
      `Filtering table - isExact: ${isExact}, loanNumber: ${loanNumber}, loanType: ${loanType}`
    );

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

          if (
            label &&
            value &&
            ((loanType === "Servicer" &&
              label.textContent.trim() === "Servicer:") ||
              (loanType === "Investor" &&
                label.textContent.trim() === "Investor:"))
          ) {
            loanValue = value.textContent.trim();
            break;
          }
        }
      }

      if (loanValue) {
        console.log(`Checking ${loanType} value: "${loanValue}"`);

        // Check if this loan value is in storedNumbersSet
        const isInStoredSet = isLoanNumberProvisioned(loanValue);
        console.log(`Loan "${loanValue}" in storedSet: ${isInStoredSet}`);

        // First check: Is the loan in storedNumbersSet? (Always required)
        if (!isInStoredSet) {
          console.log(
            `Loan "${loanValue}" is not in storedNumbersSet, hiding row`
          );
          row.style.display = "none";
          removedCount++;
          return; // Skip to next row
        }

        let isMatch = false;

        // For exact search with a loan number, check if it matches
        if (isExact && loanNumber) {
          // Check if the loan number matches the search criteria
          if (
            loanValue.includes(loanNumber) ||
            loanNumber.includes(loanValue) ||
            loanValue.toLowerCase() === loanNumber.toLowerCase()
          ) {
            isMatch = true;
            console.log(
              `Match found for exact search: "${loanValue}" matches "${loanNumber}"`
            );
          }
        } else {
          // For non-exact search or no loan number, consider it a match
          // But still only show loans that are in storedNumbersSet (already checked above)
          isMatch = true;
          console.log(
            `Match by default because exact search is off or no specific loan number`
          );
        }

        if (!isMatch) {
          row.style.display = "none";
          removedCount++;
        } else {
          row.style.display = "";
          visibleCount++;
        }
      } else {
        // If no loan value found for the selected type, hide the row
        row.style.display = "none";
        removedCount++;
      }
    });

    // Update pagination info
    updatePaginationInfo(visibleCount);

    console.log(
      `Filtered out ${removedCount} rows, showing ${visibleCount} rows`
    );
  }

  // Function to handle form submission
  function handleFormSubmission(event) {
    const searchGridElement = new SearchGridElement();
    const isExact = isExactSearch();
    const loanNumber = getLoanNumber();
    const loanType = getLoanType();

    console.log(
      `Submit clicked - isExact: ${isExact}, loanNumber: ${loanNumber}, loanType: ${loanType}`
    );

    if (isExact && loanNumber && loanType) {
      console.log(
        `Exact search selected for loan number: ${loanNumber}, type: ${loanType}`
      );

      // Check if the loan number is in the storedNumbersSet
      if (!isLoanNumberProvisioned(loanNumber)) {
        console.log(`Loan number ${loanNumber} is not provisioned to the user`);
        searchGridElement.showRestrictedMessage();
        searchGridElement.hide();

        // Prevent the default form submission
        if (event) {
          event.preventDefault();
        }
        return false;
      } else {
        console.log(`Loan number ${loanNumber} is provisioned to the user`);
        searchGridElement.hideRestrictedMessage();
        searchGridElement.show();

        // Apply filtering
        filterTable();
      }
    } else {
      // For non-exact search, show the grid and apply filtering
      searchGridElement.hideRestrictedMessage();
      searchGridElement.show();

      // Apply filtering to show only loans in storedNumbersSet
      filterTable();

      console.log("Non-exact search: Showing only loans in storedNumbersSet");
    }
  }

  // Set up the initial filtering
  filterTable();

  // Set up mutation observer for the table
  const tableContainer =
    findLoanTable()?.closest("table") ||
    document.querySelector(".new-ui-table.striped") ||
    document.querySelector("table");
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

  // Set up event listeners using the onValueChange approach
  const searchForm = document.querySelector("#search-loan-form");
  if (searchForm) {
    // Monitor changes to the form inputs
    onValueChange(
      () => getLoanNumber(),
      (newValue) => {
        if (!isExactSearch()) {
          filterTable();
        }
      }
    );

    onValueChange(
      () => getLoanType(),
      (newValue) => {
        if (!isExactSearch()) {
          filterTable();
        }
      }
    );

    onValueChange(
      () => isExactSearch(),
      (newValue) => {
        if (!newValue) {
          filterTable();
        }
      }
    );

    // Add event listener to the submit button
    const submitButton = document.querySelector("#btnSubmit");
    if (submitButton) {
      console.log("Found submit button, adding event listener");
      submitButton.addEventListener("click", handleFormSubmission);
    } else {
      console.error("Submit button not found");
    }
  }

  // Monitor URL changes (similar to the reference file)
  onValueChange(
    () => document.location.href,
    async (newVal) => {
      console.log(`URL changed to: ${newVal}`);
      // Re-apply filtering when URL changes
      setTimeout(filterTable, 500);
    }
  );
})();
