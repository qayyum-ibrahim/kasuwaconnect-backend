const Trader = require("../models/Trader.model");
const JobSeeker = require("../models/JobSeeker.model");
const Job = require("../models/Job.model");
const Transaction = require("../models/Transaction.model");
const {
  inititatePayout,
  getBankList,
  getNipCode,
} = require("../services/squad.service");

// POST /api/payments/payout
// Employer pays a hired job seeker
const payWorker = async (req, res) => {
  try {
    const { traderId, seekerId, jobId } = req.body;

    // 1. Validate all parties exist
    const [trader, seeker, job] = await Promise.all([
      Trader.findById(traderId),
      JobSeeker.findById(seekerId),
      Job.findById(jobId),
    ]);

    if (!trader) {
      return res
        .status(404)
        .json({ success: false, message: "Trader not found" });
    }
    if (!seeker) {
      return res
        .status(404)
        .json({ success: false, message: "Job seeker not found" });
    }
    // ← Pull bank details from seeker's Squad virtual account
    const accountNumber =
      seeker.squadVirtualAccount?.accountNumber || "0000000000";
    const accountName =
      seeker.squadVirtualAccount?.accountName ||
      `${seeker.firstName} ${seeker.lastName}`;
    const bankName = seeker.squadVirtualAccount?.bankName || "Squad";

    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    if (job.isFilled) {
      return res.status(409).json({
        success: false,
        message: "This job has already been filled and paid",
        data: {
          jobId: job._id,
          title: job.title,
          hiredSeeker: job.hiredSeeker,
        },
      });
    }

    if (job.traderId.toString() !== traderId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to pay for this job",
      });
    }
    const amount = job.payAmount;
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Job has no valid pay amount set",
      });
    }
    // 2. Build a unique transaction reference
    const transactionRef = `KCW_${traderId}_${seekerId}_${Date.now()}`;

    // 3. Initiate Squad payout
    const squadResponse = await inititatePayout({
      transactionRef,
      amount,
      bankCode: "000", // sandbox test bank code
      nipCode: "0000000000",
      accountNumber:
        accountNumber ||
        seeker.squadVirtualAccount?.accountNumber ||
        "0000000000",
      accountName: accountName || `${seeker.firstName} ${seeker.lastName}`,
      narration: `Wage for: ${job.title}`,
    });
    console.log({ squadResponse });
    if (!squadResponse.success) {
      return res.status(400).json({
        success: false,
        message: "Payout failed",
        error: squadResponse.message,
      });
    }

    // 4. Update seeker earnings
    await JobSeeker.findByIdAndUpdate(seekerId, {
      $inc: {
        totalEarnings: amount,
        completedGigs: 1,
      },
      isAvailable: true,
    });

    // 5. Mark job as filled
    await Job.findByIdAndUpdate(jobId, {
      isFilled: true,
      hiredSeeker: seekerId,
    });

    // 6. Record the payout transaction
    await Transaction.create({
      traderId,
      seekerId,
      jobId,
      squadTransactionRef: transactionRef,
      virtualAccountNumber: accountNumber || "payout",
      amount: amount * 100,
      amountInNaira: amount,
      currency: "NGN",
      senderName: `${trader.firstName} ${trader.lastName}`,
      narration: `Wage payment: ${job.title}`,
      transactionDate: new Date(),
      webhookVerified: false,
    });

    console.log(
      `💸 Payout initiated: ${amount} NGN from ${trader.firstName} to ${seeker.firstName}`,
    );

    res.json({
      success: true,
      message: "Payout initiated successfully",
      data: {
        transactionRef,
        amount,
        recipient: {
          name: `${seeker.firstName} ${seeker.lastName}`,
          accountNumber,
          accountName,
          bankName,
        },
        job: job.title,
        squadResponse: squadResponse.data,
      },
    });
  } catch (error) {
    console.error("Payout error:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: "Payout failed",
      error: error.response?.data || error.message,
    });
  }
};

// GET /api/payments/banks
const getBanks = async (req, res) => {
  try {
    const result = await getBankList();
    res.json({ success: true, data: result.data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/payments/history/:traderId
const getPayoutHistory = async (req, res) => {
  try {
    const transactions = await Transaction.find({
      traderId: req.params.traderId,
    })
      .populate("jobId", "title category payAmount")
      .populate("seekerId", "firstName lastName")
      .sort({ createdAt: -1 })
      .limit(50)
      .select("-__v");

    res.json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { payWorker, getBanks, getPayoutHistory };
