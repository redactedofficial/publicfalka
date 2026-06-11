const { db } = require('../database');
const config = require('../config');
const { nowIso, olderThanDays, olderThanHours } = require('../utils/time');
const { tierName } = require('../utils/romanTier');
const roleService = require('./roleService');
const tierService = require('./tierService');
const voteService = require('./voteService');

function forcedStillProtected(user) {
  return user.forced_tier && user.forced_until && new Date(user.forced_until).getTime() > Date.now();
}

async function runDecay(client, guild) {
  if (!config.decay.decayEnabled) return { decayed: 0, demotions: 0, votes: 0 };
  const users = db.prepare('SELECT * FROM users WHERE verified = 1 AND current_tier >= ?').all(Number(config.decay.minimumTier || 1));
  let decayed = 0;
  let demotions = 0;
  let votes = 0;

  for (const user of users) {
    const member = await guild.members.fetch(user.user_id).catch(() => null);
    if (member && roleService.isAdmin(member)) continue;
    if (forcedStillProtected(user)) continue;
    if (!olderThanDays(user.last_activity_at, config.decay.inactivityGraceDays)) continue;
    if (!olderThanHours(user.last_decay_at, config.decay.decayIntervalHours)) continue;

    const newXp = Math.max(0, Number(user.xp || 0) - Number(config.decay.decayAmount || 0));
    db.prepare('UPDATE users SET xp = ?, last_decay_at = ?, updated_at = ? WHERE user_id = ?')
      .run(newXp, nowIso(), nowIso(), user.user_id);
    decayed += 1;

    const minTier = Number(config.decay.minimumTier || 1);
    const earnedTier = Math.max(minTier, tierService.tierForXp(newXp));
    if (earnedTier < Number(user.current_tier || minTier)) {
      const targetTier = Math.max(minTier, Number(user.current_tier) - 1, earnedTier);
      const reason = `Inactive XP decay dropped below ${tierName(user.current_tier)} requirement`;
      if (config.decay.demotionMode === 'automatic') {
        await tierService.setTier({
          client,
          guild,
          userId: user.user_id,
          tier: targetTier,
          reason,
          action: 'demotion'
        });
        demotions += 1;
      } else {
        await voteService.createTierVote(client, guild, {
          userId: user.user_id,
          voteType: 'demotion',
          fromTier: user.current_tier,
          toTier: targetTier,
          reason
        });
        votes += 1;
      }
    }
  }

  return { decayed, demotions, votes };
}

module.exports = { runDecay };
