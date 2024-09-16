import Image from 'next/image';

export default function ChipsTab() {
  return (
    <div className="p-4 animate-fadeIn">
      <h2 className="text-2xl md:text-3xl font-bold mb-6 text-indigo-700">🎫 칩 개수 탭 설명</h2>
      <div className="max-w-screen-md mx-auto">
        <p className="mb-4 text-base md:text-lg text-gray-700">
          어떤 플레이어가 몇 개의 칩이 남았는지는 알 수 없습니다.
        </p>
        <p className="mb-4 text-base md:text-lg text-gray-700">
          다만 각 플레이어들의 <span className="text-indigo-600 font-semibold">‘익명이름’</span>을 통해 남은 칩 개수를 확인할 수 있습니다.
        </p>
        <p className="mb-6 text-base md:text-lg text-gray-700">
          본인의 <span className="text-indigo-600 font-semibold">‘익명이름’</span>은 <span className="text-indigo-600 font-semibold">‘내 상태 보기’</span>를 통해 확인할 수 있습니다.
        </p>
        <div className="relative w-full mb-4">
          <Image
            src="/images/rule/horse/chips.avif"
            alt="칩 개수 탭 이미지"
            width={964}
            height={433}
            quality={90}
            className="rounded-lg shadow-md mx-auto"
            sizes="(max-width: 768px) 100vw, 540px"
            style={{ width: '100%', height: 'auto' }}
          />
        </div>
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
