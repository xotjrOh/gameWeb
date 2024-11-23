'use client';

import { Provider } from 'react-redux';
import store from '@/store'; // store 파일을 import합니다.
import { ReactNode } from 'react';

interface ReduxProviderProps {
  children: ReactNode;
}

export default function ReduxProvider({ children }: ReduxProviderProps) {
  return <Provider store={store}>{children}</Provider>;
}
