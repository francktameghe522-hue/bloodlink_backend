const express = require('express');
const auth = require('../middleware/auth');
const profileController = require('../controllers/profileController');
const upload = require('../middleware/upload');

const router = express.Router();

router.get('/', auth, profileController.getProfile);
router.put('/', auth, profileController.updateProfile);

// Upload photo de profil
router.post('/photo', auth, upload.single('photo'), profileController.uploadPhotoProfil);

// Supprimer photo de profil
router.delete('/photo', auth, profileController.supprimerPhotoProfil);

module.exports = router;
