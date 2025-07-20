document.getElementById("analyzeButton").addEventListener("click", async () => {
  const code = document.getElementById("codeInput").innerText.trim();
  const walletAddress = document.getElementById("walletInput").value;
  const language = document.getElementById("languageSelect").value;
  const resultDiv = document.getElementById("result");
  const loader = document.getElementById("loader");
  const loaderNote = document.getElementById("loader-note");

  if (!code || !walletAddress) {
    resultDiv.innerHTML = `<p class="error">Please enter code and wallet address.</p>`;
    resultDiv.classList.add("show");
    return;
  }

  resultDiv.classList.remove("show");
  loader.style.display = "block";
  loaderNote.style.display = "block";
  loaderNote.textContent = "Processing your request, this may take up to a minute - please wait patiently.";

  try {
    const languages = await fetchLanguages();
    console.log("Fetched languages:", languages);

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
                `<div class="issues-item" style="animation-delay: ${
                  index * 0.2
                }s"><span class="badge ${
                  issue.includes("error") ? "critical" : "warning"
                }">${issue}</span></div>`
            )
            .join("")
        : "<div class='issues-item'><span>No issues</span></div>";
      let suggestionsHtml = review.suggestions.length
        ? review.suggestions
            .map(
              (suggestion, index) =>
                `<div class="suggestion-part" style="animation-delay: ${
                  index * 0.2
                }s"><p>${suggestion}</p></div>`
            )
            .join("")
        : "<div class='suggestion-part'><p>No suggestions</p></div>";

      resultDiv.innerHTML = `
        <div class="result-block"><h4>Issues Detected</h4><div class="issues-container">${issuesHtml}</div></div>
        <div class="result-block"><h4>Suggestions for Improvement</h4><div class="suggestions-container">${suggestionsHtml}</div></div>
        <div class="result-block"><h4>Code Health Score</h4><div class="score-bar"><div class="score-bar-fill" style="width: ${
          review.score * 100
        }%"></div></div><p>Score: ${review.score.toFixed(2)} / 1.0</p></div>
        <div class="result-block transaction-block"><h4>Transaction Details</h4><p>Transaction ID: <span class="transaction-id" title="${transactionId}">${transactionId.slice(
        0,
        10
      )}...</span></p></div>
      `;
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
  } catch (error) {
    loader.style.display = "none";
    loaderNote.style.display = "none";
    resultDiv.innerHTML = `<p class="error">Error: ${error.message}</p>`;
    resultDiv.classList.add("show");
  }
});

// Fetch dynamic languages from GitHub Linguist API (simulated for now)
async function fetchLanguages() {
  try {
    const response = await fetch("https://api.github.com/languages", {
      headers: { Accept: "application/vnd.github.v3+json" },
    });
    const data = await response.json();
    return Object.keys(data).map((lang) => ({
      value: lang.toLowerCase(),
      label: lang.charAt(0).toUpperCase() + lang.slice(1),
    }));
  } catch (error) {
    console.error("Language fetch error:", error);
    return ["javascript", "python", "java", "cpp", "ruby", "go"].map(
      (lang) => ({
        value: lang,
        label: lang.charAt(0).toUpperCase() + lang.slice(1),
      })
    );
  }
}

// Populate dynamic language dropdown
async function populateLanguages() {
  const select = document.getElementById("languageSelect");
  const languages = await fetchLanguages();
  select.innerHTML =
    '<option value="">Select Language</option>' +
    languages
      .map((lang) => `<option value="${lang.value}">${lang.label}</option>`)
      .join("");
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

// Enforce styles on contenteditable div to override inline styles
const codeInput = document.getElementById("codeInput");
codeInput.style.padding = "25px";
codeInput.style.backgroundColor = "";
codeInput.style.color = "";