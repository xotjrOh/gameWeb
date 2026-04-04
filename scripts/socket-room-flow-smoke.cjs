const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const process = require('node:process');
const { setTimeout: delay } = require('node:timers/promises');
const { io } = require('socket.io-client');

const SOCKET_PATH = '/api/socket/io';
const HEALTHCHECK_PATH = '/api/version';
const ACK_TIMEOUT_MS = 10000;
const EVENT_TIMEOUT_MS = 10000;
const REACHABLE_CHECK_TIMEOUT_MS = 4000;
const SERVER_BOOT_TIMEOUT_MS = 90000;
const POST_CONNECT_SETTLE_MS = 150;

const DEFAULT_BASE_URL =
  process.env.SOCKET_SMOKE_URL?.trim() ||
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  'http://127.0.0.1:3000';
const AUTO_SPAWN = process.env.SOCKET_SMOKE_SPAWN !== '0';
const SPAWN_HOST = process.env.SOCKET_SMOKE_HOST?.trim() || '127.0.0.1';
const SPAWN_PORT = Number.parseInt(process.env.SOCKET_SMOKE_PORT ?? '3100', 10);
const VERBOSE = process.env.SOCKET_SMOKE_VERBOSE === '1';

const expectedExitChildren = new Set();

const log = (message, payload) => {
  if (payload === undefined) {
    console.log(`[socket-smoke] ${message}`);
    return;
  }
  console.log(`[socket-smoke] ${message}`, payload);
};

const makeId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const makeNickname = (prefix) => {
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${prefix}${suffix}`.slice(0, 10);
};

const getYarnInvocation = () => {
  const yarnRcPath = path.join(process.cwd(), '.yarnrc.yml');
  if (fs.existsSync(yarnRcPath)) {
    const yarnRc = fs.readFileSync(yarnRcPath, 'utf8');
    const yarnPathMatch = yarnRc.match(/^\s*yarnPath:\s*(.+)\s*$/m);

    if (yarnPathMatch?.[1]) {
      const yarnPath = yarnPathMatch[1].trim().replace(/^['"]|['"]$/g, '');
      return {
        command: process.execPath,
        baseArgs: [path.resolve(process.cwd(), yarnPath)],
      };
    }
  }

  return {
    command: process.platform === 'win32' ? 'yarn.cmd' : 'yarn',
    baseArgs: [],
  };
};

const waitForHttp = async (baseUrl, timeoutMs) => {
  const startedAt = Date.now();
  const target = new URL(HEALTHCHECK_PATH, baseUrl).toString();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(target, { cache: 'no-store' });
      if (response.ok) {
        return true;
      }
    } catch (error) {
      // Keep polling until timeout.
    }

    await delay(1000);
  }

  throw new Error(`server did not become reachable in time (${baseUrl})`);
};

const warmSocketEndpoint = async (baseUrl) => {
  const target = new URL('/api/socket/io', baseUrl).toString();
  const response = await fetch(target, { cache: 'no-store' });
  if (response.ok || response.status === 400) {
    return;
  }
  throw new Error(`socket endpoint warmup failed (${response.status})`);
};

const startDevServer = async (baseUrl) => {
  const { command, baseArgs } = getYarnInvocation();
  const child = spawn(
    command,
    [
      ...baseArgs,
      'dev',
      '--hostname',
      SPAWN_HOST,
      '--port',
      String(SPAWN_PORT),
    ],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NEXT_TELEMETRY_DISABLED: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  child.stdout.on('data', (chunk) => {
    if (!VERBOSE) {
      return;
    }
    process.stdout.write(`[socket-smoke][dev] ${chunk}`);
  });

  child.stderr.on('data', (chunk) => {
    if (!VERBOSE) {
      return;
    }
    process.stderr.write(`[socket-smoke][dev] ${chunk}`);
  });

  child.on('exit', (code) => {
    if (!expectedExitChildren.has(child.pid) && code !== null && code !== 0) {
      log(`spawned dev server exited early with code ${code}`);
    }
  });

  await waitForHttp(baseUrl, SERVER_BOOT_TIMEOUT_MS);
  return child;
};

const ensureServer = async () => {
  try {
    await waitForHttp(DEFAULT_BASE_URL, REACHABLE_CHECK_TIMEOUT_MS);
    log(`using running server ${DEFAULT_BASE_URL}`);
    return {
      baseUrl: DEFAULT_BASE_URL,
      devServer: null,
    };
  } catch (error) {
    if (!AUTO_SPAWN) {
      throw new Error(
        `server is not reachable at ${DEFAULT_BASE_URL} and auto-spawn is disabled`
      );
    }
  }

  const spawnedBaseUrl = `http://${SPAWN_HOST}:${SPAWN_PORT}`;
  log(`spawning local dev server at ${spawnedBaseUrl}`);
  const devServer = await startDevServer(spawnedBaseUrl);
  return {
    baseUrl: spawnedBaseUrl,
    devServer,
  };
};

const connectSocket = (baseUrl, label) =>
  new Promise((resolve, reject) => {
    const socket = io(baseUrl, {
      path: SOCKET_PATH,
      addTrailingSlash: false,
      forceNew: true,
      reconnection: false,
      transports: ['polling'],
    });

    const timer = setTimeout(() => {
      socket.disconnect();
      reject(new Error(`${label} socket connect timeout`));
    }, EVENT_TIMEOUT_MS);

    const handleConnect = () => {
      clearTimeout(timer);
      socket.off('connect_error', handleError);
      log(`${label} connected`, { socketId: socket.id });
      resolve(socket);
    };

    const handleError = (error) => {
      clearTimeout(timer);
      socket.off('connect', handleConnect);
      socket.disconnect();
      reject(
        new Error(
          `${label} socket connect error: ${error?.message ?? 'unknown'}`
        )
      );
    };

    socket.once('connect', handleConnect);
    socket.once('connect_error', handleError);
  });

const waitForEvent = (socket, eventName, options = {}) => {
  const { timeoutMs = EVENT_TIMEOUT_MS, filter } = options;

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(eventName, handleEvent);
      reject(new Error(`timeout while waiting for ${eventName}`));
    }, timeoutMs);

    const handleEvent = (payload) => {
      if (filter && !filter(payload)) {
        return;
      }
      clearTimeout(timer);
      socket.off(eventName, handleEvent);
      resolve(payload);
    };

    socket.on(eventName, handleEvent);
  });
};

const emitAck = (socket, eventName, payload) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${eventName} ack timeout`));
    }, ACK_TIMEOUT_MS);

    socket.emit(eventName, payload, (response) => {
      clearTimeout(timer);
      resolve(response);
    });
  });

const assertCondition = (condition, message, payload) => {
  if (condition) {
    return;
  }
  if (payload !== undefined) {
    throw new Error(`${message} ${JSON.stringify(payload)}`);
  }
  throw new Error(message);
};

const requestRoomList = async (socket) => {
  const roomUpdatedPromise = waitForEvent(socket, 'room-updated');
  socket.emit('get-room-list');
  return roomUpdatedPromise;
};

const primeSocket = async (socket) => {
  await delay(POST_CONNECT_SETTLE_MS);
  await requestRoomList(socket);
};

const disconnectSocket = (socket) => {
  if (!socket) {
    return;
  }
  if (socket.connected) {
    socket.disconnect();
    return;
  }
  socket.close();
};

const terminateProcess = async (child) => {
  if (!child || child.killed) {
    return;
  }

  expectedExitChildren.add(child.pid);

  if (process.platform === 'win32') {
    await new Promise((resolve) => {
      const killer = spawn(
        'taskkill',
        ['/PID', String(child.pid), '/T', '/F'],
        {
          stdio: 'ignore',
        }
      );

      killer.once('exit', resolve);
      killer.once('error', resolve);
    });
    return;
  }

  child.kill();
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    delay(5000),
  ]);
};

const cleanupRoom = async ({ baseUrl, roomId, hostSessionId, hostSockets }) => {
  if (!baseUrl || !roomId || !hostSessionId) {
    return;
  }

  let temporarySocket = null;
  let cleanupSocket = hostSockets.find((socket) => socket?.connected) ?? null;

  try {
    if (!cleanupSocket) {
      temporarySocket = await connectSocket(baseUrl, 'cleanup-host');
      cleanupSocket = temporarySocket;
      await primeSocket(cleanupSocket);
      await emitAck(cleanupSocket, 'check-can-join-room', {
        roomId,
        sessionId: hostSessionId,
      });
    }

    const response = await emitAck(cleanupSocket, 'leave-room', {
      roomId,
      sessionId: hostSessionId,
    });
    if (response?.success) {
      log('cleanup room closed');
    }
  } catch (error) {
    log(`cleanup skipped: ${error.message}`);
  } finally {
    if (temporarySocket) {
      disconnectSocket(temporarySocket);
    }
  }
};

const main = async () => {
  let devServer = null;
  let baseUrl = '';
  let roomId = '';

  let hostSocket = null;
  let playerSocket = null;
  let playerReconnectSocket = null;
  let hostReconnectSocket = null;
  let observerSocket = null;

  const hostSessionId = makeId('host-session');
  const playerSessionId = makeId('player-session');
  const hostName = makeNickname('host');
  const playerName = makeNickname('play');
  let roomClosed = false;

  try {
    const ensuredServer = await ensureServer();
    baseUrl = ensuredServer.baseUrl;
    devServer = ensuredServer.devServer;
    await warmSocketEndpoint(baseUrl);

    hostSocket = await connectSocket(baseUrl, 'host');
    await primeSocket(hostSocket);

    const createResponse = await emitAck(hostSocket, 'create-room', {
      roomName: makeId('room'),
      userName: hostName,
      gameType: 'horse',
      sessionId: hostSessionId,
      maxPlayers: 2,
    });
    assertCondition(
      createResponse?.success && createResponse?.roomId,
      'create-room failed',
      createResponse
    );
    roomId = String(createResponse.roomId);
    log('room created', { roomId });

    const roomsAfterCreate = await requestRoomList(hostSocket);
    const createdRoom = roomsAfterCreate?.[roomId];
    assertCondition(
      Boolean(createdRoom),
      'created room not found in room list'
    );
    assertCondition(
      createdRoom.host?.id === hostSessionId,
      'host sessionId mismatch'
    );

    playerSocket = await connectSocket(baseUrl, 'player');
    await primeSocket(playerSocket);

    const checkJoinResponse = await emitAck(
      playerSocket,
      'check-can-join-room',
      {
        roomId,
        sessionId: playerSessionId,
      }
    );
    assertCondition(
      checkJoinResponse?.success,
      'check-can-join-room failed',
      checkJoinResponse
    );
    assertCondition(
      !checkJoinResponse?.reEnter,
      'new player should not be treated as re-entry'
    );

    const joinResponse = await emitAck(playerSocket, 'join-room', {
      roomId,
      userName: playerName,
      sessionId: playerSessionId,
    });
    assertCondition(joinResponse?.success, 'join-room failed', joinResponse);

    const roomsAfterJoin = await requestRoomList(hostSocket);
    const joinedRoom = roomsAfterJoin?.[roomId];
    assertCondition(
      joinedRoom.players?.some((player) => player.id === playerSessionId),
      'joined player not found in room list'
    );

    disconnectSocket(playerSocket);
    playerSocket = null;

    playerReconnectSocket = await connectSocket(baseUrl, 'player-reentry');
    await primeSocket(playerReconnectSocket);
    const playerReentryResponse = await emitAck(
      playerReconnectSocket,
      'check-can-join-room',
      {
        roomId,
        sessionId: playerSessionId,
      }
    );
    assertCondition(
      playerReentryResponse?.success && playerReentryResponse?.reEnter === true,
      'player re-entry contract failed',
      playerReentryResponse
    );
    assertCondition(
      playerReentryResponse?.host === false,
      'player re-entry should not be host'
    );

    const roomsAfterPlayerReentry = await requestRoomList(hostSocket);
    const reenteredPlayer = roomsAfterPlayerReentry?.[roomId]?.players?.find(
      (player) => player.id === playerSessionId
    );
    assertCondition(
      Boolean(reenteredPlayer),
      're-entered player missing from room list'
    );
    assertCondition(
      reenteredPlayer.socketId === playerReconnectSocket.id,
      're-entered player socketId was not refreshed',
      {
        expected: playerReconnectSocket.id,
        actual: reenteredPlayer.socketId,
      }
    );

    disconnectSocket(hostSocket);
    hostSocket = null;

    hostReconnectSocket = await connectSocket(baseUrl, 'host-reentry');
    await primeSocket(hostReconnectSocket);
    const hostReentryResponse = await emitAck(
      hostReconnectSocket,
      'check-can-join-room',
      {
        roomId,
        sessionId: hostSessionId,
      }
    );
    assertCondition(
      hostReentryResponse?.success && hostReentryResponse?.reEnter === true,
      'host re-entry contract failed',
      hostReentryResponse
    );
    assertCondition(
      hostReentryResponse?.host === true,
      'host re-entry should return host=true'
    );

    const roomClosedPromise = waitForEvent(
      playerReconnectSocket,
      'room-closed'
    );
    const leaveResponse = await emitAck(hostReconnectSocket, 'leave-room', {
      roomId,
      sessionId: hostSessionId,
    });
    assertCondition(leaveResponse?.success, 'leave-room failed', leaveResponse);
    roomClosed = true;

    const roomClosedPayload = await roomClosedPromise;
    assertCondition(
      typeof roomClosedPayload?.message === 'string' &&
        roomClosedPayload.message.length > 0,
      'room-closed message missing',
      roomClosedPayload
    );

    observerSocket = await connectSocket(baseUrl, 'observer');
    await primeSocket(observerSocket);
    const roomsAfterClose = await requestRoomList(observerSocket);
    assertCondition(
      !roomsAfterClose?.[roomId],
      'closed room still present in room list'
    );

    log('room flow smoke passed', {
      baseUrl,
      roomId,
    });
  } finally {
    if (!roomClosed) {
      await cleanupRoom({
        baseUrl,
        roomId,
        hostSessionId,
        hostSockets: [hostReconnectSocket, hostSocket],
      });
    }

    disconnectSocket(observerSocket);
    disconnectSocket(hostReconnectSocket);
    disconnectSocket(playerReconnectSocket);
    disconnectSocket(playerSocket);
    disconnectSocket(hostSocket);

    await terminateProcess(devServer);
  }
};

main().catch((error) => {
  console.error(`[socket-smoke] ${error.message}`);
  process.exit(1);
});
