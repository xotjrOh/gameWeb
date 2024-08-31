'use client'

import { useSelector } from 'react-redux';

export default function LoadingSpinner() {
    const { isLoading } = useSelector((state) => state.loading);

    if (!isLoading) return null;

    return (
      <div className="spinner-container">
        <div className="spinner"></div>
      </div>
    );
  }
  