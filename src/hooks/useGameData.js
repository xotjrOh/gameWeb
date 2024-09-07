import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setGameData, updatePositions, updateRounds, updateFinishLine, updatePersonalRounds, updateVoteHistory, updateIsBetLocked, updateIsVoteLocked, updateChip } from '@/store/horseSlice'; // Redux 슬라이스에서 가져옴

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

        // 호스트를 위한 rounds 데이터
        socket.on('update-positions', ({ horsesData, rounds }) => {
            console.log("update-positions:", horsesData);
            console.log("update-positions2:", rounds);
            dispatch(updatePositions(horsesData)); // Redux에 상태 저장
            dispatch(updateRounds(rounds)); // Redux에 상태 저장
        });
        socket.on('update-finishLine', (data) => {
            console.log("update-finishLine:", data);
            dispatch(updateFinishLine(data)); // Redux에 상태 저장
        });
        socket.on('personal-round-update', (data) => {
            console.log("personal-round-update:", data);
            dispatch(updatePersonalRounds(data)); // Redux에 상태 저장
        });
        socket.on('vote-history-update', (data) => {
            console.log("vote-history-update:", data);
            dispatch(updateVoteHistory(data)); // Redux에 상태 저장
        });
        socket.on('update-isBetLocked', (data) => {
            console.log("update-isBetLocked:", data);
            dispatch(updateIsBetLocked(data)); // Redux에 상태 저장
        });
        socket.on('update-isVoteLocked', (data) => {
            console.log("update-isVoteLocked:", data);
            dispatch(updateIsVoteLocked(data)); // Redux에 상태 저장
        });
        socket.on('update-chip', (data) => {
            console.log("update-chip:", data);
            dispatch(updateChip(data)); // Redux에 상태 저장
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
            socket.off('personal-round-update');
            socket.off('vote-history-update');
            socket.off('update-isBetLocked');
            socket.off('update-isVoteLocked');
            socket.off('update-chip');
        };
    }
  }, [roomId, socket?.id, dispatch]);
};

export default useGameData;
