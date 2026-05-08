const express = require("express");
const router = express.Router();
const {
  registerJobSeeker,
  getJobSeeker,
  getAllJobSeekers,
} = require("../controllers/jobseeker.controller");

router.post("/register", registerJobSeeker);
router.get("/", getAllJobSeekers);
router.get("/:id", getJobSeeker);

module.exports = router;
