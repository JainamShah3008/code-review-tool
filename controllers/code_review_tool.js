const { Web3 } = require("web3");
const { Groq } = require("groq-sdk");
require("dotenv").config();

const web3 = new Web3(
  process.env.WEB3_PROVIDER_URL ||
    "https://sepolia.infura.io/v3/1c7fd124a73846e18015776e08aa84dd"
);
const contractAddress = "0xc947eCDA9D7e41B0C5042E6983863a06408aF42b";
const contractABI = require("../contract-abi.json");
const contract = new web3.eth.Contract(contractABI, contractAddress);
const privateKey = process.env.ETHEREUM_PRIVATE_KEY;

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const cache = new Map();

module.exports.analyzeCode = async (code, language) => {
  const cacheKey = `${code}:${language}`;
  if (cache.has(cacheKey)) {
    console.log("Returning cached result");
    return cache.get(cacheKey);
  }

  try {
    const prompt = `Analyze the following ${language} code for syntax errors, style issues, and optimization suggestions. Return only a JSON object with fields: issues (array), suggestions (array), score (number between 0 and 1). Example: {"issues": ["Syntax error: extra brace"], "suggestions": ["Remove extra braces"], "score": 0.6}. Code:\n${code}\n`;
    const response = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      max_tokens: 1200,
      temperature: 0.4,
    });

    const output = response.choices[0].message.content.trim();
    const jsonMatch = output.match(/\{(?:[^{}]|(?:\{[^{}]*\}))*\}/);
    if (jsonMatch) {
      const review = JSON.parse(jsonMatch[0]);
      cache.set(cacheKey, review);
      return review;
    } else {
      throw new Error("Model returned invalid JSON format");
    }
  } catch (error) {
    console.error("API Error:", error.message);
    throw error;
  }
};

module.exports.reviewCode = async (req, res) => {
  const { code, language, walletAddress } = req.body;

  if (!code || !language || !walletAddress || typeof code !== "string" || code.trim().length === 0) {
    return res.status(400).json({
      status: false,
      message: "Valid code, language, and walletAddress are required",
    });
  }
  if (!web3.utils.isAddress(walletAddress)) {
    return res.status(400).json({ status: false, message: "Invalid wallet address" });
  }

  try {
    console.log(`Analyzing code: ${code.substring(0, 50)}...`);
    const review = await this.analyzeCode(code, language);

    if (!review.issues || !review.suggestions || typeof review.score !== "number") {
      console.error("Invalid review format:", review);
      return res.status(500).json({ status: false, message: "Invalid review format" });
    }

    const reviewHash = web3.utils.sha3(JSON.stringify(review));
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    const tx = contract.methods.storeReview(reviewHash, walletAddress);

    const gas = await tx.estimateGas({ from: account.address }).catch((error) => {
      throw new Error(`Gas Estimation Error: ${error.message}`);
    });
    const gasPrice = await web3.eth.getGasPrice().catch((error) => {
      throw new Error(`Gas Price Error: ${error.message}`);
    });

    const gasNumber = Number(gas);
    const gasPriceNumber = Number(gasPrice);
    const nonce = await web3.eth.getTransactionCount(account.address, "latest");
    const txData = {
      from: account.address,
      to: contractAddress,
      data: tx.encodeABI(),
      gas: gasNumber,
      gasPrice: gasPriceNumber,
      value: "0x0",
      nonce: nonce,
    };

    const signedTx = await web3.eth.accounts.signTransaction(txData, privateKey);
    const txReceipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

    res.status(200).json({
      status: true,
      data: { review, transactionId: txReceipt.transactionHash },
      message: "Code review completed successfully",
    });
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({
      status: false,
      message: error.message || "Internal server error",
    });
  }
};