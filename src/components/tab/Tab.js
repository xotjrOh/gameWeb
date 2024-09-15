'use client'

export default function Tab({ label, isActive, onClick }) {
    return (
      <button
        className={`flex-1 text-center px-2 py-2 text-sm md:text-lg font-semibol border-b-2 ${
          isActive ? 'border-blue-500 text-blue-500' : 'border-transparent'
        }`}
        onClick={onClick}
      >
        {label}
      </button>
    );
}