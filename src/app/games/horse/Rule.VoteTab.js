import Image from 'next/image';

export default function VoteTab() {
  return (
    <div className="p-4 animate-fadeIn">
      <h2 className="text-2xl md:text-3xl font-bold mb-6 text-indigo-700">🔮 예측탭 설명</h2>
      <div className="max-w-screen-md mx-auto">
        <p className="mb-4 text-base md:text-lg text-gray-700">
          각 라운드마다 플레이어는 최다 득표 경주마를 예측합니다.
        </p>
        <p className="mb-4 text-base md:text-lg text-gray-700">
          예측에 성공할 경우 칩 <span className="text-indigo-600 font-semibold">2개</span>를 획득합니다.
        </p>
        <p className="mb-4 text-base md:text-lg text-gray-700">
          하단에 라운드마다 내가 예측했던 내역을 확인할 수 있습니다.
        </p>
        <p className="mb-6 text-base md:text-lg text-gray-700">
          💡 <span className="font-semibold">Tip:</span> 예측탭에는 라운드마다 반드시 투표하는 게 좋아요!
        </p>
        <div className="relative w-full">
          <Image
            src="/images/rule/horse/voteTab.avif"
            alt="예측탭 화면"
            width={1452}
            height={873}
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
