import { timers, rooms } from '../state/gameState';
import { GAME_STATUS } from '../utils/constants';
import { Room, Player } from '@/types/room';
import { ShufflePlayerData, EvaluationResult } from '@/types/shuffle';
import { Server } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents } from '@/types/socket';
import _ from 'lodash';

// 게임 타이머 시작
export function startGameTimer(
  roomId: string,
  room: Room,
  io: Server<ClientToServerEvents, ServerToClientEvents>
) {
  room.gameData.currentPhase = 'answering';
  io.to(roomId).emit('shuffle-start-answering');

  // 답안 제출 제한 시간 타이머 설정 (예: 60초)
  timers[roomId] = setTimeout(() => {
    // 제한 시간 내에 제출하지 않은 플레이어는 탈락 처리
    room.players.forEach((player) => {
      const shufflePlayer = player as Player & ShufflePlayerData;
      if (shufflePlayer.isAlive && shufflePlayer.answer === null) {
        shufflePlayer.isAlive = false;
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
}

// 플레이어 상태 초기화
export function resetPlayerStatus(players: Player[]): void {
  players.forEach((player) => {
    const shufflePlayer = player as Player & ShufflePlayerData;
    shufflePlayer.answer = null;
    shufflePlayer.isAlive = true;
  });
}

// 답안 제출 처리
export function submitAnswer(
  player: Player & ShufflePlayerData,
  answer: string[]
): void {
  if (!player.isAlive) {
    throw new Error('이미 탈락한 플레이어입니다.');
  }
  player.answer = answer;
}

// 모든 답안 제출 여부 확인
export function checkAllAnswersSubmitted(room: Room) {
  return room.players.every((player) => {
    const shufflePlayer = player as Player & ShufflePlayerData;
    return !shufflePlayer.isAlive || shufflePlayer.answer !== null;
  });
}

// 답안 평가
export function evaluateAnswers(room: Room): EvaluationResult[] {
  const { correctOrder } = room.gameData;

  return room.players.map((player) => {
    const shufflePlayer = player as Player & ShufflePlayerData;
    if (!shufflePlayer.isAlive) {
      return {
        id: shufflePlayer.id,
        name: shufflePlayer.name,
        isAlive: false,
      };
    }

    const isCorrect = _.isEqual(shufflePlayer.answer, correctOrder);
    shufflePlayer.isAlive = isCorrect;

    return {
      id: shufflePlayer.id,
      name: shufflePlayer.name,
      isAlive: shufflePlayer.isAlive,
    };
  });
}
