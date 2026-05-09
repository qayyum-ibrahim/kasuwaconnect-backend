const express = require("express");
const router = express.Router();
const {
  createJob,
  getAllJobs,
  getJob,
  getMatchedJobs,
} = require("../controllers/job.controller");

router.post("/", createJob);
router.get("/", getAllJobs);
router.get("/:id", getJob);
router.get("/matches/:seekerId", getMatchedJobs);

module.exports = router;
