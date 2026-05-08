const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();
const testRoutes = require('./src/routes/test.routes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'KasuwaConnect API',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});
app.use('/api/test', testRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`KasuwaConnect API running on port ${PORT}`);
});

module.exports = app;