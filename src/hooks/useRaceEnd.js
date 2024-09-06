import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

function useRaceEnd() {
    const [hasRaceEnded, setHasRaceEnded] = useState(false); // 게임 종료 여부를 상태로 관리
    const { positions, finishLine } = useSelector((state) => state.horse.gameData);

    useEffect(() => {
      // positions 배열에서 결승선을 넘은 말이 있는지 확인
      const raceEnded = positions.some(horse => horse.position >= finishLine);
      setHasRaceEnded(raceEnded); // 게임 종료 여부 업데이트
    }, [positions, finishLine]);

    return { hasRaceEnded };
}

export default useRaceEnd;