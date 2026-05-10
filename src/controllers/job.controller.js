const Job = require("../models/Job.model");
const Trader = require("../models/Trader.model");
const JobSeeker = require("../models/JobSeeker.model");
const { matchJobs } = require("../services/ai.service");

// POST /api/jobs
const createJob = async (req, res) => {
  try {
    const {
      traderId,
      title,
      description,
      category,
      skillsRequired,
      languagesRequired,
      experienceLevel,
      payAmount,
      payFrequency,
      marketLocation,
      state,
      longitude,
      latitude,
    } = req.body;

    // Verify trader exists
    const trader = await Trader.findById(traderId);
    if (!trader) {
      return res
        .status(404)
        .json({ success: false, message: "Trader not found" });
    }

    const location =
      longitude && latitude
        ? {
            type: "Point",
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          }
        : undefined;

    const job = await Job.create({
      traderId,
      title,
      description,
      category,
      skillsRequired: skillsRequired || [],
      languagesRequired: languagesRequired || [],
      experienceLevel,
      payAmount,
      payFrequency,
      marketLocation,
      state,
      location,
    });

    res.status(201).json({
      success: true,
      message: "Job posted successfully",
      data: job,
    });
  } catch (error) {
    console.error("Job creation error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/jobs
const getAllJobs = async (req, res) => {
  try {
    const { category, state, open } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (state) filter.state = state;
    filter.isOpen = open === "false" ? false : true;
    filter.isFilled = false;

    const jobs = await Job.find(filter)
      .populate("traderId", "firstName lastName marketLocation creditScore")
      .select("-__v")
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, count: jobs.length, data: jobs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/jobs/:id
const getJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate(
      "traderId",
      "firstName lastName marketLocation state creditScore squadVirtualAccount",
    );
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    res.json({ success: true, data: job });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/jobs/matches/:seekerId
const getMatchedJobs = async (req, res) => {
  try {
    const seeker = await JobSeeker.findById(req.params.seekerId);
    if (!seeker) {
      return res
        .status(404)
        .json({ success: false, message: "Job seeker not found" });
    }

    // Get all open jobs
    const openJobs = await Job.find({ isOpen: true, isFilled: false });
    if (openJobs.length === 0) {
      return res.json({
        success: true,
        matches: [],
        message: "No open jobs available",
      });
    }

    // Call AI matching service
    const matchResult = await matchJobs(seeker, openJobs);
    if (!matchResult) {
      return res.json({
        success: true,
        seeker: {
          id: seeker._id,
          name: `${seeker.firstName} ${seeker.lastName}`,
        },
        matches: openJobs
          .slice(0, 5)
          .map((job) => ({ job_id: job._id, score: null })),
        message:
          "Showing unranked results — matching service temporarily unavailable",
      });
    }

    res.json({
      success: true,
      seeker: {
        id: seeker._id,
        name: `${seeker.firstName} ${seeker.lastName}`,
      },
      ...matchResult,
    });
  } catch (error) {
    console.error("Job matching error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
module.exports = { createJob, getAllJobs, getJob, getMatchedJobs };
