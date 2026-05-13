const JobSeeker = require("../models/JobSeeker.model");
const { createVirtualAccount } = require("../services/squad.service");

// POST /api/jobseekers/register
const registerJobSeeker = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      email,
      state,
      localGovt,
      skills,
      preferredCategories,
      experienceLevel,
      languages,
      marketLocation,
      longitude,
      latitude,
      bvn,
      dob,
      pin,
      address,
      gender,
    } = req.body;

    // 1. Check duplicate
    const existing = await JobSeeker.findOne({ phone });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A job seeker with this phone number already exists",
      });
    }

    // 2. Build location object if coordinates provided
    const location =
      longitude && latitude
        ? {
            type: "Point",
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          }
        : undefined;

    // 3. Create job seeker
    const jobSeeker = await JobSeeker.create({
      firstName,
      lastName,
      phone,
      email,
      bvn,
      dob,
      pin,
      address,
      gender,
      state,
      localGovt,
      skills: skills || [],
      preferredCategories: preferredCategories || [],
      experienceLevel: experienceLevel || "none",
      languages: languages || ["english"],
      marketLocation,
      location,
    });

    // 4. Create Squad virtual account so wages can be paid to them
    try {
      const squadResponse = await createVirtualAccount({
        firstName,
        lastName,
        phone,
        email: email || `${phone}@kasuwaconnect.com`,
        bvn,
        dob,
        address,
        gender,
        customer_identifier: `seeker_${jobSeeker._id.toString()}`,
      });

      if (squadResponse.success) {
        jobSeeker.squadVirtualAccount = {
          accountNumber: squadResponse.data?.virtual_account_number,
          bankName: squadResponse.data?.bank_name,
          accountName: `${firstName} ${lastName}`,
        };
        await jobSeeker.save();
      }
    } catch (squadError) {
      console.error(
        "Squad virtual account error (job seeker):",
        squadError.response?.data || squadError.message,
      );
    }

    res.status(201).json({
      success: true,
      message: "Job seeker registered successfully",
      data: jobSeeker,
    });
  } catch (error) {
    console.error("Job seeker registration error:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error.message,
    });
  }
};

// GET /api/jobseekers/:id
const getJobSeeker = async (req, res) => {
  try {
    const jobSeeker = await JobSeeker.findById(req.params.id);
    if (!jobSeeker) {
      return res
        .status(404)
        .json({ success: false, message: "Job seeker not found" });
    }
    res.json({ success: true, data: jobSeeker });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/jobseekers
const getAllJobSeekers = async (req, res) => {
  try {
    const { skills, category, state, available } = req.query;
    const filter = { isActive: true };

    if (skills) filter.skills = { $in: skills.split(",") };
    if (category) filter.preferredCategories = category;
    if (state) filter.state = state;
    if (available) filter.isAvailable = available === "true";

    const jobSeekers = await JobSeeker.find(filter)
      .select("-__v")
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, count: jobSeekers.length, data: jobSeekers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { registerJobSeeker, getJobSeeker, getAllJobSeekers };
