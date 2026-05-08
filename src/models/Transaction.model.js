const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    // Link to trader
    traderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trader",
      required: true,
    },

    // Squad transaction data
    squadTransactionRef: { type: String, unique: true, sparse: true },
    virtualAccountNumber: { type: String, required: true },
    amount: { type: Number, required: true }, // in kobo
    amountInNaira: { type: Number, required: true },
    currency: { type: String, default: "NGN" },

    // Transaction metadata
    senderName: { type: String, trim: true },
    senderBank: { type: String, trim: true },
    narration: { type: String, trim: true },
    transactionDate: { type: Date, default: Date.now },

    // Flags
    isAnomaly: { type: Boolean, default: false },
    webhookVerified: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Index for fast trader transaction lookups
transactionSchema.index({ traderId: 1, createdAt: -1 });
transactionSchema.index({ virtualAccountNumber: 1 });

module.exports = mongoose.model("Transaction", transactionSchema);
