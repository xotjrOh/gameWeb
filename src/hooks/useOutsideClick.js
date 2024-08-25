import { useEffect } from 'react';

// ref 이외의 영역을 누르면 callback이 실행되는 훅
const useOutsideClick = (ref, callback) => {

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        callback();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ref]);

};

export default useOutsideClick;