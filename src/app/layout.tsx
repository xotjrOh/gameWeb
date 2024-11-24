import './globals.css';
import ThemeRegistry from '@/components/provider/ThemeRegistry';
import SessionProviderWrapper from '@/components/provider/SessionProviderWrapper';
import ReduxProvider from '@/components/provider/ReduxProvider';
import SocketProvider from '@/components/provider/SocketProvider';
import ToastProvider from '@/components/provider/ToastProvider';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ReactNode } from 'react';

export const metadata = {
  title: '게임 웹',
  description: '커스텀 게임을 웹으로 즐기자!',
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ko">
      <body>
        <ThemeRegistry>
          <SessionProviderWrapper>
            <ReduxProvider>
              <SocketProvider>
                <ToastProvider>
                  <LoadingSpinner />
                  {children}
                </ToastProvider>
              </SocketProvider>
            </ReduxProvider>
          </SessionProviderWrapper>
        </ThemeRegistry>
      </body>
    </html>
  );
}
