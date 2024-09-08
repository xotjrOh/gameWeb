'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { setIsLoading } from '@/store/loadingSlice';
import { useSocket } from '@/components/provider/SocketProvider';
import RoomModal from './RoomModal';
import useCheckVersion from '@/hooks/useCheckVersion';
// import { useBrowserWarning } from '@/hooks/useBrowserWarning';
import { showToast } from '@/store/toastSlice';

export default function GameRooms({ session }) {
  const { socket } = useSocket();
  const router = useRouter();
  const dispatch = useDispatch();
  const [showModal, setShowModal] = useState(false);
  const { rooms } = useSelector((state) => state.room);
  // useBrowserWarning(dispatch);

  useCheckVersion(socket);

  useEffect(() => {
    console.log(socket?.id, socket?.connected);
  }, [socket?.id]);

  const closeModal = () => setShowModal(false);

  const joinRoom = (roomId, gameType) => {
    if (!socket || !socket.connected) {
      // todo : 모달로 변경하여 새로고침 버튼을 넣는게 나을지도
      return dispatch(showToast({ message: '서버와 연결이 되어 있지 않습니다. 새로고침을 추천합니다.', type: 'error' }));;
    }

    dispatch(setIsLoading(true));
    socket.emit('join-room', { roomId, userName: session.user.name, sessionId: session.user.id }, (response) => {
      if (!response.success) {
        if (response.host) router.push(`/${gameType}/${roomId}/host`);
        if (response.message) dispatch(showToast({ message: response.message, type: 'error' }));
      } else {
        // 페이지를 이동하거나, UI를 업데이트할 수 있습니다.
        router.push(`/${gameType}/${roomId}`);
        // window.location.href = `/${gameType}/${roomId}`;
      }
      dispatch(setIsLoading(false));
    });
  };

  return (
    <div className="flex flex-col items-center p-4 bg-[#eff9ff] yanolza-font min-h-screen">

      <button onClick={() => setShowModal(true)} className="bg-blue-500 text-white px-4 py-2 rounded mb-4">
        방 만들기
      </button>

      <table className="min-w-full text-center">
        <thead>
          <tr className="border-b border-gray-300 bg-[#dff2fd]">
            <th className="px-4 py-2">#</th>
            <th className="px-4 py-2">방 이름</th>
            <th className="px-4 py-2">게임 종류</th>
            <th className="px-4 py-2">상태</th>
            <th className="px-4 py-2">인원</th>
          </tr>
        </thead>
        <tbody>
          {Object.values(rooms).map((room, index) => (
            <tr key={index} className="border-b border-gray-300 hover:bg-[#cde8ff] cursor-pointer" 
                onClick={() => joinRoom(room.roomId, room.gameType)}>
              <td className="px-4 py-2">{index + 1}</td>
              <td className="px-4 py-2">{room.roomName}</td>
              <td className="px-4 py-2">{room.gameType}</td>
              <td className="px-4 py-2">{room.status}</td>
              <td className="px-4 py-2">{room.players.length} / {room.maxPlayers}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {showModal && <RoomModal closeModal={closeModal} socket={socket} router={router} dispatch={dispatch} session={session} />}
    </div>
  );
}
