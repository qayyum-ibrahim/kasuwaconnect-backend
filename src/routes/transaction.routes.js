const express = require("express");
const router = express.Router();
const {
  getTraderTransactions,
  getSeekerEarnings,
  getTransactionSummary,
} = require("../controllers/transaction.controller");

router.get("/trader/:traderId", getTraderTransactions);
router.get("/seeker/:seekerId", getSeekerEarnings);
router.get("/summary/:traderId", getTransactionSummary);

module.exports = router;
