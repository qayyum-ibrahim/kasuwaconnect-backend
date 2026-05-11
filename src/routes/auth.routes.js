const express = require("express");
const router  = express.Router();
const { loginUser, checkPhone } = require("../controllers/trader.controller");

router.post("/login",        loginUser);
router.get("/check/:phone",  checkPhone);

module.exports = router;