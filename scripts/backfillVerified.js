require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const config = require('../src/config');
const { db, ensureUser } = require('../src/database');
const roleService = require('../src/services/roleService');
const { nowIso } = require('../src/utils/time');
const logger = require('../src/utils/logger');

const CHECK = '✅';

async function findVerificationMessage(guild) {
  for (const [, channel] of guild.channels.cache) {
    if (!channel?.isTextBased() || !channel.messages?.fetch) continue;
    try {
      const message = await channel.messages.fetch(config.verifyMessageId);
      if (message) return message;
    } catch {
      // Message IDs are channel-scoped for fetching; misses are expected while scanning.
    }
  }
  return null;
}

async function fetchAllReactionUsers(reaction) {
  const users = new Map();
  let after;

  while (true) {
    const batch = await reaction.users.fetch({ limit: 100, after });
    for (const [id, user] of batch) users.set(id, user);
    if (batch.size < 100) break;
    after = batch.lastKey();
  }

  return [...users.values()];
}

async function main() {
  if (!config.token) throw new Error('DISCORD_TOKEN is required.');
  if (!config.guildId) throw new Error('GUILD_ID is required for backfill.');
  if (!config.tierRoles['1']) throw new Error('T_I_ROLE_ID is required for backfill.');

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessageReactions
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
  });

  await client.login(config.token);
  const guild = await client.guilds.fetch(config.guildId);
  await guild.channels.fetch();
  await guild.members.fetch();

  const message = await findVerificationMessage(guild);
  if (!message) throw new Error(`Could not find verification message ${config.verifyMessageId}.`);

  const reaction = message.reactions.cache.find((entry) => entry.emoji.name === CHECK)
    || await message.reactions.resolve(CHECK)?.fetch();
  if (!reaction) throw new Error(`No ${CHECK} reaction found on verification message.`);

  const users = await fetchAllReactionUsers(reaction);
  let assigned = 0;
  let skippedAdmins = 0;
  let skippedBots = 0;
  let missingMembers = 0;
  const now = nowIso();

  for (const user of users) {
    if (user.bot) {
      skippedBots += 1;
      continue;
    }

    const member = guild.members.cache.get(user.id) || await guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      missingMembers += 1;
      continue;
    }

    if (roleService.isAdmin(member)) {
      skippedAdmins += 1;
      continue;
    }

    const existing = ensureUser(user.id);
    const targetTier = Math.max(1, Number(existing.current_tier || 0));
    db.prepare(`
      UPDATE users
      SET verified = 1,
          current_tier = ?,
          last_activity_at = COALESCE(last_activity_at, ?),
          updated_at = ?
      WHERE user_id = ?
    `).run(targetTier, now, now, user.id);

    await roleService.assignAccessRoles(member);
    await roleService.assignTierRole(member, targetTier);
    assigned += 1;
  }

  logger.info('Backfill complete', {
    reacted: users.length,
    assigned,
    skippedAdmins,
    skippedBots,
    missingMembers
  });

  await client.destroy();
}

main().catch(async (error) => {
  logger.error('Backfill failed', { error: error.message });
  process.exitCode = 1;
});
