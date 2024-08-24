'use client'

import { useEffect } from "react";

export default function Error({error, reset}) {
  useEffect(() => {
    console.error('--------', error.message);
  }, [])

  return (
    <>
      <div>
        에러페이지 입니다. 
      </div>
      <div>
        {error.message}
      </div>
      <button onClick={()=>{
        reset();
      }}>
        새로고침
      </button>
    </>
  );
}
