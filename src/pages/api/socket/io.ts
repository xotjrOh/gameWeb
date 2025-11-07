import { Server as NetServer } from 'http';
import { Socket } from 'net';
import { NextApiRequest, NextApiResponse } from 'next';
import { Server as ServerIO } from 'socket.io';
import commonHandler from './handlers/commonHandler';
import horseGameHandler from './handlers/horseGameHandler';
import shuffleGameHandler from './handlers/shuffleGameHandler';
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

type DebuggableServerIO = ServerIO<
  ClientToServerEvents,
  ServerToClientEvents
> & {
  __dbgAttached?: boolean;
};

type GlobalWithSocket = typeof globalThis & {
  __socketIOInstance?: ServerIO<ClientToServerEvents, ServerToClientEvents>;
};

const globalSocketStore = globalThis as GlobalWithSocket;

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

const ioHandler = (req: NextApiRequest, res: NextApiResponseServerIO) => {
  if (!res.socket.server.io) {
    const httpServer: NetServer = res.socket.server as NetServer;
    let io: ServerIO<ClientToServerEvents, ServerToClientEvents>;
    let isNewInstance = false;

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
        isNewInstance = true;
      }
    } else {
      io = new ServerIO<ClientToServerEvents, ServerToClientEvents>(
        httpServer,
        {
          path: '/api/socket/io',
          addTrailingSlash: false,
        }
      );
      isNewInstance = true;
    }

    attachServerDebugListeners(io);

    res.socket.server.io = io;

    if (!SOCKET_SINGLETON_FIX || isNewInstance) {
      io.on('connection', (socket: ServerSocketType) => {
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
    }
  }
  res.end();
};

export default ioHandler;
