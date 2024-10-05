import { useEffect } from 'react';
import { useCustomSnackbar } from '@/hooks/useCustomSnackbar';

const useBrowserWarning = (dispatch) => {
  const { enqueueSnackbar } = useCustomSnackbar();

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isEdge = userAgent.includes('edge');

    if (isEdge) {
      enqueueSnackbar('이 웹사이트는 Chrome 브라우저에서 최적화되어 있습니다. Chrome 브라우저로 접속해 주세요.', { variant: 'error' });
    }
  }, [dispatch]);
}

export default useBrowserWarning;