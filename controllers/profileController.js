const User = require('../models/Utilisateur');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

const TROIS_MOIS_MS = 90 * 24 * 60 * 60 * 1000;

/* =========================================================
   HELPER : UPLOAD VERS CLOUDINARY
========================================================= */

function uploadVersCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
    streamifier.createReadStream(buffer).pipe(stream);
  });
}

async function getProfile(req, res) {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    // -------------------------------------------------
    // Calcul de l'éligibilité pour les donneurs
    // -------------------------------------------------
    let eligibilite = null;

    if (user.role === 'donneur') {
      if (!user.dateDernierDon) {
        // Jamais donné → éligible immédiatement
        eligibilite = {
          eligible: true,
          dateDernierDon: null,
          dateEligibilite: null,
          joursRestants: 0,
        };
      } else {
        const dateEligibilite = new Date(
          new Date(user.dateDernierDon).getTime() + TROIS_MOIS_MS
        );
        const maintenant = Date.now();
        const ecoulé = maintenant - new Date(user.dateDernierDon).getTime();
        const eligible = ecoulé >= TROIS_MOIS_MS;
        const joursRestants = eligible
          ? 0
          : Math.ceil((TROIS_MOIS_MS - ecoulé) / (24 * 60 * 60 * 1000));

        eligibilite = {
          eligible,
          dateDernierDon: user.dateDernierDon,
          dateEligibilite: eligible ? null : dateEligibilite,
          joursRestants,
        };
      }
    }

    res.status(200).json({ user, eligibilite });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
}

async function updateProfile(req, res) {
  try {
    const updates = (({ nom, prenom, telephone, gender }) => ({ nom, prenom, telephone, gender }))(req.body);
    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });
    res.status(200).json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
}

/* =========================================================
   UPLOAD PHOTO DE PROFIL
========================================================= */

async function uploadPhotoProfil(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier fourni.' });
    }

    const result = await uploadVersCloudinary(req.file.buffer, {
      folder: 'bloodlink/profils',
      resource_type: 'image',
    });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { photoProfil: result.secure_url },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    return res.status(200).json({ user });
  } catch (err) {
    console.error('Erreur uploadPhotoProfil :', err);
    return res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
}

/* =========================================================
   SUPPRIMER PHOTO DE PROFIL
========================================================= */

async function supprimerPhotoProfil(req, res) {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { photoProfil: null },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    return res.status(200).json({ user });
  } catch (err) {
    console.error('Erreur supprimerPhotoProfil :', err);
    return res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
}

module.exports = { getProfile, updateProfile, uploadPhotoProfil, supprimerPhotoProfil };
