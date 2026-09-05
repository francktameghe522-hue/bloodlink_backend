const express = require("express");
const authController = require("../controllers/authController");

const router = express.Router();
// post, get, put, delete
// CRUD : Create, R: Read, U: Update, D: Delete

router.post("/register", authController.register);
router.post("/login", authController.login);

module.exports = router;