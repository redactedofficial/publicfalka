const { db, ensureUser } = require('../database');
const config = require('../config');
const { nowIso, minutesBetween } = require('../utils/time');
const roleService = require('./roleService');
const tierService = require('./tierService');
const voteService = require('./voteService');

function cooldownPassed(userId, type, seconds) {
  const row = db.prepare('SELECT last_at FROM activity_cooldowns WHERE user_id = ? AND activity_type = ?').get(userId, type);
  if (!row) return true;
  return Date.now() - new Date(row.last_at).getTime() >= seconds * 1000;
}

function touchCooldown(userId, type) {
  db.prepare(`
    INSERT INTO activity_cooldowns (user_id, activity_type, last_at)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id, activity_type) DO UPDATE SET last_at = excluded.last_at
  `).run(userId, type, nowIso());
}

async function addActivity(client, guild, member, type, xp, column) {
  if (!member || member.user.bot || roleService.isAdmin(member)) return;
  const user = ensureUser(member.id);
  if (!user.verified) return;
  const now = nowIso();
  db.prepare(`
    UPDATE users
    SET xp = xp + ?, ${column} = ${column} + 1, last_activity_at = ?, updated_at = ?
    WHERE user_id = ?
  `).run(xp, now, now, member.id);

  const updated = db.prepare('SELECT * FROM users WHERE user_id = ?').get(member.id);
  const next = tierService.nextTierForUser(updated);
  if (next) {
    await voteService.createTierVote(client, guild, {
      userId: member.id,
      voteType: 'promotion',
      fromTier: updated.current_tier,
      toTier: next,
      reason: `${type} activity qualified user for ${next}`
    });
  }
}

async function recordMessage(client, message) {
  if (!message.guild || message.author.bot) return;
  const member = message.member || await message.guild.members.fetch(message.author.id).catch(() => null);
  const hasImage = message.attachments.some((a) => (a.contentType || '').startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(a.name || a.url || ''));
  const isReply = Boolean(message.reference?.messageId);

  if (cooldownPassed(message.author.id, 'message', config.activity.messageCooldownSeconds)) {
    touchCooldown(message.author.id, 'message');
    await addActivity(client, message.guild, member, 'message', Number(config.activity.messageXp), 'messages');
  }
  if (isReply && cooldownPassed(message.author.id, 'reply', config.activity.replyCooldownSeconds)) {
    touchCooldown(message.author.id, 'reply');
    await addActivity(client, message.guild, member, 'reply', Number(config.activity.replyXp), 'replies');
  }
  if (hasImage && cooldownPassed(message.author.id, 'image', config.activity.imageCooldownSeconds)) {
    touchCooldown(message.author.id, 'image');
    await addActivity(client, message.guild, member, 'image', Number(config.activity.imageXp), 'images');
  }
}

async function voiceJoin(member, channelId) {
  if (!member || member.user.bot || roleService.isAdmin(member)) return;
  ensureUser(member.id);
  db.prepare(`
    INSERT INTO voice_sessions (user_id, channel_id, joined_at)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET channel_id = excluded.channel_id, joined_at = excluded.joined_at
  `).run(member.id, channelId, nowIso());
}

async function voiceLeave(client, member) {
  if (!member || member.user.bot) return;
  const session = db.prepare('SELECT * FROM voice_sessions WHERE user_id = ?').get(member.id);
  if (!session) return;
  db.prepare('DELETE FROM voice_sessions WHERE user_id = ?').run(member.id);
  const minutes = minutesBetween(session.joined_at);
  if (minutes <= 0 || roleService.isAdmin(member)) return;
  const user = ensureUser(member.id);
  if (!user.verified) return;
  const xp = minutes * Number(config.activity.vcMinuteXp);
  const now = nowIso();
  db.prepare(`
    UPDATE users
    SET xp = xp + ?, vc_minutes = vc_minutes + ?, last_activity_at = ?, updated_at = ?
    WHERE user_id = ?
  `).run(xp, minutes, now, now, member.id);
  const updated = db.prepare('SELECT * FROM users WHERE user_id = ?').get(member.id);
  const next = tierService.nextTierForUser(updated);
  if (next) {
    await voteService.createTierVote(client, member.guild, {
      userId: member.id,
      voteType: 'promotion',
      fromTier: updated.current_tier,
      toTier: next,
      reason: 'Voice activity qualified user for next tier'
    });
  }
}

module.exports = { recordMessage, voiceJoin, voiceLeave };
