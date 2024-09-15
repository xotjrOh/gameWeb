import Image from 'next/image';

export default function ChipsTab() {
  return (
    <div className="text-center p-4">
        <h2 className="text-xl md:text-2xl font-bold mb-4 yeogieottae-font">칩 개수 탭 설명</h2>
        <p className="mb-2 text-xs md:text-base">어떤 플레이어가 몇 개의 칩이 남았는지는 알 수 없습니다.</p>
        <p className="mb-2 text-xs md:text-base">다만 각 플레이어들의 &apos;익명이름&apos;을 통해 남은 칩 개수를 확인할 수 있습니다.</p>
        <p className="mb-2 text-xs md:text-base">본인의 &apos;익명이름&apos;은 &apos;내 상태 보기&apos;를 통해 확인할 수 있습니다.</p>
        <p className="mb-2 text-xs md:text-base">각 플레이어의 남은 칩개수는 &apos;라운드 종료&apos;시 업데이트됩니다.</p>
        <Image src="/images/rule/horse/chips.avif" alt="칩 개수 탭 이미지" layout="responsive" width={540} height={230} quality={90} className="mx-auto rounded-lg shadow-md" />
        <Image src="/images/rule/horse/statusInfo.avif" alt="내 상태 보기" layout="responsive" width={540} height={230} quality={90} className="mx-auto rounded-lg shadow-md mt-5" />
    </div>
  );
}
