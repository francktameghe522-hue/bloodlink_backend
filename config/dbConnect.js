const mongoose = require("mongoose");

const dbConnect = async () => {
  try {
    console.log("🕟 Connexion à MongoDB...");

    mongoose.set("strictQuery", true);

    console.log(
      "DATABASE_URL présente :",
      process.env.DATABASE_URL ? "OUI" : "NON"
    );

    await mongoose.connect(process.env.DATABASE_URL, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log("💾 MongoDB connecté !");
  } catch (error) {
    console.error("❌ Impossible de se connecter à MongoDB");
    console.error("Message :", error.message);
    process.exit(1);
  }
};

module.exports = dbConnect;