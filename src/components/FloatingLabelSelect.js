'use client';

import { useState } from 'react';

const FloatingLabelSelect = ({ label, value, onChange, selectRef, options }) => {
  const [focused, setFocused] = useState(false);

  return (
    <div className="relative w-full mb-4">
      <select
        ref={selectRef}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="block w-full px-2 pt-4 pb-2 border 
          border-gray-300 focus:border-blue-500 
          focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition duration-300"
      >
        {options.map((option, index) => (
          <option key={index} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <label
        className={`absolute left-2 -top-2 text-xs 
            ${focused ? 'text-blue-500' : 'text-gray-500'} 
            transition-all duration-300 bg-white px-1 mx-1`}
      >
        {label}
      </label>
    </div>
  );
};

export default FloatingLabelSelect;