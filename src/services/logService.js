const { EmbedBuilder } = require('discord.js');
const { db } = require('../database');
const config = require('../config');
const { nowIso } = require('../utils/time');
const { tierName } = require('../utils/romanTier');
const logger = require('../utils/logger');

function saveTierLog({ userId, action, oldTier, newTier, reason, actorId }) {
  db.prepare(`
    INSERT INTO tier_logs (user_id, action, old_tier, new_tier, reason, actor_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(userId, action, oldTier || null, newTier || null, reason || null, actorId || null, nowIso());
}

async function sendAdminLog(client, payload) {
  if (!config.adminLogChannelId) return;
  try {
    const channel = await client.channels.fetch(config.adminLogChannelId);
    if (!channel?.isTextBased()) return;
    const embed = new EmbedBuilder()
      .setTitle(payload.title || 'Tier action')
      .setColor(payload.color || 0x5865f2)
      .addFields(
        { name: 'User', value: `<@${payload.userId}>`, inline: true },
        { name: 'Change', value: `${tierName(payload.oldTier)} -> ${tierName(payload.newTier)}`, inline: true },
        { name: 'Reason', value: payload.reason || 'No reason provided' }
      )
      .setTimestamp();
    await channel.send({ embeds: [embed] });
  } catch (error) {
    logger.warn('Failed to send admin log', { error: error.message });
  }
}

module.exports = { saveTierLog, sendAdminLog };
