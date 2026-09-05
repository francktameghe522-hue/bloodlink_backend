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
} = require("../controllers/donController");

// Donneur répond (se rend disponible)
router.post("/repondre/:demandeId", auth, repondreDemande);

// Annuler sa réponse
router.delete("/repondre/:demandeId", auth, annulerReponse);

// Lister les réponses pour une demande (demandeur ou admin)
router.get("/reponses/:demandeId", auth, getDonneursRepondu);

// Admin confirme qu'un don a été effectué par un donneur (valide le don)
router.patch(
  "/admin/confirmer/:demandeId/:donneurId",
  auth,
  verifyRole("admin", "super-admin"),
  adminConfirmerDon
);

// Admin enregistre un donneur dans la plateforme
router.post(
  "/admin/enregistrer-donneur",
  auth,
  verifyRole("admin", "super-admin"),
  adminEnregistrerDonneur
);

module.exports = router;