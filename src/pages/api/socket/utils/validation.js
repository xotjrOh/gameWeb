import { rooms } from '../state/gameState';
import { MESSAGES, NOT_ASSIGNED } from '../utils/constants';

export function validateRoom(roomId) {
    const room = rooms[roomId];
    if (!room) {
        throw new Error(MESSAGES.ROOM_NOT_FOUND);
    }
    return room;
}

export function validatePlayer(room, sessionId) {
    const player = room.players.find(p => p.id === sessionId);
    if (!player) {
        throw new Error(MESSAGES.NOT_A_PARTICIPANT);
    }
    return player;
}

/**
 * @see 모든 플레이어에게 말이 할당되었는지 체크
 */
export function validateAssignedByHorseGame(room) {
    const hasMissingHorse = room.players.some(player => !player.horse || player.horse === NOT_ASSIGNED);
    if (hasMissingHorse) {
        throw new Error(MESSAGES.NOT_ALL_PLAYERS_ASSIGNED);
    }
}

/**
 * @see 과잉 투자 체크
 */
export function validateChipsByHorseGame(player, bets) {
    const totalBets = Object.values(bets).reduce((sum, chips) => sum + chips, 0);
    if (player.chips < totalBets) {
        return new Error(MESSAGES.INSUFFICIENT_CHIPS);
    }
    return totalBets;
}