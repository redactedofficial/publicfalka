const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { ensureUser } = require('../database');
const roleService = require('../services/roleService');
const tierService = require('../services/tierService');
const voteService = require('../services/voteService');
const { tierName } = require('../utils/romanTier');

module.exports = {
  ephemeral: true,
  data: new SlashCommandBuilder()
    .setName('tier-recheck')
    .setDescription('Admin-only: recheck XP and create a promotion vote if qualified.')
    .addUserOption((option) => option.setName('user').setDescription('User').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  async execute(interaction) {
    if (!roleService.isAdmin(interaction.member)) {
      await interaction.editReply('Only admins can recheck tiers.');
      return;
    }

    const target = interaction.options.getUser('user', true);
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (member && roleService.isAdmin(member)) {
      await interaction.editReply('Admins are ignored by automatic tiering.');
      return;
    }

    const user = ensureUser(target.id);
    if (!user.verified) {
      await interaction.editReply('This user is not verified in the database.');
      return;
    }

    const next = tierService.nextTierForUser(user);
    if (!next) {
      await interaction.editReply(`<@${target.id}> is not qualified for a higher tier. Current: ${tierName(user.current_tier)}, XP: ${user.xp}.`);
      return;
    }

    const vote = await voteService.createTierVote(interaction.client, interaction.guild, {
      userId: target.id,
      voteType: 'promotion',
      fromTier: user.current_tier,
      toTier: next,
      reason: 'Manual tier recheck'
    });
    await interaction.editReply(`Promotion vote #${vote.vote_id} is pending for <@${target.id}>: ${tierName(user.current_tier)} -> ${tierName(next)}.`);
  }
};
