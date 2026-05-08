const express = require("express");
const router = express.Router();
const {
  registerTrader,
  getTrader,
  getAllTraders,
} = require("../controllers/trader.controller");

router.post("/register", registerTrader);
router.get("/", getAllTraders);
router.get("/:id", getTrader);

module.exports = router;
