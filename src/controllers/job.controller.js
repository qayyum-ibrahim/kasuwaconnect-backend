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
    if (!seeker.isAvailable) {
      return res.status(409).json({
        success: false,
        message: "You are currently on a job and unavailable for new matches",
      });
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
// POST /api/jobs/:id/apply
const applyForJob = async (req, res) => {
  try {
    const { seekerId } = req.body;
    const jobId = req.params.id;

    // 1. Validate both exist
    const [job, seeker] = await Promise.all([
      Job.findById(jobId),
      JobSeeker.findById(seekerId),
    ]);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }
    if (!seeker) {
      return res.status(404).json({
        success: false,
        message: "Job seeker not found",
      });
    }
    if (!job.isOpen || job.isFilled) {
      return res.status(400).json({
        success: false,
        message: "This job is no longer accepting applications",
      });
    }

    // 2. Check if already applied
    const alreadyApplied = job.applicants.includes(seekerId);
    if (alreadyApplied) {
      return res.status(409).json({
        success: false,
        message: "You have already applied for this job",
      });
    }

    // 3. Add seeker to applicants list
    await Job.findByIdAndUpdate(jobId, {
      $push: { applicants: seekerId },
    });

    console.log(`📋 ${seeker.firstName} applied for: ${job.title}`);

    res.json({
      success: true,
      message: "Application submitted successfully",
      data: {
        jobId,
        jobTitle: job.title,
        seekerId,
        seekerName: `${seeker.firstName} ${seeker.lastName}`,
        appliedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Application error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/jobs/:id/hire
const hireApplicant = async (req, res) => {
  try {
    const { seekerId } = req.body;
    const jobId = req.params.id;

    // 1. Validate
    const [job, seeker] = await Promise.all([
      Job.findById(jobId).populate("traderId", "firstName lastName"),
      JobSeeker.findById(seekerId),
    ]);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }
    if (!seeker) {
      return res.status(404).json({
        success: false,
        message: "Job seeker not found",
      });
    }
    if (job.isFilled) {
      return res.status(400).json({
        success: false,
        message: "This job has already been filled",
      });
    }

    // 2. Check seeker actually applied
    const hasApplied = job.applicants
      .map((id) => id.toString())
      .includes(seekerId.toString());

    if (!hasApplied) {
      return res.status(400).json({
        success: false,
        message: "This seeker has not applied for this job",
      });
    }

    // 3. Mark job as hired — keep open until payment is made
    await Job.findByIdAndUpdate(jobId, {
      hiredSeeker: seekerId,
    });

    // 4. Mark seeker as unavailable
    await JobSeeker.findByIdAndUpdate(seekerId, {
      isAvailable: false,
    });

    console.log(`🤝 ${seeker.firstName} hired for: ${job.title}`);

    res.json({
      success: true,
      message: "Applicant hired successfully",
      data: {
        jobId,
        jobTitle: job.title,
        seekerId,
        seekerName: `${seeker.firstName} ${seeker.lastName}`,
        payAmount: job.payAmount,
        payFrequency: job.payFrequency,
        nextStep: "Proceed to pay worker via /api/payments/payout",
      },
    });
  } catch (error) {
    console.error("Hire error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/jobs/:id/applicants
// Returns applicant list with AI match scores for each
const getApplicants = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate({
      path: "applicants",
      select:
        "firstName lastName skills languages experienceLevel state marketLocation squadVirtualAccount totalEarnings completedGigs isAvailable",
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Build match scores for each applicant
    const { matchJobs } = require("../services/ai.service");

    let applicantsWithScores = job.applicants.map((seeker) => ({
      ...seeker.toObject(),
      matchScore: null,
      matchPercentage: null,
    }));

    // Call AI matcher if there are applicants
    if (job.applicants.length > 0) {
      try {
        const matchResult = await matchJobs(
          // Use first applicant as base seeker to get relative scores
          // Then individually score each one
          job.applicants[0],
          [job],
        );

        // Score each applicant individually against this job
        const scoredApplicants = await Promise.all(
          job.applicants.map(async (seeker) => {
            const result = await matchJobs(seeker, [job]);
            const topMatch = result?.matches?.[0];
            return {
              ...seeker.toObject(),
              matchScore: topMatch?.match_score || 0,
              matchPercentage: topMatch?.match_percentage || 0,
              matchedSkills: topMatch?.matched_skills || [],
            };
          }),
        );

        // Sort by match score descending
        scoredApplicants.sort((a, b) => b.matchScore - a.matchScore);
        applicantsWithScores = scoredApplicants;
      } catch (aiError) {
        console.error("AI scoring for applicants failed:", aiError.message);
        // Return applicants without scores rather than failing
      }
    }

    res.json({
      success: true,
      job: {
        id: job._id,
        title: job.title,
        payAmount: job.payAmount,
        payFrequency: job.payFrequency,
        hiredSeeker: job.hiredSeeker,
        isFilled: job.isFilled,
      },
      applicantCount: applicantsWithScores.length,
      applicants: applicantsWithScores,
    });
  } catch (error) {
    console.error("Get applicants error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
module.exports = {
  createJob,
  getAllJobs,
  getJob,
  getMatchedJobs,
  applyForJob,
  hireApplicant,
  getApplicants,
};
