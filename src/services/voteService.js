const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require('discord.js');
const { db } = require('../database');
const config = require('../config');
const { addHoursIso, nowIso } = require('../utils/time');
const { tierName } = require('../utils/romanTier');
const tierService = require('./tierService');
const notifications = require('./notificationService');
const logger = require('../utils/logger');

function voteButtons(voteId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`tier_vote:${voteId}:approve`).setLabel('Approve').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`tier_vote:${voteId}:reject`).setLabel('Reject').setStyle(ButtonStyle.Danger)
  );
}

async function createTierVote(client, guild, { userId, voteType, fromTier, toTier, reason }) {
  const existing = db.prepare(`
    SELECT * FROM tier_votes WHERE user_id = ? AND vote_type = ? AND to_tier = ? AND status = 'pending'
  `).get(userId, voteType, toTier);
  if (existing) return existing;

  const createdAt = nowIso();
  const expiresAt = addHoursIso(config.vote.expiresHours);
  const result = db.prepare(`
    INSERT INTO tier_votes (user_id, vote_type, from_tier, to_tier, status, created_at, expires_at)
    VALUES (?, ?, ?, ?, 'pending', ?, ?)
  `).run(userId, voteType, fromTier, toTier, createdAt, expiresAt);
  const voteId = result.lastInsertRowid;

  try {
    const channel = await client.channels.fetch(config.adminVoteChannelId);
    if (channel?.isTextBased()) {
      const embed = new EmbedBuilder()
        .setTitle(voteType === 'promotion' ? 'Tier promotion vote' : 'Tier demotion vote')
        .setDescription(`<@${userId}>: ${tierName(fromTier)} -> ${tierName(toTier)}`)
        .addFields({ name: 'Reason', value: reason || 'Activity threshold reached' })
        .setColor(voteType === 'promotion' ? 0x57f287 : 0xed4245)
        .setTimestamp();
      const message = await channel.send({ embeds: [embed], components: [voteButtons(voteId)] });
      db.prepare('UPDATE tier_votes SET message_id = ? WHERE vote_id = ?').run(message.id, voteId);
    }
  } catch (error) {
    logger.warn('Failed to create vote message', { voteId, error: error.message });
  }

  return db.prepare('SELECT * FROM tier_votes WHERE vote_id = ?').get(voteId);
}

async function adminCount(guild) {
  await guild.members.fetch().catch(() => null);
  const role = guild.roles.cache.get(config.adminRoleId);
  return Math.max(1, role?.members?.size || 1);
}

async function castVote(interaction, voteId, adminId, vote) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const record = db.prepare('SELECT * FROM tier_votes WHERE vote_id = ?').get(voteId);
  if (!record || record.status !== 'pending') {
    await interaction.editReply('This vote is no longer pending.');
    return;
  }

  db.prepare(`
    INSERT INTO tier_vote_entries (vote_id, admin_id, vote, created_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(vote_id, admin_id) DO UPDATE SET vote = excluded.vote, created_at = excluded.created_at
  `).run(voteId, adminId, vote, nowIso());

  const counts = db.prepare(`
    SELECT
      SUM(CASE WHEN vote = 'approve' THEN 1 ELSE 0 END) AS approves,
      SUM(CASE WHEN vote = 'reject' THEN 1 ELSE 0 END) AS rejects
    FROM tier_vote_entries WHERE vote_id = ?
  `).get(voteId);
  const needed = Math.floor(await adminCount(interaction.guild) / 2) + 1;

  if (Number(counts.approves || 0) >= needed) {
    await resolveVote(interaction.client, interaction.guild, record, 'approved');
    await interaction.editReply(`Approved. ${tierName(record.to_tier)} will be applied.`);
  } else if (Number(counts.rejects || 0) >= needed) {
    await resolveVote(interaction.client, interaction.guild, record, 'rejected');
    await interaction.editReply('Rejected.');
  } else {
    await interaction.editReply(`Vote recorded. Approval threshold: ${needed}.`);
  }
}

async function resolveVote(client, guild, record, status) {
  db.prepare('UPDATE tier_votes SET status = ? WHERE vote_id = ?').run(status, record.vote_id);
  if (status === 'approved') {
    await tierService.setTier({
      client,
      guild,
      userId: record.user_id,
      tier: record.to_tier,
      reason: `${record.vote_type} vote approved`,
      action: record.vote_type === 'demotion' ? 'demotion' : 'promotion'
    });
  } else if (record.vote_type === 'promotion' && config.sendRejectedPromotionNotice) {
    await notifications.notifyUser(client, record.user_id, `Your promotion vote to ${tierName(record.to_tier)} was rejected.`);
  }
}

async function expireVotes(client) {
  const expired = db.prepare(`
    SELECT * FROM tier_votes WHERE status = 'pending' AND expires_at <= ?
  `).all(nowIso());
  for (const vote of expired) {
    db.prepare('UPDATE tier_votes SET status = ? WHERE vote_id = ?').run('expired', vote.vote_id);
  }
  return expired.length;
}

async function cancelVote(voteId) {
  const record = db.prepare('SELECT * FROM tier_votes WHERE vote_id = ?').get(voteId);
  if (!record || record.status !== 'pending') return null;
  db.prepare('UPDATE tier_votes SET status = ? WHERE vote_id = ?').run('rejected', voteId);
  return record;
}

module.exports = { createTierVote, castVote, expireVotes, cancelVote };
