const config = require('../config');
const logger = require('../utils/logger');

async function notifyUser(client, userId, content, fallbackChannelId = config.notificationFallbackChannelId) {
  try {
    const user = await client.users.fetch(userId);
    await user.send(content);
    return true;
  } catch (error) {
    logger.warn('DM failed', { userId, error: error.message });
  }

  if (!fallbackChannelId) return false;
  try {
    const channel = await client.channels.fetch(fallbackChannelId);
    if (channel?.isTextBased()) {
      await channel.send(`<@${userId}> ${content}`);
      return true;
    }
  } catch (error) {
    logger.warn('Fallback notification failed', { userId, error: error.message });
  }
  return false;
}

async function verificationSuccess(client, member) {
  const message = 'You have verified successfully and have been assigned T I.';
  if (config.sendVerificationSuccess) {
    await notifyUser(client, member.id, message, config.welcomeChannelId || config.notificationFallbackChannelId);
  }
}

module.exports = { notifyUser, verificationSuccess };
