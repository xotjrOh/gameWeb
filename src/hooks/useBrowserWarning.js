import { useEffect } from 'react';

const useBrowserWarning = () => {
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isWhale = userAgent.includes('whale');

    if (isWhale) {
      alert('이 웹사이트는 Chrome 브라우저에서 최적화되어 있습니다. Chrome 브라우저로 접속해 주세요.');
    }
  }, []);
}

export default useBrowserWarning;