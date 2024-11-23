'use client';

import React, { ReactNode } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Head from 'next/head';
import { indigo, red } from '@mui/material/colors'; // 색상 객체 임포트

interface ThemeRegistryProps {
  children: ReactNode;
}

const theme = createTheme({
  palette: {
    background: {
      default: '#f0f2f5', // 원하는 배경색으로 변경
      card: '#f0f4ff',
      success: '#e8f5e9',
      fail: '#ffffff',
    },
    border: {
      success: '#4caf50',
      fail: '#e2e8f0',
    },
    primary: {
      main: indigo[500], // indigo[700]으로 설정
      dark: indigo[700],
    },
    secondary: {
      main: indigo[600], // 필요 시 변경
    },
    text: {
      primary: '#333333', // 기본 텍스트 색상 수정
      secondary: '#666666', // 보조 텍스트 색상 수정
    },
    info: {
      light: '#bbdefb', // 밝은 파란색
      main: '#64b5f6', // 기본 파란색
      dark: '#1976d2', // 어두운 파란색
    },
    error: {
      light: '#ffcdd2', // 밝은 빨간색
      main: red[500], // 기본 빨간색
      dark: '#d32f2f', // 어두운 빨간색
    },
  },
  typography: {
    fontFamily: '"Noto Sans KR", "Roboto", sans-serif',
  },
});

export default function ThemeRegistry({ children }: ThemeRegistryProps) {
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
