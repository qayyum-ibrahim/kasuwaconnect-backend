const axios = require('axios');

const aiClient = axios.create({
  baseURL: process.env.AI_SERVICE_URL,
  timeout: 15000, // 15 second timeout — Render free tier can be slow to wake
  headers: { 'Content-Type': 'application/json' },
});

const scoreTrader = async (trader) => {
  try {
    // Build the feature payload from trader's MongoDB data
    const monthsActive = Math.max(
      Math.floor((Date.now() - new Date(trader.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30)),
      1
    );

    const avgTransactionAmount = trader.totalTransactions > 0
      ? trader.totalVolume / trader.totalTransactions
      : 0;

    const avgWeeklyVolume = trader.totalVolume > 0
      ? trader.totalVolume / Math.max(monthsActive * 4.3, 1)
      : 0;

    const payload = {
      trader_id:              trader._id.toString(),
      avg_daily_transactions: trader.totalTransactions / Math.max(monthsActive * 30, 1),
      avg_transaction_amount: avgTransactionAmount,
      trade_days_per_week:    Math.min(trader.totalTransactions / Math.max(monthsActive * 4.3, 1), 7),
      supplier_diversity:     Math.min(Math.floor(trader.totalTransactions / 10), 15),
      payment_regularity:     trader.totalTransactions > 0
        ? Math.min(trader.totalTransactions / (monthsActive * 30), 1)
        : 0,
      dispute_rate:           0, // expand this when dispute tracking is added
      total_transactions:     trader.totalTransactions,
      avg_weekly_volume:      avgWeeklyVolume,
      volume_growth_rate:     0, // expand with time-series data later
      months_active:          monthsActive,
      category:               trader.tradeCategory || 'other',
      state:                  trader.state || 'Lagos',
    };

    const response = await aiClient.post('/score', payload);
    return response.data;

  } catch (error) {
    console.error('AI scoring error:', error.response?.data || error.message);
    return null; // fail gracefully — don't break the webhook pipeline
  }
};

const matchJobs = async (seeker, jobs) => {
  try {
    const payload = {
      seeker: {
        seeker_id:            seeker._id.toString(),
        skills:               seeker.skills || [],
        preferred_categories: seeker.preferredCategories || [],
        languages:            seeker.languages || ['english'],
        experience_level:     seeker.experienceLevel || 'none',
        state:                seeker.state || '',
        market_location:      seeker.marketLocation || null,
      },
      jobs: jobs.map(job => ({
        job_id:             job._id.toString(),
        title:              job.title,
        category:           job.category,
        skills_required:    job.skillsRequired || [],
        languages_required: job.languagesRequired || [],
        experience_level:   job.experienceLevel || 'none',
        pay_amount:         job.payAmount,
        pay_frequency:      job.payFrequency,
        state:              job.state,
        market_location:    job.marketLocation || null,
        trader_id:          job.traderId?.toString(),
      })),
      top_n: 5,
    };

    const response = await aiClient.post('/match', payload);
    return response.data;

  } catch (error) {
    console.error('AI matching error:', error.response?.data || error.message);
    return null;
  }
};

module.exports = { scoreTrader, matchJobs };