import React, { useRef, useState } from 'react';
import { Box, Button, ButtonGroup, Select, MenuItem, FormControl, InputLabel, Typography, Collapse, Tooltip, IconButton } from '@mui/material';
import YouTube from 'react-youtube';
import { videoDataList } from '@/utils/constants';
import {
  ExitToApp as ExitIcon,
} from '@mui/icons-material';
import LeaveModal from './LeaveModal';

export default function VideoPlayerTab({ roomId, socket, session }) {
  const [selectedVideoKey, setSelectedVideoKey] = useState('');
  const [clips, setClips] = useState([]);
  const youtubeRef = useRef(null);
  const [originIds, setOriginIds] = useState([]);
  const [answer, setAnswer] = useState([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [disableAnimation, setDisableAnimation] = useState(false);
  const [modals, setModals] = useState({
    leave: false,
  });

  const openModal = (type) => {
    setModals((prev) => ({ ...prev, [type]: true }));
  };

  const closeModal = (type) => {
    setModals((prev) => ({ ...prev, [type]: false }));
  };

  // 비디오 선택 시 처리
  const handleVideoSelect = (event) => {
    // 정답 숨기기 (애니메이션 없이)
    setDisableAnimation(true);
    setShowAnswer(false);

    const key = event.target.value;
    setSelectedVideoKey(key);
    youtubeRef.current?.stopVideo();

    if (videoDataList[key]) {
      const videoData = videoDataList[key];

      // 클립에 랜덤한 id 부여
      const ids = Array.from({ length: videoData.clips.length }, (_, i) => String.fromCharCode(65 + i));
      setOriginIds(ids);
      const shuffledIds = [...ids].sort(() => Math.random() - 0.5);
      setAnswer(shuffledIds);
      const clipsWithId = videoData.clips.map((clip, index) => ({
        ...clip,
        id: shuffledIds[index],
      }));

      setClips(clipsWithId);
    }
  };

  const onReady = (event) => {
    youtubeRef.current = event.target;
  };

  const handlePlayClip = (id) => {
    const clip = clips.find((clip) => clip.id === id);
    if (!clip) return;

    if (youtubeRef.current) {
      youtubeRef.current.loadVideoById({
        videoId: videoDataList?.[selectedVideoKey]?.videoId,
        startSeconds: clip.start,
        endSeconds: clip.end,
      });

      // 전체 화면으로 전환
      const iframe = youtubeRef.current.getIframe();
      if (iframe.requestFullscreen) {
        iframe.requestFullscreen();
      } else if (iframe.mozRequestFullScreen) {
        iframe.mozRequestFullScreen();
      } else if (iframe.webkitRequestFullscreen) {
        iframe.webkitRequestFullscreen();
      } else if (iframe.msRequestFullscreen) {
        iframe.msRequestFullscreen();
      }
    }
  };

  const handlePlayFullVideo = () => {
    if (youtubeRef.current) {
      youtubeRef.current.loadVideoById({
        videoId: videoDataList?.[selectedVideoKey]?.videoId,
        startSeconds: videoDataList?.[selectedVideoKey]?.full.start,
        endSeconds: videoDataList?.[selectedVideoKey]?.full.end,
      });

      // 전체 화면으로 전환
      const iframe = youtubeRef.current.getIframe();
      if (iframe.requestFullscreen) {
        iframe.requestFullscreen();
      } else if (iframe.mozRequestFullScreen) {
        iframe.mozRequestFullScreen();
      } else if (iframe.webkitRequestFullscreen) {
        iframe.webkitRequestFullscreen();
      } else if (iframe.msRequestFullscreen) {
        iframe.msRequestFullscreen();
      }
    }
  };

  const handleVideoEnd = () => {
    // 재생 종료 시 전체 화면 해제
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
    youtubeRef.current?.stopVideo();
  };

  return (
    <Box
      sx={{
        width: '100%',
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 비디오 선택 박스 */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel id="video-select-label">비디오 선택</InputLabel>
        <Select
          labelId="video-select-label"
          value={selectedVideoKey}
          label="비디오 선택"
          onChange={handleVideoSelect}
        >
          {Object.keys(videoDataList).map((key) => (
            <MenuItem key={key} value={key}>
              {key}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
        }}
      >
        <Button onClick={() => setShowAnswer(!showAnswer)}>
          {showAnswer ? '정답 숨기기' : '정답 보기'}
        </Button>
        <Tooltip title="나가기">
          <IconButton
            onClick={() => openModal('leave')}
            color="error"
            size="large"
          >
            <ExitIcon fontSize="large" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* 정답 표시 */}
      <Collapse
        in={showAnswer}
        timeout={disableAnimation ? 0 : undefined} // 애니메이션 제어
        sx={{ mb: 2 }}
      >
        <Typography variant="h6">
          정답: {answer.join(', ')}
        </Typography>
      </Collapse>

      {/* 버튼 그룹 */}
      {clips.length > 0 && (
        <ButtonGroup variant="contained" color="primary" sx={{ mb: 2 }}>
          {originIds.map((id) => (
            <Button key={id} onClick={() => handlePlayClip(id)}>
              {id}
            </Button>
          ))}
          <Button key={"전체재생"} onClick={() => handlePlayFullVideo()}>
            전체재생
          </Button>
        </ButtonGroup>
      )}

      {/* YouTube 플레이어 */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          flexGrow: 1,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
          }}
        >
          <YouTube
            videoId={videoDataList?.[selectedVideoKey]?.videoId}
            opts={{
              playerVars: {
                autoplay: 0,
                controls: 0,
                modestbranding: 1,
              },
              width: '100%',
              height: '100%',
            }}
            onReady={onReady}
            onEnd={handleVideoEnd}
          />
        </Box>
      </Box>

      <LeaveModal
        open={modals.leave}
        onClose={() => closeModal('leave')}
        roomId={roomId}
        socket={socket}
        session={session}
      />
    </Box>
  );
}
