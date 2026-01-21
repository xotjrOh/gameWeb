import { Server as NetServer } from 'http';
import { Socket } from 'net';
import { NextApiRequest, NextApiResponse } from 'next';
import { Server as ServerIO } from 'socket.io';
import commonHandler from './handlers/commonHandler';
import horseGameHandler from './handlers/horseGameHandler';
import shuffleGameHandler from './handlers/shuffleGameHandler';
import animalGameHandler from './handlers/animalGameHandler';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  ServerSocketType,
  JoinRoomData,
  CommonResponse,
} from '@/types/socket';

export type NextApiResponseServerIO = NextApiResponse & {
  socket: Socket & {
    server: NetServer & {
      io?: ServerIO<ClientToServerEvents, ServerToClientEvents>;
    };
  };
};

const DEBUG = process.env.SOCKET_DEBUG === '1';
const SOCKET_SINGLETON_FIX = process.env.SOCKET_SINGLETON_FIX === '1';
const SOCKET_ENFORCE_VERSION = process.env.SOCKET_ENFORCE_VERSION === '1';
const SERVER_APP_VERSION = process.env.APP_VERSION ?? 'dev';

type DebuggableServerIO = ServerIO<
  ClientToServerEvents,
  ServerToClientEvents
> & {
  __dbgAttached?: boolean;
  __connectionHandlersAttached?: boolean;
};

type GlobalWithSocket = typeof globalThis & {
  __socketIOInstance?: ServerIO<ClientToServerEvents, ServerToClientEvents>;
};

const globalSocketStore = globalThis as GlobalWithSocket;

const extractClientVersion = (socket: ServerSocketType): string | undefined => {
  const authVersion = socket.handshake.auth?.ver;
  if (typeof authVersion === 'string') {
    return authVersion;
  }

  const query = socket.handshake.query as Record<
    string,
    string | string[] | undefined
  >;
  const queryVersion = query?.v;
  if (Array.isArray(queryVersion)) {
    return queryVersion[0];
  }
  if (typeof queryVersion === 'string') {
    return queryVersion;
  }

  const headerVersion = socket.handshake.headers?.['x-app-version'];
  if (Array.isArray(headerVersion)) {
    return headerVersion[0];
  }
  if (typeof headerVersion === 'string') {
    return headerVersion;
  }

  return undefined;
};

const attachServerDebugListeners = (
  io: ServerIO<ClientToServerEvents, ServerToClientEvents>
) => {
  if (!DEBUG) {
    return;
  }

  const debuggableIo = io as DebuggableServerIO;
  if (debuggableIo.__dbgAttached) {
    return;
  }
  debuggableIo.__dbgAttached = true;

  io.engine.on('connection_error', (error: unknown) => {
    const err = error as { code?: string; message?: string };
    console.warn(
      `[socket-debug][server] engine connection_error code=${
        err?.code ?? 'unknown'
      } message=${err?.message ?? 'unknown'}`
    );
  });

  io.on('connection', (socket: ServerSocketType) => {
    socket.on(
      'join-room',
      (
        { roomId }: JoinRoomData,
        callback: (response: CommonResponse) => void
      ) => {
        console.log(
          `[socket-debug][server] join-room roomId=${roomId} hasAck=${
            typeof callback === 'function'
          }`
        );
      }
    );
  });
};

const attachConnectionHandlers = (
  io: ServerIO<ClientToServerEvents, ServerToClientEvents>
) => {
  const debuggableIo = io as DebuggableServerIO;
  if (debuggableIo.__connectionHandlersAttached) {
    return;
  }
  debuggableIo.__connectionHandlersAttached = true;

  io.on('connection', (socket: ServerSocketType) => {
    if (SOCKET_ENFORCE_VERSION) {
      const clientVersion = extractClientVersion(socket);
      if (clientVersion !== SERVER_APP_VERSION) {
        socket.emit('server-version', { version: SERVER_APP_VERSION });
        socket.disconnect(true);
        if (DEBUG) {
          console.log(
            `[socket-debug][server] version-mismatch id=${socket.id} client=${clientVersion} server=${SERVER_APP_VERSION}`
          );
        }
        return;
      }
    }

    console.log('server : A user connected', socket.id);
    if (DEBUG) {
      const transport = socket.conn.transport?.name;
      const clientsCount = io.engine.clientsCount;
      console.log(
        `[socket-debug][server] connection id=${socket.id} transport=${transport} clients=${clientsCount}`
      );
    }

    commonHandler(io, socket);
    horseGameHandler(io, socket);
    shuffleGameHandler(io, socket);
    animalGameHandler(io, socket);

    socket.on('disconnect', (reason) => {
      console.log('server : A user disconnected');
      if (DEBUG) {
        console.log(
          `[socket-debug][server] disconnect id=${socket.id} reason=${reason}`
        );
      }
    });
    socket.on('error', (err) => {
      console.error(`Error occurred on socket ${socket.id}:`, err);
    });
  });
};

const ioHandler = (req: NextApiRequest, res: NextApiResponseServerIO) => {
  if (!res.socket.server.io) {
    const httpServer: NetServer = res.socket.server as NetServer;
    let io: ServerIO<ClientToServerEvents, ServerToClientEvents>;

    if (SOCKET_SINGLETON_FIX) {
      if (globalSocketStore.__socketIOInstance) {
        io = globalSocketStore.__socketIOInstance;
      } else {
        io = new ServerIO<ClientToServerEvents, ServerToClientEvents>(
          httpServer,
          {
            path: '/api/socket/io',
            addTrailingSlash: false,
          }
        );
        globalSocketStore.__socketIOInstance = io;
      }
    } else {
      io = new ServerIO<ClientToServerEvents, ServerToClientEvents>(
        httpServer,
        {
          path: '/api/socket/io',
          addTrailingSlash: false,
        }
      );
    }

    attachServerDebugListeners(io);

    res.socket.server.io = io;
    attachConnectionHandlers(io);
  }
  res.end();
};

export default ioHandler;
