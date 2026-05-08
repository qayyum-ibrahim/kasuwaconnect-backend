const express = require("express");
const router = express.Router();
const {
  handleSquadWebhook,
  testFireWebhook,
} = require("../controllers/webhook.controller");

// Squad sends POST to this URL
router.post("/squad", handleSquadWebhook);

// Test endpoint — simulate a payment for demo purposes
router.get("/test-fire", testFireWebhook);

module.exports = router;
