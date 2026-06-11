const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const roleService = require('../services/roleService');
const voteService = require('../services/voteService');
const logService = require('../services/logService');

module.exports = {
  ephemeral: true,
  data: new SlashCommandBuilder()
    .setName('tier-vote-cancel')
    .setDescription('Admin-only: cancel a pending tier vote.')
    .addIntegerOption((option) => option.setName('vote-id').setDescription('Vote ID from /tier-votes').setRequired(true).setMinValue(1))
    .addStringOption((option) => option.setName('reason').setDescription('Audit reason').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  async execute(interaction) {
    if (!roleService.isAdmin(interaction.member)) {
      await interaction.editReply('Only admins can cancel votes.');
      return;
    }
    const voteId = interaction.options.getInteger('vote-id', true);
    const reason = interaction.options.getString('reason', true);
    const vote = await voteService.cancelVote(voteId);
    if (!vote) {
      await interaction.editReply('No pending vote found with that ID.');
      return;
    }
    logService.saveTierLog({
      userId: vote.user_id,
      action: 'vote_cancel',
      oldTier: vote.from_tier,
      newTier: vote.to_tier,
      reason,
      actorId: interaction.user.id
    });
    await interaction.editReply(`Cancelled vote #${voteId}.`);
  }
};
