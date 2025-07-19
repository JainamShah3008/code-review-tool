document.getElementById("analyzeButton").addEventListener("click", async () => {
  const code = document.getElementById("codeInput").innerText.trim();
  const walletAddress = document.getElementById("walletInput").value;
  const resultDiv = document.getElementById("result");
  const loader = document.getElementById("loader");

  if (!code || !walletAddress) {
    resultDiv.innerHTML = `<p class="error">Please enter code and wallet address.</p>`;
    resultDiv.classList.add("show");
    return;
  }

  resultDiv.classList.remove("show");
  loader.style.display = "block";

  try {
    const response = await fetch(
      "/v1/code-review-tool/review-suggestion-code",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language: "javascript", walletAddress }),
      }
    );

    const data = await response.json();
    console.log("data++++++++++++++++++++++++", data);

    loader.style.display = "none";
    if (data.status === false) {
      resultDiv.innerHTML = `<p class="error">${data.message}</p>`;
    } else if (data.status && data.data) {
      const review = data.data.review;
      const transactionId = data.data.transactionId;
      resultDiv.innerHTML = `
        <h3>Review Results</h3>
        <p><strong>Issues:</strong> ${review.issues.join(", ") || "None"}</p>
        <p><strong>Suggestions:</strong> ${
          review.suggestions.join(", ") || "None"
        }</p>
        <p><strong>Score:</strong> ${review.score.toFixed(2)}</p>
        <p><strong>Transaction ID:</strong> <a href="https://sepolia.etherscan.io/tx/${transactionId}" target="_blank">${transactionId.slice(
        0,
        10
      )}...</a></p>
        <p><strong>Message:</strong> ${data.message}</p>
      `;
    } else {
      resultDiv.innerHTML = `<p class="error">Unexpected response format</p>`;
    }
    resultDiv.classList.add("show");
  } catch (error) {
    loader.style.display = "none";
    resultDiv.innerHTML = `<p class="error">Error: ${error.message}</p>`;
    resultDiv.classList.add("show");
  }
});

// Dark/Light Mode Switch
const modeSwitch = document.getElementById("modeSwitch");
modeSwitch.addEventListener("click", () => {
  document.body.dataset.theme =
    document.body.dataset.theme === "light" ? "dark" : "light";
  modeSwitch.textContent =
    document.body.dataset.theme === "light" ? "Dark Mode 🌙" : "Light Mode ☀️";
});

// Ensure initial mode text
document.body.dataset.theme = "dark"; // Default
modeSwitch.textContent = "Light Mode ☀️";
