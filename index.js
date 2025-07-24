require("dotenv").config({ path: "../env" });
const express = require("express");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");
const cors = require("cors");
const helmet = require("helmet");

const app = express();
const port = process.env.PORT || 3006;
const HOST_URL = process.env.HOST_URL || "http://localhost:3006";

// Disable `X-Powered-By` header
app.disable("x-powered-by");

// Set security HTTP headers with custom CSP
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", "https://api.github.com"], // Allow GitHub API
        styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles (if needed for your app)
        scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts (if needed)
      },
    },
  })
);

// Enable CORS
app.use(cors());
app.options("*", cors());

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts); // Enable layouts

// Set layout file
app.set("layout", "layout"); // Default layout is views/layout.ejs

const v1Route = require("./routes/v1");

// API routes under /v1
app.use("/v1", v1Route);

// Render index.ejs, which uses the layout
app.get("/", (req, res) => {
  res.render("index");
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Project Running On :  ${HOST_URL}`);
});