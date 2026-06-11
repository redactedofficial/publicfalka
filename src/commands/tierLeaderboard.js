const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../database');
const { tierName } = require('../utils/romanTier');

module.exports = {
  ephemeral: false,
  data: new SlashCommandBuilder()
    .setName('tier-leaderboard')
    .setDescription('Shows the most active users.'),
  async execute(interaction) {
    const rows = db.prepare('SELECT * FROM users WHERE verified = 1 ORDER BY xp DESC LIMIT 10').all();
    const lines = rows.map((u, index) => `${index + 1}. <@${u.user_id}> - ${u.xp} XP (${tierName(u.current_tier)})`);
    const embed = new EmbedBuilder()
      .setTitle('Tier leaderboard')
      .setColor(0xf1c40f)
      .setDescription(lines.join('\n') || 'No verified users yet.');
    await interaction.editReply({ embeds: [embed] });
  }
};
