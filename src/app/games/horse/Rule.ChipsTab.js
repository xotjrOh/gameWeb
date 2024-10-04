'use client';

import Image from 'next/image';
import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';

export default function ChipsTab() {
  const theme = useTheme();

  // 반응형 디자인을 위한 미디어 쿼리
  const isXs = useMediaQuery(theme.breakpoints.down('sm')); // 모바일
  const isSm = useMediaQuery(theme.breakpoints.between('sm', 'md')); // 태블릿

  return (
    <Box
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
        🎫 칩 개수 탭 설명
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
          어떤 플레이어가 몇 개의 칩이 남았는지는 알 수 없습니다.
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
          다만 각 플레이어들의{' '}
          <Box
            component="span"
            sx={{
              color: theme.palette.primary.main,
              fontWeight: 'bold',
            }}
          >
            ‘익명이름’
          </Box>
          을 통해 남은 칩 개수를 확인할 수 있습니다.
        </Typography>

        {/* 세 번째 문단 */}
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
          본인의{' '}
          <Box
            component="span"
            sx={{
              color: theme.palette.primary.main,
              fontWeight: 'bold',
            }}
          >
            ‘익명이름’
          </Box>
          은{' '}
          <Box
            component="span"
            sx={{
              color: theme.palette.primary.main,
              fontWeight: 'bold',
            }}
          >
            ‘내 상태 보기’
          </Box>
          를 통해 확인할 수 있습니다.
        </Typography>

        {/* 첫 번째 이미지 */}
        <Box sx={{ position: 'relative', width: '100%', mb: 2 }}>
          <Image
            src="/images/rule/horse/chips.avif"
            alt="칩 개수 탭 이미지"
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

        {/* 두 번째 이미지 */}
        <Box sx={{ position: 'relative', width: '100%' }}>
          <Image
            src="/images/rule/horse/statusInfo.avif"
            alt="내 상태 보기"
            width={423}
            height={580}
            quality={90}
            sizes="(max-width: 768px) 100vw, 540px"
            style={{
              width: '100%',
              height: 'auto',
              borderRadius: '8px', // rounded-lg
              boxShadow: '0px 4px 6px rgba(0,0,0,0.1)', // shadow-md
              marginTop: '20px', // mt-5
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}
