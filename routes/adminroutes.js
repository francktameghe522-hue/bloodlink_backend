const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth");
const verifyRole = require("../middleware/role");

const {
  getUsers,
  createUser,
  toggleUserStatus,
  deleteUser,
  supprimerAnciennesDemandes,
  setupSuperAdmin,
  getDashboardStats,
} = require("../controllers/adminController");

/*
=====================================================
              ROUTES SUPER-ADMIN
=====================================================
*/

/*
-----------------------------------------------------
INITIALISATION SUPER-ADMIN (une seule fois)
-----------------------------------------------------

Crée le premier compte super-admin.
Aucune authentification requise.
Retourne 409 si un super-admin existe déjà.
*/
router.post("/setup-super-admin", setupSuperAdmin);

/*
-----------------------------------------------------
VOIR / RECHERCHER LES UTILISATEURS
-----------------------------------------------------

Exemples :

GET /api/admin/users

GET /api/admin/users?search=Franck

GET /api/admin/users?role=donneur

GET /api/admin/users?actif=true
*/
router.get(
  "/users",
  auth,
  verifyRole("super-admin", "admin"),
  getUsers
);

/*
-----------------------------------------------------
CRÉER UN UTILISATEUR
-----------------------------------------------------

Le Super-admin peut créer :

- demandeur
- donneur
- admin
- super-admin
*/
router.post(
  "/users",
  auth,
  verifyRole("super-admin"),
  createUser
);

/*
-----------------------------------------------------
ACTIVER / DÉSACTIVER UN UTILISATEUR
-----------------------------------------------------
*/
router.patch(
  "/users/:id/status",
  auth,
  verifyRole("super-admin"),
  toggleUserStatus
);

router.delete(
  "/demandes/anciennes",
  auth,
  verifyRole("super-admin"),
  supprimerAnciennesDemandes
);

/*
-----------------------------------------------------
SUPPRIMER UN UTILISATEUR
-----------------------------------------------------
*/
router.delete(
  "/users/:id",
  auth,
  verifyRole("super-admin"),
  deleteUser
);

/*
-----------------------------------------------------
TABLEAU DE BORD - STATISTIQUES GLOBALES
-----------------------------------------------------

Retourne les statistiques globales de l'application :
- Utilisateurs (total, par rôle, actifs/inactifs)
- Demandes (total, par statut)
- Dons (total, par statut)
- Notifications (total)
*/
router.get(
  "/dashboard",
  auth,
  verifyRole("super-admin", "admin"),
  getDashboardStats
);

module.exports = router;