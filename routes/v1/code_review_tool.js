const express = require("express");
const router = express.Router();
const codeReviewToolController = require("../../controllers/code_review_tool");

router.post("/review-suggestion-code", codeReviewToolController.reviewCode);

module.exports = router;