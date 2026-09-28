const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");

const {
  getNotificationsForUser,
  markAsRead,
  markAllRead,
  archiveNotification,
  unarchiveNotification,
  getUnreadCount,
  deleteNotification,
} = require("../controllers/notifController");

// Récupérer les notifications de l'utilisateur connecté
router.get("/", auth, getNotificationsForUser);

router.get("/unread-count", auth, getUnreadCount);

// Marquer une notification comme lue
router.patch("/:id/read", auth, markAsRead);

// Marquer toutes les notifications comme lues
router.patch("/mark-all-read", auth, markAllRead);

router.patch("/:id/archive", auth, archiveNotification);

router.patch("/:id/unarchive", auth, unarchiveNotification);

// Supprimer une notification
router.delete("/:id", auth, deleteNotification);

module.exports = router;
