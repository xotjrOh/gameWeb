'use client';

import Image from 'next/image';
import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';

export default function VoteTab() {
  const theme = useTheme();

  // 반응형 디자인을 위한 미디어 쿼리
  const isXs = useMediaQuery(theme.breakpoints.down('sm')); // 모바일
  const isSm = useMediaQuery(theme.breakpoints.between('sm', 'md')); // 태블릿

  return (
    <Box
      id="tabpanel-3"
      aria-labelledby="tab-3"
      sx={{
        p: 3, // 패딩: 24px
      }}
    >
      {/* 제목 */}
      <Typography
        variant="h4"
        component="h2"
        gutterBottom
        sx={{
          fontWeight: 'bold',
          color: theme.palette.primary.main, // 테마의 primary 색상 사용
          fontSize: {
            xs: '1.5rem', // 모바일
            sm: '2rem',    // 태블릿
            md: '2.5rem',  // 데스크톱 이상
          },
          mb: {
            xs: 1, // 모바일
            sm: 2, // 태블릿
            md: 3, // 데스크톱 이상
          },
        }}
      >
        🔮 예측탭 설명
      </Typography>

      {/* 설명 내용 */}
      <Box sx={{ maxWidth: 'md', mx: 'auto' }}>
        {/* 첫 번째 문단 */}
        <Typography
          variant="body1"
          sx={{
            mb: 2, // mb-4
            color: theme.palette.text.primary, // 테마의 기본 텍스트 색상 사용
            fontSize: {
              xs: '1rem',    // 모바일
              sm: '1.25rem', // 태블릿
              md: '1.25rem', // 데스크톱 이상
            },
          }}
        >
          각 라운드마다 플레이어는 최다 득표 경주마를 예측합니다.
        </Typography>

        {/* 두 번째 문단 */}
        <Typography
          variant="body1"
          sx={{
            mb: 2, // mb-4
            color: theme.palette.text.primary,
            fontSize: {
              xs: '1rem',
              sm: '1.25rem',
              md: '1.25rem',
            },
          }}
        >
          예측에 성공할 경우 칩{' '}
          <Box
            component="span"
            sx={{
              color: theme.palette.primary.main,
              fontWeight: 'bold',
            }}
          >
            2개
          </Box>
          를 획득합니다.
        </Typography>

        {/* 세 번째 문단 */}
        <Typography
          variant="body1"
          sx={{
            mb: 2, // mb-4
            color: theme.palette.text.primary,
            fontSize: {
              xs: '1rem',
              sm: '1.25rem',
              md: '1.25rem',
            },
          }}
        >
          하단에 라운드마다 내가 예측했던 내역을 확인할 수 있습니다.
        </Typography>

        {/* 네 번째 문단 */}
        <Typography
          variant="body1"
          sx={{
            mb: 3, // mb-6
            color: theme.palette.text.primary,
            fontSize: {
              xs: '1rem',
              sm: '1.25rem',
              md: '1.25rem',
            },
          }}
        >
          💡{' '}
          <Box
            component="span"
            sx={{
              color: 'black',
              fontWeight: 'bold',
            }}
          >
            Tip:
          </Box>{' '}
          예측탭에는 라운드마다 반드시 투표하는 게 좋아요!
        </Typography>

        {/* 이미지 */}
        <Box sx={{ position: 'relative', width: '100%', mb: 2 }}>
          <Image
            src="/images/rule/horse/voteTab.avif"
            alt="예측탭 화면"
            width={425}
            height={581}
            quality={90}
            sizes="(max-width: 768px) 100vw, 540px"
            style={{
              width: '100%',
              height: 'auto',
              borderRadius: '8px', // rounded-lg
              boxShadow: '0px 4px 6px rgba(0,0,0,0.1)', // shadow-md
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}
