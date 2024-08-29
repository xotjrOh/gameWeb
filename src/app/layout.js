import "./globals.css";
import SessionProviderWrapper from '@/components/provider/SessionProviderWrapper';
import ReduxProvider from "@/components/provider/ReduxProvider";

export const metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SessionProviderWrapper>
          <ReduxProvider>
            {children}
          </ReduxProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
