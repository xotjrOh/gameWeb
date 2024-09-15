import Image from 'next/image';
import { useState, useEffect } from 'react';

export default function BettingTab() {
  const [hasLayoutShift, setHasLayoutShift] = useState(false);

  useEffect(() => {
    // 탭이 변경될 때 레이아웃 시프트 방지를 위한 처리
    const handleResize = () => {
      setHasLayoutShift(true);
      setTimeout(() => setHasLayoutShift(false), 300); // shift 방지 타이머
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className={`text-center p-4 transition-all duration-300 ease-in-out ${hasLayoutShift ? 'min-h-[500px]' : ''}`}>
      <h2 className="text-xl md:text-2xl font-bold mb-4 yeogieottae-font">베팅탭 설명</h2>
      <p className="mb-2 text-xs md:text-base">각 라운드마다 플레이어는 경주마에 칩을 베팅합니다.</p>
      <p className="mb-2 text-xs md:text-base">라운드 종료시마다 최다득표 말은 2칸, 차다득표 말은 1칸 전진합니다. (동률은 함께 전진)</p>
      <p className="mb-2 text-xs md:text-base">하단에 라운드마다 내가 베팅했던 내역을 확인할 수 있습니다.</p>
      <p className="mb-2 text-xs md:text-base">Tip: 베팅은 필수가 아닙니다. 칩을 아껴 후반을 노리는 것도 좋겠죠!</p>

      {/* 이미지 부분 */}
      <Image
        src="/images/rule/horse/bettingTab.avif"
        alt="베팅탭 이미지"
        layout="responsive"
        width={540}
        height={230}
        quality={90}
        className="mx-auto rounded-lg shadow-md"
      />
    </div>
  );
}
