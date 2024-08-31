import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { initializeSocket } from '@/store/socketSlice';
import { setRooms } from '@/store/roomSlice';

const useSocket = () => {
  const dispatch = useDispatch();
  const { socket } = useSelector((state) => state.socket);

  useEffect(() => {
    if (!socket || !socket.connected) {
      dispatch(initializeSocket());
    }
  }, [socket, dispatch]);

  useEffect(() => {
    if (socket) {
      const handleRoomUpdated = (updatedRooms) => {
        dispatch(setRooms(updatedRooms));
      };

      socket.on('room-updated', handleRoomUpdated);
      socket.emit('get-room-list');

      return () => {
        socket.off('room-updated', handleRoomUpdated);
        // setTimeout(socket.disconnect(), 4000);
      };
    }
  }, [socket, dispatch]);

  return socket;
};

export default useSocket;
