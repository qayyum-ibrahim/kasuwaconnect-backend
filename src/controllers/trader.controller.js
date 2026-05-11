const Trader = require("../models/Trader.model");
const { createVirtualAccount } = require("../services/squad.service");

// POST /api/traders/register
const registerTrader = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      email,
      bvn,
      dob,
      address,
      gender,
      tradeCategory,
      tradeDescription,
      marketLocation,

      state,
    } = req.body;

    // 1. Check if trader already exists
    const existing = await Trader.findOne({ phone });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A trader with this phone number already exists",
      });
    }

    // 2. Create trader in DB first (without virtual account)
    const trader = await Trader.create({
      firstName,
      lastName,
      phone,
      email,
      bvn,
      dob,
      address,
      gender,
      tradeCategory,
      tradeDescription,
      marketLocation,
      state,
    });

    // 3. Create Squad virtual account for the trader
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
        customer_identifier: trader._id.toString(),
      });

      // 4. Update trader with virtual account details
      if (squadResponse.success) {
        trader.squadVirtualAccount = {
          accountNumber: squadResponse.data?.virtual_account_number,
          bankName: squadResponse.data?.bank_name,
          accountName: `${firstName} ${lastName}`,
        };
        await trader.save();
      }
    } catch (squadError) {
      console.error(
        "Squad virtual account error:",
        squadError.response?.data || squadError.message,
      );
    }

    res.status(201).json({
      success: true,
      message: "Trader registered successfully",
      data: trader,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error.message,
    });
  }
};

// GET /api/traders/:id
const getTrader = async (req, res) => {
  try {
    const trader = await Trader.findById(req.params.id);
    if (!trader) {
      return res
        .status(404)
        .json({ success: false, message: "Trader not found" });
    }
    res.json({ success: true, data: trader });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/traders
const getAllTraders = async (req, res) => {
  try {
    const traders = await Trader.find({ isActive: true })
      .select("-__v")
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, count: traders.length, data: traders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/auth/login
const loginUser = async (req, res) => {
  try {
    const { phone, pin } = req.body;

    // Check trader first
    let user = await Trader.findOne({ phone });
    let role = "trader";

    if (!user) {
      // Check job seeker
      const JobSeeker = require("../models/JobSeeker.model");
      user = await JobSeeker.findOne({ phone });
      role = "seeker";
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this phone number",
      });
    }

    if (user.pin !== pin) {
      return res.status(401).json({
        success: false,
        message: "Incorrect PIN",
      });
    }

    res.json({
      success: true,
      data: {
        id:    user._id,
        phone: user.phone,
        role,
        name:  `${user.firstName} ${user.lastName}`,
        user,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/auth/check/:phone
const checkPhone = async (req, res) => {
  try {
    const { phone } = req.params;
    const JobSeeker = require("../models/JobSeeker.model");

    const trader = await Trader.findOne({ phone });
    const seeker = await JobSeeker.findOne({ phone });

    const user = trader || seeker;
    if (!user) {
      return res.json({ exists: false });
    }

    res.json({
      exists: true,
      role:   trader ? "trader" : "seeker",
      name:   `${user.firstName} ${user.lastName}`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  registerTrader,
  getTrader,
  getAllTraders,
  loginUser,
  checkPhone,
};
