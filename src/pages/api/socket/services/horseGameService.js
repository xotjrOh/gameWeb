import { GAME_STATUS } from '../utils/constants';

/**
 * @see 베팅 -> {말, 전진, 칩}
 */
export function calculateRoundResult(room, bets) {
    const sortedHorses = Object.entries(bets)
        .sort(([, chipsA], [, chipsB]) => chipsB - chipsA);

    const maxChips = sortedHorses?.[0]?.[1] || -1;
    const secondMaxChips = sortedHorses.find(([, chips]) => chips < maxChips)?.[1] || 0;

    const roundResult = sortedHorses.map(([horse, chips]) => ({
        horse,
        chips,
        progress: chips === maxChips ? 2 : chips === secondMaxChips ? 1 : 0,
    }));

    room.gameData.rounds.push(roundResult || []);

    return roundResult;
}

export function getProgressTwoHorses(roundResult) {
    return roundResult.reduce((acc, { horse, progress }) => {
        if (progress === 2) {
            acc[horse] = true;  // progress가 2인 말만 저장
        }
        return acc;
    }, {});
}

/**
 * @see 무효표 히스토리 추가, 예측 혜택 반영
 */
export function updatePlayersAfterRound(room, progressTwoHorses, io) {
    room.players.forEach(player => {
        if (!player.isBetLocked) {
            player.rounds.push([]);  // 빈 배열 추가
        }
        io.to(player.socketId).emit('personal-round-update', player.rounds);

        if (!player.isVoteLocked) {
            player.voteHistory.push('X');
        }
        io.to(player.socketId).emit('vote-history-update', player.voteHistory);

        const lastVote = player.voteHistory[player.voteHistory.length - 1];  // voteHistory의 마지막 값
        if (progressTwoHorses[lastVote]) {  // progress가 2인 말에 투표했는지 확인
            const chipGain = player.isSolo ? 5 : 2;
            player.chips += chipGain;
            player.chipDiff += chipGain;
            io.to(player.socketId).emit('update-chip', player.chips);
            io.to(player.socketId).emit('update-chipDiff', player.chipDiff);
        }
    });
}

/**
 * @see roundResult{말, 전진, 칩} -> horsesData{말, 위치} -> emit
 */
export function updateHorsePositions(room, roundResult, io, roomId) {
    roundResult.forEach(({ horse, progress }) => {
        room.gameData.positions[horse] = (room.gameData.positions[horse] || 0) + progress;
    });
    
    const positions = room.gameData.positions || {};
    const horsesData = Object.entries(positions).map(([name, position]) => ({
        name,
        position
    }));
    io.to(roomId).emit('update-positions', { horsesData, rounds: room.gameData.rounds });
}

/**
 * @see 결승선 통과 확인 -> 통과하면 winner loser들 emit
 */
export function checkGameEnd(room, io, roomId) {
    const horsesPositions = Object.entries(room.gameData.positions);

    // 결승선을 넘은 말들을 찾음 (losers)
    const losers = horsesPositions.filter(([horse, position]) => position >= room.gameData.finishLine);

    if (losers.length > 0) {
        // 결승선에 도달하지 않은 말 중 가장 가까운 말들을 찾음 (winners)
        const remainingHorses = horsesPositions.filter(([horse, position]) => position < room.gameData.finishLine);
        const maxPosition = Math.max(...remainingHorses.map(([, position]) => position));

        const winners = remainingHorses.filter(([, position]) => position === maxPosition);

        const getPlayersByHorse = (horseName) =>
            room.players
                .filter((player) => player.horse === horseName)
                .map((player) => player.name);  // 말에 할당된 플레이어 이름

        io.to(roomId).emit('game-ended', {
            winners: winners.map(([horse]) => ({
                horse,
                playerNames: getPlayersByHorse(horse),
            })),
            losers: losers.map(([horse]) => ({
                horse,
                playerNames: getPlayersByHorse(horse),
            })),
        });

        room.status = GAME_STATUS.PENDING;
    }
}
