const express = require('express');
const router = express.Router();
const { verifyConnection } = require('../services/squad.service');

router.get('/squad-ping', async (req, res) => {
  try {
    const result = await verifyConnection();
    res.json({
      success: true,
      message: 'Squad connection verified',
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Squad connection failed',
      error: error.response?.data || error.message,
    });
  }
});

module.exports = router;