const config = require('./config');
const decayService = require('./services/decayService');
const voteService = require('./services/voteService');
const logger = require('./utils/logger');

function startScheduler(client) {
  const run = async () => {
    try {
      const guildId = config.guildId || client.guilds.cache.first()?.id;
      if (!guildId) return;
      const guild = await client.guilds.fetch(guildId);
      await voteService.expireVotes(client);
      await decayService.runDecay(client, guild);
    } catch (error) {
      logger.error('Scheduled tier job failed', { error: error.message });
    }
  };

  const intervalMs = Math.max(15, Number(config.decay.decayIntervalHours || 24) * 60) * 60 * 1000;
  setInterval(run, intervalMs);
  setTimeout(run, 10000);
}

module.exports = { startScheduler };
