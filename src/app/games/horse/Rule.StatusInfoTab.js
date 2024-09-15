import Image from 'next/image';

export default function StatusInfoTab() {
  return (
    <div className="text-center p-4">
        <h2 className="text-xl md:text-2xl font-bold mb-4 yeogieottae-font">내 상태 보기란?</h2>
        <p className="mb-2 text-xs md:text-base">플레이할 인원이 모두 게임방에 들어오면 방장이 &apos;역할 분배&apos;를 클릭할거에요.</p>
        <p className="mb-2 text-xs md:text-base">그러면 &apos;익명이름&apos;, &apos;내 경주마&apos;, &apos;남은 칩 개수&apos;가 초기화됩니다.</p>
        <p className="mb-2 text-xs md:text-base">&apos;익명이름&apos;은 &apos;칩 개수&apos;탭에서 표기될 나의 익명이름입니다.</p>
        <p className="mb-2 text-xs md:text-base">&apos;내 경주마&apos;는 팀원을 찾고 힘을 합쳐 2등의 위치를 사수해야합니다.</p>
        <p className="mb-2 text-xs md:text-base">2명당 1팀이기때문에 전체인원수/2 만큼의 &apos;경주마&apos;가 존재합니다.</p>
        <p className="mb-2 text-xs md:text-base">&apos;남은 칩 개수&apos;는 &apos;베팅&apos;탭에 사용되며 &apos;예측&apos;탭을 통해 다시 증가할 수 있습니다.</p>
        <Image src="/images/rule/horse/statusInfo.avif" alt="내 상태 보기" layout="responsive" width={540} height={230} quality={90} className="mx-auto rounded-lg shadow-md" />
    </div>
  );
}
