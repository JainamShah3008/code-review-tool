const { Web3 } = require("web3");
const { Groq } = require("groq-sdk");
const PDFDocument = require("pdfkit");
require("dotenv").config();

const web3 = new Web3(
  process.env.WEB3_PROVIDER_URL ||
    "https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID"
);

let contractAddress, contractABI;
try {
  contractAddress = require("../contract-address.json").contractAddress;
  contractABI = require("../contract-abi.json");
} catch (error) {
  console.error("Error loading contract files:", error.message);
  throw new Error("Failed to load contract address or ABI");
}

const contract = new web3.eth.Contract(contractABI, contractAddress);
const privateKey = process.env.ETHEREUM_PRIVATE_KEY;
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const cache = new Map();

module.exports.analyzeCode = async (code, language) => {
  const cacheKey = `${code}:${language}`;
  if (cache.has(cacheKey)) {
    console.log("Returning cached result");
    return cache.get(cacheKey);
  }

  try {
    const prompt = `
Analyze the following ${language} code for syntax errors, style issues, and optimization opportunities. Return a JSON object with:
1. **score**: A number (0-1) assessing code quality based on readability, efficiency, maintainability, and best practices.
2. **issues**: An array of objects, each with:
   - **line_number**: Line where the issue appears (if applicable, else -1).
   - **description**: Clear explanation of the issue.
   - **severity**: "low", "medium", or "high".
3. **suggestions**: An array of objects, each with:
   - **description**: Detailed suggestion for improving the code.
   - **example**: A specific code snippet showing the improvement applied to the provided code.
   - **benefit**: Why this improvement is valuable.

Ensure suggestions and examples directly reference and modify the provided code. Examples must be syntactically correct and concise. Return only the JSON object, enclosed in triple backticks (\`\`\`json\n...\n\`\`\`).

Code:
${code}

Example response:
\`\`\`json
{
  "score": 0.6,
  "issues": [{"line_number": 5, "description": "Syntax error: extra brace", "severity": "high"}],
  "suggestions": [{"description": "Remove extra braces", "example": "<modified code>", "benefit": "Improves readability"}]
}
\`\`\`
    `;
    const response = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      max_tokens: 1200,
      temperature: 0.4,
    });

    const output = response.choices[0].message.content.trim();
    const jsonMatch = output.match(/```json\n([\s\S]*?)\n```/);
    if (!jsonMatch || !jsonMatch[1]) {
      throw new Error("Model returned invalid JSON format");
    }

    const review = JSON.parse(jsonMatch[1]);
    if (
      typeof review.score !== "number" ||
      !Array.isArray(review.issues) ||
      !Array.isArray(review.suggestions) ||
      review.issues.some(
        (issue) =>
          typeof issue.line_number !== "number" ||
          typeof issue.description !== "string" ||
          !["low", "medium", "high"].includes(issue.severity)
      ) ||
      review.suggestions.some(
        (sug) =>
          typeof sug.description !== "string" ||
          typeof sug.example !== "string" ||
          typeof sug.benefit !== "string"
      )
    ) {
      throw new Error(
        "Invalid review structure: missing or malformed score, issues, or suggestions"
      );
    }

    cache.set(cacheKey, review);
    return review;
  } catch (error) {
    console.error("API Error:", error.message);
    throw error;
  }
};

module.exports.reviewCode = async (req, res) => {
  const { code, language, walletAddress } = req.body;

  if (
    !code ||
    !language ||
    !walletAddress ||
    typeof code !== "string" ||
    code.trim().length === 0
  ) {
    return res.status(400).json({
      status: false,
      message: "Valid code, language, and walletAddress are required",
    });
  }
  if (!web3.utils.isAddress(walletAddress)) {
    return res
      .status(400)
      .json({ status: false, message: "Invalid wallet address" });
  }

  try {
    const review = await this.analyzeCode(code, language);

    const reviewHash = web3.utils.sha3(JSON.stringify(review));
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    const tx = contract.methods.storeReview(reviewHash, walletAddress);

    const gas = await tx
      .estimateGas({ from: account.address })
      .catch((error) => {
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

    const signedTx = await web3.eth.accounts.signTransaction(
      txData,
      privateKey
    );
    const txReceipt = await web3.eth.sendSignedTransaction(
      signedTx.rawTransaction
    );

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

module.exports.downloadPdf = async (req, res) => {
  const { review, transactionId, code, language } = req.body;

  if (!review || !transactionId || !code || !language) {
    return res
      .status(400)
      .json({ status: false, message: "Missing required data" });
  }

  try {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=codechain_analysis_report.pdf"
      );
      res.send(pdfBuffer);
    });

    // ========== COVER PAGE ==========
    doc.rect(0, 0, doc.page.width, doc.page.height).fill("#181824");
    doc
      .fillColor("#00ffcc")
      .fontSize(32)
      .font("Helvetica-Bold")
      .text("CodeChain Analyzer", { align: "center" });
    doc
      .moveDown(0.5)
      .fontSize(18)
      .fillColor("white")
      .text("Code Health Analysis Report", { align: "center" });
    doc
      .moveDown(0.5)
      .fontSize(12)
      .fillColor("#ff00ff")
      .text(`Language: ${language}`, { align: "center" });
    doc
      .moveDown(0.2)
      .fillColor("#00ffcc")
      .text(`Transaction ID: ${transactionId.slice(0, 10)}...`, {
        align: "center",
      });

    doc.addPage();

    // ========== HEADER & FOOTER ==========
    const drawHeader = () => {
      doc
        .fontSize(16)
        .fillColor("#00ffcc")
        .text("CodeChain Analyzer Report", 50, 30);
      doc
        .moveTo(50, 50)
        .lineTo(doc.page.width - 50, 50)
        .strokeColor("#00ffcc")
        .lineWidth(0.5)
        .stroke();
    };
    const drawFooter = () => {
      const pageNum = doc.page?.number || 1;
      doc
        .fontSize(8)
        .fillColor("gray")
        .text(`Page ${pageNum}`, 50, doc.page.height - 40);
    };

    drawHeader();
    drawFooter();

    // Sidebar on first content page
    doc.rect(40, 60, 4, doc.page.height - 100).fill("#00ffcc");

    // ========== Submitted Code ==========
    doc
      .moveDown(1)
      .fontSize(14)
      .fillColor("#ff00ff")
      .text("Submitted Code", { underline: true });
    doc.moveDown(0.3);
    doc.font("Courier").fontSize(9).fillColor("black");
    code.split("\n").forEach((line) => {
      if (doc.y > doc.page.height - 60) {
        drawFooter();
        doc.addPage();
        drawHeader();
        doc.rect(40, 60, 4, doc.page.height - 100).fill("#00ffcc");
        doc.font("Courier").fontSize(9).fillColor("black");
      }
      doc.text(line, { lineGap: 1 });
    });

    // ========== Issues Detected ==========
    doc
      .moveDown(0.8)
      .fontSize(14)
      .fillColor("#ff00ff")
      .text("Issues Detected", { underline: true });
    doc.moveDown(0.3);
    if (review.issues && review.issues.length > 0) {
      review.issues.forEach((issue, idx) => {
        if (doc.y > doc.page.height - 60) {
          drawFooter();
          doc.addPage();
          drawHeader();
          doc.rect(40, 60, 4, doc.page.height - 100).fill("#00ffcc");
        }
        doc
          .fontSize(11)
          .fillColor("black")
          .text(
            `${idx + 1}. Line ${issue.line_number}: ${issue.description} (${
              issue.severity
            })`
          );
      });
    } else {
      doc.fontSize(11).fillColor("gray").text("No issues detected.");
    }

    // ========== Suggestions ==========
    doc
      .moveDown(0.8)
      .fontSize(14)
      .fillColor("#00ffcc")
      .text("Suggestions for Improvement", { underline: true });
    doc.moveDown(0.3);
    if (review.suggestions && review.suggestions.length > 0) {
      review.suggestions.forEach((sug, idx) => {
        if (doc.y > doc.page.height - 60) {
          drawFooter();
          doc.addPage();
          drawHeader();
          doc.rect(40, 60, 4, doc.page.height - 100).fill("#00ffcc");
        }
        doc
          .fontSize(11)
          .fillColor("black")
          .text(`${idx + 1}. ${sug.description}`);
        doc
          .moveDown(0.3)
          .fontSize(10)
          .fillColor("black")
          .text("Example:", { underline: true });
        doc
          .font("Courier")
          .fontSize(9)
          .fillColor("black")
          .text(sug.example, { lineGap: 1 });
        doc
          .moveDown(0.3)
          .fontSize(10)
          .fillColor("black")
          .text(`Benefit: ${sug.benefit}`);
      });
    } else {
      doc.fontSize(11).fillColor("gray").text("No suggestions.");
    }

    // ========== Code Health Score ==========
    doc
      .moveDown(0.8)
      .fontSize(14)
      .fillColor("#ff00ff")
      .text("Code Health Score", { underline: true });
    doc.moveDown(0.3);
    const score =
      typeof review.score === "number" ? review.score.toFixed(2) : "0.00";
    doc.fontSize(12).fillColor("black").text(`Score: ${score} / 1.0`);

    // ========== Transaction Details ==========
    doc
      .moveDown(0.8)
      .fontSize(14)
      .fillColor("#00ffcc")
      .text("Transaction Details", { underline: true });
    doc.moveDown(0.3);
    doc
      .fontSize(11)
      .fillColor("black")
      .text(`Transaction ID: ${transactionId.slice(0, 10)}...`);
    doc.fontSize(10).fillColor("gray").text(`Language: ${language}`);

    drawFooter();
    doc.end();
  } catch (err) {
    console.error("PDF Generation Error:", err);
    res.status(500).json({ status: false, message: "Error generating PDF" });
  }
};
