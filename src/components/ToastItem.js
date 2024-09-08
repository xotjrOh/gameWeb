'use client';

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { hideToast } from '@/store/toastSlice';

export default function ToastItem({ toast }) {
  const dispatch = useDispatch();

  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(hideToast(toast.id));
    }, 8000); // 8초 후에 토스트가 사라지도록 설정

    return () => clearTimeout(timer); // 컴포넌트가 언마운트될 때 타이머 클리어
  }, [dispatch, toast.id]);

  return (
    <div
      onClick={() => dispatch(hideToast(toast.id))} // 클릭 시 토스트 숨기기
      className={`p-4 rounded-lg shadow-lg text-white transition-all duration-800 ease-in-out transform cursor-pointer
        ${toast.type === 'success' ? 'bg-green-500' : ''}
        ${toast.type === 'error' ? 'bg-red-500' : ''}
        ${toast.type === 'warning' ? 'bg-yellow-500' : ''}
        ${toast.type === 'info' ? 'bg-blue-500' : ''}
      `}
      style={{
        animation: 'fadeOutUp 8s forwards',
        width: 'auto',  // **toast의 너비를 auto로 설정**
        flexShrink: 0,  // **너비가 변경되지 않도록 설정**
      }}
    >
      {toast.message}
    </div>
  );
}