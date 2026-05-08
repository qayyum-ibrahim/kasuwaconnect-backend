const mongoose = require("mongoose");

const traderSchema = new mongoose.Schema(
  {
    // Personal Info
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    bvn: { type: String, required: true, trim: true },
    dob: { type: String, required: true },
    address: { type: String, required: true, trim: true },
    gender: { type: String, required: true, enum: [1, 2] }, 
    
    // Trade Info
    tradeCategory: {
      type: String,
      required: true,
      enum: [
        "food",
        "clothing",
        "electronics",
        "artisan",
        "transport",
        "agriculture",
        "other",
      ],
    },
    tradeDescription: { type: String, trim: true },
    marketLocation: { type: String, required: true },
    state: { type: String, required: true },

    // Squad Financial Identity
    squadVirtualAccount: {
      accountNumber: { type: String },
      bankName: { type: String },
      accountName: { type: String },
    },

    // Credit Profile
    creditScore: { type: Number, default: 0, min: 0, max: 850 },
    creditTier: {
      type: String,
      enum: ["unscored", "low", "medium", "high"],
      default: "unscored",
    },
    totalTransactions: { type: Number, default: 0 },
    totalVolume: { type: Number, default: 0 },

    // Status
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Trader", traderSchema);
