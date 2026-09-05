const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getNotificationsForUser,
  markAsRead,
  markAllRead,
  deleteNotification,
} = require('../controllers/notifController');

router.get('/', auth, getNotificationsForUser);
router.patch('/:id/read', auth, markAsRead);
router.patch('/mark-all-read', auth, markAllRead);
router.delete('/:id', auth, deleteNotification);




// Récupérer notifications utilisateur
router.get("/", auth, getNotificationsForUser);

// Marquer une notification comme lue
router.patch("/:id/read", auth, markAsRead);

// Marquer toutes comme lues
router.patch("/mark-all-read", auth, markAllRead);

// Supprimer une notification
router.delete("/:id", auth, deleteNotification);

module.exports = router;