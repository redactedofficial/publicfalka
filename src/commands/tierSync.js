const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { ensureUser } = require('../database');
const roleService = require('../services/roleService');
const { tierName } = require('../utils/romanTier');

module.exports = {
  ephemeral: true,
  data: new SlashCommandBuilder()
    .setName('tier-sync')
    .setDescription('Admin-only: reapply database tier/access roles to a member.')
    .addUserOption((option) => option.setName('user').setDescription('User').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  async execute(interaction) {
    if (!roleService.isAdmin(interaction.member)) {
      await interaction.editReply('Only admins can sync tier roles.');
      return;
    }
    const target = interaction.options.getUser('user', true);
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      await interaction.editReply('That user is not currently in the server.');
      return;
    }
    if (roleService.isAdmin(member)) {
      await interaction.editReply('Admins are ignored by automatic tiering. No roles changed.');
      return;
    }
    const user = ensureUser(target.id);
    if (!user.verified || Number(user.current_tier || 0) < 1) {
      await interaction.editReply('This user is not verified with a tier in the database.');
      return;
    }
    await roleService.assignAccessRoles(member);
    await roleService.assignTierRole(member, user.current_tier);
    await interaction.editReply(`Synced <@${target.id}> to ${tierName(user.current_tier)}.`);
  }
};
