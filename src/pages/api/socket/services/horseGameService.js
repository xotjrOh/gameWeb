import { GAME_STATUS } from '../utils/constants';

/**
 * 베팅 -> {말, 전진, 칩}
 */
export function calculateRoundResult(room, bets) {
  const sortedHorses = Object.entries(bets).sort(
    ([, chipsA], [, chipsB]) => chipsB - chipsA
  );

  const maxChips = sortedHorses?.[0]?.[1] || -1;
  const secondMaxChips =
    sortedHorses.find(([, chips]) => chips < maxChips)?.[1] || 0;

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
      acc[horse] = true; // progress가 2인 말만 저장
    }
    return acc;
  }, {});
}

/**
 * 무효표 히스토리 추가, 예측 혜택 반영
 */
export function updatePlayersAfterRound(room, progressTwoHorses, io) {
  room.players.forEach((player) => {
    if (!player.isBetLocked) {
      player.rounds.push([]); // 빈 배열 추가
    }
    io.to(player.socketId).emit('personal-round-update', player.rounds);

    if (!player.isVoteLocked) {
      player.voteHistory.push('X');
    }
    io.to(player.socketId).emit('vote-history-update', player.voteHistory);

    const lastVote = player.voteHistory[player.voteHistory.length - 1]; // voteHistory의 마지막 값
    if (progressTwoHorses[lastVote]) {
      // progress가 2인 말에 투표했는지 확인
      const chipGain = player.isSolo ? 5 : 2;
      player.chips += chipGain;
      player.chipDiff += chipGain;
      io.to(player.socketId).emit('update-chip', player.chips);
      io.to(player.socketId).emit('update-chipDiff', player.chipDiff);
    }
  });
}

/**
 * roundResult{말, 전진, 칩} -> horsesData{말, 위치} -> emit
 */
export function updateHorsePositions(room, roundResult, io, roomId) {
  roundResult.forEach(({ horse, progress }) => {
    room.gameData.positions[horse] =
      (room.gameData.positions[horse] || 0) + progress;
  });

  const positions = room.gameData.positions || {};
  const horsesData = Object.entries(positions).map(([name, position]) => ({
    name,
    position,
  }));
  io.to(roomId).emit('update-positions', {
    horsesData,
    rounds: room.gameData.rounds,
  });
}

/**
 * 결승선 통과 확인 -> 통과하면 winner loser들 emit
 */
export function checkGameEnd(room, io, roomId) {
  const horsesPositions = Object.entries(room.gameData.positions);

  // 결승선을 넘은 말들을 찾음 (losers)
  const losers = horsesPositions.filter(
    ([horse, position]) => position >= room.gameData.finishLine
  );

  if (losers.length > 0) {
    // 결승선에 도달하지 않은 말 중 가장 가까운 말들을 찾음 (winners)
    const remainingHorses = horsesPositions.filter(
      ([horse, position]) => position < room.gameData.finishLine
    );
    const maxPosition = Math.max(
      ...remainingHorses.map(([, position]) => position)
    );

    const winners = remainingHorses.filter(
      ([, position]) => position === maxPosition
    );

    const getPlayersByHorse = (horseName) =>
      room.players
        .filter((player) => player.horse === horseName)
        .map((player) => player.name); // 말에 할당된 플레이어 이름

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

export function generateHorseNames(numHorses) {
  const horses = [];
  for (let i = 0; i < numHorses; i++) {
    horses.push(String.fromCharCode(65 + i)); // 'A', 'B', 'C', ...
  }
  return horses;
}

export function assignRolesToPlayers(players, horses, io) {
  players.sort(() => Math.random() - 0.5);
  const randomHorses = [...horses];
  randomHorses.sort(() => Math.random() - 0.5);

  const numPlayers = players.length;
  const numHorses = horses.length;

  players.forEach((player, index) => {
    player.dummyName = `player${index + 1}`;
    player.horse = randomHorses[index % numHorses];
    player.chips = 20;
    player.chipDiff = 0;
    player.isSolo =
      numPlayers % 2 !== 0 && index === Math.floor(numPlayers / 2);
    player.rounds = [];
    player.voteHistory = [];
    player.isBetLocked = false;
    player.isVoteLocked = false;
    player.memo = [];

    io.to(player.socketId).emit('status-update', player); // id, name, socketId도 함께 전달됨
  });
}

/**
 * 1라운드용 bets데이터 : 라운드 시작시 bets초기화, 라운드 종료시 여기서 udpate된 bets값 이용
 */
export function recordPlayerBets(room, bets) {
  room.gameData.bets = room.gameData.bets || {};
  Object.entries(bets).forEach(([horse, chips]) => {
    room.gameData.bets[horse] = (room.gameData.bets[horse] || 0) + chips;
  });
}

/**
 * 플레이어의 칩 사용 히스토리를 업데이트합니다.
 */
export function updatePlayerChipHistory(player, bets) {
  const sortedHorses = Object.entries(bets).sort(
    ([, chipsA], [, chipsB]) => chipsB - chipsA
  );
  const roundResult = sortedHorses.map(([horse, chips]) => ({
    horse,
    chips,
  }));
  player.rounds.push(roundResult || []);
}
