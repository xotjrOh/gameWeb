import { useEffect } from 'react';
import { showToast } from '@/store/toastSlice';

const useBrowserWarning = (dispatch) => {
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isWhale = userAgent.includes('whale');

    if (isWhale) {
      dispatch(showToast({ message: '이 웹사이트는 Chrome 브라우저에서 최적화되어 있습니다. Chrome 브라우저로 접속해 주세요.', type: 'error' }));
    }
  }, []);
}

export default useBrowserWarning;