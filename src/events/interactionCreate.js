const commands = require('../commands');
const voteService = require('../services/voteService');
const roleService = require('../services/roleService');
const { MessageFlags } = require('discord.js');

async function rawInitialReply(interaction, options) {
  const data = {
    content: options.content || 'Processing...'
  };
  if (options.flags) data.flags = options.flags;

  const response = await fetch(`https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 4, data })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Raw interaction callback failed status=${response.status} body=${body}`);
  }

  interaction.replied = true;
  interaction.editReply = (payload) => {
    const message = typeof payload === 'string' ? { content: payload } : payload;
    return interaction.webhook.editMessage('@original', message);
  };
}

module.exports = async function interactionCreate(interaction) {
  try {
    if (interaction.isChatInputCommand()) {
      const ageMs = Date.now() - interaction.createdTimestamp;
      console.log(`[interaction] command=${interaction.commandName} ageMs=${ageMs} ping=${Math.round(interaction.client.ws.ping)} uptimeMs=${Math.round(process.uptime() * 1000)}`);
      const command = commands.handlers.get(interaction.commandName);
      if (!command) {
        await interaction.reply({
          content: 'This command is registered in Discord, but the running bot has not loaded it yet. Restart the bot and try again.',
          flags: MessageFlags.Ephemeral
        });
        return;
      }
      if (ageMs > 2500) {
        console.warn(`[interaction] stale-before-defer command=${interaction.commandName} ageMs=${ageMs}`);
      }
      await rawInitialReply(interaction, command.ephemeral === false
        ? { content: 'Processing...' }
        : { content: 'Processing...', flags: MessageFlags.Ephemeral });
      await command.execute(interaction);
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith('tier_vote:')) {
      if (!roleService.isAdmin(interaction.member)) {
        await interaction.reply({ content: 'Only admins can vote on tier changes.', flags: MessageFlags.Ephemeral });
        return;
      }
      const [, voteId, vote] = interaction.customId.split(':');
      await voteService.castVote(interaction, Number(voteId), interaction.user.id, vote);
    }
  } catch (error) {
    console.error(`[interactionCreate] ${interaction.commandName || interaction.customId}:`, error);
    const message = 'Something went wrong while handling this interaction. The error was logged on the bot host.';
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(message).catch(() => null);
    } else {
      await interaction.reply({ content: message, flags: MessageFlags.Ephemeral }).catch(() => null);
    }
  }
};
