const express = require("express");
const router = express.Router();
const {
  createJob,
  getAllJobs,
  getJob,
  getMatchedJobs,
  applyForJob,
  hireApplicant,
  getApplicants,
} = require("../controllers/job.controller");

router.post("/", createJob);
router.get("/", getAllJobs);
router.get("/matches/:seekerId", getMatchedJobs);
router.get("/:id", getJob);
router.get("/:id/applicants", getApplicants);
router.post("/:id/apply", applyForJob);
router.post("/:id/hire", hireApplicant);
module.exports = router;
