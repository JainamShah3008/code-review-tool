document.getElementById("reviewForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const code = document.getElementById("codeInput").value;
  const walletAddress = document.getElementById("walletInput").value;
  const resultDiv = document.getElementById("result");

  resultDiv.innerHTML = "Analyzing...";
  resultDiv.classList.add("show");

  try {
    const response = await fetch("/v1/code-review-tool/rievew-suggestion-code", {
      // Corrected route
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, language: "javascript", walletAddress }),
    });

    const data = await response.json();
    console.log("data++++++++++++++++++++++++", data);

    if (data.error) {
      resultDiv.innerHTML = `<p class="error">${data.error}</p>`;
    } else if (data.status && data.data) {
      const review = data.data.review; // Access nested review
      const transactionId = data.data.transactionId;
      resultDiv.innerHTML = `
        <p><strong>Issues:</strong> ${review.issues.join(", ")}</p>
        <p><strong>Suggestions:</strong> ${review.suggestions.join(", ")}</p>
        <p><strong>Score:</strong> ${review.score}</p>
        <p><strong>Transaction ID:</strong> ${transactionId}</p>
        <p><strong>Message:</strong> ${data.message}</p>
      `;
    } else {
      resultDiv.innerHTML = `<p class="error">Unexpected response format</p>`;
    }
  } catch (error) {
    resultDiv.innerHTML = `<p class="error">Error: ${error.message}</p>`;
  }
});
