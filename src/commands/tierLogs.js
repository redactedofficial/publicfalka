const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { db } = require('../database');
const roleService = require('../services/roleService');
const { tierName } = require('../utils/romanTier');

module.exports = {
  ephemeral: true,
  data: new SlashCommandBuilder()
    .setName('tier-logs')
    .setDescription('Admin-only: view recent tier audit logs for a user.')
    .addUserOption((option) => option.setName('user').setDescription('User').setRequired(true))
    .addIntegerOption((option) => option.setName('limit').setDescription('Number of logs').setRequired(false).setMinValue(1).setMaxValue(10))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  async execute(interaction) {
    if (!roleService.isAdmin(interaction.member)) {
      await interaction.editReply('Only admins can view tier logs.');
      return;
    }
    const target = interaction.options.getUser('user', true);
    const limit = interaction.options.getInteger('limit') || 5;
    const rows = db.prepare('SELECT * FROM tier_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?').all(target.id, limit);
    const description = rows.map((row) => {
      const actor = row.actor_id ? `<@${row.actor_id}>` : 'system';
      return `#${row.log_id} ${row.created_at}\n${row.action}: ${tierName(row.old_tier)} -> ${tierName(row.new_tier)} by ${actor}\n${row.reason || 'No reason'}`;
    }).join('\n\n') || 'No logs for this user.';
    const embed = new EmbedBuilder()
      .setTitle(`${target.username} tier logs`)
      .setColor(0x5865f2)
      .setDescription(description.slice(0, 4000));
    await interaction.editReply({ embeds: [embed] });
  }
};
