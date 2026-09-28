const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/utilisateur");
const { verifierEtReactiverDonneur } = require("../utils/eligibilite");

// Clé secrète utilisée pour signer les tokens JWT
const JWT_SECRET = process.env.JWT_SECRET || "secret123";

/**
 * =========================================================
 * INSCRIPTION PUBLIQUE
 * =========================================================
 *
 * L'inscription publique permet uniquement de créer :
 * - demandeur
 * - donneur
 */
async function register(req, res) {
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
    if (!nom || !email || !password) {
      return res.status(400).json({
        message: "Nom, email et mot de passe requis",
      });
    }

    // Normaliser l'email
    const emailNormalise = email.toLowerCase().trim();

    // Vérifier si l'utilisateur existe déjà
    const existing = await User.findOne({
      email: emailNormalise,
    });

    if (existing) {
      return res.status(409).json({
        message: "Email déjà utilisé",
      });
    }

    // Hasher le mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    // Seuls demandeur et donneur peuvent s'inscrire publiquement
    const roleFinal = ["demandeur", "donneur"].includes(role)
      ? role
      : "demandeur";

    // Création de l'utilisateur
    const user = new User({
      nom: nom.trim(),
      prenom: prenom ? prenom.trim() : "",
      email: emailNormalise,
      telephone: telephone ? telephone.trim() : "",
      role: roleFinal,
      password: hashed,
      gender: gender || "male",
      groupeSanguin: groupeSanguin || null,
      actif: true,
    });

    await user.save();

    console.log("✅ Utilisateur créé :", {
      email: user.email,
      role: user.role,
    });

    // Création du token JWT
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        telephone: user.telephone,
      },
      JWT_SECRET,
      {
        expiresIn: "30d",
      }
    );

    return res.status(201).json({
      message: "Utilisateur créé",
      token,

      user: {
        id: user._id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
        telephone: user.telephone,
        groupeSanguin: user.groupeSanguin,
        actif: user.actif,
      },
    });
  } catch (error) {
    console.error("❌ Erreur register :", error);

    return res.status(500).json({
      message: "Erreur serveur",
      error: error.message,
    });
  }
}

/**
 * =========================================================
 * CONNEXION
 * =========================================================
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    console.log("====================================");
    console.log("🔐 TENTATIVE DE CONNEXION");
    console.log("====================================");
    console.log("📧 Email reçu :", email);
    console.log("🔑 Mot de passe reçu :", password ? "OUI" : "NON");

    // Vérification des champs
    if (!email || !password) {
      return res.status(400).json({
        message: "Email et mot de passe requis",
      });
    }

    // Normaliser l'email
    const emailNormalise = email.toLowerCase().trim();

    console.log("🔎 Email recherché :", emailNormalise);

    // Rechercher l'utilisateur
    const user = await User.findOne({
      email: emailNormalise,
    });

    console.log(
      "👤 Utilisateur trouvé :",
      user
        ? `${user.email} | rôle=${user.role}`
        : "AUCUN"
    );

    // Utilisateur inexistant
    if (!user) {
      console.log("❌ Aucun utilisateur avec cet email");

      return res.status(401).json({
        message: "Email incorrect",
      });
    }

    // Vérifier si le compte est actif
    if (user.actif === false) {
      console.log("🚫 Compte désactivé :", user.email);

      return res.status(403).json({
        message:
          "Votre compte a été désactivé. Veuillez contacter l'administrateur.",
      });
    }

    // Vérifier que le mot de passe existe
    if (!user.password) {
      console.log("❌ Aucun mot de passe enregistré pour :", user.email);

      return res.status(500).json({
        message: "Le compte utilisateur ne possède pas de mot de passe valide.",
      });
    }

    // Vérifier le mot de passe
    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    console.log(
      "🔑 Mot de passe correspondant :",
      isMatch ? "OUI" : "NON"
    );

    if (!isMatch) {
      console.log("❌ Mot de passe incorrect");

      return res.status(401).json({
        message: "Mot de passe incorrect",
      });
    }

    // -------------------------------------------------
    // Si c'est un donneur, vérifier si les 3 mois sont
    // écoulés depuis son dernier don → réactivation auto
    // -------------------------------------------------
    if (user.role === "donneur") {
      try {
        await verifierEtReactiverDonneur(user._id);
      } catch (e) {
        // Ne pas bloquer la connexion en cas d'erreur
        console.error("Erreur vérification éligibilité :", e);
      }
    }

    // Créer le token JWT
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        telephone: user.telephone,
      },
      JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    console.log("✅ Connexion réussie :", {
      email: user.email,
      role: user.role,
    });

    console.log("====================================");

    return res.status(200).json({
      message: "Connexion réussie",
      token,

      user: {
        id: user._id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
        telephone: user.telephone,
        groupeSanguin: user.groupeSanguin,
        actif: user.actif,
      },
    });
  } catch (error) {
    console.error("❌ Erreur login :", error);

    return res.status(500).json({
      message: "Erreur serveur",
      error: error.message,
    });
  }
}

/**
 * =========================================================
 * EXPORTS
 * =========================================================
 */
module.exports = {
  register,
  login,
};