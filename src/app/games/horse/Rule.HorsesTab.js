import Image from 'next/image';

export default function HorsesTab() {
  return (
    <div className="p-4 animate-fadeIn">
      <h2 className="text-2xl md:text-3xl font-bold mb-6 text-indigo-700">🏇 경주마 탭 설명</h2>
      <div className="max-w-screen-md mx-auto">
        <p className="mb-4 text-base md:text-lg text-gray-700">
          각 경주마의 위치를 볼 수 있습니다.
        </p>
        <p className="mb-4 text-base md:text-lg text-gray-700">
          경주마가 1마리라도 결승선에 도달하면 그 즉시 게임이 종료됩니다.
        </p>
        <p className="mb-4 text-base md:text-lg text-gray-700">
          종료 시점에 결승선을 통과하지 않은 말 중 가장 앞선 말이 우승자가 됩니다.
        </p>
        <p className="mb-6 text-base md:text-lg text-gray-700">
          <span className="text-indigo-600 font-semibold">‘내 경주마’</span>는 <span className="text-indigo-600 font-semibold">‘내 상태 보기’</span>를 통해 확인할 수 있습니다.
        </p>
        <div className="relative w-full mb-4">
          <Image
            src="/images/rule/horse/horsesTab.avif"
            alt="경주마 탭 화면"
            width={1456}
            height={336}
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
