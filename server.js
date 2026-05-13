const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();
const connectDB = require("./src/config/database");
const testRoutes = require("./src/routes/test.routes");
const traderRoutes = require("./src/routes/trader.routes");
const webhookRoutes = require("./src/routes/webhook.routes");
const jobSeekerRoutes = require("./src/routes/jobseeker.routes");
const jobRoutes = require("./src/routes/job.routes");
const paymentRoutes = require("./src/routes/payment.routes");
const transactionRoutes = require("./src/routes/transaction.routes");
const authRoutes = require("./src/routes/auth.routes");

const axios = require("axios");

const app = express();
connectDB();
app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "KasuwaConnect API",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});
app.use("/api/test", testRoutes);
app.use("/api/traders", traderRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/jobseekers", jobSeekerRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/auth", authRoutes);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`KasuwaConnect API running on port ${PORT}`);
  // keepAlive();
});
const keepAlive = () => {
  const ping = async () => {
    try {
      await axios.get(`${process.env.AI_SERVICE_URL}/health`);
      console.log("✅ AI service keep-alive ping sent");
    } catch (e) {
      console.error("❌ AI keep-alive failed:", e.message);
    }

    try {
      await axios.get(`${process.env.SERVER_URL}/health`);
      console.log("✅ Node server keep-alive ping sent");
    } catch (e) {
      console.error("❌ Node keep-alive failed:", e.message);
    }
  };

  ping(); // ← fire immediately on startup
  setInterval(ping, 10 * 60 * 1000); // then every 10 minutes
};
module.exports = app;
