'use client';

import { Provider } from 'react-redux';
import store from '@/store'; // store 파일을 import합니다.

export default function ReduxProvider({ children }) {
  return <Provider store={store}>{children}</Provider>;
}
