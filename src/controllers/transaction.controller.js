const Transaction = require("../models/Transaction.model");
const Trader = require("../models/Trader.model");
const JobSeeker = require("../models/JobSeeker.model");

// GET /api/transactions/trader/:traderId
// All incoming payments to a trader's virtual account
const getTraderTransactions = async (req, res) => {
  try {
    const { traderId } = req.params;
    const { limit = 20, page = 1, from, to } = req.query;

    const filter = { traderId };

    // Optional date range filter
    if (from || to) {
      filter.transactionDate = {};
      if (from) filter.transactionDate.$gte = new Date(from);
      if (to) filter.transactionDate.$lte = new Date(to);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Transaction.countDocuments(filter);

    const transactions = await Transaction.find(filter)
      .sort({ transactionDate: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select("-__v");

    // Aggregate summary stats for the header card
    const stats = await Transaction.aggregate([
      {
        $match: {
          traderId:
            require("mongoose").Types.ObjectId.createFromHexString(traderId),
        },
      },
      {
        $group: {
          _id: null,
          totalVolume: { $sum: "$amountInNaira" },
          totalCount: { $sum: 1 },
          avgAmount: { $avg: "$amountInNaira" },
          largestTx: { $max: "$amountInNaira" },
        },
      },
    ]);

    res.json({
      success: true,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
      summary: stats[0]
        ? {
            totalVolume: Math.round(stats[0].totalVolume),
            totalCount: stats[0].totalCount,
            avgAmount: Math.round(stats[0].avgAmount),
            largestTx: stats[0].largestTx,
          }
        : {
            totalVolume: 0,
            totalCount: 0,
            avgAmount: 0,
            largestTx: 0,
          },
      data: transactions,
    });
  } catch (error) {
    console.error("Get trader transactions error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/transactions/seeker/:seekerId
// Earnings history for a job seeker
const getSeekerEarnings = async (req, res) => {
  try {
    const seeker = await JobSeeker.findById(req.params.seekerId).select(
      "firstName lastName totalEarnings completedGigs squadVirtualAccount",
    );

    if (!seeker) {
      return res.status(404).json({
        success: false,
        message: "Job seeker not found",
      });
    }

    // Find transactions where this seeker was the recipient
    // These are payout transactions narrated with their name
    const earnings = await Transaction.find({
      seekerId: req.params.seekerId,
      amountInNaira: { $gt: 0 },
    })
      .sort({ transactionDate: -1 })
      .limit(20)
      .select("amountInNaira narration transactionDate senderName");
    console.log({ earnings });
    res.json({
      success: true,
      seeker: {
        name: `${seeker.firstName} ${seeker.lastName}`,
        totalEarnings: seeker.totalEarnings,
        completedGigs: seeker.completedGigs,
        accountNumber: seeker.squadVirtualAccount?.accountNumber,
      },
      data: earnings,
    });
  } catch (error) {
    console.error("Get seeker earnings error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/transactions/summary/:traderId
// Quick stats for dashboard header — called on dashboard load
const getTransactionSummary = async (req, res) => {
  try {
    const trader = await Trader.findById(req.params.traderId).select(
      "firstName creditScore creditTier totalTransactions totalVolume squadVirtualAccount",
    );

    if (!trader) {
      return res.status(404).json({
        success: false,
        message: "Trader not found",
      });
    }

    // Last 7 days volume
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weeklyStats = await Transaction.aggregate([
      {
        $match: {
          traderId: require("mongoose").Types.ObjectId.createFromHexString(
            req.params.traderId,
          ),
          transactionDate: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: null,
          weeklyVolume: { $sum: "$amountInNaira" },
          weeklyCount: { $sum: 1 },
        },
      },
    ]);

    // Last 5 transactions for the dashboard preview
    const recentTransactions = await Transaction.find({
      traderId: req.params.traderId,
    })
      .sort({ transactionDate: -1 })
      .limit(5)
      .select("amountInNaira senderName transactionDate narration");

    res.json({
      success: true,
      data: {
        trader: {
          name: `${trader.firstName}`,
          creditScore: trader.creditScore,
          creditTier: trader.creditTier,
          totalTransactions: trader.totalTransactions,
          totalVolume: trader.totalVolume,
          accountNumber: trader.squadVirtualAccount?.accountNumber,
        },
        weekly: weeklyStats[0]
          ? {
              volume: Math.round(weeklyStats[0].weeklyVolume),
              count: weeklyStats[0].weeklyCount,
            }
          : { volume: 0, count: 0 },
        recentTransactions,
      },
    });
  } catch (error) {
    console.error("Transaction summary error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getTraderTransactions,
  getSeekerEarnings,
  getTransactionSummary,
};
