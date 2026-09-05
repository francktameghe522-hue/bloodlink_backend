const Demande = require("../models/demande");
const Don = require("../models/don");
const User = require("../models/Utilisateur");

// règle métier : 1 poche = 2 donneurs
function calculerNombreDeDonneur(nombreDePocheDeSang) {
  const n = Number(nombreDePocheDeSang) || 0;
  return Math.max(0, Math.ceil(n * 2));
}

// Donneur répond à une demande (se rend disponible)
async function repondreDemande(req, res) {
  try {
    const demandeId = req.params.demandeId;
    const donneurId = req.user.id;
    const { telephone } = req.body;

    const demande = await Demande.findById(demandeId);
    if (!demande) return res.status(404).json({ message: "Demande non trouvée" });
    if (demande.bloque) return res.status(400).json({ message: "Demande bloquée" });

    // éviter doublons
    if (demande.donneursRepondu.some(d => d.donneurId.equals(donneurId))) {
      return res.status(409).json({ message: "Vous avez déjà répondu à cette demande" });
    }

    demande.donneursRepondu.push({ donneurId, telephone, status: "disponible" });
    await demande.save();

    return res.status(201).json({ message: "Réponse enregistrée", demande });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
}

// Lister donneurs ayant répondu pour une demande (visible par demandeur / admin)
async function getDonneursRepondu(req, res) {
  try {
    const demande = await Demande.findById(req.params.demandeId)
      .populate("donneursRepondu.donneurId", "nom prenom email telephone");
    if (!demande) return res.status(404).json({ message: "Demande non trouvée" });
    return res.status(200).json({ donneurs: demande.donneursRepondu });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
}

// Admin confirme qu'un donneur a effectué le don (valide le don)
async function adminConfirmerDon(req, res) {
  try {
    const { demandeId, donneurId } = req.params;

    const demande = await Demande.findById(demandeId);
    if (!demande) return res.status(404).json({ message: "Demande non trouvée" });

    const reponse = demande.donneursRepondu.find(r => r.donneurId.equals(donneurId));
    if (!reponse) return res.status(404).json({ message: "Réponse du donneur introuvable" });

    if (reponse.status === "confirmé") return res.status(409).json({ message: "Déjà confirmé" });

    // marquer comme confirmé
    reponse.status = "confirmé";
    demande.donneursConfirmeCount = (demande.donneursConfirmeCount || 0) + 1;

    // créer/mettre à jour un enregistrement Don (optionnel)
    await Don.create({
      demandeId: demande._id,
      donneurId,
      groupeSanguin: demande.groupeSanguinPatient,
      quantite: 1,
      statut: "confirmé",
    });

    // si le nombre confirmé atteint le nombre requis, bloquer la demande et notifier
    const required = calculerNombreDeDonneur(demande.nombreDePocheDeSang);
    if (demande.donneursConfirmeCount >= required) {
      demande.bloque = true;
      demande.status = "bloquée";
      // notifier les autres donneurs
      const autres = demande.donneursRepondu
        .filter(r => !r.donneurId.equals(donneurId) && r.status !== "confirmé")
        .map(r => r.donneurId);
      // créer des notifications en base pour le demandeur et les autres donneurs
      try {
        const { createNotification } = require("./notificationController");
        // notifier le demandeur
        await createNotification({
          userId: demande.utilisateurId,
          type: "demande_completee",
          title: "Votre demande est complétée",
          message: `La demande ${demande.idDemande} a atteint le nombre requis de donneurs.`,
          data: { demandeId: demande._id },
        });

        // notifier les autres donneurs
        for (const otherId of autres) {
          await createNotification({
            userId: otherId,
            type: "demande_bloquee",
            title: "Demande complétée",
            message: `La demande ${demande.idDemande} a été complétée par d'autres donneurs.`,
            data: { demandeId: demande._id },
          });
        }
      } catch (notifErr) {
        console.error("Erreur lors de la création des notifications :", notifErr);
      }
    }

    await demande.save();

    return res.status(200).json({ message: "Don confirmé par admin", demande });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
}

// Admin enregistre un donneur dans la plateforme (ex : création utilisateur + rôle)
async function adminEnregistrerDonneur(req, res) {
  try {
    const { nom, prenom, email, telephone, password, groupeSanguin } = req.body;
    if (!email || !nom) return res.status(400).json({ message: "Email et nom requis" });

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: "Email déjà utilisé" });

    const allowedGroupes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
    if (groupeSanguin && !allowedGroupes.includes(groupeSanguin)) {
      return res.status(400).json({ message: "Groupe sanguin invalide" });
    }

    const user = new User({
      nom,
      prenom,
      email,
      telephone,
      role: "donneur",
      password,
      groupeSanguin: groupeSanguin || null,
    });
    await user.save();

    return res.status(201).json({ message: "Donneur enregistré", user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
}

// Donneur annule sa réponse (se désister)
async function annulerReponse(req, res) {
  try {
    const demandeId = req.params.demandeId;
    const donneurId = req.user.id;

    const demande = await Demande.findById(demandeId);
    if (!demande) return res.status(404).json({ message: "Demande non trouvée" });

    const before = demande.donneursRepondu.length;
    demande.donneursRepondu = demande.donneursRepondu.filter(r => !r.donneurId.equals(donneurId));
    if (demande.donneursRepondu.length === before) return res.status(404).json({ message: "Vous n'aviez pas répondu" });

    await demande.save();
    return res.status(200).json({ message: "Réponse annulée", demande });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
}

module.exports = {
  repondreDemande,
  getDonneursRepondu,
  adminConfirmerDon,
  adminEnregistrerDonneur,
  annulerReponse,
};