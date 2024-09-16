import Image from 'next/image';

export default function BettingTab() {
  return (
    <div className="p-4 animate-fadeIn">
      <h2 className="text-2xl md:text-3xl font-bold mb-6 text-indigo-700">💰 베팅탭 설명</h2>
      <div className="max-w-screen-md mx-auto">
        <p className="mb-4 text-base md:text-lg text-gray-700">
          각 라운드마다 플레이어는 경주마에 칩을 베팅합니다.
        </p>
        <p className="mb-4 text-base md:text-lg text-gray-700">
          라운드 종료 시 최다 득표 말은 <span className="text-indigo-600 font-semibold">2칸</span>,
          차다 득표 말은 <span className="text-indigo-600 font-semibold">1칸</span> 전진합니다. (동률은 함께 전진)
        </p>
        <p className="mb-4 text-base md:text-lg text-gray-700">
          하단에 라운드마다 내가 베팅했던 내역을 확인할 수 있습니다.
        </p>
        <p className="mb-6 text-base md:text-lg text-gray-700">
          💡 <span className="font-semibold">Tip:</span> 베팅은 필수가 아닙니다. 칩을 아껴 후반을 노리는 것도 좋겠죠!
        </p>

        <div className="relative w-full">
          <Image
            src="/images/rule/horse/bettingTab.avif"
            alt="베팅탭 이미지"
            width={1450}
            height={958}
            quality={90}
            className="rounded-lg shadow-md mx-auto"
            sizes="(max-width: 768px) 100vw, 540px"
            style={{ width: '100%', height: 'auto' }}
          />
        </div>
      </div>
    </div>
  );
}
