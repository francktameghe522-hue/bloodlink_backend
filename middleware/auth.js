const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
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
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "secret123"
    );

    // Stocker les informations de l'utilisateur
    req.user = decoded;

    next();
  } catch (err) {
    console.error("Erreur JWT :", err.message);

    return res.status(401).json({
      message: "Token invalide",
    });
  }
};