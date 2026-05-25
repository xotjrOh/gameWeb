'use client';

import { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/components/provider/SocketProvider';
import MurderMysteryTableExperience from '@/components/murderMystery/MurderMysteryTableExperience';
import useCheckVersion from '@/hooks/useCheckVersion';
import useLeaveRoom from '@/hooks/useLeaveRoom';
import useMurderMysteryGameData from '@/hooks/useMurderMysteryGameData';
import useRedirectIfInvalidRoom from '@/hooks/useRedirectIfInvalidRoom';
import useRedirectIfNotHost from '@/hooks/useRedirectIfNotHost';
import useUpdateSocketId from '@/hooks/useUpdateSocketId';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useCustomSnackbar } from '@/hooks/useCustomSnackbar';
import {
  MurderMysterySeatPosition,
  MurderMysterySpecialEventOutcome,
} from '@/types/murderMystery';

interface MurderMysteryGameScreenProps {
  roomId: string;
  isHostView: boolean;
}

interface AckResponse {
  success: boolean;
  message?: string;
}

export default function MurderMysteryGameScreen({
  roomId,
  isHostView,
}: MurderMysteryGameScreenProps) {
  const { socket } = useSocket();
  const { data: session } = useSession();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useCustomSnackbar();
  const sessionId = session?.user.id ?? '';
  const reservationChangeSourceRef = useRef<'self' | null>(null);
  const previousReservationBackIdRef = useRef<string | null>(null);

  useCheckVersion(socket);
  useUpdateSocketId(socket, session, roomId);
  useLeaveRoom(socket, dispatch);
  useRedirectIfNotHost(roomId, isHostView);
  useRedirectIfInvalidRoom(roomId, !isHostView);

  const { snapshot, latestAnnouncement, latestPartReveal } =
    useMurderMysteryGameData(roomId, socket, sessionId);

  useEffect(() => {
    if (!latestAnnouncement) {
      return;
    }
    if (latestAnnouncement.type === 'SYSTEM') {
      enqueueSnackbar(latestAnnouncement.text, { variant: 'info' });
      return;
    }
    enqueueSnackbar(
      latestAnnouncement.type === 'INTRO'
        ? '프롤로그가 테이블에 공개되었습니다.'
        : '엔딩이 공개되었습니다.',
      { variant: 'success' }
    );
  }, [latestAnnouncement, enqueueSnackbar]);

  useEffect(() => {
    if (!latestPartReveal) {
      return;
    }
    enqueueSnackbar(
      `핵심 증거 공개 진행: ${latestPartReveal.revealedCount}/${latestPartReveal.totalCount}`,
      { variant: 'info' }
    );
  }, [latestPartReveal, enqueueSnackbar]);

  useEffect(() => {
    const currentReservationBackId =
      snapshot?.investigation.turn?.myReservation?.backId ?? null;

    if (previousReservationBackIdRef.current && !currentReservationBackId) {
      if (reservationChangeSourceRef.current === 'self') {
        reservationChangeSourceRef.current = null;
      } else {
        enqueueSnackbar(
          '예약한 카드가 다른 플레이어에게 먼저 가져가졌습니다. 새 카드를 다시 골라주세요.',
          { variant: 'warning' }
        );
      }
    }

    if (currentReservationBackId) {
      reservationChangeSourceRef.current = null;
    }
    previousReservationBackIdRef.current = currentReservationBackId;
  }, [snapshot?.investigation.turn?.myReservation?.backId, enqueueSnackbar]);

  const emitWithAck = <T extends object>(
    eventName: string,
    payload: T,
    successMessage?: string
  ) => {
    if (!socket) {
      return;
    }
    const looseSocket = socket as unknown as {
      emit: (
        event: string,
        data: unknown,
        callback: (response: AckResponse) => void
      ) => void;
    };
    looseSocket.emit(eventName, payload, (response) => {
      if (!response.success) {
        enqueueSnackbar(response.message ?? '요청 처리에 실패했습니다.', {
          variant: 'error',
        });
        return;
      }
      if (successMessage) {
        enqueueSnackbar(successMessage, { variant: 'success' });
      }
    });
  };

  const emitWithAckResult = <T extends object>(eventName: string, payload: T) =>
    new Promise<boolean>((resolve) => {
      if (!socket) {
        enqueueSnackbar('소켓 연결 대기 중입니다.', { variant: 'warning' });
        resolve(false);
        return;
      }

      const looseSocket = socket as unknown as {
        emit: (
          event: string,
          data: unknown,
          callback: (response: AckResponse) => void
        ) => void;
      };
      looseSocket.emit(eventName, payload, (response) => {
        if (!response.success) {
          enqueueSnackbar(response.message ?? '요청 처리에 실패했습니다.', {
            variant: 'error',
          });
          resolve(false);
          return;
        }
        resolve(true);
      });
    });

  const handleLeaveRoom = () => {
    if (!socket || !sessionId) {
      return;
    }
    socket.emit('leave-room', { roomId, sessionId }, (response) => {
      if (!response.success) {
        enqueueSnackbar(response.message ?? '방 나가기에 실패했습니다.', {
          variant: 'error',
        });
        return;
      }
      router.replace('/');
    });
  };

  const handleSubmitInvestigationByTarget = (targetId: string) => {
    emitWithAck(
      'mm_submit_investigation',
      { roomId, sessionId, targetId },
      '조사를 완료했습니다.'
    );
  };

  const handleSubmitInvestigationByBack = (backId: string) => {
    reservationChangeSourceRef.current = 'self';
    emitWithAck(
      'mm_submit_investigation',
      { roomId, sessionId, backId },
      '카드를 가져왔습니다.'
    );
  };

  const handleSetInvestigationReservation = (backId: string) => {
    emitWithAck(
      'mm_set_investigation_reservation',
      { roomId, sessionId, backId },
      '카드를 예약했습니다.'
    );
  };

  const handleClearInvestigationReservation = () => {
    reservationChangeSourceRef.current = 'self';
    emitWithAck(
      'mm_clear_investigation_reservation',
      { roomId, sessionId },
      '예약을 해제했습니다.'
    );
  };

  const handleSubmitVote = (voteOptionId: string) => {
    emitWithAck(
      'mm_submit_vote',
      { roomId, sessionId, voteOptionId },
      '최종 투표를 제출했습니다.'
    );
  };

  const handleReportSpecialEvent = (
    eventId: string,
    outcome: MurderMysterySpecialEventOutcome
  ) => {
    emitWithAck(
      'mm_report_special_event',
      { roomId, sessionId, eventId, outcome },
      outcome === 'reveal'
        ? '잠금 카드를 전체 공개했습니다.'
        : '잠금 카드를 영구 폐기했습니다.'
    );
  };

  const handleUpdateSeatPosition = (
    playerId: string,
    position: MurderMysterySeatPosition
  ) =>
    emitWithAckResult('mm_update_seat_position', {
      roomId,
      sessionId,
      playerId,
      position,
    });

  if (!snapshot) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <Typography>머더미스터리 테이블을 준비하는 중입니다.</Typography>
      </Box>
    );
  }

  return (
    <MurderMysteryTableExperience
      roomId={roomId}
      sessionId={sessionId}
      isHostView={isHostView}
      snapshot={snapshot}
      onLeaveRoom={handleLeaveRoom}
      onStartGame={() =>
        emitWithAck(
          'mm_host_start_game',
          { roomId, sessionId },
          '게임을 시작했습니다.'
        )
      }
      onNextPhase={() =>
        emitWithAck(
          'mm_host_next_phase',
          { roomId, sessionId },
          '다음 단계로 진행했습니다.'
        )
      }
      onFinalizeVote={() =>
        emitWithAck(
          'mm_host_finalize_vote',
          { roomId, sessionId },
          '최종 투표를 집계했습니다.'
        )
      }
      onUpdateSeatPosition={handleUpdateSeatPosition}
      onResetSeatLayout={() =>
        emitWithAck(
          'mm_reset_seat_layout',
          { roomId, sessionId },
          '자리 배치를 초기화했습니다.'
        )
      }
      onSubmitInvestigationByTarget={handleSubmitInvestigationByTarget}
      onSubmitInvestigationByBack={handleSubmitInvestigationByBack}
      onSetReservation={handleSetInvestigationReservation}
      onClearReservation={handleClearInvestigationReservation}
      onSubmitVote={handleSubmitVote}
      onReportSpecialEvent={handleReportSpecialEvent}
    />
  );
}
