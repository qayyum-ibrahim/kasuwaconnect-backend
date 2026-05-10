# kasuwaconnect-backend

Backend for Kasuwaconnect

## Live API

Base URL: https://kasuwaconnect-backend.onrender.com

## API Endpoints

### Health

GET /health
GET /api/test/db-ping
GET /api/test/squad-ping

### Traders

POST /api/traders/register
GET /api/traders
GET /api/traders/:id

### Job Seekers

POST /api/jobseekers/register
GET /api/jobseekers
GET /api/jobseekers/:id

### Jobs

POST /api/jobs
GET /api/jobs
GET /api/jobs/:id
GET /api/jobs/matches/:seekerId
GET /api/jobs/:id/applicants
POST /api/jobs/:id/apply
POST /api/jobs/:id/hire

### Payments

POST /api/payments/payout
GET /api/payments/banks
GET /api/payments/history/:traderId

### Transactions

GET /api/transactions/trader/:traderId
GET /api/transactions/summary/:traderId
GET /api/transactions/seeker/:seekerId

### Webhooks

POST /api/webhooks/squad
GET /api/webhooks/test-fire?virtualAccountNumber=&amount=
