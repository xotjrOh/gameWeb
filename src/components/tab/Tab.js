'use client'

export default function Tab({ label, isActive, onClick }) {
    return (
      <button
        className={`flex-1 text-center file:px-4 py-2 text-lg font-semibold border-b-2 ${
          isActive ? 'border-blue-500 text-blue-500' : 'border-transparent'
        }`}
        onClick={onClick}
      >
        {label}
      </button>
    );
}