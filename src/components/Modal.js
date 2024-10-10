'use client';
// todo : bettingTab에서 대체 이후. 해당 파일 삭제 예정

import { useRef } from 'react';
import ReactDOM from 'react-dom';
import useOutsideClick from '../hooks/useOutsideClick';

const Modal = ({ title, message, onConfirm, onCancel, type }) => {
  const modalRef = useRef(null);

  // 모달 외부 클릭 시 onCancel이 실행되도록 설정
  useOutsideClick(modalRef, onCancel);

  return ReactDOM.createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-4 bg-black bg-opacity-60 z-50">
      {/* 모바일에서도 좌우 여백을 추가하고, 컨테이너를 중앙에 배치 */}
      <div ref={modalRef} className="bg-white w-full max-w-lg rounded-lg shadow-xl p-6 mx-4 relative">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 text-center">{title}</h2>
        
        <div className="text-gray-700 mb-6">
          {/* 모달 메시지 또는 입력 필드 */}
          {message}
        </div>

        <div className="flex justify-center space-x-4">
          <button
            onClick={onConfirm}
            className={`w-full py-3 rounded-lg font-semibold text-white transition-all duration-300 
            ${type === 'warning' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          >
            확인
          </button>
          <button
            onClick={onCancel}
            className="w-full py-3 rounded-lg bg-gray-300 hover:bg-gray-400 font-semibold transition-all duration-300"
          >
            취소
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
