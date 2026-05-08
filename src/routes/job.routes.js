const express = require("express");
const router = express.Router();
const {
  createJob,
  getAllJobs,
  getJob,
} = require("../controllers/job.controller");

router.post("/", createJob);
router.get("/", getAllJobs);
router.get("/:id", getJob);

module.exports = router;
