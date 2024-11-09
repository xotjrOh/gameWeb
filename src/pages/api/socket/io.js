import { Server } from 'socket.io';
import commonHandler from './handlers/commonHandler';
import horseGameHandler from './handlers/horseGameHandler';
import shuffleGameHandler from './handlers/shuffleGameHandler';

const ioHandler = (req, res) => {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server, {
      path: '/api/socket/io',
      addTrailingSlash: false,
    });

    res.socket.server.io = io;

    io.on('connection', (socket) => {
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
