import Image from 'next/image';

export default function StatusInfoTab() {
  return (
    <div className="p-4 animate-fadeIn">
      <h2 className="text-2xl md:text-3xl font-bold mb-6 text-indigo-700">👥 내 상태 보기란?</h2>
      <div className="max-w-screen-md mx-auto">
        <p className="mb-4 text-base md:text-lg text-gray-700">
          플레이할 인원이 모두 게임방에 들어오면 방장이 <span className="text-indigo-600 font-semibold">‘역할 분배’</span>를 클릭할 거예요.
        </p>
        <p className="mb-4 text-base md:text-lg text-gray-700">
          그러면 <span className="text-indigo-600 font-semibold">‘익명이름’</span>, <span className="text-indigo-600 font-semibold">‘내 경주마’</span>, <span className="text-indigo-600 font-semibold">‘남은 칩 개수’</span>가 초기화됩니다.
        </p>
        <p className="mb-4 text-base md:text-lg text-gray-700">
          <span className="text-indigo-600 font-semibold">‘익명이름’</span>은 <span className="text-indigo-600 font-semibold">‘칩 개수’</span> 탭에서 표기될 나의 익명이름입니다.
        </p>
        <p className="mb-6 text-base md:text-lg text-gray-700">
          <span className="text-indigo-600 font-semibold">‘내 경주마’</span>와 같은 경주마를 맡은 팀원을 찾고 힘을 합쳐 2등의 위치를 사수해야 합니다.
        </p>
        <div className="relative w-full">
          <Image
            src="/images/rule/horse/statusInfo.avif"
            alt="내 상태 보기"
            width={1422}
            height={559}
            quality={90}
            className="rounded-lg shadow-md mx-auto mt-5"
            sizes="(max-width: 768px) 100vw, 540px"
            style={{ width: '100%', height: 'auto' }}
          />
        </div>
      </div>
    </div>
  );
}
