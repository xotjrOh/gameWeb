import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setGameData, updatePositions, updateRounds, updateFinishLine } from '@/store/horseSlice'; // Redux 슬라이스에서 가져옴

const useGameData = (roomId, socket, sessionId) => {
  const dispatch = useDispatch();
  console.log("useGameData");

  useEffect(() => {
    console.log("useGameData1");
    if (socket && roomId) {
        console.log("useGameData2");
        
        socket.on('game-data-update', (data) => {
            console.log("Received game data:", data);
            dispatch(setGameData(data)); // Redux에 상태 저장
        });

        socket.on('update-positions', ({ horsesData, rounds }) => {
            console.log("update-positions:", horsesData, rounds);
            dispatch(updatePositions(horsesData)); // Redux에 상태 저장
            dispatch(updateRounds(rounds)); // Redux에 상태 저장
        });
        socket.on('update-finishLine', (data) => {
            console.log("update-finishLine:", data);
            dispatch(updateFinishLine(data)); // Redux에 상태 저장
        });

        // 서버에서 데이터를 받아와 Redux에 저장
        socket.emit('horse-get-game-data', { roomId, sessionId }, (response) => {
            if (!response.success) {
                alert(response.message);
            }
        });

        // cleanup: 컴포넌트가 언마운트되거나 socket이 변경될 때 이벤트 제거
        return () => {
            socket.off('game-data-update');
            socket.off('update-positions');
            socket.off('update-finishLine');
        };
    }
  }, [roomId, socket?.id, dispatch]);
};

export default useGameData;
