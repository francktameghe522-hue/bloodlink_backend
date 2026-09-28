require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/Utilisateur");

async function createSuperAdmin() {
  try {
    // Connexion à MongoDB Atlas
    await mongoose.connect(process.env.DATABASE_URL);

    console.log("MongoDB connecté avec succès.");

    const email = "superadmin@bloodlink.com";
    const password = "SuperAdmin123";

    // Vérifier si le compte existe déjà
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      console.log("Ce compte existe déjà.");

      if (existingUser.role !== "super-admin") {
        existingUser.role = "super-admin";
        await existingUser.save();

        console.log("Le rôle a été changé en super-admin.");
      } else {
        console.log("Le compte est déjà super-admin.");
      }

      await mongoose.disconnect();
      return;
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer le super-admin
    const superAdmin = new User({
      nom: "Administrateur",
      prenom: "Principal",
      email: email,
      password: hashedPassword,
      telephone: "690000000",
      role: "super-admin",
      gender: "male",
    });

    await superAdmin.save();

    console.log("--------------------------------");
    console.log("SUPER-ADMIN CRÉÉ AVEC SUCCÈS");
    console.log("--------------------------------");
    console.log("Email :", email);
    console.log("Mot de passe :", password);
    console.log("Rôle :", superAdmin.role);
    console.log("--------------------------------");

    await mongoose.disconnect();

  } catch (error) {
    console.error("Erreur :", error.message);

    await mongoose.disconnect();
  }
}

createSuperAdmin();