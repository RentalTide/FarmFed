const fs = require('fs');
const path = require('path');

const DATA_PATH = path.resolve(__dirname, '../data/notifications.json');

const getNotifications = () => {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    return Array.isArray(data.notifications) ? data.notifications : [];
  } catch (e) {
    return [];
  }
};

const setNotifications = notifications => {
  const data = { notifications: notifications || [] };
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
};

const addNotification = notification => {
  const notifications = getNotifications();
  notifications.push({
    ...notification,
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
    read: false,
  });
  setNotifications(notifications);
};

const getNotificationsForUser = userId => {
  return getNotifications().filter(n => n.userId === userId);
};

const markReadForUser = userId => {
  const notifications = getNotifications();
  const updated = notifications.map(n =>
    n.userId === userId ? { ...n, read: true } : n
  );
  setNotifications(updated);
};

module.exports = { getNotifications, setNotifications, addNotification, getNotificationsForUser, markReadForUser };
