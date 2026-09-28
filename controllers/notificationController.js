const Notification = require('../models/notification');
const { verifierEtReactiverDonneur } = require('../utils/eligibilite');

async function createNotification({ userId, type = 'info', title, message, data = {} }) {
  const notif = new Notification({ userId, type, title, message, data });
  await notif.save();
  return notif;
}

async function getNotificationsForUser(req, res) {
  try {
    const userId = req.user.id;
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 100);
    const filter = { userId };
    const unreadFilter = { userId, archived: false, read: false };
    const eligibilite = req.user.role === 'donneur'
      ? await verifierEtReactiverDonneur(userId)
      : null;

    if (eligibilite?.dateEligibilite) {
      const alertesEligibles = {
        $or: [
          { type: { $ne: 'demande_sang' } },
          { type: 'demande_sang', createdAt: { $gte: eligibilite.dateEligibilite } },
        ],
      };
      filter.$and = [alertesEligibles];
      unreadFilter.$and = [alertesEligibles];
    }

    if (req.query.archived === 'true' || req.query.archived === 'false') {
      filter.archived = req.query.archived === 'true';
    } else {
      filter.archived = false;
    }
    if (req.query.read === 'true' || req.query.read === 'false') {
      filter.read = req.query.read === 'true';
    }
    if (req.query.type?.trim()) filter.type = req.query.type.trim();
    if (req.query.search?.trim()) {
      const search = new RegExp(req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ title: search }, { message: search }];
    }
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from && !Number.isNaN(Date.parse(req.query.from))) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to && !Number.isNaN(Date.parse(req.query.to))) filter.createdAt.$lte = new Date(req.query.to);
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Notification.countDocuments(filter),
      Notification.countDocuments(unreadFilter),
    ]);
    return res.status(200).json({
      notifications,
      unreadCount,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
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
    await Notification.updateMany({ userId: req.user.id, archived: false, read: false }, { read: true });
    return res.status(200).json({ message: 'Toutes les notifications marquées comme lues' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
}

async function archiveNotification(req, res) {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { archived: true, archivedAt: new Date() },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notification non trouvée' });
    return res.status(200).json({ notification });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
}

async function unarchiveNotification(req, res) {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { archived: false, archivedAt: null },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notification non trouvée' });
    return res.status(200).json({ notification });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
}

async function getUnreadCount(req, res) {
  try {
    const filter = { userId: req.user.id, archived: false, read: false };
    if (req.user.role === 'donneur') {
      const eligibilite = await verifierEtReactiverDonneur(req.user.id);
      if (eligibilite.dateEligibilite) {
        filter.$and = [{
          $or: [
            { type: { $ne: 'demande_sang' } },
            { type: 'demande_sang', createdAt: { $gte: eligibilite.dateEligibilite } },
          ],
        }];
      }
    }
    const unreadCount = await Notification.countDocuments(filter);
    return res.status(200).json({ unreadCount });
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
  archiveNotification,
  unarchiveNotification,
  getUnreadCount,
  deleteNotification,
};
