import Image from 'next/image';

export default function BettingTab() {
  return (
    <div className="text-center p-4">
        <h2 className="text-2xl font-bold mb-4 yeogieottae-font">베팅탭 설명</h2>
        <p className="mb-2">각 라운드마다 플레이어는 경주마에 칩을 베팅합니다.</p>
        <p className="mb-2">라운드 종료시마다 최다득표 말은 2칸, 차다득표 말은 1칸 전진합니다. (동률은 함께 전진)</p>
        <p className="mb-2">하단에 라운드마다 내가 베팅했던 내역을 확인할 수 있습니다.</p>
        <p className="mb-2">Tip : 베팅은 필수가 아닙니다. 칩을 아껴 후반을 노리는 것도 좋겠죠!</p>
        <Image src="/images/rule/horse/bettingTab.avif" alt="베팅탭 이미지" layout="responsive" width={540} height={230} quality={90} className="mx-auto rounded-lg shadow-md" />
    </div>
  );
}
