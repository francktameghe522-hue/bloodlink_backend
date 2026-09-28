const express = require("express");
const authController = require("../controllers/authController");

const router = express.Router();

// =====================================================
// INSCRIPTION PUBLIQUE
// =====================================================

// Inscription générale
router.post("/register", authController.register);

// Inscription d'un donneur
router.post("/register/donneur", (req, res) => {
  req.body.role = "donneur";
  authController.register(req, res);
});

// Inscription d'un demandeur
router.post("/register/demandeur", (req, res) => {
  req.body.role = "demandeur";
  authController.register(req, res);
});

// =====================================================
// CONNEXION
// =====================================================

router.post("/login", authController.login);

module.exports = router;