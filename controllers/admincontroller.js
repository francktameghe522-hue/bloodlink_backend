const bcrypt = require("bcryptjs");
const User = require("../models/Utilisateur");
const Demande = require("../models/demande");
const Don = require("../models/don");
const Notification = require("../models/notification");
const { notifySafely } = require("../utils/notifications");

const roles = ["demandeur", "donneur", "admin", "super-admin"];
const publicUser = (user) => ({ id: user._id, nom: user.nom, prenom: user.prenom, email: user.email, telephone: user.telephone, role: user.role, gender: user.gender, groupeSanguin: user.groupeSanguin, actif: user.actif });

async function getUsers(req, res) {
  try {
    const { search, role, actif } = req.query;
    const filter = {};
    if (search?.trim()) {
      const value = new RegExp(search.trim(), "i");
      filter.$or = [{ nom: value }, { prenom: value }, { email: value }];
    }
    if (roles.includes(role)) filter.role = role;
    if (actif === "true" || actif === "false") filter.actif = actif === "true";
    return res.json({ users: await User.find(filter).select("-password").sort({ createdAt: -1 }) });
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur" });
  }
}

async function createUser(req, res) {
  try {
    const { nom, prenom, email, password, telephone, role, gender, groupeSanguin } = req.body;
    if (!nom || !email || !password || !roles.includes(role)) return res.status(400).json({ message: "Données utilisateur invalides" });
    if (password.length < 8) return res.status(400).json({ message: "Le mot de passe doit contenir au moins 8 caractères" });
    const normalizedEmail = email.toLowerCase().trim();
    if (await User.exists({ email: normalizedEmail })) return res.status(409).json({ message: "Cet email est déjà utilisé" });
    const user = await User.create({ nom: nom.trim(), prenom: prenom?.trim() || "", email: normalizedEmail, password: await bcrypt.hash(password, 10), telephone: telephone?.trim() || "", role, gender: gender || "male", groupeSanguin: groupeSanguin || null, actif: true });
    await notifySafely({ userId: user._id, type: "compte_active", title: "Compte cree", message: "Votre compte BloodLink est actif.", data: { url: "/" } });
    return res.status(201).json({ message: "Utilisateur créé avec succès", user: publicUser(user) });
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur" });
  }
}

async function toggleUserStatus(req, res) {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ message: "Vous ne pouvez pas modifier votre propre compte" });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });
    user.actif = user.actif === false;
    await user.save();
    await notifySafely({ userId: user._id, type: user.actif ? "compte_active" : "compte_desactive", title: user.actif ? "Compte active" : "Compte desactive", message: user.actif ? "Votre compte BloodLink a ete active." : "Votre compte BloodLink a ete desactive.", data: {} });
    return res.json({ message: user.actif ? "Compte activé avec succès" : "Compte désactivé avec succès", actif: user.actif });
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur" });
  }
}

async function deleteUser(req, res) {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ message: "Vous ne pouvez pas supprimer votre propre compte" });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });
    const demandesSupprimees = await Demande.deleteMany({ utilisateurId: user._id });
    await User.findByIdAndDelete(user._id);
    return res.json({ message: "Utilisateur et ses demandes supprimés avec succès", demandesSupprimees: demandesSupprimees.deletedCount });
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur" });
  }
}

async function supprimerAnciennesDemandes(_req, res) {
  try {
    const result = await Demande.deleteMany({});
    return res.json({ message: "Demandes supprimées avec succès", nombreSupprime: result.deletedCount });
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur" });
  }
}

async function setupSuperAdmin(req, res) {
  try {
    if (!process.env.SETUP_SECRET || req.get("X-Setup-Secret") !== process.env.SETUP_SECRET) return res.status(403).json({ message: "Initialisation non autorisée" });
    if (await User.exists({ role: "super-admin" })) return res.status(409).json({ message: "Un super-admin existe déjà" });
    const { nom, prenom, email, password, telephone, gender } = req.body;
    if (!nom || !email || !password || password.length < 8) return res.status(400).json({ message: "Nom, email et mot de passe d'au moins 8 caractères requis" });
    const superAdmin = await User.create({ nom: nom.trim(), prenom: prenom?.trim() || "", email: email.toLowerCase().trim(), password: await bcrypt.hash(password, 10), telephone: telephone || "", gender: gender || "male", role: "super-admin", actif: true });
    return res.status(201).json({ message: "Super-admin créé avec succès", user: publicUser(superAdmin) });
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur" });
  }
}

async function getDashboardStats(_req, res) {
  try {
    const [users, demandes, dons, notifications] = await Promise.all([User.countDocuments(), Demande.countDocuments(), Don.countDocuments(), Notification.countDocuments()]);
    return res.json({ utilisateurs: { total: users }, demandes: { total: demandes }, dons: { total: dons }, notifications: { total: notifications } });
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur" });
  }
}

module.exports = { getUsers, createUser, toggleUserStatus, deleteUser, supprimerAnciennesDemandes, setupSuperAdmin, getDashboardStats };
