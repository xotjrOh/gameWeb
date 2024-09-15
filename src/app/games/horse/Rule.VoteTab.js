import Image from 'next/image';

export default function VoteTab() {
  return (
    <div className="text-center p-4">
        <h2 className="text-xl md:text-2xl font-bold mb-4 yeogieottae-font">예측탭 설명</h2>
        <p className="mb-2 text-xs md:text-base">각 라운드마다 플레이어는 최다득표 경주마를 예측합니다.</p>
        <p className="mb-2 text-xs md:text-base">예측에 성공할 경우 칩 2개를 획득합니다.</p>
        <p className="mb-2 text-xs md:text-base">하단에 라운드마다 내가 예측했던 내역을 확인할 수 있습니다.</p>
        <p className="mb-2 text-xs md:text-base">(예측에 성공한 경우 초록색으로 표기돼요)</p>
        <p className="mb-2 text-xs md:text-base">Tip : 예측탭에는 라운드마다 반드시 투표하는게 좋아요!</p>
        <Image src="/images/rule/horse/voteTab.avif" alt="예측탭 이미지" layout="responsive" width={540} height={230} quality={90} className="mx-auto rounded-lg shadow-md" />
    </div>
  );
}
