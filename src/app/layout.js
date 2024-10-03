import "./globals.css";
import ThemeRegistry from '@/components/provider/ThemeRegistry';
import SessionProviderWrapper from '@/components/provider/SessionProviderWrapper';
import ReduxProvider from "@/components/provider/ReduxProvider";
import { SocketProvider } from '@/components/provider/SocketProvider';

import LoadingSpinner from "@/components/LoadingSpinner";
import Toast from "@/components/Toast";
import './toast.css';

export const metadata = {
  title: "게임 웹",
  description: "커스텀 게임을 웹으로 즐기자!",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <ThemeRegistry>
          <SessionProviderWrapper>
            <ReduxProvider>
              <SocketProvider>
                <LoadingSpinner />
                <Toast />
                {children}
              </SocketProvider>
            </ReduxProvider>
          </SessionProviderWrapper>
        </ThemeRegistry>
      </body>
    </html>
  );
}
