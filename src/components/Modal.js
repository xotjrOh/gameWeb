import React from 'react';
import ReactDOM from 'react-dom';

const Modal = ({ title, message, onConfirm, onCancel, type }) => {
  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded shadow-lg text-center max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">{title}</h2>
        <p className="mb-6">{message}</p>
        <div className="flex justify-around">
          <button
            onClick={onConfirm}
            className={`py-2 px-4 rounded ${
              type === 'warning'
                ? 'bg-red-500 text-white'
                : 'bg-blue-500 text-white'
            }`}
          >
            확인
          </button>
          <button
            onClick={onCancel}
            className="py-2 px-4 bg-gray-300 rounded"
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
