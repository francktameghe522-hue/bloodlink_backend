const jwt = require("jsonwebtoken");
const User = require("../models/Utilisateur");

module.exports = async function (req, res, next) {
  // Récupérer le header Authorization
  const authHeader =
    req.headers.authorization ||
    req.headers.Authorization;

  // Vérifier la présence du token
  if (
    !authHeader ||
    !authHeader.startsWith("Bearer ")
  ) {
    return res.status(401).json({
      message: "Token manquant",
    });
  }

  // Récupérer uniquement le token
  const token = authHeader.split(" ")[1];

  try {
    // Vérifier le token
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET manquant");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Trust the current account state rather than the stale role in a token.
    const user = await User.findById(decoded.id).select(
      "role actif telephone groupeSanguin"
    );

    if (!user || user.actif === false) {
      return res.status(401).json({ message: "Compte indisponible" });
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
      telephone: user.telephone,
      groupeSanguin: user.groupeSanguin,
    };

    next();
  } catch (err) {
    console.error("Erreur JWT :", err.message);

    return res.status(401).json({
      message: "Token invalide",
    });
  }
};
