import { rooms, incrementRoomId } from '../state/gameState';
import { Lock } from '../state/globalState';
import { MIN_PLAYER_LENGTH, NOT_ASSIGNED, MESSAGES, GAME_STATUS, HORSE_GAME } from '../utils/constants';

const commonHandler = (io, socket) => {
    socket.on('update-socket-id', ({ roomId, sessionId, newSocketId }) => {
        // roomId와 sessionId를 기반으로 해당 플레이어를 찾아서 socketId를 업데이트
        if (rooms[roomId]) {
            const player = rooms[roomId].players.find(p => p.id === sessionId);
            if (player) {
                player.socketId = newSocketId;
                socket.join(roomId.toString());
                console.log(`Updated player socketId for player ${sessionId} in room ${roomId} : ${newSocketId}`);
            }

            if (rooms[roomId].host.id == sessionId) {
                socket.join(roomId.toString());
                console.log(`Updated host socketId for player ${sessionId} in room ${roomId} : ${newSocketId}`);
            }
        }
    });

    socket.on('get-room-list', () => {
        socket.emit('room-updated', rooms);
    });

    socket.on('check-room', ({ roomId, sessionId }, callback) => {
        const room = rooms[roomId];
        const isInRoom = room && room.players.some(player => player.id === sessionId);
        callback({ isInRoom });
    });
    socket.on('check-room-host', ({ roomId, sessionId }, callback) => {
        const room = rooms[roomId];
        const isInRoom = room && room.host.id === sessionId;
        callback({ isInRoom });
    });

    socket.on('create-room', ({ roomName, userName, gameType, sessionId, maxPlayers }, callback) => {
        // if (!AUTHORIZED_SESSION_IDS.includes(sessionId)) {
        //   return callback({ success: false, message: MESSAGES.CREATE_ROOM_AUTH_REQUIRED });
        // }
        if (!roomName) {
            return callback({ success: false, message: MESSAGES.ROOM_NAME_REQUIRED });
        }
        if (!gameType) {
            return callback({ success: false, message: MESSAGES.GAME_TYPE_REQUIRED });
        }
        if (!Number.isInteger(maxPlayers) || maxPlayers < MIN_PLAYER_LENGTH) {
            return callback({ success: false, message: MESSAGES.MAX_PLAYERS_INVALID });
        }
        // **다른 방에서 이미 sessionId가 있는지 체크**
        for (const [otherRoomId, otherRoom] of Object.entries(rooms)) {
            const isPlayerInOtherRoom = otherRoom.players.some(player => player.id === sessionId);
            const isHostInOtherRoom = otherRoom.host.id === sessionId;

            if (isPlayerInOtherRoom || isHostInOtherRoom) {
                return callback({
                    success: false,
                    message: MESSAGES.ALREADY_IN_ANOTHER_ROOM(otherRoom.roomName),
                });
            }
        }

        Lock.acquire('rooms', (done) => {
            const roomId = incrementRoomId();
            rooms[roomId] = {
                roomId,
                roomName,
                gameType,
                host: {
                    id: sessionId,
                    name: userName,
                    socketId: socket.id,
                },
                players: [],
                gameData: {
                    // horse 용 설정
                    // finishLine: HORSE_GAME.DEFAULT_FINISH_LINE,
                    // positions: {},
                },
                status: GAME_STATUS.PENDING,
                maxPlayers,
            };
            if (gameType == "horse") {
                rooms[roomId].gameData.finishLine = HORSE_GAME.DEFAULT_FINISH_LINE;
            }
            socket.join(roomId.toString());
            callback({ success: true, roomId });
            io.emit('room-updated', rooms);
            done();
        }, (err) => {
            if (err) {
                console.error('Lock acquisition failed', err);
            }
        });
    });

    socket.on('check-can-join-room', ({ roomId, sessionId }, callback) => {
        const room = rooms[roomId];
        if (!room) {
            return callback({ success: false, host: false, message: MESSAGES.ROOM_NOT_FOUND });
        }

        // **다른 방에서 이미 sessionId가 있는지 체크**
        for (const [otherRoomId, otherRoom] of Object.entries(rooms)) {
            if (otherRoomId.toString() !== roomId.toString()) {
                const isPlayerInOtherRoom = otherRoom.players.some(player => player.id === sessionId);
                const isHostInOtherRoom = otherRoom.host.id === sessionId;

                if (isPlayerInOtherRoom || isHostInOtherRoom) {
                    return callback({
                        success: false,
                        message: MESSAGES.ALREADY_IN_ANOTHER_ROOM(otherRoom.roomName)
                    });
                }
            }
        }

        const playerExists = room.players.some(player => player.id === sessionId);
        // 튕겼다가 온 사람은 재연결 해줌
        if (playerExists) {
            const player = room.players.find(player => player.id === sessionId);
            player.socketId = socket.id;
            socket.join(roomId.toString());
            return callback({ success: true, reEnter: true });
        }

        if (room.players.length >= room.maxPlayers) {
            return callback({ success: false, host: false, message: MESSAGES.ROOM_FULL });
        }
        if (room.host.id === sessionId) {
            return callback({ success: true, reEnter: true, host: true });
        }
        if (room.status === GAME_STATUS.IN_PROGRESS) {
            return callback({ success: false, host: false, message: MESSAGES.GAME_ALREADY_STARTED });
        }

        return callback({ success: true });
    });

    socket.on('join-room', ({ roomId, userName, sessionId }, callback) => {
        const room = rooms[roomId];
        if (!room) {
            return callback({ success: false, message: MESSAGES.ROOM_NOT_FOUND });
        }

        // 현재 방에서 동일한 닉네임이 있는지 확인
        const isDuplicateName = room.players.some(player => player.name === userName) || room.host.name === userName;
        if (isDuplicateName) {
            return callback({
                success: false,
                message: MESSAGES.NICKNAME_ALREADY_IN_USE,
            });
        }

        // 닉네임 유효성 검사
        if (!userName || userName.length > 10) {
            return callback({
                success: false,
                message: MESSAGES.NICKNAME_TOO_LONG,
            });
        }

        // 플레이어 추가 로직
        room.players.push({
            id: sessionId,
            dummyName: NOT_ASSIGNED,
            horse: NOT_ASSIGNED,
            name: userName,
            socketId: socket.id,
            chips: 0,
            chipDiff: 0,
            rounds: [],
            voteHistory: [],
            isBetLocked: false,
            isVoteLocked: false,
            memo: []
        });

        socket.join(roomId.toString());
        io.emit('room-updated', rooms);
        return callback({ success: true });
    });

    socket.on('leave-room', ({ roomId, sessionId }, callback) => {
        const room = rooms[roomId];
        if (!room) {
            return callback({ success: false, message: MESSAGES.ROOM_NOT_FOUND });
        }
        if (room.status === GAME_STATUS.IN_PROGRESS) {
            return callback({ success: false, message: MESSAGES.CANNOT_LEAVE_DURING_GAME });
        }

        // 방장인지 확인
        const isHost = room.host.id === sessionId;

        // 방장이 아닌 경우는 나갈 수 없음
        if (!isHost) {
            return callback({ success: false, message: MESSAGES.ONLY_HOST_CAN_CLOSE_ROOM });
        }

        // 방 삭제 처리
        delete rooms[roomId];
        io.to(roomId).emit('room-closed', { message: MESSAGES.ROOM_CLOSED_BY_HOST });

        // 방 내 다른 플레이어들의 소켓 이벤트 해제
        io.in(roomId).socketsLeave(roomId);  // 모든 플레이어를 방에서 제거
        // io.in(roomId).clients((error, clients) => {
        //   if (error) throw error;
        //   clients.forEach(clientId => {
        //     const clientSocket = io.sockets.sockets.get(clientId);
        //     clientSocket.removeAllListeners();  // 각 클라이언트 소켓의 이벤트 리스너 제거
        //   });
        // });

        io.emit('room-updated', rooms);      // 방이 삭제되었음을 알림

        return callback({ success: true, host: false });
    });
};

export default commonHandler;