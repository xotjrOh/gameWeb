'use client';

import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Head from 'next/head';

const theme = createTheme({
    palette: {
      primary: {
        main: '#5b21b6',
      },
      secondary: {
        main: '#4c1d95',
      },
    },
    typography: {
      fontFamily: '"Noto Sans KR", "Roboto", sans-serif',
    },
  });

export default function ThemeRegistry({ children }) {
  return (
    <>
        {/* 구글 폰트 로드 */}
        <Head>
            <link
                href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap"
                rel="stylesheet"
            />
        </Head>
        <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
        </ThemeProvider>
    </>
  );
}
