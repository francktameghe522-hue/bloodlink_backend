const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const verifyRole = require("../middleware/role");

const {
  repondreDemande,
  getDonneursRepondu,
  adminConfirmerDon,
  adminEnregistrerDonneur,
  annulerReponse,
  getAllDons,
} = require("../controllers/donController");

// ==========================================
// ADMIN / SUPER-ADMIN : liste des dons
// GET /api/dons
// ==========================================
router.get(
  "/",
  auth,
  verifyRole("admin", "super-admin"),
  getAllDons
);

// ==========================================
// DONNEUR : répondre à une demande
// ==========================================
router.post(
  "/repondre/:demandeId",
  auth,
  repondreDemande
);

// ==========================================
// DONNEUR : annuler sa réponse
// ==========================================
router.delete(
  "/repondre/:demandeId",
  auth,
  annulerReponse
);

// ==========================================
// DEMANDEUR / ADMIN : voir les réponses
// ==========================================
router.get(
  "/reponses/:demandeId",
  auth,
  getDonneursRepondu
);

// ==========================================
// ADMIN / SUPER-ADMIN : confirmer un don
// ==========================================
router.patch(
  "/admin/confirmer/:demandeId/:donneurId",
  auth,
  verifyRole("admin", "super-admin"),
  adminConfirmerDon
);

// ==========================================
// ADMIN / SUPER-ADMIN : enregistrer un donneur
// ==========================================
router.post(
  "/admin/enregistrer-donneur",
  auth,
  verifyRole("admin", "super-admin"),
  adminEnregistrerDonneur
);

module.exports = router;