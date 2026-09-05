const mongoose = require("mongoose");


const dns = require("dns");

// Force Node à utiliser des DNS publics pour résoudre le SRV
// (contourne un DNS local/VPN qui bloque les requêtes DNS de Node.js)
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const dbConnect = async () => {
  console.log("🕟 wait, connecting to mongodb ....");
  mongoose.set('strictQuery', true);
  await mongoose.connect(process.env.DATABASE_URL)   
    .then(() => console.log('💾  mongoDB connecté !'))
    .catch((err) => {
      console.error('Impossibe de se connecter à mongoDB 😭😭😭');
      console.log(err);
      process.exit(1);
    });
};
module.exports = dbConnect;