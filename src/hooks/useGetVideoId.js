// todo : 아마 지워질듯
'use client';

import { useEffect, useState } from "react";
import { useCustomSnackbar } from '@/hooks/useCustomSnackbar';

export default function useGetVideoId(videoUrl) {
    const { enqueueSnackbar } = useCustomSnackbar();
    const [videoId, setVideoId] = useState(null);

    useEffect(() => {
        if (!videoUrl) return; // videoUrl이 없는 경우 처리하지 않음

        // 유튜브 URL 패턴에 맞는지 확인하는 정규 표현식
        const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:&.*)?/;
        const match = videoUrl.match(youtubeRegex);

        if (!match) {
            // 유튜브 URL 형식이 아닐 때 경고 표시
            enqueueSnackbar("유튜브 URL 형태를 입력해주세요", { variant: 'warning' });
            setVideoId(null);
            return;
        }

        // 유튜브 URL 형식이 맞을 때 videoId 추출
        const extractedVideoId = match[1];
        setVideoId(extractedVideoId);
    }, [videoUrl]);

    return { videoId };
}
