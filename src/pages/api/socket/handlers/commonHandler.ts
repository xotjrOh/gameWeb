import { Server } from 'socket.io';
import {
  ServerSocketType,
  ClientToServerEvents,
  ServerToClientEvents,
  CommonResponse,
  JoinRoomData,
} from '@/types/socket';
import { Room, Player } from '@/types/room';
import _ from 'lodash';
import { rooms, incrementRoomId } from '../state/gameState';
import { Lock } from '../state/globalState';
import {
  MESSAGES,
  GAME_STATUS,
  DEFAULT_GAME_DATA,
  DEFAULT_PLAYER_DATA,
} from '../utils/constants';
import { ShufflePlayerData } from '@/types/shuffle';
import {
  validateRoomName,
  validateGameType,
  validateMaxPlayers,
  validateAlreadyJoinOtherRoom,
  validateRoom,
  validateRoomFull,
  validateGameAlreadyStarted,
  validateDuplicateNickname,
  validateNickname,
  validateCannotLeave,
  validateOnlyHostRemoveRoom,
} from '../utils/validation';
import { handlePlayerReconnect } from '../services/commonService';

const DEBUG = process.env.SOCKET_DEBUG === '1';

const commonHandler = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: ServerSocketType
) => {
  socket.on('update-socket-id', ({ roomId, sessionId, newSocketId }) => {
    if (!rooms[roomId]) return;

    const player = rooms[roomId].players.find((p) => p.id === sessionId);
    if (player) {
      player.socketId = newSocketId;
      socket.join(roomId);
      console.log(
        `Updated player socketId for player ${sessionId} in room ${roomId} : ${newSocketId}`
      );
    }

    if (rooms[roomId].host.id == sessionId) {
      rooms[roomId].host.socketId = newSocketId;
      socket.join(roomId);
      console.log(
        `Updated host socketId for player ${sessionId} in room ${roomId} : ${newSocketId}`
      );

      const room = rooms[roomId];
      if (
        room.gameType === 'shuffle' &&
        room.status !== GAME_STATUS.IN_PROGRESS
      ) {
        room.gameData = _.cloneDeep(DEFAULT_GAME_DATA['shuffle']);
        room.players.forEach((p) => {
          const shufflePlayer = p as Player & ShufflePlayerData;
          shufflePlayer.answer = null;
          shufflePlayer.isAnswerSubmitted = false;
        });
        io.to(roomId).emit('shuffle-round-reset', {
          gameData: room.gameData,
          players: room.players,
        });
      }
    }
  });

  socket.on('get-room-list', () => {
    socket.emit('room-updated', rooms);
  });

  socket.on('check-room', ({ roomId, sessionId }, callback) => {
    const room = rooms[roomId];
    const isInRoom =
      room && room.players.some((player) => player.id === sessionId);
    callback({ success: isInRoom });
  });
  socket.on('check-room-host', ({ roomId, sessionId }, callback) => {
    const room = rooms[roomId];
    const isInRoom = room && room.host.id === sessionId;
    callback({ success: isInRoom });
  });

  socket.on(
    'create-room',
    ({ roomName, userName, gameType, sessionId, maxPlayers }, callback) => {
      try {
        // validateCanCreateRoom(sessionId);
        validateRoomName(roomName);
        validateGameType(gameType);
        validateMaxPlayers(maxPlayers);
        validateAlreadyJoinOtherRoom(rooms, sessionId);

        Lock.acquire(
          'rooms',
          (done) => {
            const roomId = incrementRoomId();
            const newRoom: Room = {
              roomId,
              roomName,
              gameType,
              host: {
                id: sessionId,
                name: userName,
                socketId: socket.id,
              },
              players: [], // TODO : 집어넣을때 as HorsePlayers[] 처럼 타입단언 후에 넣는거고려
              gameData: _.cloneDeep(DEFAULT_GAME_DATA[gameType]),
              status: GAME_STATUS.PENDING,
              maxPlayers,
            };

            rooms[roomId] = newRoom;

            socket.join(roomId);
            callback({ success: true, roomId });
            io.emit('room-updated', rooms);
            done();
          },
          (err) => {
            if (err) {
              console.error('Lock acquisition failed', err);
            }
          }
        );
      } catch (error) {
        callback({ success: false, message: (error as Error).message });
      }
    }
  );

  socket.on('check-can-join-room', ({ roomId, sessionId }, callback) => {
    try {
      const room = validateRoom(roomId);
      validateAlreadyJoinOtherRoom(rooms, sessionId, roomId);

      // 지금처럼 '재접속 로직'이 '유효성검증'보다 상단에 위치해야함
      const reconnectResponse = handlePlayerReconnect(room, sessionId, socket);
      if (reconnectResponse) {
        return callback(reconnectResponse);
      }

      validateRoomFull(room);
      validateGameAlreadyStarted(room);

      return callback({ success: true });
    } catch (error) {
      callback({ success: false, message: (error as Error).message });
    }
  });

  socket.on(
    'join-room',
    (
      { roomId, userName, sessionId }: JoinRoomData,
      callback: (response: CommonResponse) => void
    ) => {
      const joinStartedAt = DEBUG ? Date.now() : 0;
      if (DEBUG) {
        console.log(
          `[socket-debug][server] join-room attempt roomId=${roomId} socketId=${socket.id}`
        );
      }
      try {
        const room = validateRoom(roomId);
        const defaultPlayerData = _.cloneDeep(
          DEFAULT_PLAYER_DATA[room.gameType]
        );

        validateDuplicateNickname(room, userName);
        validateNickname(userName);

        // 플레이어 추가 로직
        room.players.push({
          id: sessionId,
          name: userName,
          socketId: socket.id,

          ...defaultPlayerData,
        });

        socket.join(roomId);
        io.emit('room-updated', rooms);
        const successResponse: CommonResponse = { success: true };
        if (DEBUG) {
          console.log(
            `[socket-debug][server] join-room result roomId=${roomId} success=true dt=${
              joinStartedAt ? Date.now() - joinStartedAt : 0
            }ms players=${room.players.length}`
          );
        }
        callback(successResponse);
        if (DEBUG) {
          console.log(
            `[socket-debug][server] join-room callback-dispatched roomId=${roomId}`
          );
        }
        return;
      } catch (error) {
        const failureResponse: CommonResponse = {
          success: false,
          message: (error as Error).message,
        };
        if (DEBUG) {
          console.log(
            `[socket-debug][server] join-room result roomId=${roomId} success=false message=${failureResponse.message}`
          );
        }
        callback(failureResponse);
        if (DEBUG) {
          console.log(
            `[socket-debug][server] join-room callback-dispatched roomId=${roomId}`
          );
        }
      }
    }
  );

  socket.on('leave-room', ({ roomId, sessionId }, callback) => {
    try {
      const room = validateRoom(roomId);
      validateCannotLeave(room);
      validateOnlyHostRemoveRoom(room, sessionId);

      delete rooms[roomId];
      io.to(roomId).emit('room-closed', {
        message: MESSAGES.ROOM_CLOSED_BY_HOST,
      });

      // 방 내 다른 플레이어들의 소켓 이벤트 해제
      io.in(roomId).socketsLeave(roomId); // 모든 플레이어를 방에서 제거
      io.emit('room-updated', rooms); // 방이 삭제되었음을 알림

      return callback({ success: true });
    } catch (error) {
      callback({ success: false, message: (error as Error).message });
    }
  });
};

export default commonHandler;
