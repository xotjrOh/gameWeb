'use client';

import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Head from 'next/head';
import { indigo, grey, red } from '@mui/material/colors'; // 색상 객체 임포트

const theme = createTheme({
  palette: {
    primary: {
      main: indigo[700], // indigo[700]으로 설정
      dark: indigo[800],
    },
    secondary: {
      main: indigo[600], // 필요 시 변경
    },
    text: {
      primary: grey[700], // 본문 텍스트 색상 설정
    },
    error: {
      main: red[500], // 오류 텍스트 색상 설정
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
