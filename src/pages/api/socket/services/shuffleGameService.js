import { timers } from '../state/gameState';
import { GAME_STATUS } from '../utils/constants';

// 클립 생성 및 섞기
export function generateClips(gameData) {
  const { startTime, interval, clipCount } = gameData;
  let clips = [];

  for (let i = 0; i < clipCount; i++) {
    clips.push({
      id: String.fromCharCode(65 + i), // 'A', 'B', 'C', ...
      start: startTime + interval * i,
      end: startTime + interval * (i + 1),
    });
  }

  // 정답 순서 저장
  gameData.correctOrder = clips.map((clip) => clip.id);

  // 클립 섞기
  return _.shuffle(clips);
}

// 게임 타이머 시작
export function startGameTimer(roomId, room, io) {
  const duration = room.gameData.clipCount * room.gameData.interval;

  timers[roomId] = setTimeout(() => {
    room.gameData.currentPhase = 'answering';
    io.to(roomId).emit('shuffle-start-answering');

    // 답안 제출 제한 시간 타이머 설정 (예: 60초)
    timers[roomId] = setTimeout(() => {
      // 제한 시간 내에 제출하지 않은 플레이어는 탈락 처리
      room.players.forEach((player) => {
        if (player.isAlive && player.answer === null) {
          player.isAlive = false;
        }
      });

      // 답안 평가 및 결과 전송
      const results = evaluateAnswers(room);
      io.to(roomId).emit('shuffle-round-results', {
        results,
        correctOrder: room.gameData.correctOrder,
      });

      // 게임 상태 업데이트
      room.status = GAME_STATUS.PENDING;
      io.emit('room-updated', rooms);
    }, 60000); // 60초
  }, duration * 1000);
}

// 플레이어 상태 초기화
export function resetPlayerStatus(players) {
  players.forEach((player) => {
    player.answer = null;
    player.isAlive = true;
  });
}

// 답안 제출 처리
export function submitAnswer(player, answer) {
  if (!player.isAlive) {
    throw new Error('이미 탈락한 플레이어입니다.');
  }
  player.answer = answer;
}

// 모든 답안 제출 여부 확인
export function checkAllAnswersSubmitted(room) {
  return room.players.every(
    (player) => !player.isAlive || player.answer !== null
  );
}

// 답안 평가
export function evaluateAnswers(room) {
  const { correctOrder } = room.gameData;

  return room.players.map((player) => {
    if (!player.isAlive) {
      return {
        id: player.id,
        name: player.name,
        isAlive: false,
      };
    }

    const isCorrect = _.isEqual(player.answer, correctOrder);
    player.isAlive = isCorrect;

    return {
      id: player.id,
      name: player.name,
      isAlive: player.isAlive,
    };
  });
}
