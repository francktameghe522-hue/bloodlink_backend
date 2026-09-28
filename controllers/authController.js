const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/Utilisateur");
const { verifierEtReactiverDonneur } = require("../utils/eligibilite");
const { sendEmailSafely } = require("./emailController");
const donneurBienvenue = require("../emails/donneurBienvenue");
const demandeurBienvenue = require("../emails/demandeurBienvenue");

function createToken(user, expiresIn) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET manquant");
  }

  return jwt.sign(
    { id: user._id, role: user.role, telephone: user.telephone },
    process.env.JWT_SECRET,
    { expiresIn }
  );
}

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

    if (password.length < 8) {
      return res.status(400).json({
        message: "Le mot de passe doit contenir au moins 8 caractères",
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

    try {
      const appUrl = (process.env.APP_URL || "http://localhost:5174").replace(/\/$/, "");
      const welcomeEmail = user.role === "donneur"
        ? donneurBienvenue({ user, appUrl })
        : demandeurBienvenue({ user, appUrl });
      await sendEmailSafely({ to: user.email, ...welcomeEmail });
    } catch (emailError) {
      console.error("Erreur lors de la preparation de l'email de bienvenue :", emailError);
    }

    console.log("✅ Utilisateur créé :", {
      email: user.email,
      role: user.role,
    });

    // Création du token JWT
    const token = createToken(user, "1h");

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
        photoProfil: user.photoProfil,
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

    // Vérification des champs
    if (!email || !password) {
      return res.status(400).json({
        message: "Email et mot de passe requis",
      });
    }

    // Normaliser l'email
    const emailNormalise = email.toLowerCase().trim();

    // Rechercher l'utilisateur
    const user = await User.findOne({
      email: emailNormalise,
    });

    // Utilisateur inexistant
    if (!user) {
      return res.status(401).json({
        message: "Email incorrect",
      });
    }

    // Vérifier si le compte est actif
    if (user.actif === false) {
      return res.status(403).json({
        message:
          "Votre compte a été désactivé. Veuillez contacter l'administrateur.",
      });
    }

    // Vérifier que le mot de passe existe
    if (!user.password) {
      return res.status(500).json({
        message: "Le compte utilisateur ne possède pas de mot de passe valide.",
      });
    }

    // Vérifier le mot de passe
    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(401).json({
        message: "Mot de passe incorrect",
      });
    }

    // -------------------------------------------------
    // Si c'est un donneur, verifier si les 30 jours sont
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
    const token = createToken(user, "1h");

    console.log("✅ Connexion réussie :", {
      email: user.email,
      role: user.role,
    });

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
        photoProfil: user.photoProfil,
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
