const config = require('../config');
const logger = require('../utils/logger');

function isAdmin(member) {
  return Boolean(config.adminRoleId && member?.roles?.cache?.has(config.adminRoleId));
}

async function addRole(member, roleId, reason) {
  if (!roleId || member.roles.cache.has(roleId)) return;
  try {
    await member.roles.add(roleId, reason);
  } catch (error) {
    logger.warn('Failed to add role', { userId: member.id, roleId, error: error.message });
  }
}

async function removeRole(member, roleId, reason) {
  if (!roleId || !member.roles.cache.has(roleId)) return;
  try {
    await member.roles.remove(roleId, reason);
  } catch (error) {
    logger.warn('Failed to remove role', { userId: member.id, roleId, error: error.message });
  }
}

async function assignFalkaTag(member) {
  await addRole(member, config.falkaTagRoleId, 'New member Falka tag');
}

async function assignAccessRoles(member) {
  for (const roleId of config.accessRoleIds) {
    await addRole(member, roleId, 'Verification access role');
  }
}

async function assignTierRole(member, tier) {
  const wanted = config.tierRoles[String(tier)];
  for (const roleId of Object.values(config.tierRoles)) {
    if (roleId && roleId !== wanted) {
      await removeRole(member, roleId, 'Removing conflicting tier role');
    }
  }
  await addRole(member, wanted, `Assigning tier ${tier}`);
}

module.exports = { isAdmin, addRole, removeRole, assignFalkaTag, assignAccessRoles, assignTierRole };
