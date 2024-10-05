'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { setIsLoading } from '@/store/loadingSlice';
import { useSocket } from '@/components/provider/SocketProvider';
import RoomModal from './RoomModal';
import useCheckVersion from '@/hooks/useCheckVersion';
import useLoadingReset from '@/hooks/useLoadingReset';
import { useSnackbar } from 'notistack';

const gameTypeMap = {
  horse: '🏇 경마게임',
  shuffle: '🔀 뒤죽박죽',
};

export default function GameRooms({ session }) {
  const { socket } = useSocket();
  const router = useRouter();
  const dispatch = useDispatch();
  const [showModal, setShowModal] = useState(false);
  const { rooms } = useSelector((state) => state.room);
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  useCheckVersion(socket);
  useLoadingReset(socket, dispatch);

  const closeModal = () => {
    socket.disconnect();
    socket.connect();
    setShowModal(false);
  };

  const joinRoom = (roomId, gameType) => {
    if (!socket || !socket.connected) {
      return enqueueSnackbar('서버와 연결이 되어 있지 않습니다. 잠시 후 다시 시도해주세요.', { variant: 'error' });
    }

    dispatch(setIsLoading(true));
    socket?.emit(
      'join-room',
      { roomId, userName: session.user.name, sessionId: session.user.id },
      (response) => {
        if (!response.success) {
          enqueueSnackbar(response.message, { variant: 'error' });
        } else {
          if (response.host) router.replace(`/${gameType}/${roomId}/host`);
          else router.replace(`/${gameType}/${roomId}`);
        }
        dispatch(setIsLoading(false));
      }
    );
  };

  const waitingRooms = Object.values(rooms).filter((room) => room.status === '대기중');
  const playingRooms = Object.values(rooms).filter((room) => room.status === '게임중');
  
  return (
    <div className="flex flex-col items-center p-8 bg-gradient-to-b from-blue-50 to-indigo-100 min-h-screen">
      <h1 className="text-3xl font-extrabold mb-6 text-indigo-700">🎮 게임 대기실</h1>

      <button
        onClick={() => setShowModal(true)}
        className="bg-indigo-600 text-white px-6 py-3 rounded-full mb-8 hover:bg-indigo-700 transition font-semibold shadow-lg"
      >
        방 만들기
      </button>

      <div className="w-full max-w-4xl">
        {Object.values(rooms).length === 0 ? (
          <div className="text-center text-gray-600">현재 생성된 방이 없습니다.</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {waitingRooms.map((room) => (
                <div
                  key={room.roomId}
                  className="p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 cursor-pointer bg-white"
                  onClick={() => joinRoom(room.roomId, room.gameType)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">{room.roomName}</h2>
                    <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-600">
                      {room.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-gray-600">{gameTypeMap[room.gameType]}</div>
                    <div className="text-gray-600">
                      {room.players.length} / {room.maxPlayers} 명
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {playingRooms.map((room) => (
                <div
                  key={room.roomId}
                  className="p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 cursor-pointer bg-gray-200"
                  onClick={() => joinRoom(room.roomId, room.gameType)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">{room.roomName}</h2>
                    <span className="px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-600">
                      {room.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-gray-600">{gameTypeMap[room.gameType]}</div>
                    <div className="text-gray-600">
                      {room.players.length} / {room.maxPlayers} 명
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showModal && (
        <RoomModal
          closeModal={closeModal}
          socket={socket}
          router={router}
          dispatch={dispatch}
          session={session}
        />
      )}
    </div>
  );
}
