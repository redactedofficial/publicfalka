require('dotenv').config();
const fs = require('fs');
const path = require('path');

const configPath = path.resolve(process.cwd(), process.env.CONFIG_PATH || 'config.json');
const fileConfig = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};

function pick(key, fallback = '') {
  return process.env[key] || fallback;
}

function merge(base, override) {
  return { ...base, ...Object.fromEntries(Object.entries(override || {}).filter(([, v]) => v !== undefined && v !== '')) };
}

const config = {
  token: pick('DISCORD_TOKEN'),
  clientId: pick('CLIENT_ID'),
  guildId: pick('GUILD_ID', fileConfig.guildId || ''),
  databasePath: pick('DATABASE_PATH', './data/falkabot.sqlite'),
  adminRoleId: pick('ADMIN_ROLE_ID', fileConfig.adminRoleId || '1469421167898263572'),
  falkaTagRoleId: pick('FALKA_TAG_ROLE_ID', fileConfig.falkaTagRoleId || '1469420752502657197'),
  verifyMessageId: pick('VERIFY_MESSAGE_ID', fileConfig.verifyMessageId || '1469447118388203590'),
  adminVoteChannelId: pick('ADMIN_VOTE_CHANNEL_ID', fileConfig.adminVoteChannelId || ''),
  adminLogChannelId: pick('ADMIN_LOG_CHANNEL_ID', fileConfig.adminLogChannelId || ''),
  welcomeChannelId: pick('WELCOME_CHANNEL_ID', fileConfig.welcomeChannelId || ''),
  notificationFallbackChannelId: pick('NOTIFICATION_FALLBACK_CHANNEL_ID', fileConfig.notificationFallbackChannelId || ''),
  sendVerificationSuccess: fileConfig.sendVerificationSuccess !== false,
  sendRejectedPromotionNotice: fileConfig.sendRejectedPromotionNotice === true,
  accessRoleIds: fileConfig.accessRoleIds || [],
  tierRoles: merge(fileConfig.tierRoles || {}, {
    1: process.env.T_I_ROLE_ID,
    2: process.env.T_II_ROLE_ID,
    3: process.env.T_III_ROLE_ID,
    4: process.env.T_IV_ROLE_ID,
    5: process.env.T_V_ROLE_ID
  }),
  thresholds: merge({ 1: 0, 2: 250, 3: 750, 4: 1500, 5: 3000 }, fileConfig.thresholds),
  activity: merge({
    messageXp: 2,
    replyXp: 4,
    imageXp: 8,
    vcMinuteXp: 1,
    messageCooldownSeconds: 60,
    imageCooldownSeconds: 180,
    replyCooldownSeconds: 90
  }, fileConfig.activity),
  decay: merge({
    decayEnabled: true,
    decayIntervalHours: 24,
    decayAmount: 25,
    inactivityGraceDays: 14,
    demotionMode: 'vote',
    minimumTier: 1
  }, fileConfig.decay),
  forcedTierGraceDays: Number(fileConfig.forcedTierGraceDays || 30),
  vote: merge({ expiresHours: 72 }, fileConfig.vote)
};

module.exports = config;
