const Demande = require("../models/demande");
const Notification = require("../models/notification");
const User = require("../models/utilisateur");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

/* =========================================================
   HELPER : UPLOAD VERS CLOUDINARY
========================================================= */

function uploadVersCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
    streamifier.createReadStream(buffer).pipe(stream);
  });
}

/* =========================================================
   CALCUL DU NOMBRE DE DONNEURS
   1 poche = 2 donneurs
========================================================= */

function calculerNombreDeDonneur(nombreDePocheDeSang) {
  const nombre = Number(nombreDePocheDeSang);

  if (!Number.isFinite(nombre) || nombre <= 0) {
    return 0;
  }

  return nombre * 2;
}

/* =========================================================
   CREER UNE DEMANDE
========================================================= */

async function creerDemande(req, res) {
  try {
    const {
      nomPatient,
      numeroBonDeSang,
      quantite,
      groupeSanguinPatient,
      photoBonDeSang: photoBonDeSangBody,
      nombreDePocheDeSang,
    } = req.body;

    // Déterminer l'URL du bon de sang :
    // priorité au fichier uploadé, sinon la string du body
    let photoBonDeSang = photoBonDeSangBody || null;

    if (req.file) {
      const result = await uploadVersCloudinary(req.file.buffer, {
        folder: "bloodlink/bons-de-sang",
        resource_type: "image",
      });
      photoBonDeSang = result.secure_url;
    }

    if (
      !nomPatient ||
      !numeroBonDeSang ||
      !groupeSanguinPatient ||
      !photoBonDeSang ||
      !nombreDePocheDeSang
    ) {
      return res.status(400).json({
        message:
          "Les champs nomPatient, numeroBonDeSang, groupeSanguinPatient, photoBonDeSang et nombreDePocheDeSang sont requis.",
      });
    }

    const nombrePoches = Number(nombreDePocheDeSang);

    if (!Number.isInteger(nombrePoches) || nombrePoches < 1) {
      return res.status(400).json({
        message:
          "Le nombre de poches doit être un entier supérieur à 0.",
      });
    }

    const quantiteFinale = quantite
      ? Number(quantite)
      : nombrePoches;

    if (
      !Number.isInteger(quantiteFinale) ||
      quantiteFinale < 1
    ) {
      return res.status(400).json({
        message: "La quantité est invalide.",
      });
    }

    const nombreDeDonneur =
      calculerNombreDeDonneur(nombrePoches);

    const idDemande = `DEMANDE-${Date.now()}-${Math.floor(
      Math.random() * 1000
    )}`;

    const demande = new Demande({
      utilisateurId: req.user.id,

      nomPatient: nomPatient.trim(),

      numeroBonDeSang: numeroBonDeSang.trim(),

      quantite: quantiteFinale,

      nombreDePocheDeSang: nombrePoches,

      groupeSanguinPatient,

      nombreDeDonneur,

      photoBonDeSang: typeof photoBonDeSang === "string" ? photoBonDeSang.trim() : photoBonDeSang,

      idDemande,

      status: "en attente",

      donneursConfirmeCount: 0,

      bloque: false,
    });

    await demande.save();

    return res.status(201).json({
      message: "Demande créée avec succès",
      demande,
    });
  } catch (error) {
    console.error("Erreur creerDemande :", error);

    return res.status(500).json({
      message: "Erreur serveur",
      error: error.message,
    });
  }
}

/* =========================================================
   RECUPERER TOUTES LES DEMANDES
========================================================= */

async function getToutesLesDemandes(req, res) {
  try {
    const demandes = await Demande.find()
      .populate(
        "utilisateurId",
        "nom prenom email telephone role"
      )
      .populate(
        "donneursRepondu.donneurId",
        "nom prenom telephone email"
      )
      .sort({ dateCreation: -1 });

    return res.status(200).json({
      demandes,
    });
  } catch (error) {
    console.error(
      "Erreur getToutesLesDemandes :",
      error
    );

    return res.status(500).json({
      message: "Erreur serveur",
      error: error.message,
    });
  }
}

/* =========================================================
   RECUPERER UNE DEMANDE
========================================================= */

async function getDemandeParId(req, res) {
  try {
    const { id } = req.params;

    const demande = await Demande.findById(id)
      .populate(
        "utilisateurId",
        "nom prenom email telephone role"
      )
      .populate(
        "donneursRepondu.donneurId",
        "nom prenom telephone email"
      );

    if (!demande) {
      return res.status(404).json({
        message: "Demande non trouvée",
      });
    }

    return res.status(200).json({
      demande,
    });
  } catch (error) {
    console.error(
      "Erreur getDemandeParId :",
      error
    );

    return res.status(500).json({
      message: "Erreur serveur",
      error: error.message,
    });
  }
}

/* =========================================================
   DEMANDES DU DEMANDEUR CONNECTE
========================================================= */

async function getMesDemandes(req, res) {
  try {
    const demandes = await Demande.find({
      utilisateurId: req.user.id,
    })
      .populate(
        "donneursRepondu.donneurId",
        "nom prenom telephone email"
      )
      .sort({
        dateCreation: -1,
      });

    return res.status(200).json({
      demandes,
    });
  } catch (error) {
    console.error(
      "Erreur getMesDemandes :",
      error
    );

    return res.status(500).json({
      message: "Erreur serveur",
      error: error.message,
    });
  }
}

/* =========================================================
   METTRE A JOUR LE STATUT
   ADMIN / SUPER-ADMIN
========================================================= */

async function mettreAJourStatut(req, res) {
  try {
    const { id } = req.params;

    const { statut, status } = req.body;

    // Accepter les deux noms envoyés par le frontend
    const nouveauStatut = statut || status;

    console.log(
      "=========================================="
    );

    console.log(
      "MISE A JOUR DU STATUT DE LA DEMANDE"
    );

    console.log("ID :", id);

    console.log(
      "Statut reçu :",
      nouveauStatut
    );

    console.log(
      "=========================================="
    );

    if (!nouveauStatut) {
      return res.status(400).json({
        message: "Le nouveau statut est obligatoire.",
      });
    }

    /* =====================================================
       NORMALISATION DES STATUTS
    ===================================================== */

    let statutFinal = nouveauStatut;

    if (
      nouveauStatut === "validée" ||
      nouveauStatut === "validé" ||
      nouveauStatut === "validee" ||
      nouveauStatut === "valide"
    ) {
      statutFinal = "acceptée";
    }

    if (
      nouveauStatut === "refusée" ||
      nouveauStatut === "refusé" ||
      nouveauStatut === "refusee" ||
      nouveauStatut === "refuse"
    ) {
      statutFinal = "refusée";
    }

    if (
      nouveauStatut === "terminée" ||
      nouveauStatut === "terminé"
    ) {
      statutFinal = "bloquée";
    }

    if (
      nouveauStatut === "annulée" ||
      nouveauStatut === "annulé"
    ) {
      statutFinal = "refusée";
    }

    /* =====================================================
       STATUTS DU MODELE DEMANDE
    ===================================================== */

    const statutsAutorises = [
      "en attente",
      "acceptée",
      "refusée",
      "bloquée",
    ];

    if (!statutsAutorises.includes(statutFinal)) {
      return res.status(400).json({
        message:
          `Statut "${nouveauStatut}" non autorisé.`,
      });
    }

    /* =====================================================
       RECUPERER LA DEMANDE
    ===================================================== */

    const demande = await Demande.findById(id);

    if (!demande) {
      return res.status(404).json({
        message: "Demande introuvable.",
      });
    }

    const ancienStatut = demande.status;

    /* =====================================================
       CORRECTION IMPORTANTE

       Le modèle utilise :

       status

       et NON :

       statut
    ===================================================== */

    demande.status = statutFinal;

    await demande.save();

    console.log(
      "Statut enregistré dans MongoDB :",
      demande.status
    );

    /* =====================================================
       SI LA DEMANDE EST VALIDEE
       → NOTIFIER LES DONNEURS
    ===================================================== */

    if (
      statutFinal === "acceptée" &&
      ancienStatut !== "acceptée"
    ) {
      try {
        /*
         * Pour l'instant, on récupère les utilisateurs
         * ayant le rôle donneur.
         */

        // On n'alerte que les donneurs éligibles :
        // - rôle donneur
        // - actif
        // - dateDernierDon null (jamais donné)
        //   OU dateDernierDon >= 90 jours (délai écoulé)
        const TROIS_MOIS_MS = 90 * 24 * 60 * 60 * 1000;
        const dateSeuilEligibilite = new Date(Date.now() - TROIS_MOIS_MS);

        const donneurs = await User.find({
          role: "donneur",
          actif: true,
          $or: [
            { dateDernierDon: null },
            { dateDernierDon: { $lte: dateSeuilEligibilite } },
          ],
        }).select("_id");

        console.log(
          "Nombre de donneurs trouvés :",
          donneurs.length
        );

        if (donneurs.length > 0) {
          const notifications = donneurs.map(
            (donneur) => ({
              userId: donneur._id,

              type: "demande_sang",

              title:
                "Nouvelle demande de sang",

              message:
                `Une nouvelle demande de sang est disponible pour le patient ${demande.nomPatient}. ` +
                `Groupe sanguin : ${demande.groupeSanguinPatient}. ` +
                `Nombre de poches : ${demande.nombreDePocheDeSang}.`,

              data: {
                demandeId: demande._id,
                idDemande: demande.idDemande,
                nomPatient: demande.nomPatient,
                groupeSanguin:
                  demande.groupeSanguinPatient,
                nombreDePoche:
                  demande.nombreDePocheDeSang,
              },

              read: false,
            })
          );

          await Notification.insertMany(
            notifications
          );

          console.log(
            `${notifications.length} notification(s) créée(s).`
          );
        } else {
          console.log(
            "Aucun donneur disponible pour recevoir la notification."
          );
        }
      } catch (notificationError) {
        /*
         * Une erreur de notification ne doit pas
         * annuler la validation de la demande.
         */

        console.error(
          "Erreur lors de la création des notifications :",
          notificationError
        );
      }
    }

    /* =====================================================
       REPONSE AU FRONTEND
    ===================================================== */

    return res.status(200).json({
      message:
        statutFinal === "acceptée"
          ? "Demande validée et notifications envoyées aux donneurs."
          : "Statut de la demande mis à jour avec succès.",

      demande,
    });
  } catch (error) {
    console.error(
      "Erreur mettreAJourStatut :",
      error
    );

    return res.status(500).json({
      message:
        error.message ||
        "Une erreur est survenue lors de la mise à jour du statut.",
    });
  }
}

/* =========================================================
   INCREMENTER LE NOMBRE DE DONNEURS
========================================================= */

async function incrementerDonneur(req, res) {
  try {
    const { id } = req.params;

    const demande = await Demande.findById(id);

    if (!demande) {
      return res.status(404).json({
        message: "Demande non trouvée",
      });
    }

    if (demande.bloque) {
      return res.status(409).json({
        message:
          "Cette demande est déjà satisfaite.",
      });
    }

    if (
      demande.donneursConfirmeCount >=
      demande.nombreDeDonneur
    ) {
      demande.bloque = true;
      demande.status = "bloquée";

      await demande.save();

      return res.status(409).json({
        message:
          "Le nombre de donneurs nécessaires est déjà atteint.",
        demande,
      });
    }

    demande.donneursConfirmeCount += 1;

    if (
      demande.donneursConfirmeCount >=
      demande.nombreDeDonneur
    ) {
      demande.donneursConfirmeCount =
        demande.nombreDeDonneur;

      demande.bloque = true;
      demande.status = "bloquée";
    }

    await demande.save();

    return res.status(200).json({
      message: "Nombre de donneurs mis à jour",
      demande,
    });
  } catch (error) {
    console.error(
      "Erreur incrementerDonneur :",
      error
    );

    return res.status(500).json({
      message: "Erreur serveur",
      error: error.message,
    });
  }
}

/* =========================================================
   SUPPRIMER UNE DEMANDE
========================================================= */

async function supprimerDemande(req, res) {
  try {
    const { id } = req.params;

    const demande = await Demande.findById(id);

    if (!demande) {
      return res.status(404).json({
        message: "Demande non trouvée",
      });
    }

    if (
      req.user.role === "demandeur" &&
      demande.utilisateurId.toString() !==
        req.user.id
    ) {
      return res.status(403).json({
        message:
          "Vous n'êtes pas autorisé à supprimer cette demande.",
      });
    }

    if (
      req.user.role === "demandeur" &&
      demande.bloque
    ) {
      return res.status(403).json({
        message:
          "Une demande satisfaite ne peut pas être supprimée.",
      });
    }

    await Demande.findByIdAndDelete(id);

    return res.status(200).json({
      message: "Demande supprimée avec succès",
    });
  } catch (error) {
    console.error(
      "Erreur supprimerDemande :",
      error
    );

    return res.status(500).json({
      message: "Erreur serveur",
      error: error.message,
    });
  }
}

/* =========================================================
   DEMANDES DISPONIBLES POUR LES DONNEURS
========================================================= */

async function getDemandesDisponibles(req, res) {
  try {
    const demandes = await Demande.find({
      status: "acceptée",
      bloque: false,
    })
      .populate(
        "utilisateurId",
        "nom prenom email telephone"
      )
      .sort({
        dateCreation: -1,
      });

    return res.status(200).json({
      demandes,
    });
  } catch (error) {
    console.error(
      "Erreur getDemandesDisponibles :",
      error
    );

    return res.status(500).json({
      message: "Erreur serveur",
      error: error.message,
    });
  }
}

/* =========================================================
   UN DONNEUR REPOND A UNE DEMANDE
========================================================= */

async function repondreADemande(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (
      !["disponible", "refusé"].includes(status)
    ) {
      return res.status(400).json({
        message:
          "Statut invalide. Utilisez disponible ou refusé.",
      });
    }

    const demande = await Demande.findById(id);

    if (!demande) {
      return res.status(404).json({
        message: "Demande non trouvée",
      });
    }

    if (status === "refusé") {
      return res.status(200).json({
        message: "Demande ignorée",
      });
    }

    if (demande.status !== "acceptée") {
      return res.status(403).json({
        message:
          "Cette demande n'est pas disponible pour les donneurs.",
      });
    }

    if (demande.bloque) {
      return res.status(409).json({
        message:
          "Cette demande est déjà satisfaite.",
      });
    }

    const dejaRepondu =
      demande.donneursRepondu.find(
        (reponse) =>
          reponse.donneurId.toString() ===
          req.user.id
      );

    if (dejaRepondu) {
      return res.status(409).json({
        message:
          "Vous avez déjà répondu à cette demande.",
      });
    }

    demande.donneursRepondu.push({
      donneurId: req.user.id,
      status: "disponible",
      telephone: req.user.telephone || "",
    });

    demande.donneursConfirmeCount += 1;

    if (
      demande.donneursConfirmeCount >=
      demande.nombreDeDonneur
    ) {
      demande.donneursConfirmeCount =
        demande.nombreDeDonneur;

      demande.bloque = true;
      demande.status = "bloquée";
    }

    await demande.save();

    return res.status(200).json({
      message: demande.bloque
        ? "Demande satisfaite et bloquée."
        : "Disponibilité enregistrée avec succès.",

      demande,
    });
  } catch (error) {
    console.error(
      "Erreur repondreADemande :",
      error
    );

    return res.status(500).json({
      message: "Erreur serveur",
      error: error.message,
    });
  }
}

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  creerDemande,
  getToutesLesDemandes,
  getDemandeParId,
  getMesDemandes,
  mettreAJourStatut,
  incrementerDonneur,
  supprimerDemande,
  getDemandesDisponibles,
  repondreADemande,
};