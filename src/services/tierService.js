const { db, ensureUser } = require('../database');
const config = require('../config');
const { addDaysIso, nowIso } = require('../utils/time');
const { tierName } = require('../utils/romanTier');
const roleService = require('./roleService');
const notifications = require('./notificationService');
const logs = require('./logService');

function tierForXp(xp) {
  let tier = 1;
  for (let i = 1; i <= 5; i += 1) {
    if (Number(xp) >= Number(config.thresholds[String(i)] || 0)) tier = i;
  }
  return tier;
}

function nextTierForUser(user) {
  const current = Number(user.current_tier || 1);
  const qualified = tierForXp(user.xp);
  return qualified > current ? current + 1 : null;
}

async function verifyMember(member, client) {
  if (roleService.isAdmin(member)) return null;
  const existing = ensureUser(member.id);
  const assignedTier = Number(existing.current_tier || 0) > 1 ? Number(existing.current_tier) : 1;
  const now = nowIso();
  db.prepare(`
    UPDATE users
    SET verified = 1, current_tier = CASE WHEN current_tier < 1 THEN 1 ELSE current_tier END,
        last_activity_at = COALESCE(last_activity_at, ?), updated_at = ?
    WHERE user_id = ?
  `).run(now, now, member.id);
  await roleService.assignAccessRoles(member);
  await roleService.assignTierRole(member, assignedTier);
  await notifications.verificationSuccess(client, member);
  if (!existing.verified || existing.current_tier < 1) {
    logs.saveTierLog({ userId: member.id, action: 'verify', oldTier: existing.current_tier, newTier: 1, reason: 'Verified with reaction' });
    await logs.sendAdminLog(client, { title: 'User verified', userId: member.id, oldTier: existing.current_tier, newTier: 1, reason: 'Verified with reaction' });
  }
  return db.prepare('SELECT * FROM users WHERE user_id = ?').get(member.id);
}

async function setTier({ client, guild, userId, tier, actorId, reason, forced = false, notify = true, action = 'tier_set' }) {
  const user = ensureUser(userId);
  const member = await guild.members.fetch(userId).catch(() => null);
  const oldTier = Number(user.current_tier || 0);
  const now = nowIso();
  const forcedUntil = forced ? addDaysIso(config.forcedTierGraceDays) : null;

  db.prepare(`
    UPDATE users
    SET verified = CASE WHEN ? >= 1 THEN 1 ELSE verified END,
        current_tier = ?, forced_tier = ?, forced_by = ?, forced_reason = ?,
        forced_at = ?, forced_until = ?, updated_at = ?
    WHERE user_id = ?
  `).run(tier, tier, forced ? tier : null, forced ? actorId : null, forced ? reason : null, forced ? now : null, forcedUntil, now, userId);

  if (member) await roleService.assignTierRole(member, tier);
  logs.saveTierLog({ userId, action, oldTier, newTier: tier, reason, actorId });
  await logs.sendAdminLog(client, { title: action === 'demotion' ? 'User downtiered' : 'Tier changed', userId, oldTier, newTier: tier, reason });
  if (notify && oldTier !== tier) {
    const verb = tier > oldTier ? 'promoted' : 'downgraded';
    await notifications.notifyUser(client, userId, `You have been ${verb} to ${tierName(tier)}.`);
  }
}

async function resetTier({ client, guild, userId, actorId }) {
  const user = ensureUser(userId);
  const now = nowIso();
  db.prepare(`
    UPDATE users
    SET current_tier = 1, xp = 0, messages = 0, replies = 0, images = 0, vc_minutes = 0,
        forced_tier = NULL, forced_by = NULL, forced_reason = NULL, forced_at = NULL, forced_until = NULL,
        updated_at = ?
    WHERE user_id = ?
  `).run(now, userId);
  const member = await guild.members.fetch(userId).catch(() => null);
  if (member) await roleService.assignTierRole(member, 1);
  logs.saveTierLog({ userId, action: 'reset', oldTier: user.current_tier, newTier: 1, reason: 'Reset by admin', actorId });
  await logs.sendAdminLog(client, { title: 'Tier reset', userId, oldTier: user.current_tier, newTier: 1, reason: 'Reset by admin' });
}

module.exports = { tierForXp, nextTierForUser, verifyMember, setTier, resetTier };
