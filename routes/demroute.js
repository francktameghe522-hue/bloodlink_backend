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
} = require("../controllers/demcontroller");

const auth = require("../middleware/auth");
const verifyRole = require("../middleware/role");

// --- Routes Demandeur ---
router.post("/", auth, creerDemande);
router.get("/mes-demandes", auth, getMesDemandes);

// --- Routes Admin / Superadmin ---
router.get("/", auth, verifyRole("admin", "super-admin"), getToutesLesDemandes);
router.patch("/:id/statut", auth, verifyRole("admin", "super-admin"), mettreAJourStatut);
router.patch(
  "/:id/incrementer-donneur",
  auth,
  verifyRole("admin", "super-admin"),
  incrementerDonneur
);

// --- Route commune ---
router.get("/:id", auth, getDemandeParId);
router.delete("/:id", auth, supprimerDemande);

module.exports = router;