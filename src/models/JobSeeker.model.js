const mongoose = require("mongoose");

const jobSeekerSchema = new mongoose.Schema(
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
    pin: { type: String, required: true },
    state: { type: String, required: true },
    localGovt: { type: String, trim: true },

    // Skills + Matching Data
    skills: [
      {
        type: String,
        trim: true,
      },
    ],
    preferredCategories: [
      {
        type: String,
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
    ],
    experienceLevel: {
      type: String,
      enum: ["none", "beginner", "intermediate", "experienced"],
      default: "none",
    },
    languages: [
      {
        type: String,
        enum: ["english", "pidgin", "yoruba", "igbo", "hausa", "other"],
      },
    ],

    // Location for proximity matching
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] }, // [longitude, latitude]
    },
    marketLocation: { type: String, trim: true },

    // Financial Identity (built over time via Squad)
    squadVirtualAccount: {
      accountNumber: { type: String },
      bankName: { type: String },
      accountName: { type: String },
    },
    totalEarnings: { type: Number, default: 0 },
    completedGigs: { type: Number, default: 0 },

    // Status
    isAvailable: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Geospatial index for location-based matching
jobSeekerSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("JobSeeker", jobSeekerSchema);
