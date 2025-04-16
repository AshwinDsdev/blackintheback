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

    rows.forEach((row) => {
      let servicerValue = null;

      const cells = row.querySelectorAll("td");

      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        if (
          cell.getAttribute("data-column") === "Servicer" ||
          cell.classList.contains("servicer-column") ||
          cell.textContent.includes("Servicer:")
        ) {
          servicerValue = cell.textContent.trim();
          console.log(`Raw Servicer text: "${servicerValue}"`);

          // Extract the number after "Servicer:"
          if (servicerValue.includes("Servicer:")) {
            servicerValue = servicerValue.split("Servicer:")[1].trim();
            console.log(
              `After extracting from 'Servicer:': "${servicerValue}"`
            );
          }

          if (/^\d+$/.test(servicerValue)) {
          } else if (/\d+/.test(servicerValue)) {
            const numericMatch = servicerValue.match(/\d+/);
            if (numericMatch) {
              const numericPart = numericMatch[0];
              console.log(
                `Extracted numeric part: "${numericPart}" from "${servicerValue}"`
              );
              servicerValue = numericPart;
            }
          }

          console.log(`Final Servicer value: "${servicerValue}"`);
          break;
        }
      }

      if (!servicerValue) {
        const headerRow =
          loanTable.querySelector("tr:first-child") ||
          document.querySelector("thead tr");

        if (headerRow) {
          const headerCells = headerRow.querySelectorAll("th");
          let servicerColumnIndex = -1;

          for (let i = 0; i < headerCells.length; i++) {
            if (headerCells[i].textContent.trim().includes("Servicer")) {
              servicerColumnIndex = i;
              break;
            }
          }

          if (servicerColumnIndex >= 0 && cells.length > servicerColumnIndex) {
            servicerValue = cells[servicerColumnIndex].textContent.trim();
            console.log(
              `Found Servicer value by column index: ${servicerValue}`
            );
          }
        }
      }

      if (servicerValue) {
        console.log(`Checking Servicer value: "${servicerValue}"`);
        console.log(`Type of servicerValue: ${typeof servicerValue}`);
        console.log(`Length of servicerValue: ${servicerValue.length}`);

        // Try different formats to match with storedNumbersSet
        let isMatch = false;

        // 1. Direct match
        if (storedNumbers.has(servicerValue)) {
          isMatch = true;
          console.log(`Direct match found for "${servicerValue}"`);
        }

        // 2. Try as a number if it's numeric
        if (!isMatch && /^\d+$/.test(servicerValue)) {
          const numericValue = Number(servicerValue);
          if (storedNumbers.has(numericValue)) {
            isMatch = true;
            console.log(`Numeric match found for ${numericValue}`);
          }
        }

        // 3. Try as a string if stored as number
        if (!isMatch && !isNaN(servicerValue)) {
          const stringValue = String(servicerValue);
          if (storedNumbers.has(stringValue)) {
            isMatch = true;
            console.log(`String match found for "${stringValue}"`);
          }
        }

        // 4. Check by iterating through the set (for case-insensitive or partial matches)
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
            `No match found - Hiding row with Servicer: ${servicerValue}`
          );
          row.style.display = "none";
          removedCount++;
        } else {
          console.log(
            `Match found - Keeping row with Servicer: ${servicerValue}`
          );
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
