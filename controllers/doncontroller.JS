const Demande = require("../models/demande");
const Don = require("../models/don");
const User = require("../models/Utilisateur");
const { verifierEtReactiverDonneur, TROIS_MOIS_MS } = require("../utils/eligibilite");

// =====================================================
// RÈGLE MÉTIER
// 1 poche de sang = 2 donneurs
// =====================================================
function calculerNombreDeDonneur(nombreDePocheDeSang) {
  const n = Number(nombreDePocheDeSang) || 0;

  return Math.max(0, Math.ceil(n * 2));
}


// =====================================================
// DONNEUR RÉPOND À UNE DEMANDE
// Il devient disponible et un don est créé
// avec le statut "en attente"
// =====================================================
async function repondreDemande(req, res) {
  try {
    const demandeId = req.params.demandeId;
    const donneurId = req.user.id;

    const { telephone } = req.body;

    // -------------------------------------------------
    // Vérifier la demande
    // -------------------------------------------------
    const demande = await Demande.findById(demandeId);

    if (!demande) {
      return res.status(404).json({
        message: "Demande non trouvée",
      });
    }

    // -------------------------------------------------
    // Vérifier si la demande est bloquée
    // -------------------------------------------------
    if (demande.bloque) {
      return res.status(400).json({
        message: "Demande bloquée",
      });
    }

    // -------------------------------------------------
    // Vérifier l'éligibilité du donneur (délai 3 mois)
    // La fonction vérifie ET réactive automatiquement
    // si les 3 mois sont écoulés depuis le dernier don
    // -------------------------------------------------
    const eligibilite = await verifierEtReactiverDonneur(donneurId);

    if (!eligibilite.eligible) {
      const dateDisponible = eligibilite.dateEligibilite
        .toLocaleDateString("fr-FR");

      return res.status(403).json({
        message:
          `Vous ne pouvez pas encore donner du sang. ` +
          `Vous serez à nouveau éligible dans ${eligibilite.joursRestants} jour(s) ` +
          `(à partir du ${dateDisponible}).`,
        dateEligibilite: eligibilite.dateEligibilite,
        joursRestants: eligibilite.joursRestants,
      });
    }

    // -------------------------------------------------
    // Éviter les doublons
    // -------------------------------------------------
    const dejaRepondu = demande.donneursRepondu.some(
      (d) => d.donneurId.equals(donneurId)
    );

    if (dejaRepondu) {
      return res.status(409).json({
        message:
          "Vous avez déjà répondu à cette demande",
      });
    }

    // -------------------------------------------------
    // Ajouter la réponse du donneur
    // -------------------------------------------------
    demande.donneursRepondu.push({
      donneurId,
      telephone: telephone || "",
      status: "disponible",
    });

    await demande.save();

    // -------------------------------------------------
    // Créer le don en attente
    // -------------------------------------------------
    const donExistant = await Don.findOne({
      demandeId: demande._id,
      donneurId,
    });

    if (!donExistant) {
      await Don.create({
        demandeId: demande._id,
        donneurId,
        groupeSanguin: demande.groupeSanguinPatient,
        quantite: 1,
        statut: "en attente",
        centre: "CHU de Yaoundé",
      });
    }

    return res.status(201).json({
      message: "Réponse enregistrée avec succès",
      demande,
    });

  } catch (err) {
    console.error(
      "Erreur réponse demande :",
      err
    );

    return res.status(500).json({
      message: "Erreur serveur",
      error: err.message,
    });
  }
}


// =====================================================
// LISTER LES DONNEURS AYANT RÉPONDU
// =====================================================
async function getDonneursRepondu(req, res) {
  try {
    const demande = await Demande.findById(
      req.params.demandeId
    ).populate(
      "donneursRepondu.donneurId",
      "nom prenom email telephone groupeSanguin"
    );

    if (!demande) {
      return res.status(404).json({
        message: "Demande non trouvée",
      });
    }

    return res.status(200).json({
      donneurs: demande.donneursRepondu,
    });

  } catch (err) {
    console.error(
      "Erreur récupération donneurs :",
      err
    );

    return res.status(500).json({
      message: "Erreur serveur",
      error: err.message,
    });
  }
}


// =====================================================
// ADMIN CONFIRME QU'UN DON A RÉELLEMENT ÉTÉ EFFECTUÉ
// =====================================================
async function adminConfirmerDon(req, res) {
  try {
    const { demandeId, donneurId } = req.params;

    // -------------------------------------------------
    // Vérifier la demande
    // -------------------------------------------------
    const demande = await Demande.findById(
      demandeId
    );

    if (!demande) {
      return res.status(404).json({
        message: "Demande non trouvée",
      });
    }

    // -------------------------------------------------
    // Vérifier la réponse du donneur
    // -------------------------------------------------
    const reponse = demande.donneursRepondu.find(
      (r) => r.donneurId.equals(donneurId)
    );

    if (!reponse) {
      return res.status(404).json({
        message:
          "Réponse du donneur introuvable",
      });
    }

    // -------------------------------------------------
    // Chercher le don créé lors de la réponse
    // -------------------------------------------------
    const don = await Don.findOne({
      demandeId: demande._id,
      donneurId,
    });

    if (!don) {
      return res.status(404).json({
        message:
          "Aucun don en attente trouvé pour ce donneur.",
      });
    }

    // -------------------------------------------------
    // Vérifier le statut actuel
    // -------------------------------------------------
    if (don.statut === "confirmé") {
      return res.status(409).json({
        message: "Ce don est déjà confirmé.",
      });
    }

    if (don.statut === "refusé") {
      return res.status(400).json({
        message: "Ce don a été refusé.",
      });
    }

    // -------------------------------------------------
    // CONFIRMER LE DON
    // -------------------------------------------------
    don.statut = "confirmé";
    don.dateDon = new Date();

    await don.save();

    // -------------------------------------------------
    // ENREGISTRER LA DATE DU DERNIER DON SUR LE DONNEUR
    // Cette date sert à calculer le délai de 3 mois
    // avant qu'il puisse à nouveau répondre à une demande
    // -------------------------------------------------
    await User.findByIdAndUpdate(donneurId, {
      dateDernierDon: don.dateDon,
    });

    // -------------------------------------------------
    // Mettre à jour la réponse du donneur
    // -------------------------------------------------
    reponse.status = "confirmé";

    // -------------------------------------------------
    // Incrémenter le nombre de donneurs confirmés
    // -------------------------------------------------
    demande.donneursConfirmeCount =
      (demande.donneursConfirmeCount || 0) + 1;

    // -------------------------------------------------
    // Nombre de donneurs nécessaires
    // -------------------------------------------------
    const required =
      calculerNombreDeDonneur(
        demande.nombreDePocheDeSang
      );

    // -------------------------------------------------
    // SI LA DEMANDE EST COMPLÈTE
    // -------------------------------------------------
    if (
      demande.donneursConfirmeCount >=
      required
    ) {
      demande.bloque = true;
      demande.status = "bloquée";

      try {
        const {
          createNotification,
        } = require(
          "./notificationController"
        );

        // ---------------------------------------------
        // NOTIFIER LE DEMANDEUR
        // ---------------------------------------------
        await createNotification({
          userId: demande.utilisateurId,

          type: "demande_completee",

          title:
            "Votre demande est complétée",

          message:
            `La demande ${demande.idDemande} ` +
            `a atteint le nombre requis de donneurs.`,

          data: {
            demandeId: demande._id,
          },
        });

        // ---------------------------------------------
        // NOTIFIER LES AUTRES DONNEURS
        // ---------------------------------------------
        const autres =
          demande.donneursRepondu
            .filter(
              (r) =>
                !r.donneurId.equals(
                  donneurId
                ) &&
                r.status !== "confirmé"
            )
            .map((r) => r.donneurId);

        for (const otherId of autres) {
          await createNotification({
            userId: otherId,

            type: "demande_bloquee",

            title:
              "Demande complétée",

            message:
              `La demande ${demande.idDemande} ` +
              `a été complétée par d'autres donneurs.`,

            data: {
              demandeId: demande._id,
            },
          });
        }

      } catch (notifErr) {
        console.error(
          "Erreur lors de la création des notifications :",
          notifErr
        );
      }
    }

    // -------------------------------------------------
    // SAUVEGARDER LA DEMANDE COURANTE
    // -------------------------------------------------
    await demande.save();

    // -------------------------------------------------
    // MARQUER LE DONNEUR COMME INDISPONIBLE
    // SUR TOUTES LES AUTRES DEMANDES ACTIVES
    // -------------------------------------------------
    // Un donneur qui vient de faire un don ne peut plus
    // répondre à d'autres demandes tant que l'admin ne
    // l'a pas remis disponible (délai de 3 mois).
    // On cherche toutes les demandes (hors celle-ci)
    // où ce donneur est encore "disponible" et on :
    //   1. Passe son statut à "indisponible"
    //   2. Annule son don "en attente" correspondant
    // -------------------------------------------------
    try {
      const autresDemandes = await Demande.find({
        _id: { $ne: demande._id },
        bloque: false,
        "donneursRepondu": {
          $elemMatch: {
            donneurId: donneurId,
            status: "disponible",
          },
        },
      });

      for (const autreDemande of autresDemandes) {
        // Passer le statut du donneur à "indisponible"
        const autreReponse = autreDemande.donneursRepondu.find(
          (r) => r.donneurId.equals(donneurId)
        );

        if (autreReponse) {
          autreReponse.status = "indisponible";
        }

        await autreDemande.save();

        // Annuler le don "en attente" sur cette demande
        await Don.findOneAndUpdate(
          {
            demandeId: autreDemande._id,
            donneurId: donneurId,
            statut: "en attente",
          },
          { statut: "refusé" }
        );
      }

      // Notifier le donneur qu'il est maintenant indisponible
      if (autresDemandes.length > 0) {
        const {
          createNotification,
        } = require("./notificationController");

        await createNotification({
          userId: donneurId,

          type: "donneur_indisponible",

          title: "Vous êtes maintenant indisponible",

          message:
            `Votre don a été confirmé. Vous avez été retiré de ` +
            `${autresDemandes.length} autre(s) demande(s) en attente. ` +
            `Vous pourrez à nouveau donner après 3 mois.`,

          data: {
            demandeConfirmeeId: demande._id,
            nombreDemandesAnnulees: autresDemandes.length,
          },
        });
      }

    } catch (indispoErr) {
      console.error(
        "Erreur lors du marquage indisponible du donneur :",
        indispoErr
      );
    }

    return res.status(200).json({
      message:
        "Le don a été enregistré et confirmé avec succès.",

      don,

      demande,
    });

  } catch (err) {
    console.error(
      "Erreur confirmation don :",
      err
    );

    return res.status(500).json({
      message:
        "Erreur serveur lors de la confirmation du don.",

      error: err.message,
    });
  }
}


// =====================================================
// ADMIN ENREGISTRE UN NOUVEAU DONNEUR
// =====================================================
async function adminEnregistrerDonneur(req, res) {
  try {
    const {
      nom,
      prenom,
      email,
      telephone,
      password,
      groupeSanguin,
      gender,
    } = req.body;

    // -------------------------------------------------
    // Vérification des champs obligatoires
    // -------------------------------------------------
    if (!nom || !email || !password) {
      return res.status(400).json({
        message:
          "Le nom, l'email et le mot de passe sont obligatoires.",
      });
    }

    // -------------------------------------------------
    // Vérifier si l'email existe
    // -------------------------------------------------
    const existing = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (existing) {
      return res.status(409).json({
        message: "Email déjà utilisé",
      });
    }

    // -------------------------------------------------
    // Groupes sanguins autorisés
    // -------------------------------------------------
    const allowedGroupes = [
      "A+",
      "A-",
      "B+",
      "B-",
      "AB+",
      "AB-",
      "O+",
      "O-",
    ];

    if (
      groupeSanguin &&
      !allowedGroupes.includes(groupeSanguin)
    ) {
      return res.status(400).json({
        message:
          "Groupe sanguin invalide",
      });
    }

    // -------------------------------------------------
    // Genres autorisés
    // -------------------------------------------------
    const allowedGender = [
      "male",
      "female",
      "others",
    ];

    if (
      gender &&
      !allowedGender.includes(gender)
    ) {
      return res.status(400).json({
        message: "Genre invalide",
      });
    }

    // -------------------------------------------------
    // Créer le donneur
    // -------------------------------------------------
    const user = new User({
      nom: nom.trim(),

      prenom: prenom
        ? prenom.trim()
        : "",

      email: email
        .toLowerCase()
        .trim(),

      telephone: telephone
        ? telephone.trim()
        : "",

      password,

      role: "donneur",

      groupeSanguin:
        groupeSanguin || null,

      gender:
        gender || "male",

      actif: true,
    });

    await user.save();

    return res.status(201).json({
      message:
        "Donneur enregistré avec succès",

      user,
    });

  } catch (err) {
    console.error(
      "Erreur enregistrement donneur :",
      err
    );

    return res.status(500).json({
      message:
        "Erreur serveur lors de l'enregistrement du donneur",

      error: err.message,
    });
  }
}


// =====================================================
// DONNEUR ANNULE SA RÉPONSE
// =====================================================
async function annulerReponse(req, res) {
  try {
    const demandeId = req.params.demandeId;
    const donneurId = req.user.id;

    const demande = await Demande.findById(
      demandeId
    );

    if (!demande) {
      return res.status(404).json({
        message: "Demande non trouvée",
      });
    }

    // -------------------------------------------------
    // Vérifier la réponse
    // -------------------------------------------------
    const reponse =
      demande.donneursRepondu.find(
        (r) =>
          r.donneurId.equals(donneurId)
      );

    if (!reponse) {
      return res.status(404).json({
        message:
          "Vous n'aviez pas répondu à cette demande",
      });
    }

    // -------------------------------------------------
    // Empêcher l'annulation d'un don déjà confirmé
    // -------------------------------------------------
    if (reponse.status === "confirmé") {
      return res.status(400).json({
        message:
          "Vous ne pouvez plus annuler une réponse dont le don a été confirmé.",
      });
    }

    // -------------------------------------------------
    // Supprimer la réponse
    // -------------------------------------------------
    demande.donneursRepondu =
      demande.donneursRepondu.filter(
        (r) =>
          !r.donneurId.equals(
            donneurId
          )
      );

    await demande.save();

    // -------------------------------------------------
    // Supprimer le don en attente associé
    // -------------------------------------------------
    await Don.deleteOne({
      demandeId: demande._id,
      donneurId,
      statut: "en attente",
    });

    return res.status(200).json({
      message:
        "Réponse annulée avec succès",

      demande,
    });

  } catch (err) {
    console.error(
      "Erreur annulation réponse :",
      err
    );

    return res.status(500).json({
      message: "Erreur serveur",
      error: err.message,
    });
  }
}


// =====================================================
// ADMIN RÉCUPÈRE TOUS LES DONS
// =====================================================
async function getAllDons(req, res) {
  try {
    const dons = await Don.find()

      .populate(
        "donneurId",
        "nom prenom email telephone groupeSanguin"
      )

      .populate(
        "demandeId",
        "idDemande nomPatient numeroBonDeSang groupeSanguinPatient nombreDePocheDeSang"
      )

      .sort({
        createdAt: -1,
      });

    return res.status(200).json(dons);

  } catch (err) {
    console.error(
      "Erreur récupération des dons :",
      err
    );

    return res.status(500).json({
      message:
        "Erreur serveur lors de la récupération des dons",

      error: err.message,
    });
  }
}


// =====================================================
// EXPORTS
// =====================================================
module.exports = {
  repondreDemande,
  getDonneursRepondu,
  adminConfirmerDon,
  adminEnregistrerDonneur,
  annulerReponse,
  getAllDons,
};