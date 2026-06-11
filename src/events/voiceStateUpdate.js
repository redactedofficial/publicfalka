const activityService = require('../services/activityService');

module.exports = async function voiceStateUpdate(oldState, newState) {
  if (!oldState.channelId && newState.channelId) {
    await activityService.voiceJoin(newState.member, newState.channelId);
    return;
  }
  if (oldState.channelId && !newState.channelId) {
    await activityService.voiceLeave(newState.client, oldState.member);
    return;
  }
  if (oldState.channelId !== newState.channelId) {
    await activityService.voiceLeave(newState.client, oldState.member);
    await activityService.voiceJoin(newState.member, newState.channelId);
  }
};
