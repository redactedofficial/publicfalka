const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');
const { tierName } = require('../utils/romanTier');

module.exports = {
  ephemeral: true,
  data: new SlashCommandBuilder()
    .setName('tier-config')
    .setDescription('Shows tier thresholds and decay settings.'),
  async execute(interaction) {
    const thresholds = Object.entries(config.thresholds).map(([tier, xp]) => `${tierName(tier)}: ${xp} XP`).join('\n');
    const embed = new EmbedBuilder()
      .setTitle('Tier configuration')
      .setColor(0x5865f2)
      .addFields(
        { name: 'Thresholds', value: thresholds },
        { name: 'Decay', value: `Enabled: ${config.decay.decayEnabled}\nInterval hours: ${config.decay.decayIntervalHours}\nAmount: ${config.decay.decayAmount}\nGrace days: ${config.decay.inactivityGraceDays}\nMode: ${config.decay.demotionMode}` },
        { name: 'Forced tier grace', value: `${config.forcedTierGraceDays} days`, inline: true }
      );
    await interaction.editReply({ embeds: [embed] });
  }
};
