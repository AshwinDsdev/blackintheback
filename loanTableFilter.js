(function () {
  console.log("window.storedNumbersSet:", window.storedNumbersSet);
  if (!window.storedNumbersSet || !(window.storedNumbersSet instanceof Set)) {
    console.error("window.storedNumbersSet is not defined or not a Set object");
    return;
  }

  const storedNumbers = window.storedNumbersSet;

  const loanTable = document.querySelector(".new-ui-table.striped tbody");

  if (!loanTable) {
    console.error("Loan table not found");
    return;
  }

  console.log(`Filtering table with ${storedNumbers.size} stored loan numbers`);

  const rows = loanTable.querySelectorAll("tr");
  let removedCount = 0;

  rows.forEach((row) => {
    const loanAnchor = row.querySelector(".grid-loan-anchor");

    if (loanAnchor) {
      const loanNumber = loanAnchor.getAttribute("data-loannum");
      console.log(`Checking loan number: ${loanNumber}`);

      if (!storedNumbers.has(loanNumber)) {
        row.style.display = "none";
        removedCount++;
      }
    }
  });

  console.log(
    `Filtered out ${removedCount} loans that were not in storedNumbersSet`
  );
})();
