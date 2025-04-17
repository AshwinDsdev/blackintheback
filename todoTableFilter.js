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

  function filterTable() {
    const loanTable = findLoanTable();

    if (!loanTable) {
      console.error("Loan table not found");
      return;
    }

    console.log(
      `Filtering table with ${storedNumbers.size} stored loan numbers`
    );

    const rows = loanTable.querySelectorAll("tr");
    let removedCount = 0;

    const headerRow =
      loanTable.querySelector("tr:first-child") ||
      document.querySelector("thead tr");

    const servicerColumnIndex = findServicerColumnIndex(headerRow);
    console.log(`Servicer column index: ${servicerColumnIndex}`);

    rows.forEach((row) => {
      let servicerValue = null;
      const cells = row.querySelectorAll("td");

      if (cells.length === 0) return;

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
        } else {
          console.log(`Match found - Keeping row with value: ${servicerValue}`);
          row.style.display = "";
        }
      }
    });

    console.log(
      `Filtered out ${removedCount} rows that were not in storedNumbersSet`
    );
  }

  filterTable();

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
})();
