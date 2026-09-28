const express = require("express");
const router = express.Router();

const {
  creerDemande,
  getToutesLesDemandes,
  getDemandeParId,
  getMesDemandes,
  mettreAJourStatut,
  incrementerDonneur,
  supprimerDemande,
  getDemandesDisponibles,
} = require("../controllers/demcontroller");

const auth = require("../middleware/auth");
const verifyRole = require("../middleware/role");
const upload = require("../middleware/upload");

// =====================================================
// DEMANDEUR / SUPER-ADMIN
// =====================================================

// Créer une demande de sang
router.post(
  "/",
  auth,
  verifyRole("demandeur", "super-admin"),
  upload.single("photoBonDeSang"),
  creerDemande
);

// Voir ses propres demandes
router.get(
  "/mes-demandes",
  auth,
  verifyRole("demandeur"),
  getMesDemandes
);

// =====================================================
// DONNEUR
// =====================================================

// Voir les demandes disponibles
router.get(
  "/disponibles",
  auth,
  verifyRole("donneur"),
  getDemandesDisponibles
);

// =====================================================
// ADMIN / SUPER-ADMIN
// =====================================================

// Voir toutes les demandes
router.get(
  "/",
  auth,
  verifyRole("admin", "super-admin"),
  getToutesLesDemandes
);

// Modifier le statut d'une demande
router.patch(
  "/:id/statut",
  auth,
  verifyRole("admin", "super-admin"),
  mettreAJourStatut
);

// Incrémenter le nombre de donneurs
router.patch(
  "/:id/incrementer-donneur",
  auth,
  verifyRole("admin", "super-admin"),
  incrementerDonneur
);

// =====================================================
// ROUTES COMMUNES
// =====================================================

// Consulter une demande précise
router.get(
  "/:id",
  auth,
  getDemandeParId
);

// Supprimer une demande
router.delete(
  "/:id",
  auth,
  supprimerDemande
);

module.exports = router;