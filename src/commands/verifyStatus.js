const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ensureUser } = require('../database');
const config = require('../config');
const { tierName } = require('../utils/romanTier');
const roleService = require('../services/roleService');

module.exports = {
  ephemeral: true,
  data: new SlashCommandBuilder()
    .setName('verify-status')
    .setDescription('Checks verification and role status for a member.')
    .addUserOption((option) => option.setName('user').setDescription('User to inspect').setRequired(false)),
  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    const user = ensureUser(target.id);
    const tierRoleId = config.tierRoles[String(user.current_tier)];
    const embed = new EmbedBuilder()
      .setTitle(`${target.username} verification`)
      .setColor(user.verified ? 0x57f287 : 0xed4245)
      .addFields(
        { name: 'Database verified', value: user.verified ? 'Yes' : 'No', inline: true },
        { name: 'Current tier', value: tierName(user.current_tier), inline: true },
        { name: 'Admin ignored', value: member && roleService.isAdmin(member) ? 'Yes' : 'No', inline: true },
        { name: 'Falka tag role', value: member?.roles.cache.has(config.falkaTagRoleId) ? 'Present' : 'Missing', inline: true },
        { name: 'Tier role', value: tierRoleId && member?.roles.cache.has(tierRoleId) ? 'Present' : 'Missing', inline: true }
      );
    await interaction.editReply({ embeds: [embed] });
  }
};
