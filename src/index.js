const {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes
} = require('discord.js');
const dns = require('dns');
const config = require('./config');
require('./database');
const commands = require('./commands');
const scheduler = require('./scheduler');
const logger = require('./utils/logger');

dns.setDefaultResultOrder('ipv4first');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

client.once('clientReady', async () => {
  logger.info(`Logged in as ${client.user.tag}`, {
    botUserId: client.user.id,
    applicationId: client.application?.id || null,
    configuredClientId: config.clientId,
    clientIdMatchesBot: client.user.id === config.clientId || client.application?.id === config.clientId
  });
  scheduler.startScheduler(client);
});

client.on('guildMemberAdd', require('./events/guildMemberAdd'));
client.on('messageReactionAdd', require('./events/messageReactionAdd'));
client.on('messageCreate', require('./events/messageCreate'));
client.on('voiceStateUpdate', require('./events/voiceStateUpdate'));
client.on('interactionCreate', require('./events/interactionCreate'));

async function registerCommands() {
  if (!config.token || !config.clientId) {
    throw new Error('DISCORD_TOKEN and CLIENT_ID are required.');
  }
  const rest = new REST({ version: '10' }).setToken(config.token);
  const body = commands.all.map((command) => command.data.toJSON());
  if (config.guildId) {
    await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body });
    logger.info('Registered guild slash commands', { guildId: config.guildId });
  } else {
    await rest.put(Routes.applicationCommands(config.clientId), { body });
    logger.info('Registered global slash commands');
  }
}

process.on('unhandledRejection', (error) => logger.error('Unhandled rejection', { error: error.message }));
process.on('uncaughtException', (error) => logger.error('Uncaught exception', { error: error.message }));

(async () => {
  await registerCommands();
  await client.login(config.token);
})();
