module.exports = function verifyRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Authentification requise' });
    if (!allowedRoles.includes(req.user.role)) {

      console.log("req.user.role", req.user.role);
      
      return res.status(403).json({ message: 'Accès refusé : rôle insuffisant' });
    }
    next();
  };
};
