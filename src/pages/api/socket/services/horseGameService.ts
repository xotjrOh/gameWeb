import { GAME_STATUS } from '../utils/constants';
import { HorseRoom, Player } from '@/types/room';
import { RoundData, HorsePlayerData, HorsePosition } from '@/types/horse';
import { Server } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents } from '@/types/socket';
import { recordGameWinners } from '../state/leaderboardState';

/**
 * 베팅 -> {말, 전진, 칩}
 */
export function calculateRoundResult(
  room: HorseRoom,
  bets: { [horse: string]: number }
): RoundData[] {
  const sortedHorses = Object.entries(bets)
    .filter(([, chips]) => chips > 0)
    .sort(([, chipsA], [, chipsB]) => chipsB - chipsA);

  if (sortedHorses.length === 0) {
    room.gameData.rounds.push([]);
    return [];
  }

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

export function getProgressTwoHorses(roundResult: RoundData[]): {
  [horse: string]: boolean;
} {
  return roundResult.reduce(
    (acc, { horse, progress }) => {
      if (progress === 2) {
        acc[horse] = true; // progress가 2인 말만 저장
      }
      return acc;
    },
    {} as { [horse: string]: boolean }
  );
}

/**
 * 무효표 히스토리 추가, 예측 혜택 반영
 */
export function updatePlayersAfterRound(
  room: HorseRoom,
  progressTwoHorses: { [horse: string]: boolean },
  io: Server<ClientToServerEvents, ServerToClientEvents>
) {
  room.players.forEach((player) => {
    const horsePlayer = player as Player & HorsePlayerData;
    if (!horsePlayer.isBetLocked) {
      horsePlayer.rounds.push([]); // 빈 배열 추가
    }
    io.to(horsePlayer.socketId).emit(
      'personal-round-update',
      horsePlayer.rounds
    );

    if (!horsePlayer.isVoteLocked) {
      horsePlayer.voteHistory.push('X');
    }
    io.to(horsePlayer.socketId).emit(
      'vote-history-update',
      horsePlayer.voteHistory
    );

    const lastVote =
      horsePlayer.voteHistory[horsePlayer.voteHistory.length - 1]; // voteHistory의 마지막 값
    if (progressTwoHorses[lastVote]) {
      // progress가 2인 말에 투표했는지 확인
      const chipGain = horsePlayer.isSolo ? 5 : 2;
      horsePlayer.chips += chipGain;
      horsePlayer.chipDiff += chipGain;
      io.to(horsePlayer.socketId).emit('update-chip', horsePlayer.chips);
      io.to(horsePlayer.socketId).emit('update-chipDiff', horsePlayer.chipDiff);
    }
  });
}

/**
 * roundResult{말, 전진, 칩} -> horsesData{말, 위치} -> emit
 */
export function updateHorsePositions(
  room: HorseRoom,
  roundResult: RoundData[],
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  roomId: string
) {
  roundResult.forEach(({ horse, progress }) => {
    room.gameData.positions[horse] =
      (room.gameData.positions[horse] || 0) + progress;
  });

  const positions = room.gameData.positions || {};
  const horsesData = Object.entries(positions).map(([name, position]) => ({
    name,
    position,
  })) as HorsePosition[];
  io.to(roomId).emit('update-positions', {
    horsesData,
    rounds: room.gameData.rounds,
  });
}

/**
 * 결승선 통과 확인 -> 통과하면 winner loser들 emit
 */
export function checkGameEnd(
  room: HorseRoom,
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  roomId: string
) {
  const horsesPositions = Object.entries(room.gameData.positions) as [
    string,
    number,
  ][];

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

    const getPlayersByHorse = (horseName: string): string[] =>
      room.players
        .filter((player) => {
          const horsePlayer = player as Player & HorsePlayerData;
          return horsePlayer.horse === horseName;
        })
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

    const winnerPlayerNames = winners
      .flatMap(([horse]) => getPlayersByHorse(horse))
      .filter((name) => name);
    const fallbackWinnerNames =
      winnerPlayerNames.length === 0 && room.players.length === 1
        ? losers
            .flatMap(([horse]) => getPlayersByHorse(horse))
            .filter((name) => name)
        : winnerPlayerNames;
    try {
      if (fallbackWinnerNames.length > 0) {
        recordGameWinners('horse', fallbackWinnerNames);
      }
    } catch (error) {
      console.error('[leaderboard] failed to record winners', error);
    }

    room.status = GAME_STATUS.PENDING;
  }
}

export function generateHorseNames(numHorses: number): string[] {
  const horses: string[] = [];
  for (let i = 0; i < numHorses; i++) {
    horses.push(String.fromCharCode(65 + i)); // 'A', 'B', 'C', ...
  }
  return horses;
}

export function assignRolesToPlayers(
  players: Player[],
  horses: string[],
  io: Server<ClientToServerEvents, ServerToClientEvents>
) {
  players.sort(() => Math.random() - 0.5);
  const randomHorses = [...horses];
  randomHorses.sort(() => Math.random() - 0.5);

  const numPlayers = players.length;
  const numHorses = horses.length;

  players.forEach((player, index) => {
    const horsePlayer = player as Player & HorsePlayerData;

    horsePlayer.dummyName = `player${index + 1}`;
    horsePlayer.horse = randomHorses[index % numHorses];
    horsePlayer.chips = 20;
    horsePlayer.chipDiff = 0;
    horsePlayer.isSolo =
      numPlayers % 2 !== 0 && index === Math.floor(numPlayers / 2);
    horsePlayer.rounds = [];
    horsePlayer.voteHistory = [];
    horsePlayer.isBetLocked = false;
    horsePlayer.isVoteLocked = false;
    horsePlayer.memo = [];

    io.to(horsePlayer.socketId).emit('status-update', horsePlayer); // id, name, socketId도 함께 전달됨
  });
}

/**
 * 1라운드용 bets데이터 : 라운드 시작시 bets초기화, 라운드 종료시 여기서 udpate된 bets값 이용
 */
export function recordPlayerBets(
  room: HorseRoom,
  bets: { [horse: string]: number }
) {
  room.gameData.bets = room.gameData.bets || {};
  Object.entries(bets).forEach(([horse, chips]) => {
    if (chips <= 0) return;
    room.gameData.bets[horse] = (room.gameData.bets[horse] || 0) + chips;
  });
}

/**
 * 플레이어의 칩 사용 히스토리를 업데이트합니다.
 */
export function updatePlayerChipHistory(
  player: Player & HorsePlayerData,
  bets: { [horse: string]: number }
) {
  const sortedHorses = Object.entries(bets)
    .filter(([, chips]) => chips > 0)
    .sort(([, chipsA], [, chipsB]) => chipsB - chipsA);
  const roundResult = sortedHorses.map(([horse, chips]) => ({
    horse,
    chips,
  })) as RoundData[];
  player.rounds.push(roundResult || []);
}
