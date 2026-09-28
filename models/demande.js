const mongoose = require("mongoose");

// Réponse d'un donneur à une demande
const reponseDonneurSchema = new mongoose.Schema(
  {
    donneurId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Utilisateur",
      required: true,
    },

    status: {
      type: String,
      enum: ["disponible", "confirmé", "refusé", "indisponible"],
      default: "disponible",
    },

    telephone: {
      type: String,
      default: "",
    },

    dateReponse: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

// Schéma d'une demande de sang
const demandeSchema = new mongoose.Schema(
  {
    // Demandeur ayant créé la demande
    utilisateurId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Utilisateur",
      required: true,
    },

    // Informations du patient
    nomPatient: {
      type: String,
      required: true,
      trim: true,
    },

    // Numéro du bon de sang
    numeroBonDeSang: {
      type: String,
      required: true,
      trim: true,
    },

    // Date de création
    dateCreation: {
      type: Date,
      default: Date.now,
    },

    // Quantité demandée
    quantite: {
      type: Number,
      required: true,
      min: 1,
    },

    // Groupe sanguin du patient
    groupeSanguinPatient: {
      type: String,
      required: true,
      enum: [
        "A+",
        "A-",
        "B+",
        "B-",
        "AB+",
        "AB-",
        "O+",
        "O-",
      ],
    },

    // Nombre de poches demandé
    nombreDePocheDeSang: {
      type: Number,
      required: true,
      min: 1,
    },

    // Nombre de donneurs nécessaires
    // Règle actuelle : 1 poche = 2 donneurs
    nombreDeDonneur: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Photo ou référence du bon de sang
    photoBonDeSang: {
      type: String,
      required: true,
      trim: true,
    },

    // Identifiant lisible de la demande
    idDemande: {
      type: String,
      required: true,
      unique: true,
    },

    // État de la demande
    status: {
      type: String,
      enum: [
        "en attente",
        "acceptée",
        "refusée",
        "bloquée",
      ],
      default: "en attente",
    },

    // Date a laquelle la demande est devenue une alerte donneur.
    dateAlerte: {
      type: Date,
      default: null,
    },

    // Liste des donneurs ayant répondu
    donneursRepondu: {
      type: [reponseDonneurSchema],
      default: [],
    },

    // Nombre de donneurs actuellement disponibles/confirmés
    donneursConfirmeCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Permet de bloquer automatiquement la demande
    bloque: {
      type: Boolean,
      default: false,
    },
  },

  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.Demande || mongoose.model("Demande", demandeSchema);
