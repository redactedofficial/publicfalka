const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../database');
const { tierName } = require('../utils/romanTier');

module.exports = {
  ephemeral: true,
  data: new SlashCommandBuilder()
    .setName('tier-votes')
    .setDescription('Shows active pending tier votes.'),
  async execute(interaction) {
    const rows = db.prepare('SELECT * FROM tier_votes WHERE status = ? ORDER BY created_at ASC LIMIT 20').all('pending');
    const lines = rows.map((v) => `#${v.vote_id} ${v.vote_type}: <@${v.user_id}> ${tierName(v.from_tier)} -> ${tierName(v.to_tier)} expires ${v.expires_at}`);
    const embed = new EmbedBuilder()
      .setTitle('Pending tier votes')
      .setColor(0x5865f2)
      .setDescription(lines.join('\n') || 'No pending votes.');
    await interaction.editReply({ embeds: [embed] });
  }
};
