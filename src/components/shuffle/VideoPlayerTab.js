import React, { useEffect } from 'react';
import { Box } from '@mui/material';
import YouTube from 'react-youtube';
import { useSelector } from 'react-redux';

export default function VideoPlayerTab({ roomId, socket, session }) {
  const { gameData } = useSelector((state) => state.shuffle);

  useEffect(() => {
    // 서버에서 클립 재생 시작 이벤트를 수신하여 처리
    socket.on('shuffle-game-started', ({ clips, gameData }) => {
      // 클립 정보를 Redux 스토어에 저장하거나 상태를 업데이트
      // 필요한 추가 로직 구현
    });

    return () => {
      socket.off('shuffle-game-started');
    };
  }, [socket]);

  // YouTube 플레이어 옵션 설정
  const opts = {
    height: '390',
    width: '640',
    playerVars: {
      // 시작 및 종료 시간을 설정
      autoplay: 1,
    },
  };

  // 클립 재생 로직 구현
  // ...

  return (
    <Box>
      {/* YouTube 플레이어 렌더링 */}
      <YouTube videoId={gameData.videoId} opts={opts} />
    </Box>
  );
}
