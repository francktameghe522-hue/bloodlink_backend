const User = require('../models/Utilisateur');
const { deleteImage, uploadImage } = require('../utils/imageStorage');
const { DELAI_ELIGIBILITE_MS } = require('../utils/eligibilite');

async function getProfile(req, res) {
  try {
    const user = await User.findById(req.user.id).select('-password -photoProfilPublicId');
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
          new Date(user.dateDernierDon).getTime() + DELAI_ELIGIBILITE_MS
        );
        const maintenant = Date.now();
        const ecoulé = maintenant - new Date(user.dateDernierDon).getTime();
        const eligible = ecoulé >= DELAI_ELIGIBILITE_MS;
        const joursRestants = eligible
          ? 0
          : Math.ceil((DELAI_ELIGIBILITE_MS - ecoulé) / (24 * 60 * 60 * 1000));

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
    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select('-password -photoProfilPublicId');
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

    const result = await uploadImage(req.file, 'bloodlink/profils');
    const previousUser = await User.findById(req.user.id).select('photoProfil photoProfilPublicId');
    await deleteImage(previousUser?.photoProfil, previousUser?.photoProfilPublicId);

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { photoProfil: result.url, photoProfilPublicId: result.publicId },
      { new: true }
    ).select('-password -photoProfilPublicId');

    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    return res.status(200).json({ user });
  } catch (err) {
    console.error('Erreur uploadPhotoProfil :', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
}

/* =========================================================
   SUPPRIMER PHOTO DE PROFIL
========================================================= */

async function supprimerPhotoProfil(req, res) {
  try {
    const previousUser = await User.findById(req.user.id).select('photoProfil photoProfilPublicId');
    await deleteImage(previousUser?.photoProfil, previousUser?.photoProfilPublicId);

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { photoProfil: null, photoProfilPublicId: null },
      { new: true }
    ).select('-password -photoProfilPublicId');

    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    return res.status(200).json({ user });
  } catch (err) {
    console.error('Erreur supprimerPhotoProfil :', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
}

module.exports = { getProfile, updateProfile, uploadPhotoProfil, supprimerPhotoProfil };
