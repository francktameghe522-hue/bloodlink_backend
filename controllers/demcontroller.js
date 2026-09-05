const Demande = require("../models/demande");

function calculerNombreDeDonneur(nombreDePocheDeSang) {
  const nombre = Number(nombreDePocheDeSang);

  if (!Number.isFinite(nombre) || nombre <= 0) {
    return 0;
  }

  return nombre * 2; // 1 poche = 2 donneurs
}

// Créer une demande
async function creerDemande(req, res) {
  try {
    const {
      quantite,
      groupeSanguinPatient,
      photoBonDeSang,
      nombreDePocheDeSang,
    } = req.body;

    if (
      !quantite ||
      !groupeSanguinPatient ||
      !photoBonDeSang ||
      !nombreDePocheDeSang
    ) {
      return res.status(400).json({
        message:
          "Les champs quantite, groupeSanguinPatient, photoBonDeSang et nombreDePocheDeSang sont requis",
      });
    }

    const nombreDeDonneur = calculerNombreDeDonneur(nombreDePocheDeSang);

    const demande = new Demande({
      utilisateurId: req.user.id,
      quantite: Number(quantite),
      groupeSanguinPatient,
      nombreDeDonneur,
      photoBonDeSang,
      nombreDePocheDeSang: Number(nombreDePocheDeSang),
      idDemande:
        `DEMANDE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      status: "en attente",
    });

    await demande.save();

    return res.status(201).json({
      message: "Demande créée avec succès",
      demande,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Erreur serveur",
      error: error.message,
    });
  }
}

// Récupérer toutes les demandes
async function getToutesLesDemandes(req, res) {
  try {
    const demandes = await Demande.find()
      .populate("utilisateurId", "nom prenom email telephone role")
      .sort({ dateCreation: -1 });

    return res.status(200).json({ demandes });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Erreur serveur",
      error: error.message,
    });
  }
}

// Récupérer une demande par ID
async function getDemandeParId(req, res) {
  try {
    const { id } = req.params;

    const demande = await Demande.findById(id).populate(
      "utilisateurId",
      "nom prenom email telephone role"
    );

    if (!demande) {
      return res.status(404).json({ message: "Demande non trouvée" });
    }

    return res.status(200).json({ demande });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Erreur serveur",
      error: error.message,
    });
  }
}

// Récupérer mes demandes
async function getMesDemandes(req, res) {
  try {
    const demandes = await Demande.find({ utilisateurId: req.user.id }).sort({
      dateCreation: -1,
    });

    return res.status(200).json({ demandes });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Erreur serveur",
      error: error.message,
    });
  }
}

// Mettre à jour le statut
async function mettreAJourStatut(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const statutAutorises = ["en attente", "acceptée", "refusée"];

    if (!status || !statutAutorises.includes(status)) {
      return res.status(400).json({
        message: "Statut invalide. Valeurs autorisées : en attente, acceptée, refusée",
      });
    }

    const demande = await Demande.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!demande) {
      return res.status(404).json({ message: "Demande non trouvée" });
    }

    return res.status(200).json({
      message: "Statut mis à jour",
      demande,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Erreur serveur",
      error: error.message,
    });
  }
}

// Incrémenter le nombre de donneurs
async function incrementerDonneur(req, res) {
  try {
    const { id } = req.params;

    const demande = await Demande.findById(id);

    if (!demande) {
      return res.status(404).json({ message: "Demande non trouvée" });
    }

    demande.nombreDeDonneur += 1;
    await demande.save();

    return res.status(200).json({
      message: "Nombre de donneurs incrémenté",
      demande,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Erreur serveur",
      error: error.message,
    });
  }
}

// Supprimer la demande
async function supprimerDemande(req, res) {
  try {
    const { id } = req.params;

    const demande = await Demande.findByIdAndDelete(id);

    if (!demande) {
      return res.status(404).json({ message: "Demande non trouvée" });
    }

    return res.status(200).json({
      message: "Demande supprimée avec succès",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Erreur serveur",
      error: error.message,
    });
  }
}

module.exports = {
  creerDemande,
  getToutesLesDemandes,
  getDemandeParId,
  getMesDemandes,
  mettreAJourStatut,
  incrementerDonneur,
  supprimerDemande,
};