import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { initializeSocket } from '@/store/socketSlice';
import { setRooms } from '@/store/roomSlice';

const useSocket = () => {
  const dispatch = useDispatch();
  const { socket, isConnected } = useSelector((state) => state.socket);

  useEffect(() => {
    if (!isConnected) {
      dispatch(initializeSocket());
    }
  }, [isConnected, dispatch]);

  useEffect(() => {
    if (socket) {
      const handleRoomUpdated = (updatedRooms) => {
        dispatch(setRooms(updatedRooms));
      };

      socket.on('room-updated', handleRoomUpdated);
      socket.emit('get-room-list');

      return () => {
        socket.off('room-updated', handleRoomUpdated);
        socket.disconnect();
      };
    }
  }, [socket, dispatch]);

  return socket;
};

export default useSocket;
