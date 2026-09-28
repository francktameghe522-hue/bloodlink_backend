const bcrypt = require("bcryptjs");
const User = require("../models/Utilisateur");
const Demande = require("../models/Demande");

/**
 * ==========================================
 * LISTER / RECHERCHER LES UTILISATEURS
 * ==========================================
 *
 * Recherche possible par :
 * - nom
 * - prénom
 * - email
 * - rôle
 * - statut actif/inactif
 */
async function getUsers(req, res) {
  try {
    const { search, role, actif } = req.query;

    const filter = {};

    // Recherche par nom, prénom ou email
    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(search.trim(), "i");

      filter.$or = [
        { nom: searchRegex },
        { prenom: searchRegex },
        { email: searchRegex },
      ];
    }

    // Filtrer par rôle
    if (
      role &&
      ["demandeur", "donneur", "admin", "super-admin"].includes(role)
    ) {
      filter.role = role;
    }

    // Filtrer par statut
    if (actif === "true") {
      filter.actif = true;
    }

    if (actif === "false") {
      filter.actif = false;
    }

    const users = await User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      users,
    });
  } catch (error) {
    console.error("Erreur getUsers :", error);

    return res.status(500).json({
      message: "Erreur serveur",
      error: error.message,
    });
  }
}

/**
 * ==========================================
 * CRÉER UN UTILISATEUR
 * ==========================================
 *
 * Le Super-admin peut créer :
 * - demandeur
 * - donneur
 * - admin
 * - super-admin
 */
async function createUser(req, res) {
  try {
    const {
      nom,
      prenom,
      email,
      password,
      telephone,
      role,
      gender,
      groupeSanguin,
    } = req.body;

    // Vérification des champs obligatoires
    if (!nom || !email || !password || !role) {
      return res.status(400).json({
        message: "Nom, email, mot de passe et rôle sont requis",
      });
    }

    // Vérification du rôle
    const allowedRoles = [
      "demandeur",
      "donneur",
      "admin",
      "super-admin",
    ];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        message: "Rôle utilisateur invalide",
      });
    }

    // Vérifier si l'email existe déjà
    const existingUser = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Cet email est déjà utilisé",
      });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer l'utilisateur
    const user = new User({
      nom: nom.trim(),

      prenom: prenom ? prenom.trim() : "",

      email: email.toLowerCase().trim(),

      telephone: telephone || "",

      password: hashedPassword,

      role,

      gender: gender || "male",

      groupeSanguin: groupeSanguin || null,

      actif: true,
    });

    await user.save();

    return res.status(201).json({
      message: "Utilisateur créé avec succès",

      user: {
        id: user._id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        telephone: user.telephone,
        role: user.role,
        gender: user.gender,
        groupeSanguin: user.groupeSanguin,
        actif: user.actif,
      },
    });
  } catch (error) {
    console.error("Erreur createUser :", error);

    return res.status(500).json({
      message: "Erreur serveur",
      error: error.message,
    });
  }
}

/**
 * ==========================================
 * ACTIVER / DÉSACTIVER UN UTILISATEUR
 * ==========================================
 *
 * Le Super-admin peut activer ou désactiver
 * les autres utilisateurs.
 *
 * Il ne peut pas désactiver son propre compte.
 */
async function toggleUserStatus(req, res) {
  try {
    const { id } = req.params;

    // Empêcher le Super-admin de désactiver
    // son propre compte
    if (id === req.user.id) {
      return res.status(400).json({
        message: "Vous ne pouvez pas désactiver votre propre compte",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        message: "Utilisateur introuvable",
      });
    }

    // Si actif est undefined sur un ancien compte,
    // on considère le compte comme actif.
    user.actif = user.actif === false;

    await user.save();

    return res.status(200).json({
      message: user.actif
        ? "Compte activé avec succès"
        : "Compte désactivé avec succès",

      actif: user.actif,
    });
  } catch (error) {
    console.error("Erreur toggleUserStatus :", error);

    return res.status(500).json({
      message: "Erreur serveur",
      error: error.message,
    });
  }
}

/**
 * ==========================================
 * SUPPRIMER UN UTILISATEUR
 * ==========================================
 *
 * Le Super-admin peut supprimer les autres
 * utilisateurs.
 *
 * Il ne peut pas supprimer son propre compte.
 */
async function deleteUser(req, res) {
  try {
    const { id } = req.params;

    // Empêcher le Super-admin de se supprimer lui-même
    if (id === req.user.id) {
      return res.status(400).json({
        message: "Vous ne pouvez pas supprimer votre propre compte",
      });
    }

    // Vérifier que l'utilisateur existe
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        message: "Utilisateur introuvable",
      });
    }

    // Supprimer toutes les demandes créées par cet utilisateur
    const demandesSupprimees = await Demande.deleteMany({
      utilisateurId: id,
    });

    // Supprimer ensuite l'utilisateur
    await User.findByIdAndDelete(id);

    return res.status(200).json({
      message: "Utilisateur et ses demandes supprimés avec succès",
      demandesSupprimees: demandesSupprimees.deletedCount,
    });

  } catch (error) {
    console.error("Erreur deleteUser :", error);

    return res.status(500).json({
      message: "Erreur serveur",
      error: error.message,
    });
  }
}

async function supprimerAnciennesDemandes(req, res) {
  try {
    const result = await Demande.deleteMany({});

    return res.status(200).json({
      message: "Anciennes demandes supprimées avec succès",
      nombreSupprime: result.deletedCount,
    });
  } catch (error) {
    console.error("Erreur suppression demandes :", error);

    return res.status(500).json({
      message: "Erreur serveur",
      error: error.message,
    });
  }
}

/**
 * ==========================================
 * SETUP SUPER-ADMIN (initialisation unique)
 * ==========================================
 *
 * Crée le tout premier compte super-admin.
 * Retourne 409 si un super-admin existe déjà,
 * ce qui garantit que l'opération ne peut
 * réussir qu'une seule fois.
 * Aucune authentification requise.
 */
async function setupSuperAdmin(req, res) {
  try {
    // Bloquer si un super-admin existe déjà
    const existing = await User.findOne({ role: "super-admin" });

    if (existing) {
      return res.status(409).json({
        message: "Un super-admin existe déjà. Cette opération n'est autorisée qu'une seule fois.",
      });
    }

    const { nom, prenom, email, password, telephone, gender } = req.body;

    if (!nom || !email || !password) {
      return res.status(400).json({
        message: "Nom, email et mot de passe sont requis",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const superAdmin = new User({
      nom: nom.trim(),
      prenom: prenom ? prenom.trim() : "",
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      telephone: telephone || "",
      role: "super-admin",
      gender: gender || "male",
      actif: true,
    });

    await superAdmin.save();

    return res.status(201).json({
      message: "Super-admin créé avec succès",
      user: {
        id: superAdmin._id,
        nom: superAdmin.nom,
        prenom: superAdmin.prenom,
        email: superAdmin.email,
        role: superAdmin.role,
        gender: superAdmin.gender,
        actif: superAdmin.actif,
      },
    });
  } catch (error) {
    console.error("Erreur setupSuperAdmin :", error);

    return res.status(500).json({
      message: "Erreur serveur",
      error: error.message,
    });
  }
}

/**
 * ==========================================
 * TABLEAU DE BORD - STATISTIQUES GLOBALES
 * ==========================================
 *
 * Retourne les statistiques globales de
 * l'application pour le super-admin :
 * - Utilisateurs (total, par rôle, actifs/inactifs)
 * - Demandes (total, par statut)
 * - Dons (total, par statut)
 * - Notifications (total)
 */
async function getDashboardStats(req, res) {
  try {
    const Don = require("../models/don");
    const Notification = require("../models/notification");

    // -----------------------------------------------
    // STATISTIQUES UTILISATEURS
    // -----------------------------------------------
    const [
      totalUtilisateurs,
      totalActifs,
      totalInactifs,
      totalDemandeurs,
      totalDonneurs,
      totalAdmins,
      totalSuperAdmins,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ actif: true }),
      User.countDocuments({ actif: false }),
      User.countDocuments({ role: "demandeur" }),
      User.countDocuments({ role: "donneur" }),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ role: "super-admin" }),
    ]);

    // -----------------------------------------------
    // STATISTIQUES DEMANDES
    // -----------------------------------------------
    const [
      totalDemandes,
      demandesEnAttente,
      demandesAcceptees,
      demandesRefusees,
      demandesBloquees,
    ] = await Promise.all([
      Demande.countDocuments(),
      Demande.countDocuments({ status: "en attente" }),
      Demande.countDocuments({ status: "acceptée" }),
      Demande.countDocuments({ status: "refusée" }),
      Demande.countDocuments({ status: "bloquée" }),
    ]);

    // -----------------------------------------------
    // STATISTIQUES DONS
    // -----------------------------------------------
    const [
      totalDons,
      donsEnAttente,
      donsConfirmes,
      donsRefuses,
    ] = await Promise.all([
      Don.countDocuments(),
      Don.countDocuments({ statut: "en attente" }),
      Don.countDocuments({ statut: "confirmé" }),
      Don.countDocuments({ statut: "refusé" }),
    ]);

    // -----------------------------------------------
    // STATISTIQUES NOTIFICATIONS
    // -----------------------------------------------
    const totalNotifications = await Notification.countDocuments();

    // -----------------------------------------------
    // RÉPONSE
    // -----------------------------------------------
    return res.status(200).json({
      utilisateurs: {
        total: totalUtilisateurs,
        actifs: totalActifs,
        inactifs: totalInactifs,
        parRole: {
          demandeurs: totalDemandeurs,
          donneurs: totalDonneurs,
          admins: totalAdmins,
          superAdmins: totalSuperAdmins,
        },
      },
      demandes: {
        total: totalDemandes,
        parStatut: {
          enAttente: demandesEnAttente,
          acceptees: demandesAcceptees,
          refusees: demandesRefusees,
          bloquees: demandesBloquees,
        },
      },
      dons: {
        total: totalDons,
        parStatut: {
          enAttente: donsEnAttente,
          confirmes: donsConfirmes,
          refuses: donsRefuses,
        },
      },
      notifications: {
        total: totalNotifications,
      },
    });
  } catch (error) {
    console.error("Erreur getDashboardStats :", error);

    return res.status(500).json({
      message: "Erreur serveur",
      error: error.message,
    });
  }
}

module.exports = {
  getUsers,
  createUser,
  toggleUserStatus,
  deleteUser,
  supprimerAnciennesDemandes,
  setupSuperAdmin,
  getDashboardStats,
};