const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    // Nom
    nom: {
      type: String,
      required: true,
      trim: true,
    },

    // Prénom
    prenom: {
      type: String,
      trim: true,
    },

    // Email
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // Rôle
    role: {
      type: String,
      enum: [
        "demandeur",
        "donneur",
        "admin",
        "super-admin",
      ],
      default: "demandeur",
    },

    // Téléphone
    telephone: {
      type: String,
      trim: true,
    },

    // Mot de passe
    password: {
      type: String,
      required: true,
    },

    // Groupe sanguin
    groupeSanguin: {
      type: String,
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
      default: null,
    },

    // Sexe
    gender: {
      type: String,
      enum: [
        "male",
        "female",
        "others",
      ],
      default: "male",
    },

    // Statut du compte
    actif: {
      type: Boolean,
      default: true,
    },

    // Date du dernier don confirmé par l'admin
    // Sert à calculer l'éligibilité (délai de 3 mois)
    dateDernierDon: {
      type: Date,
      default: null,
    },

    // Photo de profil (URL Cloudinary)
    photoProfil: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.Utilisateur ||
  mongoose.model("Utilisateur", UserSchema);