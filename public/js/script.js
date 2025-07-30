// Global variables to store last analysis result for PDF download
let lastReview = null;
let lastTransactionId = null;
let lastCode = null;
let lastLanguage = null;

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

  // Show loading state
  const originalButtonText = analyzeButton.textContent;
  analyzeButton.textContent = "Analyzing...";
  resultDiv.classList.remove("show");
  loader.style.display = "block";
  loaderNote.style.display = "block";
  loaderNote.textContent = "Processing your request, this may take up to a few minutes - please wait patiently.";

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
                `<div class="issues-item" style="animation-delay: ${index * 0.2}s">
                  <span class="badge ${issue.severity === 'high' ? 'critical' : issue.severity === 'medium' ? 'warning' : 'low'}">
                    Line ${issue.line_number}: ${issue.description}
                  </span>
                </div>`
            )
            .join("")
        : "<div class='issues-item'><span>No issues detected</span></div>";

      let suggestionsHtml = review.suggestions.length
        ? review.suggestions
            .map(
              (suggestion, index) => `
                <div class="suggestion-container" style="animation-delay: ${index * 0.2}s">
                  <div class="suggestion-part collapsed">
                    <div class="suggestion-header">
                      ${suggestion.description}
                    </div>
                  </div>
                  <div class="suggestion-content">
                    <p><strong>Example:</strong></p>
                    <pre>${suggestion.example}</pre>
                    <p><strong>Benefit:</strong> ${suggestion.benefit}</p>
                  </div>
                </div>`
            )
            .join("")
        : "<div class='suggestion-part'><p>No suggestions</p></div>";

      // Store latest analysis for PDF download
      lastReview = review;
      lastTransactionId = transactionId;
      lastCode = code;
      lastLanguage = language;

      resultDiv.innerHTML = `
        <div class="result-block"><h4>Issues Detected</h4><div class="issues-container">${issuesHtml}</div></div>
        <div class="result-block"><h4>Suggestions for Improvement</h4><div class="suggestions-container">${suggestionsHtml}</div></div>
        <div class="result-block"><h4>Code Health Score</h4><div class="score-bar"><div class="score-bar-fill" style="width: ${review.score * 100}%"></div></div><p>Score: ${review.score.toFixed(2)} / 1.0</p></div>
        <div class="result-block transaction-block"><h4>Transaction Details</h4><p>Transaction ID: <a href="https://sepolia.etherscan.io/tx/${transactionId}" target="_blank"><span class="transaction-id" title="${transactionId}">${transactionId.slice(0, 10)}...</span></a></p></div>
        <div class="result-block" style="text-align: center;">
          <button class="button" id="resetButton">Reset</button>
          <button class="button" id="downloadButton">Download Result</button>
        </div>
      `;
      resultDiv.classList.add("show");

      // Add toggle functionality for suggestions
      resultDiv.querySelectorAll(".suggestion-container").forEach((container) => {
        const header = container.querySelector(".suggestion-header");
        const content = container.querySelector(".suggestion-content");
        header.addEventListener("click", () => {
          container.classList.toggle("expanded");
        });
      });

      // Add reset functionality
      document.getElementById("resetButton").addEventListener("click", () => {
        document.getElementById("codeInput").innerText = "";
        document.getElementById("walletInput").value = "";
        document.querySelector("#newLanguageSelect .select-trigger").textContent = "Select Language";
        document.querySelector("#newLanguageSelect .select-trigger").dataset.value = "";
        resultDiv.classList.remove("show");
        analyzeButton.textContent = originalButtonText;
      });

      // Add download functionality
      document.getElementById("downloadButton").addEventListener("click", async () => {
        try {
          if (!lastReview || !lastTransactionId || !lastCode || !lastLanguage) {
            throw new Error("Missing required data for PDF generation");
          }
          const response = await fetch("v1/code-review-tool/download-pdf", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              review: lastReview,
              transactionId: lastTransactionId,
              code: lastCode,
              language: lastLanguage,
            }),
          });

          if (!response.ok) {
            throw new Error("Failed to generate PDF");
          }

          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "codechain_analysis_report.pdf";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        } catch (error) {
          resultDiv.innerHTML = `<p class="error">Error generating PDF: ${error.message}</p>`;
          resultDiv.classList.add("show");
        }
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
    analyzeButton.textContent = originalButtonText;
  } catch (error) {
    loader.style.display = "none";
    loaderNote.style.display = "none";
    resultDiv.innerHTML = `<p class="error">Error: ${error.message}</p>`;
    resultDiv.classList.add("show");
    analyzeButton.textContent = originalButtonText;
  }
});

// Fetch dynamic languages
async function fetchLanguages() {
  const staticLanguages = [
    "javascript",
    "python",
    "java",
    "cpp",
    "csharp",
    "php",
    "typescript",
    "swift",
    "kotlin",
    "rust",
  ].map((lang) => ({
    value: lang,
    label: lang.charAt(0).toUpperCase() + lang.slice(1),
  }));
  return staticLanguages;
}

// Populate language dropdown
async function populateLanguages() {
  const selectContainer = document.getElementById("newLanguageSelect");
  const selectOptions = selectContainer.querySelector(".select-options");
  const selectTrigger = selectContainer.querySelector(".select-trigger");
  const searchInput = selectContainer.querySelector(".select-search");
  const optionsList = selectContainer.querySelector(".options-list");
  const languages = await fetchLanguages();

  selectOptions.style.display = "none";
  selectContainer.classList.remove("open");

  let allLanguages = languages;

  function renderOptions(options) {
    optionsList.innerHTML = options
      .map(
        (lang) =>
          `<div class="select-option" data-value="${lang.value}">${lang.label}</div>`
      )
      .join("");
    optionsList.querySelectorAll(".select-option").forEach((option) => {
      option.addEventListener("click", () => {
        selectTrigger.textContent = option.textContent;
        selectTrigger.dataset.value = option.dataset.value;
        selectOptions.style.display = "none";
        selectContainer.classList.remove("open");
        searchInput.value = "";
        renderOptions(allLanguages);
      });
    });
  }

  renderOptions(allLanguages);

  searchInput.addEventListener("input", () => {
    const searchTerm = searchInput.value.toLowerCase();
    const filteredLanguages = allLanguages.filter((lang) =>
      lang.label.toLowerCase().includes(searchTerm)
    );
    renderOptions(filteredLanguages);
  });

  selectTrigger.addEventListener("click", () => {
    const isOpen = selectContainer.classList.contains("open");
    selectOptions.style.display = isOpen ? "none" : "block";
    selectContainer.classList.toggle("open");
    if (!isOpen) {
      searchInput.focus();
    }
  });

  document.addEventListener("click", (e) => {
    if (!selectContainer.contains(e.target)) {
      selectOptions.style.display = "none";
      selectContainer.classList.remove("open");
      searchInput.value = "";
      renderOptions(allLanguages);
    }
  });
}

populateLanguages();

// Dark/Light Mode Switch
const modeSwitch = document.getElementById("modeSwitch");
modeSwitch.addEventListener("click", () => {
  document.body.dataset.theme =
    document.body.dataset.theme === "light" ? "dark" : "light";
  modeSwitch.textContent =
    document.body.dataset.theme === "light" ? "Dark Mode 🌙" : "Light Mode ☀️";
});

document.body.dataset.theme = "dark";
modeSwitch.textContent = "Light Mode ☀️";

// Enforce styles on contenteditable div
const codeInput = document.getElementById("codeInput");
codeInput.style.padding = "25px";
codeInput.style.backgroundColor = "";
codeInput.style.color = "";