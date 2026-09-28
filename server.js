const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const cors = require("cors");

dotenv.config({ path: path.join(__dirname, ".env") });

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET doit être défini dans l'environnement.");
}

const dbConnect = require("./config/dbConnect");

const authRoutes = require("./routes/authroute");
const profileRoutes = require("./routes/profile");
const demandeRoutes = require("./routes/demroute");
const donRoutes = require("./routes/donroute");
const notificationRoutes = require("./routes/notifroute");
const adminRoutes = require("./routes/adminroutes");

const app = express();

const PORT = Number(process.env.PORT) || 5002;
const allowedOrigins = (
  process.env.CORS_ORIGIN ||
  "http://localhost:5173,http://localhost:5174,http://localhost:5171,http://localhost:5172,http://localhost:5171"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable("x-powered-by");

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origine non autorisée par CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(cookieParser());

// ==============================
// ROUTES
// ==============================

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/demandes", demandeRoutes);
app.use("/api/dons", donRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);

app.use((err, _req, res, next) => {
  if (err.name === "MulterError" && err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ message: "L'image ne doit pas dépasser 5 Mo." });
  }

  if (err.message?.startsWith("Type de fichier non autorisé")) {
    return res.status(400).json({ message: err.message });
  }

  return next(err);
});

// ==============================
// TEST DU SERVEUR
// ==============================

app.get("/health", (_req, res) => {
  const dbState = dbConnect.getConnectionState
    ? dbConnect.getConnectionState()
    : true;

  res.status(200).json({
    status: "ok",
    database: dbState ? "connected" : "unknown",
  });
});

// ==============================
// CONNEXION BDD + DÉMARRAGE
// ==============================

dbConnect()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Serveur démarré sur le port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Échec de connexion à la base de données", err);

    process.exit(1);
  });

module.exports = app;
