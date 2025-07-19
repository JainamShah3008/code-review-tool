const router = require("express").Router();

const codeReviewToolRoute = require("./code_review_tool");

router.use("/code-review-tool", codeReviewToolRoute);

module.exports = router;
