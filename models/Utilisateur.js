const mongoose = require("mongoose")

const UserSchema = new mongoose.Schema({
    nom: String,
    email: {
        type: String,
        unique: true,
    },

    prenom: {
        type: String,
    },

    role: {
        type: String,
        enum: ["demandeur", "donneur", "admin", "super-admin"],

    },

    telephone: String,


    password: String,

    groupeSanguin: {
        type: String,
        enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
        default: null,
    },

    gender: {
        type: String,
        enum: ["male", "female", "others"],
        default: "male",
    },


})
module.exports = mongoose.model("User", UserSchema);