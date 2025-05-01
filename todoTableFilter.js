(function () {
  // Check if storedNumbersSet exists
  if (!window.storedNumbersSet || !(window.storedNumbersSet instanceof Set)) {
    console.error("window.storedNumbersSet is not defined or not a Set object");
    return;
  }

  const storedNumbers = window.storedNumbersSet;
  console.log(`Loaded storedNumbersSet with ${storedNumbers.size} entries`);

  // Flag to track if filtering has been applied
  let filteringApplied = false;

  // Function to monitor value changes, similar to the reference file
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
    }, 500);
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

  // Class to handle table elements, similar to ViewElement in the reference file
  class LoanTableHandler {
    constructor() {
      this.table = this.findLoanTable();
      this.rows = this.table
        ? Array.from(this.table.querySelectorAll("tr"))
        : [];
      this.visibleCount = 0;
      this.totalCount = this.rows.length;
      this.removedCount = 0;
      this.loanNumberCache = new Map(); // Cache loan numbers by row
    }

    // Find the loan table
    findLoanTable() {
      // Try various selectors to find the table
      const tableSelectors = [
        ".todo-table tbody",
        ".workflow-table tbody",
        ".task-table tbody",
        "table.striped tbody",
        "table tbody",
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

    // Get loan number from a row
    getLoanNumberFromRow(row) {
      // Check cache first
      if (this.loanNumberCache.has(row)) {
        return this.loanNumberCache.get(row);
      }

      const cells = row.querySelectorAll("td");
      if (cells.length === 0) return null; // Skip header rows

      let loanNumber = null;

      // Try to find a loan number in any cell
      for (const cell of cells) {
        const extractedNumber = extractLoanNumber(cell.textContent);
        if (extractedNumber) {
          loanNumber = extractedNumber;
          break;
        }
      }

      // Cache the result
      this.loanNumberCache.set(row, loanNumber);
      return loanNumber;
    }

    // Check if a loan number is allowed
    isLoanNumberAllowed(loanNumber) {
      if (!loanNumber) return false;

      // Direct match
      if (storedNumbers.has(loanNumber)) {
        return true;
      }

      // Numeric comparison
      if (/^\d+$/.test(loanNumber)) {
        const numericValue = Number(loanNumber);
        if (storedNumbers.has(numericValue)) {
          return true;
        }
      }

      // String comparison
      const stringValue = String(loanNumber);
      if (storedNumbers.has(stringValue)) {
        return true;
      }

      // Partial matches
      for (const num of storedNumbers) {
        const storedStr = String(num).toLowerCase();
        const currentStr = String(loanNumber).toLowerCase();

        if (
          storedStr === currentStr ||
          storedStr.includes(currentStr) ||
          currentStr.includes(storedStr)
        ) {
          return true;
        }
      }

      return false;
    }

    // Filter the table
    filterTable() {
      if (!this.table) {
        console.error("Loan table not found");
        return;
      }

      console.log(
        `Filtering table with ${storedNumbers.size} allowed loan numbers`
      );

      this.visibleCount = 0;
      this.removedCount = 0;

      // Store the original table parent and next sibling to reinsert it later
      const tableParent = this.table.parentNode;
      const nextSibling = this.table.nextSibling;

      // Create a document fragment to work with the rows without affecting the live DOM
      const fragment = document.createDocumentFragment();
      fragment.appendChild(this.table.cloneNode(false)); // Clone the table without its children

      // Process each row
      this.rows.forEach((row) => {
        const cells = row.querySelectorAll("td");
        if (cells.length === 0) {
          // This is a header row, always keep it
          const clonedRow = row.cloneNode(true);
          fragment.firstChild.appendChild(clonedRow);
          return;
        }

        const loanNumber = this.getLoanNumberFromRow(row);

        if (loanNumber) {
          const isAllowed = this.isLoanNumberAllowed(loanNumber);

          // Clone the row and add it to our fragment
          const clonedRow = row.cloneNode(true);

          // Show or hide the row
          if (isAllowed) {
            clonedRow.style.display = "";
            this.visibleCount++;
            fragment.firstChild.appendChild(clonedRow);
          } else {
            this.removedCount++;
            // Don't add non-matching rows to the fragment
          }
        } else {
          // If no loan number found, keep the row visible
          const clonedRow = row.cloneNode(true);
          fragment.firstChild.appendChild(clonedRow);
          this.visibleCount++;
        }
      });

      console.log(
        `Filtering complete. Removed: ${this.removedCount}, Visible: ${this.visibleCount}`
      );

      // Set flag to indicate filtering has been applied
      filteringApplied = true;

      // Replace the original table with our filtered version
      if (tableParent) {
        // Remove the original table
        this.table.remove();

        // Insert the new filtered table
        if (nextSibling) {
          tableParent.insertBefore(fragment.firstChild, nextSibling);
        } else {
          tableParent.appendChild(fragment.firstChild);
        }

        // Update the table reference
        this.table =
          tableParent.querySelector("tbody") ||
          tableParent.querySelector("table");
        this.rows = this.table
          ? Array.from(this.table.querySelectorAll("tr"))
          : [];
      }

      // Update pagination and total count information
      updatePaginationAndCount(
        this.visibleCount,
        this.removedCount + this.visibleCount
      );

      // Show a message about the filtering
      showFilterMessage(this.visibleCount);
    }
  }

  // Function to update pagination and total count information
  function updatePaginationAndCount(visibleCount, totalCount) {
    console.log(
      `Updating pagination and count: Visible=${visibleCount}, Total=${totalCount}`
    );

    // Update total count displays
    updateTotalCountDisplays(visibleCount, totalCount);

    // Update pagination elements
    updatePaginationElements(visibleCount);
  }

  // Function to update total count displays
  function updateTotalCountDisplays(visibleCount, totalCount) {
    // Check for specific count elements in your page
    const countElements = [
      // Add specific IDs or classes that show count information
      { selector: "#total-records", regex: /\d+/ },
      { selector: "#records-count", regex: /\d+/ },
      { selector: ".total-items", regex: /\d+/ },
      { selector: ".records-showing", regex: /\d+/ },
    ];

    // Update specific count elements
    countElements.forEach((item) => {
      const elements = document.querySelectorAll(item.selector);
      elements.forEach((el) => {
        const originalText = el.textContent;
        el.textContent = el.textContent.replace(item.regex, visibleCount);
        console.log(
          `Updated specific count element: ${originalText} -> ${el.textContent}`
        );
      });
    });

    // Common patterns for total count displays
    const countPatterns = [
      // Look for elements containing text like "Showing 1-10 of 100 entries"
      {
        selector:
          ".dataTables_info, .showing-entries, .count-display, .results-count, .pagination-info",
        update: (el) => {
          if (el.textContent.match(/showing|entries|results|records|items/i)) {
            // Extract the pattern: "Showing X to Y of Z entries"
            const match = el.textContent.match(
              /showing\s+\d+\s+to\s+\d+\s+of\s+\d+/i
            );
            if (match) {
              const originalText = el.textContent;
              // Replace just the total number
              el.textContent = originalText.replace(
                /of\s+\d+/i,
                `of ${visibleCount}`
              );
              console.log(
                `Updated count display: ${originalText} -> ${el.textContent}`
              );
            } else {
              el.textContent = `Showing 1 to ${visibleCount} of ${visibleCount} entries`;
            }
          }
        },
      },

      // Look for simple count displays like "Total: 100"
      {
        selector: ".total-count, .count, .total, .record-count",
        update: (el) => {
          if (el.textContent.match(/total|count|records|results|items/i)) {
            const originalText = el.textContent;
            el.textContent = el.textContent.replace(/\d+/, visibleCount);
            console.log(
              `Updated simple count: ${originalText} -> ${el.textContent}`
            );
          }
        },
      },
    ];

    // Try each pattern
    countPatterns.forEach((pattern) => {
      try {
        const elements = document.querySelectorAll(pattern.selector);
        elements.forEach(pattern.update);
      } catch (err) {
        console.error(
          `Error updating count with pattern ${pattern.selector}:`,
          err
        );
      }
    });

    // Look for any element that might contain count information
    const countRegexes = [
      {
        regex: /(\d+)\s*(results|entries|records|items|loans|accounts)/i,
        replace: `${visibleCount} $2`,
      },
      {
        regex: /showing\s+(\d+)\s+to\s+(\d+)\s+of\s+\d+/i,
        replace: `showing 1 to ${visibleCount} of ${visibleCount}`,
      },
      { regex: /total\s*:\s*\d+/i, replace: `Total: ${visibleCount}` },
      { regex: /found\s+\d+\s+items/i, replace: `found ${visibleCount} items` },
    ];

    // Apply each regex to potential elements
    countRegexes.forEach((regexItem) => {
      const possibleCountElements = Array.from(
        document.querySelectorAll("div, span, p")
      ).filter((el) => regexItem.regex.test(el.textContent));

      possibleCountElements.forEach((el) => {
        const originalText = el.textContent;
        el.textContent = el.textContent.replace(
          regexItem.regex,
          regexItem.replace
        );
        console.log(
          `Updated possible count element: ${originalText} -> ${el.textContent}`
        );
      });
    });
  }

  // Function to update pagination elements
  function updatePaginationElements(visibleCount) {
    // Update the total pages indicator
    const totalPagesSpan = document.getElementById("page-tot-pages");
    if (totalPagesSpan) {
      const originalText = totalPagesSpan.textContent;
      totalPagesSpan.textContent = "Pages: 1";
      console.log(
        `Updated total pages: ${originalText} -> ${totalPagesSpan.textContent}`
      );
    }

    // Handle the specific page-numbers div
    const pageNumbersDiv = document.querySelector(".page-numbers");
    if (pageNumbersDiv) {
      console.log("Found page-numbers div, updating pagination");

      // Get all page number links
      const pageLinks = pageNumbersDiv.querySelectorAll(
        ".page-selector.page-number"
      );

      // If we have only one page or few items, keep only the first page link
      if (visibleCount <= 10) {
        // First, make sure all page links have the correct numbers (1, 2, 3, 4)
        pageLinks.forEach((link, index) => {
          // Set the correct page number text
          link.textContent = (index + 1).toString();
        });

        // Then, keep only the first page and hide others
        pageLinks.forEach((link, index) => {
          if (index === 0) {
            // Keep only the first page and make sure it's selected
            link.classList.add("selected");
            link.setAttribute("data-page", "1");
            link.textContent = "1";
            link.style.display = "";
          } else {
            // Remove other page links
            link.style.display = "none";
          }
        });
        console.log("Updated page-numbers div: showing only page 1");
      } else {
        // If we have more items, still update all links
        pageLinks.forEach((link, index) => {
          // First fix the page numbers
          link.textContent = (index + 1).toString();

          if (index === 0) {
            // Make first page selected
            link.classList.add("selected");
            link.setAttribute("data-page", "1");
            link.style.display = "";
          } else {
            // Hide other pages
            link.style.display = "none";
          }
        });
      }
    }

    // Find standard pagination elements (for other pagination types)
    const paginationElements = document.querySelectorAll(
      '.pagination, .pager, nav[aria-label*="pagination"], ul.page-numbers'
    );

    paginationElements.forEach((pagination) => {
      // Skip if this is the page-numbers div we already handled
      if (pagination.classList.contains("page-numbers")) {
        return;
      }

      // If we have no visible items or just a few, we might want to hide pagination
      if (visibleCount <= 10) {
        pagination.style.display = "none";
        console.log("Hiding pagination as there are few visible items");
        return;
      }

      // Otherwise, we might want to update the page numbers
      const pageItems = pagination.querySelectorAll("li, a, span.page-numbers");

      // Keep only first page active, disable others
      pageItems.forEach((item, index) => {
        // Remove all active/current classes
        item.classList.remove("active", "current", "selected");

        // If this is a page number (not prev/next/etc)
        if (/^\d+$/.test(item.textContent.trim())) {
          const pageNum = parseInt(item.textContent.trim());

          // Make first page active
          if (pageNum === 1) {
            item.classList.add("active", "current", "selected");

            // If it's a link, update aria attributes
            if (item.tagName === "A") {
              item.setAttribute("aria-current", "page");
            }
          } else {
            // Hide or disable other pages
            if (item.tagName === "A") {
              item.setAttribute("aria-disabled", "true");
              item.style.pointerEvents = "none";
              item.style.opacity = "0.5";
            } else if (item.tagName === "LI") {
              item.style.display = "none";
            }
          }
        }

        // Disable next/last buttons
        if (item.textContent.match(/next|last|»|›/i)) {
          item.classList.add("disabled");
          if (item.tagName === "A") {
            item.setAttribute("aria-disabled", "true");
            item.style.pointerEvents = "none";
            item.style.opacity = "0.5";
          }
        }
      });

      console.log("Updated pagination elements");
    });

    // Update any other page number indicators
    const pageIndicators = document.querySelectorAll(
      ".page-number:not(.page-selector), .current-page"
    );
    pageIndicators.forEach((indicator) => {
      indicator.textContent = "1";
      console.log("Reset page indicator to page 1");
    });
  }

  // Function to show a message after filtering
  function showFilterMessage(visibleCount) {
    // Remove any existing message
    const existingMsg = document.getElementById("filter-message");
    if (existingMsg) {
      existingMsg.remove();
    }

    // Create a new message
    const msgDiv = document.createElement("div");
    msgDiv.id = "filter-message";
    msgDiv.style.padding = "10px 15px";
    msgDiv.style.margin = "10px 0";
    msgDiv.style.borderRadius = "4px";
    msgDiv.style.backgroundColor = "#d4edda";
    msgDiv.style.color = "#155724";
    msgDiv.style.border = "1px solid #c3e6cb";
    msgDiv.style.fontWeight = "bold";
    msgDiv.style.textAlign = "center";
    msgDiv.style.position = "fixed";
    msgDiv.style.top = "10px";
    msgDiv.style.left = "50%";
    msgDiv.style.transform = "translateX(-50%)";
    msgDiv.style.zIndex = "9999";
    msgDiv.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
    msgDiv.style.maxWidth = "80%";

    msgDiv.textContent = `Filtering complete! Showing ${visibleCount} loans you have access to (${storedNumbers.size} available).`;

    // Add the message to the body
    document.body.appendChild(msgDiv);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (msgDiv.parentNode) {
        msgDiv.remove();
      }
    }, 5000);
  }

  // Function to create an unallowed element message (similar to reference file)
  function createUnallowedElement() {
    const unallowed = document.createElement("div");
    unallowed.appendChild(
      document.createTextNode(
        "Loans not provisioned to the user have been hidden"
      )
    );
    unallowed.className = "filter-message";
    unallowed.style.padding = "10px 15px";
    unallowed.style.margin = "10px 0";
    unallowed.style.borderRadius = "4px";
    unallowed.style.backgroundColor = "#f8d7da";
    unallowed.style.color = "#721c24";
    unallowed.style.border = "1px solid #f5c6cb";
    unallowed.style.fontWeight = "bold";
    unallowed.style.textAlign = "center";

    return unallowed;
  }

  // Function to handle URL changes and filter automatically
  function setupUrlChangeMonitoring() {
    let lastUrl = document.location.href;
    let filteringInProgress = false;

    // Monitor URL changes
    onValueChange(
      () => document.location.href,
      async (newUrl) => {
        // Skip if we're already filtering or if the URL hasn't really changed
        // (sometimes hash changes don't require refiltering)
        if (
          filteringInProgress ||
          (newUrl && lastUrl && newUrl.split("#")[0] === lastUrl.split("#")[0])
        ) {
          return;
        }

        lastUrl = newUrl;
        console.log(`URL changed to: ${newUrl}`);

        // Wait a moment for the page to load
        setTimeout(() => {
          // Check if page is fully loaded
          if (document.readyState !== "complete") {
            console.log("Page not fully loaded yet, waiting...");
            return;
          }

          // Check if we have a table to filter
          const tableHandler = new LoanTableHandler();
          if (!tableHandler.table || tableHandler.rows.length === 0) {
            console.log("No suitable table found for filtering");
            return;
          }

          // Check if we have any loan numbers in the table
          let hasLoanNumbers = false;
          for (let i = 0; i < Math.min(5, tableHandler.rows.length); i++) {
            const row = tableHandler.rows[i];
            const loanNumber = tableHandler.getLoanNumberFromRow(row);
            if (loanNumber) {
              hasLoanNumbers = true;
              break;
            }
          }

          if (!hasLoanNumbers) {
            console.log(
              "No loan numbers detected in table, skipping automatic filtering"
            );
            return;
          }

          // All checks passed, apply filtering
          console.log(
            "Found loan table with loan numbers, applying filter automatically"
          );
          filteringInProgress = true;

          try {
            tableHandler.filterTable();
          } catch (err) {
            console.error("Error during automatic filtering:", err);
          } finally {
            filteringInProgress = false;
          }
        }, 1500);
      },
      { maxTime: 3600000 }
    ); // Monitor for up to 1 hour
  }

  // Function to find and attach to the Apply Filter button
  function attachToFilterButton() {
    // Try to find the button using various selectors
    const buttonSelectors = [
      "#applyFilter",
      'button:contains("Apply Filter")',
      'input[value*="Apply Filter"]',
      'button:contains("Filter")',
      'input[value*="Filter"]',
      ".filter-button",
      "#filterBtn",
    ];

    let filterButton = null;

    // Helper function to find elements containing text
    function findElementsWithText(selector, text) {
      const elements = document.querySelectorAll(selector);
      return Array.from(elements).filter((el) =>
        el.textContent.toLowerCase().includes(text.toLowerCase())
      );
    }

    // Try each selector
    for (const selector of buttonSelectors) {
      if (selector.includes(":contains(")) {
        // Handle custom contains selector
        const [baseSelector, textToFind] = selector.split(":contains(");
        const text = textToFind.replace(/["')]/g, "");
        const elements = findElementsWithText(baseSelector, text);
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
      const allButtons = document.querySelectorAll(
        'button, input[type="button"], input[type="submit"]'
      );
      for (const btn of allButtons) {
        if (
          (btn.textContent &&
            btn.textContent.toLowerCase().includes("filter")) ||
          (btn.value && btn.value.toLowerCase().includes("filter"))
        ) {
          filterButton = btn;
          break;
        }
      }
    }

    // If we found a button, attach our handler
    if (filterButton) {
      console.log("Found filter button:", filterButton.outerHTML);

      // Only attach once
      if (filterButton._filterHandlerAttached) {
        return true;
      }

      // Mark as attached
      filterButton._filterHandlerAttached = true;

      // Add click handler
      filterButton.addEventListener("click", function (event) {
        // Prevent default form submission behavior
        event.preventDefault();
        event.stopPropagation();

        // Show loading state
        const originalText = filterButton.textContent || filterButton.value;
        const originalDisabled = filterButton.disabled;

        if (filterButton.tagName === "INPUT") {
          filterButton.value = "Filtering...";
        } else {
          filterButton.textContent = "Filtering...";
        }
        filterButton.disabled = true;

        // Apply filtering after a short delay
        setTimeout(() => {
          try {
            const tableHandler = new LoanTableHandler();
            tableHandler.filterTable();
          } catch (err) {
            console.error("Error during filtering:", err);
          }

          // Reset button state
          if (filterButton.tagName === "INPUT") {
            filterButton.value = originalText;
          } else {
            filterButton.textContent = originalText;
          }
          filterButton.disabled = originalDisabled;
        }, 100);

        // Return false to prevent form submission
        return false;
      });

      console.log("Successfully attached filter handler to button");
      return true;
    }

    console.log("Could not find filter button");
    return false;
  }

  // Initialize the script
  function initialize() {
    console.log("Initializing loan filter script");

    // Set up URL change monitoring (similar to reference file)
    setupUrlChangeMonitoring();

    // Try to attach to filter button
    let buttonAttached = false;

    // Try immediately
    buttonAttached = attachToFilterButton();

    // Try again after a delay
    setTimeout(() => {
      if (!buttonAttached) {
        buttonAttached = attachToFilterButton();
      }

      // If we still don't have a button, try to filter automatically
      if (!buttonAttached && !filteringApplied) {
        console.log("No filter button found, applying filter automatically");
        const tableHandler = new LoanTableHandler();
        if (tableHandler.table) {
          tableHandler.filterTable();
        }
      }
    }, 1000);

    // Try one more time after a longer delay
    setTimeout(() => {
      if (!buttonAttached) {
        buttonAttached = attachToFilterButton();
      }

      // If we still don't have a button and haven't filtered, try again
      if (!buttonAttached && !filteringApplied) {
        console.log("Still no filter button, applying filter automatically");
        const tableHandler = new LoanTableHandler();
        if (tableHandler.table) {
          tableHandler.filterTable();
        }
      }
    }, 3000);
  }

  // Start the script
  initialize();
})();
