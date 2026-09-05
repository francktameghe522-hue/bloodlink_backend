const express = require('express');
const auth = require('../middleware/auth');
const profileController = require('../controllers/profileController');

const router = express.Router();

router.get('/', auth, profileController.getProfile);
router.put('/', auth, profileController.updateProfile);

module.exports = router;
