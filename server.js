const express = require('express');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');

dotenv.config();

const dbConnect = require('./config/dbConnect');

const authRoutes = require('./routes/authroute');
const profileRoutes = require('./routes/profile');
const demandeRoutes = require('./routes/demroute');
const donRoutes = require('./routes/donroute');
const notificationRoutes = require('./routes/notifroute');

const app = express();
const PORT = Number(process.env.PORT) || 5002;

app.disable('x-powered-by');
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/demandes', demandeRoutes);
app.use('/api/dons', donRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/health', (_req, res) => {
  const dbState = dbConnect.getConnectionState ? dbConnect.getConnectionState() : true;
  res.status(200).json({ status: 'ok', database: dbState ? 'connected' : 'unknown' });
});

// Start server after DB connection
dbConnect()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Serveur démarré sur le port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Échec de connexion à la base de données', err);
    process.exit(1);
  });

module.exports = app;
