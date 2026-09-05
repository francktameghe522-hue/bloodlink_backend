const mongoose = require("mongoose");

const donSchema = new mongoose.Schema(
  {
    demandeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Demande",
      required: true,
    },
    donneurId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    groupeSanguin: {
      type: String,
      required: true,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },
    quantite: {
      type: Number,
      required: true,
      min: 1,
    },
    dateDon: {
      type: Date,
      default: Date.now,
    },
    statut: {
      type: String,
      enum: ["en attente", "confirmé", "refusé"],
      default: "en attente",
    },
    numeroPoche: {
      type: String,
      default: "",
    },
    centre: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Don", donSchema);