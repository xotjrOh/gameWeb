'use client';

import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Head from 'next/head';
import { indigo, grey, red } from '@mui/material/colors'; // 색상 객체 임포트

const theme = createTheme({
  palette: {
    background: {
      default: '#f0f2f5', // 원하는 배경색으로 변경
      card: '#f0f4ff',
    },
    primary: {
      main: indigo[700], // indigo[700]으로 설정
      dark: indigo[800],
    },
    secondary: {
      main: indigo[600], // 필요 시 변경
    },
    text: {
      primary: '#212121',  // 기본 텍스트 색상 수정
      secondary: '#757575',  // 보조 텍스트 색상 수정
    },
    info: {
      light: '#e3f2fd',
      main: '#64b5f6',
      dark: '#1976d2',
    },
    error: {
      light: '#ffebee',
      main: red[500], // 오류 텍스트 색상 설정
      dark: '#ba000d',
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
