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
} from '@/types/socket';

export type NextApiResponseServerIO = NextApiResponse & {
  socket: Socket & {
    server: NetServer & {
      io?: ServerIO<ClientToServerEvents, ServerToClientEvents>;
    };
  };
};

const ioHandler = (req: NextApiRequest, res: NextApiResponseServerIO) => {
  if (!res.socket.server.io) {
    const httpServer: NetServer = res.socket.server as NetServer;
    const io = new ServerIO<ClientToServerEvents, ServerToClientEvents>(
      httpServer,
      {
        path: '/api/socket/io',
        addTrailingSlash: false,
      }
    );

    res.socket.server.io = io;

    io.on('connection', (socket: ServerSocketType) => {
      console.log('server : A user connected', socket.id);

      commonHandler(io, socket);
      horseGameHandler(io, socket);
      shuffleGameHandler(io, socket);

      socket.on('disconnect', () => {
        console.log('server : A user disconnected');
      });
      socket.on('error', (err) => {
        console.error(`Error occurred on socket ${socket.id}:`, err);
      });
    });
  }
  res.end();
};

export default ioHandler;
