const Notification = require("../models/notification");

async function notifySafely({ userId, type = "info", title, message, data = {} }) {
  try {
    return await Notification.create({ userId, type, title, message, data });
  } catch (error) {
    console.error("Erreur de creation de notification :", error);
    return null;
  }
}

async function notifyUsersSafely(userIds, notification) {
  const uniqueIds = [...new Set(userIds.map((id) => id.toString()))];
  return Promise.all(uniqueIds.map((userId) => notifySafely({ ...notification, userId })));
}

module.exports = { notifySafely, notifyUsersSafely };
