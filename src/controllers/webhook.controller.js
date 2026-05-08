const crypto = require("crypto");
const Trader = require("../models/Trader.model");
const Transaction = require("../models/Transaction.model");

// Verify the request is genuinely from Squad
const verifySquadSignature = (requestBody, squadSignatureHeader) => {
  try {
    const hash = crypto
      .createHmac("sha512", process.env.SQUAD_SECRET_KEY)
      .update(JSON.stringify(requestBody))
      .digest("hex")
      .toUpperCase();
    return hash === squadSignatureHeader?.toUpperCase();
  } catch {
    return false;
  }
};

// POST /api/webhooks/squad
const handleSquadWebhook = async (req, res) => {
  // 1. Respond 200 immediately — Squad expects fast acknowledgement
  // If we take too long Squad will retry and you get duplicate transactions
  res.status(200).json({ success: true });

  try {
    const signature = req.headers["x-squad-encrypted-body"];
    const body = req.body;

    // 2. Verify signature (skip verification in sandbox for now, enforce in production)
    if (process.env.NODE_ENV === "production") {
      const isValid = verifySquadSignature(body, signature);
      if (!isValid) {
        console.error("Invalid Squad webhook signature");
        return;
      }
    }

    // 3. Only process successful payment events
    const eventType = body?.Event;
    if (eventType !== "charge.success") {
      console.log(`Ignoring webhook event: ${eventType}`);
      return;
    }

    const data = body?.Body || body?.data;
    if (!data) {
      console.error("Webhook body missing data payload");
      return;
    }

    const virtualAccountNumber =
      data.virtual_account_number || data.account_number;
    const amount = data.amount || data.transaction_amount;
    const transactionRef = data.transaction_ref || data.squad_ref;

    if (!virtualAccountNumber || !amount) {
      console.error("Webhook missing required fields:", {
        virtualAccountNumber,
        amount,
      });
      return;
    }

    // 4. Find the trader by their virtual account number
    const trader = await Trader.findOne({
      "squadVirtualAccount.accountNumber": virtualAccountNumber,
    });

    if (!trader) {
      console.error(
        `No trader found for virtual account: ${virtualAccountNumber}`,
      );
      return;
    }

    // 5. Prevent duplicate transactions
    if (transactionRef) {
      const existing = await Transaction.findOne({
        squadTransactionRef: transactionRef,
      });
      if (existing) {
        console.log(`Duplicate webhook ignored: ${transactionRef}`);
        return;
      }
    }

    const amountInNaira = amount / 100;

    // 6. Save the transaction
    const transaction = await Transaction.create({
      traderId: trader._id,
      squadTransactionRef: transactionRef,
      virtualAccountNumber,
      amount,
      amountInNaira,
      currency: data.currency || "NGN",
      senderName: data.sender_name || data.payer_name,
      senderBank: data.sender_bank || data.payer_bank,
      narration: data.narration || data.remarks,
      transactionDate: data.transaction_date
        ? new Date(data.transaction_date)
        : new Date(),
      webhookVerified: true,
    });

    // 7. Update trader totals
    await Trader.findByIdAndUpdate(trader._id, {
      $inc: {
        totalTransactions: 1,
        totalVolume: amountInNaira,
      },
    });

    console.log(
      `✅ Transaction saved: ${amountInNaira} NGN for trader ${trader.firstName} ${trader.lastName}`,
    );
    console.log(
      `   Trader totals → transactions: ${trader.totalTransactions + 1}, volume: ${trader.totalVolume + amountInNaira} NGN`,
    );
  } catch (error) {
    console.error("Webhook processing error:", error);
    // Note: we already sent 200, so Squad won't retry
    // Log to monitoring in production
  }
};

// GET /api/webhooks/test-fire
// Simulates a webhook for demo purposes — remove before production
const testFireWebhook = async (req, res) => {
  try {
    const { virtualAccountNumber, amount = 5000 } = req.query;

    if (!virtualAccountNumber) {
      return res
        .status(400)
        .json({
          success: false,
          message: "virtualAccountNumber query param required",
        });
    }

    // Simulate a Squad webhook payload
    const mockPayload = {
      Event: "charge.success",
      Body: {
        virtual_account_number: virtualAccountNumber,
        amount: amount * 100, // convert to kobo
        transaction_ref: `TEST_${Date.now()}`,
        currency: "NGN",
        sender_name: "Test Customer",
        sender_bank: "Test Bank",
        narration: "Test payment",
        transaction_date: new Date().toISOString(),
      },
    };

    // Call our own webhook handler directly
    req.body = mockPayload;
    req.headers["x-squad-encrypted-body"] = "test";

    await handleSquadWebhook(req, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { handleSquadWebhook, testFireWebhook };
