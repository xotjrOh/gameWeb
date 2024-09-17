'use client';

import { useState } from 'react';

// FloatingLabelInput 컴포넌트
const FloatingLabelInput = ({ label, type = 'text', value, onChange, inputRef }) => {
    const [focused, setFocused] = useState(false);
  
    return (
      <div className="relative w-full mb-4">
        <input
          type={type}
          ref={inputRef}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`block w-full px-2 pt-4 pb-2 border 
            border-gray-300 focus:border-blue-500
            focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition duration-300`}
          placeholder=" " // 실제 placeholder는 비워둡니다.
        />
        <label
          className={`absolute left-2 
            ${focused ? 'text-blue-500' : 'text-gray-500'} 
            ${value || focused ? '-top-2 text-xs' : 'top-4 text-sm'} 
            transition-all duration-300 bg-white px-1 mx-1`}
        >
          {label}
        </label>
      </div>
    );
};

export default FloatingLabelInput;