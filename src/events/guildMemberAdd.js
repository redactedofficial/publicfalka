const roleService = require('../services/roleService');

module.exports = async function guildMemberAdd(member) {
  if (member.user.bot) return;
  await roleService.assignFalkaTag(member);
};
