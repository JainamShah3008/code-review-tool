🎉 CodeChain Analyzer - Your AI-Powered Code Guardian! 🚀
🌟 Overview
Welcome to CodeChain Analyzer, the ultimate web tool that supercharges your coding journey! This innovative application uses cutting-edge AI to analyze your code, pinpoint syntax errors, style issues, and optimization opportunities. With a sleek blockchain integration, your code reviews are securely stored for transparency and trust. Download a stunning PDF report and elevate your development game today! ✨
🚀 Features

AI-Driven Code Analysis: Get detailed reviews with a health score (0-1).
Smart Suggestions: Receive actionable improvements with code examples.
Blockchain Security: Store reviews on Ethereum for immutable trust.
PDF Reports: Download professional analysis reports.
Theme Magic: Switch between dark and light modes effortlessly.
Language Support: Analyze code in multiple languages with a dynamic dropdown.
Wallet Integration: Secure your reviews with an Ethereum wallet address.

🛠️ Prerequisites

Node.js (v14.x or later)
npm (Node Package Manager)
Web3 provider (e.g., Infura) with a project ID
Ethereum private key and contract ABI/address files
Groq API key for AI magic

📦 Installation
1. Clone the Repo
git clone https://github.com/JainamShah3008/code-review-tool.git
cd code-review-tool

2. Install Dependencies
npm install

3. Set Up Environment
Create a .env file in the root directory and add:
WEB3_PROVIDER_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
ETHEREUM_PRIVATE_KEY=your_ethereum_private_key
GROQ_API_KEY=your_groq_api_key
PORT=3006
HOST_URL=http://localhost:3006


Swap YOUR_INFURA_PROJECT_ID with your Infura ID.
Use a secure your_ethereum_private_key.
Add your your_groq_api_key.

4. Configure Contracts

Place contract-abi.json and contract-address.json in the root.
Ensure they match your Ethereum network (e.g., Sepolia testnet).

🎮 Usage
1. Launch the Server
npm start

Visit http://localhost:3006 (or your HOST_URL).
2. Analyze Your Code

Paste your code in the "Code" box.
Pick a language from the dropdown.
Enter your Ethereum wallet address.
Hit "Analyze Code" and watch the magic unfold!
Download your PDF with "Download Result".

3. Toggle Themes
Click "Light Mode ☀️" or "Dark Mode 🌙" for a fresh look.
4. Reset
Clear everything with the "Reset" button.
📂 Project Structure
code-review-tool/
├── controllers/                  # Controller logic (code_review_tool.js)
├── node_modules/                 # Dependencies
├── public/
│   ├── css/                      # Styling (style.css)
│   └── js/                       # Scripts (script.js)
├── routes/
│   └── v1/                       # API routes (code_review_tool.js)
├── views/
│   ├── index.ejs                # Main view
│   └── layout.ejs               # Layout template
├── .env                          # Env vars
├── .gitignore                    # Git ignore
├── contract-abi.json             # Contract ABI
├── contract-address.json         # Contract address
├── index.js                      # Server entry
├── package-lock.json             # Dependency lock
└── package.json                  # Project config

💻 Technologies

Frontend: HTML, EJS, CSS, JavaScript
Backend: Node.js, Express.js
Blockchain: Web3.js, Ethereum
AI: Groq SDK
PDF: PDFKit
Styling: Custom Tailwind-inspired CSS

🤝 Contributing

Fork it! 🌴
Create a branch (git checkout -b awesome-feature).
Commit your changes (git commit -m "Add awesome feature").
Push it (git push origin awesome-feature).
Open a pull request! 🎉

📜 License
MIT License - Check the LICENSE file for details.
📩 Contact
Got questions? Raise an issue on GitHub or reach out to the maintainers!

Built with ❤️ by the CodeChain Team - Happy Coding! 🎮