'use client';

import Image from 'next/image';
import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';

export default function BettingTab() {
  const theme = useTheme();

  // 반응형 디자인을 위한 미디어 쿼리
  const isXs = useMediaQuery(theme.breakpoints.down('sm')); // 모바일
  const isSm = useMediaQuery(theme.breakpoints.between('sm', 'md')); // 태블릿

  return (
    <Box
      id="tabpanel-2"
      aria-labelledby="tab-2"
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
        💰 베팅탭 설명
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
          각 라운드마다 플레이어는 경주마에 칩을 베팅합니다.
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
          라운드 종료 시 최다 득표 말은{' '}
          <Box
            component="span"
            sx={{
              color: theme.palette.primary.main,
              fontWeight: 'bold',
            }}
          >
            2칸
          </Box>
          , 차다 득표 말은{' '}
          <Box
            component="span"
            sx={{
              color: theme.palette.primary.main,
              fontWeight: 'bold',
            }}
          >
            1칸{' '}
          </Box>
          전진합니다. (동률은 함께 전진)
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
          하단에 라운드마다 내가 베팅했던 내역을 확인할 수 있습니다.
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
          베팅은 필수가 아닙니다. 칩을 아껴 후반을 노리는 것도 좋겠죠!
        </Typography>

        {/* 이미지 */}
        <Box sx={{ position: 'relative', width: '100%' }}>
          <Image
            src="/images/rule/horse/bettingTab.avif"
            alt="베팅탭 이미지"
            width={425}
            height={714}
            quality={90}
            sizes="(max-width: 768px) 100vw, 540px"
            style={{
              width: '100%',
              height: 'auto',
              borderRadius: '8px',         
              boxShadow: '0px 4px 6px rgba(0,0,0,0.1)',
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}
