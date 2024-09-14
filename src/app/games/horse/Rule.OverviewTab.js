import Image from 'next/image';

export default function OverviewTab() {
  return (
    <div className="text-center p-4">
        <h2 className="text-2xl font-bold mb-4 yeogieottae-font">경마게임이란?</h2>
        <p className="mb-2">경마게임은 오프라인에서 대화를 통해 진행되며, 액션 및 정보 확인은 웹에서 지원되는 하이브리드 게임입니다.</p>
        <p className="mb-2">게임은 2명이 1마리의 경주마를 맡아 팀전으로 진행되며 팀원은 공개되지않고 대화를 통해 찾아야합니다.</p>
        <p className="mb-2">🤫홀수인원으로 게임을 진행할 경우 발생하는 &apos;솔로 플레이어&apos;는 혼자만 알 수 있는 비밀 혜택이 있습니다.🤫</p>
        <p className="mb-2">최초로 결승선을 통과하는 말이 나오면 그 즉시 게임이 종료되며, </p>
        <p className="mb-2">통과한 말들은 꼴등이 되고 그 당시에 결승선에 가장 가까운 말을 맡은 팀이 1등이 됩니다.</p>
        <p className="mb-2 text-red-500">웹 화면을 직접적으로 다른사람에게 보여주는건 &apos;규칙위반&apos; 입니다.</p>
        <Image src="/images/rule/horse/horsesTab.avif" alt="경주마 게임 이미지" layout="responsive" width={540} height={125} quality={90} className="mx-auto rounded-lg shadow-md" />
        <Image src="/images/rule/horse/myHorseWin.avif" alt="게임종료 후 승리 이미지" layout="responsive" width={540} height={330} quality={90} className="mx-auto rounded-lg shadow-md mt-5" />
    </div>
  );
}
