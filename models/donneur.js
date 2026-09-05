const mongoose = require("mongoose");

const donneurSchema = new mongoose.Schema({
  groupesanguin: {
    type: String,
    enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    unique: true,
  },

  dateDernierDon: {
    type: Date,
    default: null,
  },
});

donneurSchema.virtual("estEligible").get(function () {
  if (!this.dateDernierDon) return true;

  const troisMois = 90 * 24 * 60 * 60 * 1000;
  return Date.now() - this.dateDernierDon.getTime() >= troisMois;
});

module.exports = mongoose.model("Donneur", donneurSchema);