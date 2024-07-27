import { Server } from 'socket.io';

const ioHandler = (req, res) => {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server);
    res.socket.server.io = io;

    io.on('connection', (socket) => {
      console.log('A user connected');

      socket.on('create-room', (roomName) => {
        socket.join(roomName);
        io.to(roomName).emit('room-created', roomName);
        console.log(`Room ${roomName} created`);
      });

      socket.on('join-room', (roomName) => {
        socket.join(roomName);
        io.to(roomName).emit('user-joined', roomName);
        console.log(`User joined room ${roomName}`);
      });

      socket.on('disconnect', () => {
        console.log('A user disconnected');
      });
    });
  }
  res.end();
};

export default ioHandler;
