const express = require("express");
const router = express.Router();
const { verifyConnection } = require("../services/squad.service");
const mongoose = require("mongoose");

router.get("/squad-ping", async (req, res) => {
  try {
    const result = await verifyConnection();
    res.json({
      success: true,
      message: "Squad connection verified",
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Squad connection failed",
      error: error.response?.data || error.message,
    });
  }
});

router.get("/db-ping", (req, res) => {
  const state = mongoose.connection.readyState;
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };
  res.json({
    success: state === 1,
    database: states[state],
  });
});
module.exports = router;
