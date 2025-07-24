document.getElementById("analyzeButton").addEventListener("click", async () => {
  const code = document.getElementById("codeInput").innerText.trim();
  const walletAddress = document.getElementById("walletInput").value;
  const language = document.querySelector("#newLanguageSelect .select-trigger").dataset.value || "";
  const resultDiv = document.getElementById("result");
  const loader = document.getElementById("loader");
  const loaderNote = document.getElementById("loader-note");
  const analyzeButton = document.getElementById("analyzeButton");

  if (!code || !walletAddress || !language) {
    resultDiv.innerHTML = `<p class="error">Please enter code, wallet address, and select a language.</p>`;
    resultDiv.classList.add("show");
    return;
  }

  // Show loading state on button instead of disabling
  const originalButtonText = analyzeButton.textContent;
  analyzeButton.textContent = "Analyzing...";
  resultDiv.classList.remove("show");
  loader.style.display = "block";
  loaderNote.style.display = "block";
  loaderNote.textContent = "Processing your request, this may take up to a minute - please wait patiently.";

  try {
    const languages = await fetchLanguages();

    const response = await fetch("/v1/code-review-tool/review-suggestion-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, language, walletAddress }),
    });

    const data = await response.json();
    loader.style.display = "none";
    loaderNote.style.display = "none";

    if (data.status === false) {
      resultDiv.innerHTML = `<p class="error">${data.message}</p>`;
    } else if (data.status && data.data) {
      const review = data.data.review;
      const transactionId = data.data.transactionId;
      let issuesHtml = review.issues.length
        ? review.issues
            .map(
              (issue, index) =>
                `<div class="issues-item" style="animation-delay: ${index * 0.2}s"><span class="badge ${
                  issue.includes("error") ? "critical" : "warning"
                }">${issue}</span></div>`
            )
            .join("")
        : "<div class='issues-item'><span>No issues</span></div>";
      let suggestionsHtml = review.suggestions.length
        ? review.suggestions
            .map((suggestion, index) => `<div class="suggestion-part" style="animation-delay: ${index * 0.2}s"><p>${suggestion}</p></div>`)
            .join("")
        : "<div class='suggestion-part'><p>No suggestions</p></div>";

      resultDiv.innerHTML = `
        <div class="result-block"><h4>Issues Detected</h4><div class="issues-container">${issuesHtml}</div></div>
        <div class="result-block"><h4>Suggestions for Improvement</h4><div class="suggestions-container">${suggestionsHtml}</div></div>
        <div class="result-block"><h4>Code Health Score</h4><div class="score-bar"><div class="score-bar-fill" style="width: ${
          review.score * 100
        }%"></div></div><p>Score: ${review.score.toFixed(2)} / 1.0</p></div>
        <div class="result-block transaction-block"><h4>Transaction Details</h4><p>Transaction ID: <a href="https://sepolia.etherscan.io/tx/${transactionId}" target="_blank"><span class="transaction-id" title="${transactionId}">${transactionId.slice(
        0,
        10
      )}...</span></a></p></div>
        <div class="result-block" style="text-align: center;">
          <button class="button" id="resetButton">Reset</button>
          <button class="button" id="downloadButton">Download Result</button>
        </div>
      `;
      resultDiv.classList.add("show");

      // Add reset functionality
      document.getElementById("resetButton").addEventListener("click", () => {
        document.getElementById("codeInput").innerText = "";
        document.getElementById("walletInput").value = "";
        document.querySelector("#newLanguageSelect .select-trigger").textContent = "Select Language";
        document.querySelector("#newLanguageSelect .select-trigger").dataset.value = "";
        resultDiv.classList.remove("show");
        analyzeButton.textContent = originalButtonText;
      });

      // Add download functionality as PDF with design
      document.getElementById("downloadButton").addEventListener("click", () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text("Code Health Analysis", 10, 10);
        doc.setLineWidth(0.5);
        doc.line(10, 15, 200, 15);
        doc.setFontSize(12);
        doc.text(`Issues Detected: ${review.issues.length ? review.issues.join("\n") : "No issues"}`, 10, 25);
        doc.text(`Suggestions: ${review.suggestions.length ? review.suggestions.join("\n") : "No suggestions"}`, 10, 40);
        doc.text(`Score: ${review.score.toFixed(2)} / 1.0`, 10, 55);
        doc.text(`Transaction ID: ${transactionId}`, 10, 70);
        doc.save("code_analysis_result.pdf");
      });

      // Add tooltip event listeners
      resultDiv.querySelectorAll(".tooltip").forEach((tooltip) => {
        tooltip.addEventListener("click", () => {
          navigator.clipboard.writeText(tooltip.textContent);
          const tooltiptext = tooltip.querySelector(".tooltiptext");
          tooltiptext.textContent = "Copied!";
          setTimeout(() => (tooltiptext.textContent = "Click to copy"), 2000);
        });
      });
    } else {
      resultDiv.innerHTML = `<p class="error">Unexpected response format</p>`;
    }
    resultDiv.classList.add("show");
    analyzeButton.textContent = originalButtonText; // Restore button text on completion
  } catch (error) {
    loader.style.display = "none";
    loaderNote.style.display = "none";
    resultDiv.innerHTML = `<p class="error">Error: ${error.message}</p>`;
    resultDiv.classList.add("show");
    analyzeButton.textContent = originalButtonText; // Restore button text on error
  }
});

// Fetch dynamic languages from GitHub Linguist API (replaced with static list)
async function fetchLanguages() {
  // Static list of most useful languages worldwide
  const staticLanguages = ["javascript", "python", "java", "cpp", "csharp", "php", "typescript", "swift", "kotlin", "rust"].map((lang) => ({
    value: lang,
    label: lang.charAt(0).toUpperCase() + lang.slice(1),
  }));
  return staticLanguages;
}

// Populate dynamic language dropdown
async function populateLanguages() {
  const selectContainer = document.getElementById("newLanguageSelect");
  const selectOptions = selectContainer.querySelector(".select-options");
  const selectTrigger = selectContainer.querySelector(".select-trigger");
  const searchInput = selectContainer.querySelector(".select-search");
  const optionsList = selectContainer.querySelector(".options-list");
  const languages = await fetchLanguages();

  // Ensure dropdown is closed by default
  selectOptions.style.display = "none";
  selectContainer.classList.remove("open");

  // Store original languages for filtering
  let allLanguages = languages;

  // Function to render options
  function renderOptions(options) {
    optionsList.innerHTML = options.map((lang) => `<div class="select-option" data-value="${lang.value}">${lang.label}</div>`).join("");

    // Add event listeners to options
    optionsList.querySelectorAll(".select-option").forEach((option) => {
      option.addEventListener("click", () => {
        selectTrigger.textContent = option.textContent;
        selectTrigger.dataset.value = option.dataset.value;
        selectOptions.style.display = "none"; // Explicitly hide options
        selectContainer.classList.remove("open");
        searchInput.value = ""; // Clear search input
        renderOptions(allLanguages); // Reset to full list
      });
    });
  }

  // Initial render
  renderOptions(allLanguages);

  // Search functionality
  searchInput.addEventListener("input", () => {
    const searchTerm = searchInput.value.toLowerCase();
    const filteredLanguages = allLanguages.filter((lang) => lang.label.toLowerCase().includes(searchTerm));
    renderOptions(filteredLanguages);
  });

  // Toggle dropdown
  selectTrigger.addEventListener("click", () => {
    const isOpen = selectContainer.classList.contains("open");
    selectOptions.style.display = isOpen ? "none" : "block";
    selectContainer.classList.toggle("open");
    if (!isOpen) {
      searchInput.focus(); // Focus search input when dropdown opens
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!selectContainer.contains(e.target)) {
      selectOptions.style.display = "none";
      selectContainer.classList.remove("open");
      searchInput.value = ""; // Clear search input
      renderOptions(allLanguages); // Reset to full list
    }
  });
}

populateLanguages();

// Dark/Light Mode Switch
const modeSwitch = document.getElementById("modeSwitch");
modeSwitch.addEventListener("click", () => {
  document.body.dataset.theme = document.body.dataset.theme === "light" ? "dark" : "light";
  modeSwitch.textContent = document.body.dataset.theme === "light" ? "Dark Mode 🌙" : "Light Mode ☀️";
});

document.body.dataset.theme = "dark";
modeSwitch.textContent = "Light Mode ☀️";

// Enforce styles on contenteditable div to override inline styles
const codeInput = document.getElementById("codeInput");
codeInput.style.padding = "25px";
codeInput.style.backgroundColor = "";
codeInput.style.color = "";