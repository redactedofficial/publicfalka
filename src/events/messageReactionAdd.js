const config = require('../config');
const tierService = require('../services/tierService');

module.exports = async function messageReactionAdd(reaction, user) {
  if (user.bot) return;
  if (reaction.partial) await reaction.fetch().catch(() => null);
  if (reaction.message.id !== config.verifyMessageId) return;
  if (reaction.emoji.name !== '✅') return;
  const guild = reaction.message.guild;
  if (!guild) return;
  const member = await guild.members.fetch(user.id).catch(() => null);
  if (!member) return;
  await tierService.verifyMember(member, reaction.client);
};
