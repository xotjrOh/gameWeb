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
const PAGE_FETCH_TIMEOUT_MS = 90000;
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

const fetchWithTimeout = (target, options = {}, timeoutMs = 4000) =>
  fetch(target, {
    ...options,
    signal: AbortSignal.timeout(timeoutMs),
  });

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
      const response = await fetchWithTimeout(target, { cache: 'no-store' });
      if (response.ok || response.status === 404) {
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
  const response = await fetchWithTimeout(target, { cache: 'no-store' });
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

const requestMurderSnapshot = async (socket, roomId, sessionId) => {
  const snapshotPromise = waitForEvent(socket, 'mm_state_snapshot');
  const response = await emitAck(socket, 'mm_get_state', {
    roomId,
    sessionId,
  });
  assertCondition(response?.success, 'mm_get_state failed', response);
  return snapshotPromise;
};

const runMurderMysteryInvestigationSmoke = async (baseUrl) => {
  const scenarioId = 'rabbit-turtle-finish-line-night';
  const roomName = makeId('mm-room');
  const maxPlayers = 3;

  const hostSessionId = makeId('mm-host');
  const hostName = makeNickname('mhost');
  const playerInfos = Array.from({ length: 2 }, (_, index) => ({
    sessionId: makeId(`mm-player-${index}`),
    userName: makeNickname(`mm${index}`),
  }));

  let roomId = '';
  let hostSocket = null;
  const playerSockets = new Map();

  const disconnectAll = () => {
    for (const socket of playerSockets.values()) {
      disconnectSocket(socket);
    }
    playerSockets.clear();
    disconnectSocket(hostSocket);
  };

  try {
    hostSocket = await connectSocket(baseUrl, 'mm-host');
    await primeSocket(hostSocket);

    const createResponse = await emitAck(hostSocket, 'create-room', {
      roomName,
      userName: hostName,
      gameType: 'murder_mystery',
      sessionId: hostSessionId,
      maxPlayers,
      scenarioId,
      hostParticipatesAsPlayer: true,
    });
    assertCondition(
      createResponse?.success && createResponse?.roomId,
      'murder create-room failed',
      createResponse
    );
    roomId = String(createResponse.roomId);

    for (const [index, playerInfo] of playerInfos.entries()) {
      const socket = await connectSocket(baseUrl, `mm-player-${index}`);
      await primeSocket(socket);
      const checkJoinResponse = await emitAck(socket, 'check-can-join-room', {
        roomId,
        sessionId: playerInfo.sessionId,
      });
      assertCondition(
        checkJoinResponse?.success,
        'murder check-can-join-room failed',
        checkJoinResponse
      );
      const joinResponse = await emitAck(socket, 'join-room', {
        roomId,
        userName: playerInfo.userName,
        sessionId: playerInfo.sessionId,
      });
      assertCondition(
        joinResponse?.success,
        'murder join-room failed',
        joinResponse
      );
      playerSockets.set(playerInfo.sessionId, socket);
    }

    const lobbySnapshot = await requestMurderSnapshot(
      hostSocket,
      roomId,
      hostSessionId
    );
    const roleIds = lobbySnapshot.roleSelection?.roles?.map((role) => role.id);
    assertCondition(
      Array.isArray(roleIds) && roleIds.length === maxPlayers,
      'murder role selection roles missing',
      lobbySnapshot.roleSelection
    );

    const firstRole = lobbySnapshot.roleSelection.roles[0];

    const lobbyShareResponse = await emitAck(
      hostSocket,
      'mm_host_get_role_share_text',
      {
        roomId,
        sessionId: hostSessionId,
        roleId: firstRole.id,
      }
    );
    assertCondition(
      lobbyShareResponse?.success &&
        typeof lobbyShareResponse.title === 'string' &&
        typeof lobbyShareResponse.text === 'string' &&
        lobbyShareResponse.title === '머더미스터리' &&
        lobbyShareResponse.text.includes(firstRole.displayName) &&
        !lobbyShareResponse.text.includes('방 코드') &&
        lobbyShareResponse.text.length <= 200 &&
        typeof lobbyShareResponse.linkPath === 'string' &&
        lobbyShareResponse.linkPath.startsWith('/murder_mystery/pre-read/'),
      'mm_host_get_role_share_text should work from lobby first screen',
      lobbyShareResponse
    );

    const lobbyPreferenceResponse = await emitAck(
      hostSocket,
      'mm_submit_role_preferences',
      {
        roomId,
        sessionId: hostSessionId,
        roleIds: [firstRole.id],
      }
    );
    assertCondition(
      lobbyPreferenceResponse?.success,
      'role preferences should be submitted from lobby first screen',
      lobbyPreferenceResponse
    );

    const selectedLobbySnapshot = await requestMurderSnapshot(
      hostSocket,
      roomId,
      hostSessionId
    );
    assertCondition(
      selectedLobbySnapshot.phase === 'LOBBY' &&
        selectedLobbySnapshot.roleSelection?.status === 'open' &&
        selectedLobbySnapshot.roleSelection?.submittedCount === 1,
      'murder should keep role selection open on lobby first screen',
      {
        phase: selectedLobbySnapshot.phase,
        roleSelection: selectedLobbySnapshot.roleSelection,
      }
    );

    const startResponse = await emitAck(hostSocket, 'mm_host_start_game', {
      roomId,
      sessionId: hostSessionId,
    });
    assertCondition(
      startResponse?.success,
      'mm_host_start_game should start host-read intro with role selection still open',
      startResponse
    );

    const introSnapshot = await requestMurderSnapshot(
      hostSocket,
      roomId,
      hostSessionId
    );
    assertCondition(
      introSnapshot.phase === 'INTRO' &&
        introSnapshot.roleSelection?.status === 'open' &&
        introSnapshot.roleSelection?.submittedCount === 1 &&
        introSnapshot.roleReading?.readyCount === 0 &&
        introSnapshot.roleReading?.totalCount === maxPlayers &&
        introSnapshot.myCards.length === 0 &&
        introSnapshot.specialEvents.length === 0 &&
        introSnapshot.publicScripts?.some(
          (script) => script.stepId === 'INTRO' && script.current
        ),
      'murder should enter host-read intro with lobby role choices preserved',
      {
        phase: introSnapshot.phase,
        roleSelection: introSnapshot.roleSelection,
        roleReading: introSnapshot.roleReading,
        myCards: introSnapshot.myCards,
        specialEvents: introSnapshot.specialEvents,
        publicScripts: introSnapshot.publicScripts,
      }
    );

    const blockedIntroNextResponse = await emitAck(
      hostSocket,
      'mm_host_next_phase',
      {
        roomId,
        sessionId: hostSessionId,
      }
    );
    assertCondition(
      blockedIntroNextResponse?.success === false,
      'intro should block role assignment before all preferences are submitted',
      blockedIntroNextResponse
    );

    const introReadResponse = await emitAck(hostSocket, 'mm_mark_phase_read', {
      roomId,
      sessionId: hostSessionId,
    });
    assertCondition(
      introReadResponse?.success === false,
      'public intro should not accept per-player read completion',
      introReadResponse
    );

    const shareResponse = await emitAck(
      hostSocket,
      'mm_host_get_role_share_text',
      {
        roomId,
        sessionId: hostSessionId,
        roleId: firstRole.id,
      }
    );
    assertCondition(
      shareResponse?.success &&
        typeof shareResponse.title === 'string' &&
        typeof shareResponse.text === 'string' &&
        shareResponse.title === '머더미스터리' &&
        shareResponse.text.includes(firstRole.displayName) &&
        !shareResponse.text.includes('방 코드') &&
        shareResponse.text.length <= 200 &&
        typeof shareResponse.linkPath === 'string' &&
        shareResponse.linkPath.startsWith('/murder_mystery/pre-read/'),
      'mm_host_get_role_share_text should return kakao-safe pre-read link text',
      shareResponse
    );
    const preReadUrl = new URL(shareResponse.linkPath, baseUrl);
    const preReadResponse = await fetchWithTimeout(
      preReadUrl,
      {},
      PAGE_FETCH_TIMEOUT_MS
    );
    const preReadHtml = await preReadResponse.text();
    assertCondition(
      preReadResponse.ok &&
        preReadHtml.includes(firstRole.displayName) &&
        preReadHtml.includes('프롤로그') &&
        preReadHtml.includes('룰지') &&
        preReadHtml.includes('규칙'),
      'pre-read link should render selected role sheet',
      { status: preReadResponse.status, url: preReadUrl.toString() }
    );

    const tamperedLinkPath = `${shareResponse.linkPath.slice(0, -1)}${
      shareResponse.linkPath.endsWith('a') ? 'b' : 'a'
    }`;
    const tamperedPreReadResponse = await fetchWithTimeout(
      new URL(tamperedLinkPath, baseUrl),
      {},
      PAGE_FETCH_TIMEOUT_MS
    );
    const tamperedPreReadHtml = await tamperedPreReadResponse.text();
    assertCondition(
      tamperedPreReadResponse.ok &&
        tamperedPreReadHtml.includes('유효하지 않은 링크입니다.'),
      'tampered pre-read token should render invalid link screen',
      { status: tamperedPreReadResponse.status }
    );

    const nonHostShareSessionId = playerInfos[0].sessionId;
    const nonHostShareResponse = await emitAck(
      playerSockets.get(nonHostShareSessionId),
      'mm_host_get_role_share_text',
      {
        roomId,
        sessionId: nonHostShareSessionId,
        roleId: firstRole.id,
      }
    );
    assertCondition(
      nonHostShareResponse?.success === false,
      'non-host should not receive role share text',
      nonHostShareResponse
    );

    const preferenceSubmitters = [...playerSockets.entries()];
    for (const [sessionId, socket] of preferenceSubmitters) {
      const preferenceResponse = await emitAck(
        socket,
        'mm_submit_role_preferences',
        {
          roomId,
          sessionId,
          roleIds: [firstRole.id],
        }
      );
      assertCondition(
        preferenceResponse?.success,
        'mm_submit_role_preferences failed',
        preferenceResponse
      );
    }

    const readyLobbySnapshot = await requestMurderSnapshot(
      hostSocket,
      roomId,
      hostSessionId
    );
    assertCondition(
      readyLobbySnapshot.phase === 'INTRO' &&
        readyLobbySnapshot.roleSelection?.status === 'open' &&
        readyLobbySnapshot.roleSelection?.submittedCount === maxPlayers,
      'murder should keep role selection open during intro after all preferences are submitted',
      {
        phase: readyLobbySnapshot.phase,
        roleSelection: readyLobbySnapshot.roleSelection,
      }
    );

    const confirmRoleSelectionResponse = await emitAck(
      hostSocket,
      'mm_host_next_phase',
      {
        roomId,
        sessionId: hostSessionId,
      }
    );
    assertCondition(
      confirmRoleSelectionResponse?.success,
      'mm_host_next_phase should lock role selection after host confirmation',
      confirmRoleSelectionResponse
    );

    const roleReadingSnapshot = await requestMurderSnapshot(
      hostSocket,
      roomId,
      hostSessionId
    );

    const sessionOrder = [
      hostSessionId,
      ...playerInfos.map((player) => player.sessionId),
    ];
    const playerSessionIds = playerInfos.map((player) => player.sessionId);
    const socketsBySession = new Map([
      [hostSessionId, hostSocket],
      ...playerSockets.entries(),
    ]);
    const roleReadingSnapshots = await Promise.all(
      sessionOrder.map(async (sessionId) =>
        requestMurderSnapshot(
          socketsBySession.get(sessionId),
          roomId,
          sessionId
        )
      )
    );
    const firstRoleCover =
      roleReadingSnapshots[0].roleSelection.publicCovers.find(
        (cover) => cover.id === firstRole.id
      );
    const randomlyAssignedCount = roleReadingSnapshots.filter(
      (snapshot) => snapshot.roleSelection.yourAssignedRoleWasRandom
    ).length;
    assertCondition(
      roleReadingSnapshot.phase === 'ROLE_READING' &&
        roleReadingSnapshot.myCards.length === 0 &&
        roleReadingSnapshot.specialEvents.length === 0,
      'murder should enter role reading gate after host intro',
      {
        phase: roleReadingSnapshot.phase,
        myCards: roleReadingSnapshot.myCards,
        specialEvents: roleReadingSnapshot.specialEvents,
      }
    );
    assertCondition(
      firstRoleCover?.preferredPlayerIds.length === maxPlayers &&
        randomlyAssignedCount === maxPlayers - 1,
      'conflicting single role choices should expose selectors and random assignment flags',
      {
        firstRoleCover,
        randomlyAssignedCount,
        roleSelections: roleReadingSnapshots.map((snapshot) => ({
          yourPreferenceRoleIds: snapshot.roleSelection.yourPreferenceRoleIds,
          yourAssignedRoleId: snapshot.roleSelection.yourAssignedRoleId,
          yourAssignedRoleWasRandom:
            snapshot.roleSelection.yourAssignedRoleWasRandom,
        })),
      }
    );

    const blockedRoleReadingNextResponse = await emitAck(
      hostSocket,
      'mm_host_next_phase',
      {
        roomId,
        sessionId: hostSessionId,
      }
    );
    assertCondition(
      blockedRoleReadingNextResponse?.success === false,
      'role reading gate should block host next before all players read',
      blockedRoleReadingNextResponse
    );

    for (const [index, sessionId] of sessionOrder.entries()) {
      const readResponse = await emitAck(
        socketsBySession.get(sessionId),
        'mm_mark_phase_read',
        {
          roomId,
          sessionId,
        }
      );
      assertCondition(
        readResponse?.success,
        'mm_mark_phase_read failed',
        readResponse
      );

      const readSnapshot = await requestMurderSnapshot(
        hostSocket,
        roomId,
        hostSessionId
      );
      if (index < sessionOrder.length - 1) {
        assertCondition(
          readSnapshot.phase === 'ROLE_READING',
          'role reading gate advanced too early',
          readSnapshot.roleReading
        );
      } else {
        assertCondition(
          readSnapshot.phase === 'ROUND1_BRIEFING' &&
            readSnapshot.roleReading?.readyCount === maxPlayers,
          'role reading gate did not auto-advance to round 1 briefing',
          { phase: readSnapshot.phase, roleReading: readSnapshot.roleReading }
        );
      }
    }

    const briefingSnapshots = await Promise.all(
      sessionOrder.map(async (sessionId) =>
        requestMurderSnapshot(
          socketsBySession.get(sessionId),
          roomId,
          sessionId
        )
      )
    );
    assertCondition(
      briefingSnapshots.every(
        (snapshot) =>
          snapshot.phase === 'ROUND1_BRIEFING' &&
          snapshot.myCards.length === 0 &&
          snapshot.specialEvents.length === 0
      ),
      'round 1 briefing should still hide initial cards and locked testimony',
      briefingSnapshots.map((snapshot) => ({
        phase: snapshot.phase,
        myCards: snapshot.myCards,
        specialEvents: snapshot.specialEvents,
      }))
    );

    const briefingReadResponse = await emitAck(
      hostSocket,
      'mm_mark_phase_read',
      {
        roomId,
        sessionId: hostSessionId,
      }
    );
    assertCondition(
      briefingReadResponse?.success === false,
      'round 1 briefing should not accept per-player read completion',
      briefingReadResponse
    );

    const wifePactAnnouncementText =
      '아내토끼가 여우에게 개인 전달 카드를 건넸습니다. 1라운드 조사를 시작합니다.';
    const wifePactAnnouncementPromises = sessionOrder.map(async (sessionId) => [
      sessionId,
      await waitForEvent(socketsBySession.get(sessionId), 'mm_announcement', {
        filter: (event) => event?.type === 'SYSTEM',
      }),
    ]);

    const briefingNextResponse = await emitAck(
      hostSocket,
      'mm_host_next_phase',
      {
        roomId,
        sessionId: hostSessionId,
      }
    );
    assertCondition(
      briefingNextResponse?.success,
      'host should advance from round 1 briefing to investigation',
      briefingNextResponse
    );
    const wifePactAnnouncements = await Promise.all(
      wifePactAnnouncementPromises
    );
    assertCondition(
      wifePactAnnouncements.every(
        ([, event]) =>
          event?.type === 'SYSTEM' && event.text === wifePactAnnouncementText
      ),
      'wife pact handoff announcement should broadcast to every participant',
      wifePactAnnouncements
    );

    const investigationEntrySnapshot = await requestMurderSnapshot(
      hostSocket,
      roomId,
      hostSessionId
    );
    assertCondition(
      investigationEntrySnapshot.phase === 'ROUND1_INVESTIGATE' &&
        investigationEntrySnapshot.publicScripts?.some(
          (script) => script.stepId === 'ROUND1_BRIEFING'
        ),
      'round 1 briefing did not unlock investigation or script archive',
      {
        phase: investigationEntrySnapshot.phase,
        publicScripts: investigationEntrySnapshot.publicScripts,
      }
    );

    const snapshotEntries = await Promise.all(
      sessionOrder.map(async (sessionId) => [
        sessionId,
        await requestMurderSnapshot(
          socketsBySession.get(sessionId),
          roomId,
          sessionId
        ),
      ])
    );
    let snapshotsBySession = new Map(snapshotEntries);

    const foxSnapshot = [...snapshotsBySession.values()].find(
      (snapshot) => snapshot.roleSheet?.roleId === 'fox'
    );
    assertCondition(
      foxSnapshot?.myCards.some((card) => card.id === 'card_start_wife_pact'),
      'fox should receive initial wife pact card after round 1 briefing',
      foxSnapshot?.myCards
    );
    const reporterSnapshot = [...snapshotsBySession.values()].find((snapshot) =>
      ['rabbit_husband', 'jara'].includes(snapshot.roleSheet?.roleId)
    );
    assertCondition(
      reporterSnapshot?.specialEvents.some(
        (event) => event.id === 'wife_suspicion_gate'
      ),
      'locked wife testimony should appear only after round 1 briefing',
      reporterSnapshot?.specialEvents
    );

    const currentPlayerId =
      snapshotsBySession.get(hostSessionId)?.investigation.turn
        ?.currentPlayerId ?? null;
    assertCondition(
      Boolean(currentPlayerId),
      'current investigation player missing'
    );

    const currentPlayerSnapshot = snapshotsBySession.get(currentPlayerId);
    assertCondition(
      currentPlayerSnapshot?.roleSheet?.roleId === 'jara',
      'round 1 first investigation turn should be jara',
      {
        currentPlayerId,
        roleId: currentPlayerSnapshot?.roleSheet?.roleId,
      }
    );
    const turnRoleSequence =
      currentPlayerSnapshot?.investigation.turn?.players
        ?.slice(0, 3)
        .map((player) => player.roleId) ?? [];
    assertCondition(
      turnRoleSequence.join('>') === 'jara>fox>rabbit_husband',
      'investigation turn order should be jara -> fox -> rabbit_husband',
      turnRoleSequence
    );

    const nonCurrentPlayerId =
      currentPlayerSnapshot?.investigation.turn?.players?.[1]?.playerId ??
      playerSessionIds.find((sessionId) => sessionId !== currentPlayerId);
    assertCondition(
      Boolean(nonCurrentPlayerId),
      'non-current non-host investigation player missing'
    );

    const currentPlayerSocket = socketsBySession.get(currentPlayerId);
    let nonCurrentPlayerSocket = socketsBySession.get(nonCurrentPlayerId);
    const ownTarget =
      currentPlayerSnapshot?.investigation.rounds
        ?.find((round) => round.round === 1)
        ?.targets.find(
          (target) => target.isOwnedByViewer && target.availableBacks.length > 0
        ) ?? null;
    const ownBackId = ownTarget?.availableBacks[0]?.backId ?? null;
    assertCondition(
      Boolean(ownBackId),
      'current player own-item backId missing'
    );
    assertCondition(
      ownTarget?.canInvestigateByViewer === false &&
        ownTarget?.isOwnedFallbackForViewer === false,
      'own belongings should stay blocked while non-owned cards remain',
      ownTarget
    );

    const ownReserveResponse = await emitAck(
      currentPlayerSocket,
      'mm_set_investigation_reservation',
      {
        roomId,
        sessionId: currentPlayerId,
        backId: ownBackId,
      }
    );
    assertCondition(
      ownReserveResponse?.success === false,
      'current player should not be able to reserve own belongings',
      ownReserveResponse
    );

    const ownPickResponse = await emitAck(
      currentPlayerSocket,
      'mm_submit_investigation',
      {
        roomId,
        sessionId: currentPlayerId,
        backId: ownBackId,
      }
    );
    assertCondition(
      ownPickResponse?.success === false,
      'current player should not be able to pick own belongings',
      ownPickResponse
    );

    const initialNonCurrentSnapshot =
      snapshotsBySession.get(nonCurrentPlayerId);
    const reserveBack =
      initialNonCurrentSnapshot?.investigation.rounds
        ?.find((round) => round.round === 1)
        ?.targets.find(
          (target) =>
            !target.isOwnedByViewer && target.availableBacks.length > 0
        )
        ?.availableBacks.find((back) => !back.extraInvestigationOnReveal) ??
      initialNonCurrentSnapshot?.investigation.rounds
        ?.find((round) => round.round === 1)
        ?.targets.find(
          (target) =>
            !target.isOwnedByViewer && target.availableBacks.length > 0
        )?.availableBacks[0] ??
      null;
    const reserveBackId = reserveBack?.backId ?? null;
    assertCondition(
      Boolean(reserveBackId),
      'map-mode reservation backId missing from non-current snapshot'
    );

    const pickBackId =
      currentPlayerSnapshot?.investigation.rounds
        ?.find((round) => round.round === 1)
        ?.targets.flatMap((target) =>
          target.canInvestigateByViewer ? target.availableBacks : []
        )
        .find(
          (back) =>
            back.backId !== reserveBackId && !back.extraInvestigationOnReveal
        )?.backId ?? null;
    assertCondition(
      Boolean(pickBackId),
      'map-mode pick backId missing from current player snapshot'
    );

    const reserveResponse = await emitAck(
      nonCurrentPlayerSocket,
      'mm_set_investigation_reservation',
      {
        roomId,
        sessionId: nonCurrentPlayerId,
        backId: reserveBackId,
      }
    );
    assertCondition(
      reserveResponse?.success,
      'mm_set_investigation_reservation failed',
      reserveResponse
    );

    let nonCurrentSnapshot = await requestMurderSnapshot(
      nonCurrentPlayerSocket,
      roomId,
      nonCurrentPlayerId
    );
    assertCondition(
      nonCurrentSnapshot.investigation.turn?.myReservation?.backId ===
        reserveBackId,
      'reservation was not persisted for reserving player'
    );

    const clearReserveResponse = await emitAck(
      nonCurrentPlayerSocket,
      'mm_clear_investigation_reservation',
      {
        roomId,
        sessionId: nonCurrentPlayerId,
      }
    );
    assertCondition(
      clearReserveResponse?.success,
      'mm_clear_investigation_reservation failed',
      clearReserveResponse
    );

    nonCurrentSnapshot = await requestMurderSnapshot(
      nonCurrentPlayerSocket,
      roomId,
      nonCurrentPlayerId
    );
    assertCondition(
      !nonCurrentSnapshot.investigation.turn?.myReservation,
      'reservation was not cleared after explicit clear'
    );

    const secondReserveResponse = await emitAck(
      nonCurrentPlayerSocket,
      'mm_set_investigation_reservation',
      {
        roomId,
        sessionId: nonCurrentPlayerId,
        backId: reserveBackId,
      }
    );
    assertCondition(
      secondReserveResponse?.success,
      'second mm_set_investigation_reservation failed',
      secondReserveResponse
    );

    disconnectSocket(nonCurrentPlayerSocket);
    playerSockets.delete(nonCurrentPlayerId);

    nonCurrentPlayerSocket = await connectSocket(baseUrl, 'mm-player-reentry');
    await primeSocket(nonCurrentPlayerSocket);
    const reEntryResponse = await emitAck(
      nonCurrentPlayerSocket,
      'check-can-join-room',
      {
        roomId,
        sessionId: nonCurrentPlayerId,
      }
    );
    assertCondition(
      reEntryResponse?.success && reEntryResponse?.reEnter === true,
      'murder player re-entry failed',
      reEntryResponse
    );
    playerSockets.set(nonCurrentPlayerId, nonCurrentPlayerSocket);
    socketsBySession.set(nonCurrentPlayerId, nonCurrentPlayerSocket);

    nonCurrentSnapshot = await requestMurderSnapshot(
      nonCurrentPlayerSocket,
      roomId,
      nonCurrentPlayerId
    );
    assertCondition(
      nonCurrentSnapshot.investigation.turn?.myReservation?.backId ===
        reserveBackId,
      'reservation was not restored after re-entry'
    );

    const illegalPickResponse = await emitAck(
      nonCurrentPlayerSocket,
      'mm_submit_investigation',
      {
        roomId,
        sessionId: nonCurrentPlayerId,
        backId: reserveBackId,
      }
    );
    assertCondition(
      illegalPickResponse?.success === false,
      'non-current player should not be able to pick a card'
    );

    const pickResponse = await emitAck(
      currentPlayerSocket,
      'mm_submit_investigation',
      {
        roomId,
        sessionId: currentPlayerId,
        backId: pickBackId,
      }
    );
    assertCondition(
      pickResponse?.success,
      'current player pick failed',
      pickResponse
    );

    const refreshedSnapshots = await Promise.all(
      sessionOrder.map(async (sessionId) => [
        sessionId,
        await requestMurderSnapshot(
          socketsBySession.get(sessionId),
          roomId,
          sessionId
        ),
      ])
    );
    snapshotsBySession = new Map(refreshedSnapshots);

    const refreshedCurrentSnapshot = snapshotsBySession.get(currentPlayerId);
    const refreshedReservedSnapshot =
      snapshotsBySession.get(nonCurrentPlayerId);
    assertCondition(
      refreshedCurrentSnapshot?.clueVault?.myClues?.length === 1,
      'picked card did not reach the current player clue vault'
    );
    const pickedCard = refreshedCurrentSnapshot?.clueVault?.myClues?.[0];
    assertCondition(
      Boolean(pickedCard) && pickedCard?.isPublic === false,
      'picked clue should be private in the owner clue vault',
      pickedCard
    );
    refreshedSnapshots.forEach(([sessionId, snapshot]) => {
      const holder = snapshot.players.find(
        (player) => player.id === currentPlayerId
      );
      assertCondition(
        holder?.heldCardBacks.some((back) => back.backId === pickBackId),
        'all player snapshots should show the clue back held by the picker',
        { viewerSessionId: sessionId, holder }
      );
      assertCondition(
        !snapshot.clueVault.publicClues.some(
          (card) => card.id === pickedCard?.id
        ),
        'ordinary picked clue should not enter public clues before owner reveal',
        {
          viewerSessionId: sessionId,
          publicClues: snapshot.clueVault.publicClues,
        }
      );
    });
    const autoPickedCard = refreshedReservedSnapshot?.clueVault.myClues.find(
      (card) => card.backId === reserveBackId
    );
    assertCondition(
      autoPickedCard?.canRevealPublicly === true &&
        autoPickedCard?.isPublic === false,
      'reserved card should be automatically picked when the reserving turn starts',
      {
        reserveBackId,
        myClues: refreshedReservedSnapshot?.clueVault.myClues,
      }
    );
    const revealTarget = pickedCard?.canRevealPublicly
      ? {
          card: pickedCard,
          ownerId: currentPlayerId,
          ownerSocket: currentPlayerSocket,
          nonOwnerSocket: nonCurrentPlayerSocket,
        }
      : {
          card: autoPickedCard,
          ownerId: nonCurrentPlayerId,
          ownerSocket: nonCurrentPlayerSocket,
          nonOwnerSocket: currentPlayerSocket,
        };
    assertCondition(
      revealTarget.card?.canRevealPublicly === true,
      'public reveal test target should be revealable',
      revealTarget.card
    );
    refreshedSnapshots.forEach(([sessionId, snapshot]) => {
      const holder = snapshot.players.find(
        (player) => player.id === nonCurrentPlayerId
      );
      assertCondition(
        holder?.heldCardBacks.some((back) => back.backId === reserveBackId),
        'all player snapshots should show the automatically picked reserved back',
        { viewerSessionId: sessionId, holder }
      );
      assertCondition(
        !snapshot.clueVault.publicClues.some(
          (card) => card.id === autoPickedCard?.id
        ),
        'automatically picked ordinary clue should remain private before owner reveal',
        {
          viewerSessionId: sessionId,
          publicClues: snapshot.clueVault.publicClues,
        }
      );
    });

    const nonOwnerRevealResponse = await emitAck(
      revealTarget.nonOwnerSocket,
      'mm_reveal_my_clue',
      {
        roomId,
        sessionId:
          revealTarget.ownerId === currentPlayerId
            ? nonCurrentPlayerId
            : currentPlayerId,
        cardId: revealTarget.card?.id,
      }
    );
    assertCondition(
      nonOwnerRevealResponse?.success === false,
      'non-owner should not be able to publicly reveal another player clue',
      nonOwnerRevealResponse
    );

    const ownerRevealResponse = await emitAck(
      revealTarget.ownerSocket,
      'mm_reveal_my_clue',
      {
        roomId,
        sessionId: revealTarget.ownerId,
        cardId: revealTarget.card?.id,
      }
    );
    assertCondition(
      ownerRevealResponse?.success,
      'owner should be able to publicly reveal own investigation clue',
      ownerRevealResponse
    );

    const publicRevealSnapshots = await Promise.all(
      sessionOrder.map(async (sessionId) => [
        sessionId,
        await requestMurderSnapshot(
          socketsBySession.get(sessionId),
          roomId,
          sessionId
        ),
      ])
    );
    snapshotsBySession = new Map(publicRevealSnapshots);
    publicRevealSnapshots.forEach(([sessionId, snapshot]) => {
      const holder = snapshot.players.find(
        (player) => player.id === revealTarget.ownerId
      );
      assertCondition(
        snapshot.clueVault.publicClues.some(
          (card) => card.id === revealTarget.card?.id
        ),
        'owner-revealed clue should appear in every public clue vault',
        {
          viewerSessionId: sessionId,
          publicClues: snapshot.clueVault.publicClues,
        }
      );
      assertCondition(
        holder?.publicRevealedClues.some(
          (card) => card.id === revealTarget.card?.id
        ),
        'owner-revealed clue should appear as public on holder seat',
        { viewerSessionId: sessionId, holder }
      );
    });

    const afterPublicRevealCurrentSnapshot = snapshotsBySession.get(
      revealTarget.ownerId
    );
    const publicOwnerCard =
      afterPublicRevealCurrentSnapshot?.clueVault.myClues.find(
        (card) => card.id === revealTarget.card?.id
      );
    assertCondition(
      publicOwnerCard?.isPublic === true &&
        publicOwnerCard?.canRevealPublicly === false,
      'publicly revealed own clue should stop showing revealable state',
      publicOwnerCard
    );
    assertCondition(
      !refreshedReservedSnapshot?.investigation.turn?.myReservation,
      'reservation should clear after automatic pickup'
    );
    assertCondition(
      refreshedReservedSnapshot?.investigation.rounds
        ?.flatMap((round) => round.targets)
        ?.every((target) =>
          target.availableBacks.every(
            (entry) =>
              entry.backId !== pickBackId && entry.backId !== reserveBackId
          )
        ),
      'picked and auto-picked backIds should disappear from later snapshots'
    );
    assertCondition(
      refreshedCurrentSnapshot?.investigation.turn?.currentPlayerId &&
        refreshedCurrentSnapshot.investigation.turn.currentPlayerId !==
          currentPlayerId,
      'investigation turn did not advance after pick'
    );
    const nextTurnPlayer =
      refreshedCurrentSnapshot?.investigation.turn?.players.find(
        (player) =>
          player.playerId ===
          refreshedCurrentSnapshot.investigation.turn?.currentPlayerId
      );
    assertCondition(
      nextTurnPlayer?.roleId === 'rabbit_husband',
      'investigation turn should advance past the auto-picked fox turn',
      nextTurnPlayer
    );

    let autoDiscussSnapshot = await requestMurderSnapshot(
      hostSocket,
      roomId,
      hostSessionId
    );
    let autoAdvancePickCount = 0;
    const maxAutoAdvancePickCount = Math.max(
      autoDiscussSnapshot.investigation.turn?.players?.length ?? 0,
      maxPlayers * 4
    );
    while (
      autoDiscussSnapshot.phase === 'ROUND1_INVESTIGATE' &&
      autoAdvancePickCount < maxAutoAdvancePickCount
    ) {
      const activePlayerId =
        autoDiscussSnapshot.investigation.turn?.currentPlayerId;
      assertCondition(
        Boolean(activePlayerId),
        'round 1 auto-advance active player missing',
        autoDiscussSnapshot.investigation.turn
      );
      const activeSocket = socketsBySession.get(activePlayerId);
      const activeSnapshot = await requestMurderSnapshot(
        activeSocket,
        roomId,
        activePlayerId
      );
      const nextBack =
        activeSnapshot.investigation.rounds
          ?.find((round) => round.round === 1)
          ?.targets.flatMap((target) =>
            target.canInvestigateByViewer ? target.availableBacks : []
          )
          .find((back) => !back.extraInvestigationOnReveal) ??
        activeSnapshot.investigation.rounds
          ?.find((round) => round.round === 1)
          ?.targets.flatMap((target) =>
            target.canInvestigateByViewer ? target.availableBacks : []
          )[0] ??
        null;
      assertCondition(
        Boolean(nextBack?.backId),
        'round 1 auto-advance card back missing',
        activeSnapshot.investigation.rounds
      );

      const autoPickResponse = await emitAck(
        activeSocket,
        'mm_submit_investigation',
        {
          roomId,
          sessionId: activePlayerId,
          backId: nextBack.backId,
        }
      );
      assertCondition(
        autoPickResponse?.success,
        'round 1 auto-advance pick failed',
        autoPickResponse
      );
      autoAdvancePickCount += 1;
      autoDiscussSnapshot = await requestMurderSnapshot(
        hostSocket,
        roomId,
        hostSessionId
      );
    }
    assertCondition(
      autoDiscussSnapshot.phase === 'ROUND1_DISCUSS',
      'round 1 investigation should auto-advance to discussion after all turns',
      {
        phase: autoDiscussSnapshot.phase,
        turn: autoDiscussSnapshot.investigation.turn,
        autoAdvancePickCount,
        maxAutoAdvancePickCount,
      }
    );
    assertCondition(
      autoDiscussSnapshot.phaseTimer?.durationSec === 600,
      'round 1 discussion should expose the scenario time limit',
      autoDiscussSnapshot.phaseTimer
    );

    const discussToRound2BriefingResponse = await emitAck(
      socketsBySession.get(hostSessionId),
      'mm_host_next_phase',
      {
        roomId,
        sessionId: hostSessionId,
      }
    );
    assertCondition(
      discussToRound2BriefingResponse?.success,
      'host should advance from round 1 discussion to round 2 briefing',
      discussToRound2BriefingResponse
    );

    const round2BriefingSnapshot = await requestMurderSnapshot(
      hostSocket,
      roomId,
      hostSessionId
    );
    assertCondition(
      round2BriefingSnapshot.phase === 'ROUND2_BRIEFING' &&
        round2BriefingSnapshot.publicScripts?.some(
          (script) => script.stepId === 'ROUND2_BRIEFING' && script.current
        ),
      'round 2 briefing should be a host-read public script stage',
      {
        phase: round2BriefingSnapshot.phase,
        publicScripts: round2BriefingSnapshot.publicScripts,
      }
    );

    const round2BriefingReadResponse = await emitAck(
      socketsBySession.get(hostSessionId),
      'mm_mark_phase_read',
      {
        roomId,
        sessionId: hostSessionId,
      }
    );
    assertCondition(
      round2BriefingReadResponse?.success === false,
      'round 2 briefing should not accept per-player read completion',
      round2BriefingReadResponse
    );

    const round2BriefingNextResponse = await emitAck(
      socketsBySession.get(hostSessionId),
      'mm_host_next_phase',
      {
        roomId,
        sessionId: hostSessionId,
      }
    );
    assertCondition(
      round2BriefingNextResponse?.success,
      'host should advance from round 2 briefing to round 2 investigation',
      round2BriefingNextResponse
    );

    const round2InvestigationSnapshot = await requestMurderSnapshot(
      hostSocket,
      roomId,
      hostSessionId
    );
    assertCondition(
      round2InvestigationSnapshot.phase === 'ROUND2_INVESTIGATE',
      'round 2 briefing host-next did not enter round 2 investigation',
      round2InvestigationSnapshot.phase
    );

    const round2SnapshotEntries = await Promise.all(
      sessionOrder.map(async (sessionId) => [
        sessionId,
        await requestMurderSnapshot(
          socketsBySession.get(sessionId),
          roomId,
          sessionId
        ),
      ])
    );
    const round2SnapshotsBySession = new Map(round2SnapshotEntries);
    const round2CurrentPlayerId =
      round2SnapshotsBySession.get(hostSessionId)?.investigation.turn
        ?.currentPlayerId ?? null;
    assertCondition(
      Boolean(round2CurrentPlayerId),
      'round 2 current investigation player missing'
    );
    const round2CurrentSnapshot = round2SnapshotsBySession.get(
      round2CurrentPlayerId
    );
    const extraBack =
      round2CurrentSnapshot?.investigation.rounds
        ?.find((round) => round.round === 2)
        ?.targets.flatMap((target) =>
          target.isOwnedByViewer ? [] : target.availableBacks
        )
        .find((back) => back.extraInvestigationOnReveal) ?? null;
    assertCondition(
      Boolean(extraBack),
      'round 2 extra-investigation back missing'
    );

    const extraPickResponse = await emitAck(
      socketsBySession.get(round2CurrentPlayerId),
      'mm_submit_investigation',
      {
        roomId,
        sessionId: round2CurrentPlayerId,
        backId: extraBack?.backId,
      }
    );
    assertCondition(
      extraPickResponse?.success && extraPickResponse.extraInvestigation,
      'extra-investigation clue pick should succeed and grant an extra action',
      extraPickResponse
    );

    const extraRevealSnapshots = await Promise.all(
      sessionOrder.map(async (sessionId) => [
        sessionId,
        await requestMurderSnapshot(
          socketsBySession.get(sessionId),
          roomId,
          sessionId
        ),
      ])
    );
    const extraOwnerSnapshot = extraRevealSnapshots.find(
      ([sessionId]) => sessionId === round2CurrentPlayerId
    )?.[1];
    const extraPublicCard = extraOwnerSnapshot?.clueVault.myClues.find(
      (card) => card.extraInvestigationOnReveal && card.isPublic
    );
    assertCondition(
      Boolean(extraPublicCard),
      'extra-investigation clue should be public immediately for owner',
      extraOwnerSnapshot?.clueVault.myClues
    );
    extraRevealSnapshots.forEach(([sessionId, snapshot]) => {
      assertCondition(
        snapshot.clueVault.publicClues.some(
          (card) => card.id === extraPublicCard?.id
        ),
        'extra-investigation clue should appear in every public clue vault immediately',
        {
          viewerSessionId: sessionId,
          publicClues: snapshot.clueVault.publicClues,
        }
      );
    });

    const resetResponse = await emitAck(
      socketsBySession.get(hostSessionId),
      'mm_host_reset_game',
      {
        roomId,
        sessionId: hostSessionId,
      }
    );
    assertCondition(
      resetResponse?.success,
      'mm_host_reset_game failed',
      resetResponse
    );

    const closeResponse = await emitAck(
      socketsBySession.get(hostSessionId),
      'leave-room',
      {
        roomId,
        sessionId: hostSessionId,
      }
    );
    assertCondition(
      closeResponse?.success,
      'murder leave-room failed',
      closeResponse
    );
  } finally {
    disconnectAll();
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

    await runMurderMysteryInvestigationSmoke(baseUrl);
    log('murder mystery investigation smoke passed', {
      baseUrl,
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
