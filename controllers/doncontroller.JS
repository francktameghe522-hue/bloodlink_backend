const bcrypt = require("bcryptjs");
const Demande = require("../models/demande");
const Don = require("../models/don");
const User = require("../models/Utilisateur");
const { verifierEtReactiverDonneur } = require("../utils/eligibilite");
const { notifySafely } = require("../utils/notifications");
const { sendEmailSafely } = require("./emailController");
const demandeurDonneurDisponible = require("../emails/demandeurDonneurDisponible");

async function repondreDemande(req, res) {
  try {
    const demande = await Demande.findOne({ _id: req.params.demandeId, status: "acceptée", bloque: false, "donneursRepondu.donneurId": { $ne: req.user.id } });
    if (!demande) return res.status(404).json({ message: "Demande indisponible ou déjà traitée" });
    const { status = "disponible", telephone = "" } = req.body;
    if (!["disponible", "refusé"].includes(status)) return res.status(400).json({ message: "Statut de réponse invalide" });
    if (status === "disponible") {
      const eligibility = await verifierEtReactiverDonneur(req.user.id);
      if (!eligibility.eligible) return res.status(403).json({ message: "Vous ne pouvez pas encore donner du sang", dateEligibilite: eligibility.dateEligibilite, joursRestants: eligibility.joursRestants });
    }
    demande.donneursRepondu.push({ donneurId: req.user.id, telephone, status });
    await demande.save();
    if (status === "disponible") await Don.create({ demandeId: demande._id, donneurId: req.user.id, groupeSanguin: demande.groupeSanguinPatient, quantite: 1, statut: "en attente", centre: "CHU de Yaoundé" });
    if (status === "disponible") {
      await notifySafely({
        userId: demande.utilisateurId,
        type: "donneur_disponible",
        title: "Un donneur est disponible",
        message: "Un donneur a repondu favorablement a votre demande.",
        data: { demandeId: demande._id, donneurId: req.user.id, url: `/demandeur/demandes/${demande._id}` },
      });

      try {
        const [demandeur, donneur] = await Promise.all([
          User.findById(demande.utilisateurId).select("email"),
          User.findById(req.user.id).select("nom prenom email telephone groupeSanguin"),
        ]);
        if (demandeur?.email && donneur) {
          const appUrl = (process.env.APP_URL || "http://localhost:5174").replace(/\/$/, "");
          await sendEmailSafely({
            to: demandeur.email,
            ...demandeurDonneurDisponible({ demande, donneur, appUrl }),
          });
        }
      } catch (emailError) {
        console.error("Erreur lors de la preparation de l'email donneur :", emailError);
      }
    }
    return res.status(201).json({ message: "Réponse enregistrée avec succès", demande });
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur" });
  }
}

async function annulerReponse(req, res) {
  try {
    const demande = await Demande.findById(req.params.demandeId);
    const response = demande?.donneursRepondu.find((item) => item.donneurId.equals(req.user.id));
    if (!response) return res.status(404).json({ message: "Réponse introuvable" });
    if (response.status === "confirmé") return res.status(409).json({ message: "Un don confirmé ne peut pas être annulé" });
    demande.donneursRepondu = demande.donneursRepondu.filter((item) => !item.donneurId.equals(req.user.id));
    await demande.save();
    await Don.deleteOne({ demandeId: demande._id, donneurId: req.user.id, statut: "en attente" });
    await notifySafely({
      userId: demande.utilisateurId,
      type: "reponse_annulee",
      title: "Disponibilite annulee",
      message: "Un donneur a annule sa disponibilite pour votre demande.",
      data: { demandeId: demande._id, donneurId: req.user.id, url: `/demandeur/demandes/${demande._id}` },
    });
    return res.json({ message: "Réponse annulée avec succès" });
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur" });
  }
}

async function getDonneursRepondu(req, res) {
  try {
    const demande = await Demande.findById(req.params.demandeId).populate("donneursRepondu.donneurId", "nom prenom email telephone groupeSanguin");
    if (!demande) return res.status(404).json({ message: "Demande non trouvée" });
    if (req.user.role === "demandeur" && !demande.utilisateurId.equals(req.user.id)) return res.status(403).json({ message: "Accès refusé" });
    return res.json({ donneurs: demande.donneursRepondu });
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur" });
  }
}

async function adminConfirmerDon(req, res) {
  try {
    const { demandeId, donneurId } = req.params;
    const demande = await Demande.findById(demandeId);
    const response = demande?.donneursRepondu.find((item) => item.donneurId.equals(donneurId));
    const required = demande?.nombreDeDonneur || 0;
    if (!response || response.status !== "disponible") return res.status(404).json({ message: "Réponse disponible introuvable" });
    const pendingDon = await Don.findOne({ demandeId, donneurId, statut: "en attente" });
    if (!pendingDon) return res.status(404).json({ message: "Don en attente introuvable" });
    const updated = await Demande.findOneAndUpdate({ _id: demandeId, bloque: false, donneursConfirmeCount: { $lt: required }, "donneursRepondu": { $elemMatch: { donneurId, status: "disponible" } } }, { $inc: { donneursConfirmeCount: 1 }, $set: { "donneursRepondu.$.status": "confirmé" } }, { new: true });
    if (!updated) return res.status(409).json({ message: "Cette demande est déjà satisfaite ou la réponse a changé" });
    if (updated.donneursConfirmeCount >= required) { updated.donneursConfirmeCount = required; updated.bloque = true; updated.status = "bloquée"; await updated.save(); }
    pendingDon.statut = "confirmé";
    pendingDon.dateDon = new Date();
    const don = await pendingDon.save();
    await User.findByIdAndUpdate(donneurId, { dateDernierDon: don.dateDon });
    await Promise.all([
      notifySafely({
        userId: donneurId,
        type: "don_confirme",
        title: "Don confirme",
        message: "Votre don a ete confirme. Merci pour votre aide.",
        data: { demandeId: updated._id, donId: don._id, url: "/donneur/notifications" },
      }),
      notifySafely({
        userId: updated.utilisateurId,
        type: "don_confirme",
        title: "Don confirme pour votre demande",
        message: "Un don a ete confirme pour votre demande.",
        data: { demandeId: updated._id, donId: don._id, url: `/demandeur/demandes/${updated._id}` },
      }),
    ]);
    return res.json({ message: "Don confirmé avec succès", don, demande: updated });
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur" });
  }
}

async function adminEnregistrerDonneur(req, res) {
  try {
    const { nom, prenom, email, password, telephone, groupeSanguin, gender } = req.body;
    if (!nom || !email || !password || password.length < 8) return res.status(400).json({ message: "Nom, email et mot de passe d'au moins 8 caractères requis" });
    const normalizedEmail = email.toLowerCase().trim();
    if (await User.exists({ email: normalizedEmail })) return res.status(409).json({ message: "Email déjà utilisé" });
    const user = await User.create({ nom: nom.trim(), prenom: prenom?.trim() || "", email: normalizedEmail, password: await bcrypt.hash(password, 10), telephone: telephone?.trim() || "", groupeSanguin: groupeSanguin || null, gender: gender || "male", role: "donneur", actif: true });
    await notifySafely({ userId: user._id, type: "compte_active", title: "Compte donneur cree", message: "Votre compte donneur est actif. Vous pouvez consulter les alertes disponibles.", data: { url: "/donneur/notifications" } });
    return res.status(201).json({ message: "Donneur enregistré avec succès", user: { id: user._id, nom: user.nom, prenom: user.prenom, email: user.email, role: user.role, groupeSanguin: user.groupeSanguin } });
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur" });
  }
}

async function getAllDons(_req, res) {
  try { return res.json(await Don.find().populate("donneurId", "nom prenom email telephone groupeSanguin photoProfil").populate("demandeId", "idDemande nomPatient numeroBonDeSang groupeSanguinPatient nombreDePocheDeSang").sort({ createdAt: -1 })); }
  catch (error) { return res.status(500).json({ message: "Erreur serveur" }); }
}

async function getMesDons(req, res) {
  try {
    const dons = await Don.find({ donneurId: req.user.id })
      .populate("demandeId", "idDemande nomPatient groupeSanguinPatient")
      .sort({ createdAt: -1 });
    return res.json({ dons });
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur" });
  }
}

module.exports = { repondreDemande, getDonneursRepondu, adminConfirmerDon, adminEnregistrerDonneur, annulerReponse, getAllDons, getMesDons };
