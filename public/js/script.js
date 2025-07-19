document.getElementById("reviewForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const code = document.getElementById("codeInput").value;
  const walletAddress = document.getElementById("walletInput").value;
  const resultDiv = document.getElementById("result");

  resultDiv.innerHTML = "Analyzing...";
  resultDiv.classList.add("show");

  try {
    const response = await fetch("/v1/code-review-tool/review-suggestion-code", { // Fixed typo
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, language: "javascript", walletAddress }),
    });

    const data = await response.json();
    console.log("data++++++++++++++++++++++++", data);

    if (data.error) {
      resultDiv.innerHTML = `<p class="error">${data.error}</p>`;
    } else if (data.status && data.data) {
      const review = data.data.review;
      const transactionId = data.data.transactionId;
      resultDiv.innerHTML = `
        <h3>Review Results</h3>
        <p><strong>Issues:</strong> ${review.issues.join(", ") || "None"}</p>
        <p><strong>Suggestions:</strong> ${review.suggestions.join(", ") || "None"}</p>
        <p><strong>Score:</strong> ${review.score.toFixed(2)}</p>
        <p><strong>Transaction ID:</strong> <a href="https://sepolia.etherscan.io/tx/${transactionId}" target="_blank">${transactionId}</a></p>
        <p><strong>Message:</strong> ${data.message}</p>
      `;
    } else {
      resultDiv.innerHTML = `<p class="error">Unexpected response format</p>`;
    }
  } catch (error) {
    resultDiv.innerHTML = `<p class="error">Error: ${error.message}</p>`;
  }
});

// Toggle Dark/Light Mode
document.getElementById("toggleMode").addEventListener("click", () => {
  document.body.dataset.theme = document.body.dataset.theme === "light" ? "dark" : "light";
});