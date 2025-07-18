require("dotenv").config();
const express = require("express");
const { Web3 } = require("web3");
const { Groq } = require("groq-sdk");
const app = express();
const port = process.env.PORT || 3006;

// Middleware to parse JSON bodies
app.use(express.json());

// Cache object
const cache = new Map();

// Web3 configuration
const web3 = new Web3(process.env.WEB3_PROVIDER_URL || "https://sepolia.infura.io/v3/1c7fd124a73846e18015776e08aa84dd");
const contractAddress = require("./contract-address.json");
const contractABI = require("./contract-abi.json");
const contract = new web3.eth.Contract(contractABI, contractAddress.contractAddress);
const privateKey = process.env.ETHEREUM_PRIVATE_KEY;

// Initialize Groq API
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

(async () => {
  const account = web3.eth.accounts.privateKeyToAccount(privateKey);
  console.log("Derived Address:", account.address);
  const balance = await new Promise((resolve) => {
    setTimeout(async () => {
      resolve(await web3.eth.getBalance(account.address));
    }, 5000);
  });
  console.log("Account Balance (wei):", balance, "ETH:", web3.utils.fromWei(balance, "ether"));
  web3.eth
    .getBlockNumber()
    .then((block) => console.log("Connected to blockchain, block number:", block))
    .catch((error) => console.error("Web3 Connection Error:", error.message));
})().catch((error) => console.error("Account or Web3 Error:", error.message));

async function analyzeCode(code, language) {
  const cacheKey = `${code}:${language}`;
  if (cache.has(cacheKey)) {
    console.log("Returning cached result");
    return cache.get(cacheKey);
  }

  try {
    const prompt = `Analyze the following ${language} code for syntax errors, style issues, and optimization suggestions. Return ONLY a valid JSON object as a single-line string with fields: issues (array of strings), suggestions (array of objects with 'text' and 'example' fields), score (number between 0 and 1). The 'suggestions' array should contain objects where 'text' is the suggestion description and 'example' is the complete modified version of the input code with ONLY that suggestion applied, formatted as valid, copy-paste-ready ${language} code with proper indentation. Ensure the 'example' code is a single string with escaped newlines (\\n) and double quotes for strings (e.g., "string" instead of 'string'). The entire JSON response must have no unescaped newlines or extra whitespace outside string values. Example: {"issues":["Syntax error: extra brace"],"suggestions":[{"text":"Remove extra braces","example":"function fixed() {\\n  return 42;\\n}"}],"score":0.6}. Do not include explanations, comments, or text outside the JSON object. Code:\n${code}\n`;
    const response = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      max_tokens: 1200, // Sufficient for full code examples
      temperature: 0.4, // Consistent JSON and code formatting
    });

    let output = response.choices[0].message.content.trim();
    // Log raw output for debugging
    console.log("Raw API Output:", output);
    // Remove structural newlines and extra whitespace, preserving escaped newlines in strings
    output = output
      .replace(/\s*\n\s*/g, "")
      .replace(/\s*,\s*/g, ",")
      .replace(/\s*:\s*/g, ":");
    let review;
    try {
      review = JSON.parse(output);
      if (
        !review.issues ||
        !review.suggestions ||
        typeof review.score !== "number" ||
        !review.suggestions.every((s) => typeof s.text === "string" && typeof s.example === "string")
      ) {
        throw new Error("Invalid review structure");
      }
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError.message, "Sanitized Output:", output);
      throw new Error("Model returned invalid JSON format");
    }
    cache.set(cacheKey, review);
    return review;
  } catch (error) {
    console.error("API Error:", error.message);
    throw new Error(`Failed to analyze code: ${error.message}`);
  }
}

app.post("/review-code", async (req, res) => {
  const { code, language, walletAddress } = req.body;

  if (!code || !language || !walletAddress || typeof code !== "string" || code.trim().length === 0) {
    return res.status(400).json({ error: "Valid code, language, and walletAddress are required" });
  }
  if (!web3.utils.isAddress(walletAddress)) {
    return res.status(400).json({ error: "Invalid wallet address" });
  }

  try {
    console.log(`Analyzing code: ${code.substring(0, 50)}...`);
    const review = await analyzeCode(code, language);

    if (!review.issues || !review.suggestions || typeof review.score !== "number") {
      console.error("Invalid review format:", review);
      throw new Error("Model returned invalid review structure");
    }

    const reviewHash = web3.utils.sha3(JSON.stringify(review));
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    const tx = contract.methods.storeReview(reviewHash, walletAddress);

    const gas = await tx.estimateGas({ from: account.address }).catch((error) => {
      console.error("Gas Estimation Error:", error.message);
      throw new Error(`Failed to estimate gas: ${error.message}`);
    });
    const gasPrice = await web3.eth.getGasPrice().catch((error) => {
      console.error("Gas Price Error:", error.message);
      throw new Error(`Failed to get gas price: ${error.message}`);
    });

    const gasNumber = Number(gas);
    const gasPriceNumber = Number(gasPrice);
    const nonce = await web3.eth.getTransactionCount(account.address, "latest");
    const txData = {
      from: account.address,
      to: contractAddress.contractAddress,
      data: tx.encodeABI(),
      gas: Math.ceil(gasNumber * 5),
      gasPrice: gasPriceNumber,
      value: "0x0",
      nonce: nonce,
    };

    console.log("Transaction Data:", txData);
    const signedTx = await web3.eth.accounts.signTransaction(txData, privateKey);
    console.log("Signed Transaction:", signedTx);
    let txReceipt;
    try {
      txReceipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
      console.log("Transaction Success:", txReceipt);
    } catch (error) {
      console.error("Transaction Submission Error:", error);
      const txHash = signedTx.transactionHash || (await web3.eth.getTransaction(signedTx.rawTransaction)).hash;
      txReceipt = await web3.eth.getTransactionReceipt(txHash);
      console.error("Transaction Receipt:", txReceipt);
      throw new Error(`Transaction failed: ${error.message}`);
    }

    res.json({ review, transactionId: txReceipt.transactionHash });
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
