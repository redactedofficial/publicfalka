const activityService = require('../services/activityService');

module.exports = async function messageCreate(message) {
  await activityService.recordMessage(message.client, message);
};
