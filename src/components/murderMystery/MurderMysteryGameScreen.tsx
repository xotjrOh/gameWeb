'use client';

import { useEffect, useRef, useState } from 'react';
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
import { getKakaoShareErrorMessage, shareKakaoText } from '@/lib/kakaoShare';
import { MurderMysterySpecialEventOutcome } from '@/types/murderMystery';

interface MurderMysteryGameScreenProps {
  roomId: string;
  isHostView: boolean;
}

interface AckResponse {
  success: boolean;
  message?: string;
  extraInvestigation?: boolean;
}

interface RoleShareAckResponse extends AckResponse {
  title?: string;
  text?: string;
  linkPath?: string;
}

const MURDER_MYSTERY_LOBBY_PATH = '/games/murder_mystery';

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
  const [pendingReservationBackId, setPendingReservationBackId] = useState<
    string | null
  >(null);

  useCheckVersion(socket);
  useUpdateSocketId(socket, session, roomId);
  useLeaveRoom(socket, dispatch);
  useRedirectIfNotHost(roomId, isHostView, MURDER_MYSTERY_LOBBY_PATH);
  useRedirectIfInvalidRoom(roomId, !isHostView, MURDER_MYSTERY_LOBBY_PATH);

  const {
    snapshot,
    requestErrorMessage,
    latestAnnouncement,
    latestPartReveal,
  } = useMurderMysteryGameData(roomId, socket, sessionId);

  useEffect(() => {
    if (!requestErrorMessage) {
      return;
    }

    enqueueSnackbar(
      '방이 사라졌거나 접근할 수 없습니다. 대기방으로 이동합니다.',
      {
        variant: 'error',
      }
    );
    socket?.emit('get-room-list');
    router.replace(MURDER_MYSTERY_LOBBY_PATH);
  }, [requestErrorMessage, enqueueSnackbar, router, socket]);

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
      `공개 단서 진행: ${latestPartReveal.revealedCount}/${latestPartReveal.totalCount}`,
      { variant: 'info' }
    );
  }, [latestPartReveal, enqueueSnackbar]);

  useEffect(() => {
    const currentReservationBackId =
      snapshot?.investigation.turn?.myReservation?.backId ?? null;
    const previousReservationBackId = previousReservationBackIdRef.current;
    const myHeldBackIds = new Set(
      snapshot?.players
        .find((player) => player.id === sessionId)
        ?.heldCardBacks.map((back) => back.backId) ?? []
    );
    const isInvestigationTurnActive = Boolean(
      snapshot?.investigation.round && snapshot.investigation.turn?.enabled
    );

    if (previousReservationBackId && !currentReservationBackId) {
      if (reservationChangeSourceRef.current === 'self') {
        reservationChangeSourceRef.current = null;
      } else if (
        isInvestigationTurnActive &&
        !myHeldBackIds.has(previousReservationBackId)
      ) {
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
  }, [snapshot, sessionId, enqueueSnackbar]);

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
      const resolvedSuccessMessage = response.message ?? successMessage;
      if (resolvedSuccessMessage) {
        enqueueSnackbar(resolvedSuccessMessage, { variant: 'success' });
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

  const emitWithAckPayload = <
    TPayload extends object,
    TResponse extends AckResponse,
  >(
    eventName: string,
    payload: TPayload
  ) =>
    new Promise<TResponse | null>((resolve) => {
      if (!socket) {
        enqueueSnackbar('소켓 연결 대기 중입니다.', { variant: 'warning' });
        resolve(null);
        return;
      }

      const looseSocket = socket as unknown as {
        emit: (
          event: string,
          data: unknown,
          callback: (response: TResponse) => void
        ) => void;
      };
      looseSocket.emit(eventName, payload, (response) => {
        if (!response.success) {
          enqueueSnackbar(response.message ?? '요청 처리에 실패했습니다.', {
            variant: 'error',
          });
          resolve(null);
          return;
        }
        resolve(response);
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
    if (!socket) {
      enqueueSnackbar('소켓 연결 대기 중입니다.', { variant: 'warning' });
      return;
    }
    setPendingReservationBackId(backId);
    const looseSocket = socket as unknown as {
      emit: (
        event: string,
        data: unknown,
        callback: (response: AckResponse) => void
      ) => void;
    };
    looseSocket.emit(
      'mm_set_investigation_reservation',
      { roomId, sessionId, backId },
      (response) => {
        setPendingReservationBackId((current) =>
          current === backId ? null : current
        );
        if (!response.success) {
          enqueueSnackbar(response.message ?? '요청 처리에 실패했습니다.', {
            variant: 'error',
          });
          return;
        }
        enqueueSnackbar(response.message ?? '카드를 예약했습니다.', {
          variant: 'success',
        });
      }
    );
  };

  const handleClearInvestigationReservation = () => {
    reservationChangeSourceRef.current = 'self';
    setPendingReservationBackId(null);
    emitWithAck(
      'mm_clear_investigation_reservation',
      { roomId, sessionId },
      '예약을 해제했습니다.'
    );
  };

  const handleRevealMyClue = (cardId: string) => {
    emitWithAck('mm_reveal_my_clue', { roomId, sessionId, cardId });
  };

  const handleSubmitVote = (voteOptionId: string) => {
    emitWithAck(
      'mm_submit_vote',
      { roomId, sessionId, voteOptionId },
      '최종 투표를 제출했습니다.'
    );
  };

  const handleSubmitEndingChoice = (choiceId: string, optionId: string) => {
    emitWithAck(
      'mm_submit_ending_choice',
      { roomId, sessionId, choiceId, optionId },
      '엔딩 선택을 제출했습니다.'
    );
  };

  const handleSubmitRolePreferences = (roleIds: string[]) => {
    emitWithAck('mm_submit_role_preferences', {
      roomId,
      sessionId,
      roleIds,
    });
  };

  const handleShareRoleSheet = async (roleId: string) => {
    const response = await emitWithAckPayload<
      { roomId: string; sessionId: string; roleId: string },
      RoleShareAckResponse
    >('mm_host_get_role_share_text', {
      roomId,
      sessionId,
      roleId,
    });

    if (!response?.title || !response.text || !response.linkPath) {
      return;
    }

    try {
      await shareKakaoText({
        title: response.title,
        text: response.text,
        linkUrl: new URL(response.linkPath, window.location.origin).href,
      });
      enqueueSnackbar('카카오톡 공유 화면을 열었습니다.', {
        variant: 'success',
      });
    } catch (error) {
      enqueueSnackbar(getKakaoShareErrorMessage(error), { variant: 'error' });
    }
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

  if (!snapshot) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <Typography>머더미스터리 테이블을 준비하는 중입니다.</Typography>
      </Box>
    );
  }

  return (
    <MurderMysteryTableExperience
      sessionId={sessionId}
      isHostView={isHostView}
      snapshot={snapshot}
      onLeaveRoom={handleLeaveRoom}
      onNextPhase={() =>
        emitWithAck(
          'mm_host_next_phase',
          { roomId, sessionId },
          snapshot.phase === 'LOBBY'
            ? '캐릭터를 배정하고 게임을 시작했습니다.'
            : '다음 단계로 진행했습니다.'
        )
      }
      onMarkRoleSheetRead={() =>
        emitWithAck('mm_mark_phase_read', {
          roomId,
          sessionId,
        })
      }
      onFinalizeVote={() =>
        emitWithAck(
          'mm_host_finalize_vote',
          { roomId, sessionId },
          '최종 투표를 집계했습니다.'
        )
      }
      onSubmitRolePreferences={handleSubmitRolePreferences}
      onShareRoleSheet={handleShareRoleSheet}
      onSubmitInvestigationByTarget={handleSubmitInvestigationByTarget}
      onSubmitInvestigationByBack={handleSubmitInvestigationByBack}
      onSetReservation={handleSetInvestigationReservation}
      onClearReservation={handleClearInvestigationReservation}
      pendingReservationBackId={pendingReservationBackId}
      onRevealMyClue={handleRevealMyClue}
      onSubmitVote={handleSubmitVote}
      onSubmitEndingChoice={handleSubmitEndingChoice}
      onReportSpecialEvent={handleReportSpecialEvent}
    />
  );
}
