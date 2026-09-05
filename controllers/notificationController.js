const Notification = require('../models/notification');

async function createNotification({ userId, type = 'info', title, message, data = {} }) {
  const notif = new Notification({ userId, type, title, message, data });
  await notif.save();
  return notif;
}

async function getNotificationsForUser(req, res) {
  try {
    const userId = req.user.id;
    const notifs = await Notification.find({ userId }).sort({ createdAt: -1 });
    return res.status(200).json({ notifications: notifs });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
}

async function markAsRead(req, res) {
  try {
    const { id } = req.params;
    const notif = await Notification.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      { read: true },
      { new: true }
    );
    if (!notif) return res.status(404).json({ message: 'Notification non trouvée' });
    return res.status(200).json({ notification: notif });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
}

async function markAllRead(req, res) {
  try {
    await Notification.updateMany({ userId: req.user.id, read: false }, { read: true });
    return res.status(200).json({ message: 'Toutes les notifications marquées comme lues' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
}

async function deleteNotification(req, res) {
  try {
    const { id } = req.params;
    const notif = await Notification.findOneAndDelete({ _id: id, userId: req.user.id });
    if (!notif) return res.status(404).json({ message: 'Notification non trouvée' });
    return res.status(200).json({ message: 'Notification supprimée' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
}

module.exports = {
  createNotification,
  getNotificationsForUser,
  markAsRead,
  markAllRead,
  deleteNotification,
};
