const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    // Posted by a trader
    traderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trader",
      required: true,
    },

    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: {
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

    // Requirements for matching
    skillsRequired: [{ type: String, trim: true }],
    languagesRequired: [
      {
        type: String,
        enum: ["english", "pidgin", "yoruba", "igbo", "hausa", "other"],
      },
    ],
    experienceLevel: {
      type: String,
      enum: ["none", "beginner", "intermediate", "experienced"],
      default: "none",
    },

    // Pay
    payAmount: { type: Number, required: true }, // in Naira
    payFrequency: {
      type: String,
      enum: ["hourly", "daily", "weekly", "monthly", "per_gig"],
      default: "daily",
    },

    // Location
    marketLocation: { type: String, required: true },
    state: { type: String, required: true },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] },
    },

    // Status
    isOpen: { type: Boolean, default: true },
    isFilled: { type: Boolean, default: false },
    applicants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "JobSeeker",
      },
    ],
    hiredSeeker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobSeeker",
      default: null,
    },
  },
  { timestamps: true },
);

jobSchema.index({ location: "2dsphere" });
jobSchema.index({ category: 1, isOpen: 1 });

module.exports = mongoose.model("Job", jobSchema);
