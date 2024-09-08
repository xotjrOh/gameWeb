'use client';

import { useSelector } from 'react-redux';
import ToastItem from './ToastItem'; // 개별 토스트 항목을 불러옴

export default function Toast() {
  const toasts = useSelector((state) => state.toast.toasts);

  return (
    <div className="fixed top-5 right-5 flex flex-col items-end space-y-2 z-[9999]">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}