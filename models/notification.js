const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, default: 'info' },
    title: { type: String, required: true },
    message: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    read: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, archived: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
