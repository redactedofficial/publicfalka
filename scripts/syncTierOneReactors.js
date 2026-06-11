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
      // Expected for channels that do not contain this message.
    }
  }
  return null;
}

async function fetchAllReactionUsers(reaction) {
  const users = new Set();
  let after;

  while (true) {
    const batch = await reaction.users.fetch({ limit: 100, after });
    for (const [id, user] of batch) {
      if (!user.bot) users.add(id);
    }
    if (batch.size < 100) break;
    after = batch.lastKey();
  }

  return users;
}

async function main() {
  if (!config.token) throw new Error('DISCORD_TOKEN is required.');
  if (!config.guildId) throw new Error('GUILD_ID is required.');
  if (!config.tierRoles['1']) throw new Error('Tier I role ID is required in config.json or .env.');

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

  const reactedUserIds = await fetchAllReactionUsers(reaction);
  let tierOneMembers = 0;
  let keptReactors = 0;
  let removed = 0;
  let skippedAdmins = 0;
  let skippedBots = 0;
  let failed = 0;
  const now = nowIso();

  for (const [, member] of guild.members.cache) {
    if (!member.roles.cache.has(config.tierRoles['1'])) continue;
    tierOneMembers += 1;

    if (member.user.bot) {
      skippedBots += 1;
      continue;
    }
    if (roleService.isAdmin(member)) {
      skippedAdmins += 1;
      continue;
    }
    if (reactedUserIds.has(member.id)) {
      keptReactors += 1;
      continue;
    }

    try {
      ensureUser(member.id);
      await roleService.removeRole(member, config.tierRoles['1'], 'Removing T I: user did not react to verification message');
      db.prepare(`
        UPDATE users
        SET verified = 0,
            current_tier = CASE WHEN current_tier = 1 THEN 0 ELSE current_tier END,
            forced_tier = CASE WHEN forced_tier = 1 THEN NULL ELSE forced_tier END,
            forced_by = CASE WHEN forced_tier = 1 THEN NULL ELSE forced_by END,
            forced_reason = CASE WHEN forced_tier = 1 THEN NULL ELSE forced_reason END,
            forced_at = CASE WHEN forced_tier = 1 THEN NULL ELSE forced_at END,
            forced_until = CASE WHEN forced_tier = 1 THEN NULL ELSE forced_until END,
            updated_at = ?
        WHERE user_id = ?
      `).run(now, member.id);
      removed += 1;
    } catch (error) {
      failed += 1;
      logger.warn('Failed to remove non-reactor Tier I', { userId: member.id, error: error.message });
    }
  }

  logger.info('Tier I reactor sync complete', {
    reacted: reactedUserIds.size,
    tierOneMembers,
    keptReactors,
    removed,
    skippedAdmins,
    skippedBots,
    failed
  });

  await client.destroy();
}

main().catch((error) => {
  logger.error('Tier I reactor sync failed', { error: error.message });
  process.exitCode = 1;
});
