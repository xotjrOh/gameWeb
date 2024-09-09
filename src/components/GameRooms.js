'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { setIsLoading } from '@/store/loadingSlice';
import { useSocket } from '@/components/provider/SocketProvider';
import RoomModal from './RoomModal';
import useCheckVersion from '@/hooks/useCheckVersion';
import useLoadingReset from '@/hooks/useLoadingReset';
// import { useBrowserWarning } from '@/hooks/useBrowserWarning';
import { showToast } from '@/store/toastSlice';

const gameTypeMap = {
  'horse' : "🏇경마게임",
  "shuffle": "뒤죽박죽",
}

export default function GameRooms({ session }) {
  const { socket } = useSocket();
  const router = useRouter();
  const dispatch = useDispatch();
  const [showModal, setShowModal] = useState(false);
  const { rooms } = useSelector((state) => state.room);
  // useBrowserWarning(dispatch);

  useCheckVersion(socket);
  useLoadingReset(socket, dispatch);

  const closeModal = () => {
    socket.disconnect();
    socket.connect();
    setShowModal(false);
  }

  const joinRoom = (roomId, gameType) => {
    if (!socket || !socket.connected) {
      // todo : 모달로 변경하여 새로고침 버튼을 넣는게 나을지도
      return dispatch(showToast({ message: '서버와 연결이 되어 있지 않습니다. 잠시후 다시 시도해주세요.', type: 'error' }));;
    }

    dispatch(setIsLoading(true));
    socket?.emit('join-room', { roomId, userName: session.user.name, sessionId: session.user.id }, (response) => {
      if (!response.success) {
        dispatch(showToast({ message: response.message, type: 'error' }));
      } else {
        if (response.host) router.push(`/${gameType}/${roomId}/host`);
        else router.push(`/${gameType}/${roomId}`);
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
          {/* 대기중인 방을 먼저 렌더링 */}
          {Object.values(rooms)
            .filter((room) => room.status === '대기중') // '대기중' 상태 필터링
            .map((room, index) => (
              <tr
                key={`waiting-${index}`}
                className="border-b border-gray-300 hover:bg-[#cde8ff] cursor-pointer"  // 대기중인 방 스타일
                onClick={() => joinRoom(room.roomId, room.gameType)}
              >
                {/* 대기중 방의 인덱스는 index + 1 */}
                <td className="px-4 py-2">{index + 1}</td> 
                <td className="px-4 py-2">{room.roomName}</td>
                <td className="px-4 py-2">{gameTypeMap[room.gameType]}</td>
                <td className="px-4 py-2">{room.status}</td>
                <td className="px-4 py-2">
                  {room.players.length} / {room.maxPlayers}
                </td>
              </tr>
            ))}

          {/* 대기중 방이 끝난 후의 인덱스 계산 */}
          {Object.values(rooms)
            .filter((room) => room.status === '게임중') // '게임중' 상태 필터링
            .map((room, index) => (
              <tr
                key={`playing-${index}`}
                className="border-b border-gray-300 bg-red-100 cursor-pointer"  // 게임중인 방 스타일
                onClick={() => joinRoom(room.roomId, room.gameType)}
              >
                {/* 게임중 방의 인덱스는 대기중 방의 개수 + 현재 게임중 방의 index + 1 */}
                <td className="px-4 py-2">
                  {Object.values(rooms).filter((room) => room.status === '대기중').length + index + 1}
                </td> 
                <td className="px-4 py-2">{room.roomName}</td>
                <td className="px-4 py-2">{gameTypeMap[room.gameType]}</td>
                <td className="px-4 py-2">{room.status}</td>
                <td className="px-4 py-2">
                  {room.players.length} / {room.maxPlayers}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
      {showModal && <RoomModal closeModal={closeModal} socket={socket} router={router} dispatch={dispatch} session={session} />}
    </div>
  );
}
