const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ensureUser } = require('../database');
const { tierName } = require('../utils/romanTier');

module.exports = {
  ephemeral: true,
  data: new SlashCommandBuilder()
    .setName('tier')
    .setDescription('Shows current tier, XP, activity, forced tier, and decay info.')
    .addUserOption((option) => option.setName('user').setDescription('User to inspect').setRequired(false)),
  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const user = ensureUser(target.id);
    const embed = new EmbedBuilder()
      .setTitle(`${target.username} tier`)
      .setColor(0x5865f2)
      .addFields(
        { name: 'Tier', value: tierName(user.current_tier), inline: true },
        { name: 'XP', value: String(user.xp), inline: true },
        { name: 'Verified', value: user.verified ? 'Yes' : 'No', inline: true },
        { name: 'Activity', value: `Messages: ${user.messages}\nReplies: ${user.replies}\nImages: ${user.images}\nVC minutes: ${user.vc_minutes}` },
        { name: 'Decay', value: `Last activity: ${user.last_activity_at || 'never'}\nLast decay: ${user.last_decay_at || 'never'}` },
        { name: 'Forced tier', value: user.forced_tier ? `${tierName(user.forced_tier)} until ${user.forced_until}` : 'No' }
      );
    await interaction.editReply({ embeds: [embed] });
  }
};
