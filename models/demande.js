const mongoose = require("mongoose");

const reponseDonneurSchema = new mongoose.Schema(
  {
    donneurId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["disponible", "confirmé", "refusé"],
      default: "disponible",
    },
    telephone: { type: String, default: "" },
    dateReponse: { type: Date, default: Date.now },
  },
  { _id: false }
);

const demandeSchema = new mongoose.Schema(
  {
    utilisateurId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    dateCreation: { type: Date, default: Date.now },
    quantite: { type: Number, required: true, min: 1 },
    groupeSanguinPatient: {
      type: String,
      required: true,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },
    nombreDeDonneur: { type: Number, default: 0, min: 0 }, // requis (calculé)
    nombreDePocheDeSang: { type: Number, required: true, min: 1 },
    photoBonDeSang: { type: String, required: true },
    idDemande: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["en attente", "acceptée", "refusée", "bloquée"],
      default: "en attente",
    },
    donneursRepondu: { type: [reponseDonneurSchema], default: [] },
    donneursConfirmeCount: { type: Number, default: 0 },
    bloque: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Demande", demandeSchema);