const express = require("express");
const router = express.Router();
const {
  payWorker,
  getBanks,
  getPayoutHistory,
} = require("../controllers/payment.controller");

router.post("/payout", payWorker);
router.get("/banks", getBanks);
router.get("/history/:traderId", getPayoutHistory);

module.exports = router;
