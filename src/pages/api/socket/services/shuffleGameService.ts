import { timers, rooms } from '../state/gameState';
import { GAME_STATUS } from '../utils/constants';
import { Room, Player } from '@/types/room';
import { ShufflePlayerData, EvaluationResult } from '@/types/shuffle';
import { Server } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents } from '@/types/socket';

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
    // 답안 평가 및 결과 전송
    const results = evaluateAnswers(room);
    io.to(roomId).emit('shuffle-round-results', {
      results,
      correctOrder: room.gameData.correctOrder,
      players: room.players,
      gameData: room.gameData,
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
    shufflePlayer.isAnswerSubmitted = false;
    if (typeof shufflePlayer.score !== 'number') {
      shufflePlayer.score = 0;
    }
  });
}

// 답안 제출 처리
export function submitAnswer(
  player: Player & ShufflePlayerData,
  answer: string[]
): void {
  player.answer = answer;
  player.isAnswerSubmitted = true;
}

// 모든 답안 제출 여부 확인
export function checkAllAnswersSubmitted(room: Room) {
  return room.players.every((player) => {
    const shufflePlayer = player as Player & ShufflePlayerData;
    return shufflePlayer.answer !== null;
  });
}

// 답안 평가
export function evaluateAnswers(room: Room): EvaluationResult[] {
  const { correctOrder, difficulty } = room.gameData;

  return room.players.map((player) => {
    const shufflePlayer = player as Player & ShufflePlayerData;
    const answer = shufflePlayer.answer ?? [];
    const isPerfect =
      answer.length === correctOrder.length &&
      answer.every((value, index) => value === correctOrder[index]);
    const weight = difficulty === '상' ? 2 : 1;
    const roundScore = isPerfect ? weight : 0;
    shufflePlayer.score = (shufflePlayer.score ?? 0) + roundScore;
    shufflePlayer.isAlive = true;
    return {
      id: shufflePlayer.id,
      name: shufflePlayer.name,
      roundScore,
      totalScore: shufflePlayer.score ?? 0,
    };
  });
}
