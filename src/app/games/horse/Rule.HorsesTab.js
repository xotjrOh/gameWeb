import Image from 'next/image';

export default function HorsesTab() {
  return (
    <div className="text-center p-4">
        <h2 className="text-2xl font-bold mb-4 yeogieottae-font">경주마 탭 설명</h2>
        <p className="mb-2">각 경주마의 위치를 볼 수 있습니다.</p>
        <p className="mb-2">경주마가 1마리라도 결승선(현재는 아래에 &apos;결승선&apos;으로 표기됨)을 통과하면 그 즉시 게임이 종료됩니다.</p>
        <p className="mb-2">종료 시점에 결승선을 통과하지 않은 말(A, C)중 결승선에 가장 가까운 말(C)이 우승자가 됩니다.</p>
        <p className="mb-2">&apos;내 경주마&apos;는 &apos;내 상태 보기&apos;를 통해 확인할 수 있습니다.</p>
        <p className="mb-2">각 플레이어의 경주마 위치는 &apos;라운드 종료&apos;시 업데이트됩니다.</p>
        <Image src="/images/rule/horse/horsesTab.avif" alt="경주마 탭 이미지" layout="responsive" width={540} height={230} quality={90} className="mx-auto rounded-lg shadow-md" />
        <Image src="/images/rule/horse/statusInfo.avif" alt="내 상태 보기" layout="responsive" width={540} height={230} quality={90} className="mx-auto rounded-lg shadow-md mt-5" />
    </div>
  );
}
