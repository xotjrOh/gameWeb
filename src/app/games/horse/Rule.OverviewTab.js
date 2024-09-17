import Image from 'next/image';

export default function OverviewTab() {
  return (
    <div className="p-4 animate-fadeIn">
      <h2 className="text-2xl md:text-3xl font-bold mb-6 text-indigo-700">🎮 경마게임이란?</h2>
      <div className="max-w-screen-md mx-auto">
        <p className="mb-4 text-base md:text-lg text-gray-700">
          경마게임은 오프라인에서 대화를 통해 진행되며, 액션 및 정보 확인은 웹에서 지원되는 하이브리드 게임입니다.
        </p>
        <p className="mb-4 text-base md:text-lg text-gray-700">
          게임은 2명이 1마리의 경주마를 맡아 팀전으로 진행되며 팀원은 공개되지 않고 대화를 통해 찾아야 합니다.
        </p>
        <p className="mb-4 text-base md:text-lg text-gray-700">
          🤫 홀수 인원으로 게임을 진행할 경우 발생하는 <span className="text-indigo-600 font-semibold">‘솔로 플레이어’</span>는 혼자만 알 수 있는 비밀 혜택이 있습니다.
        </p>
        <p className="mb-4 text-base md:text-lg text-gray-700">
          최초로 결승선을 통과하는 말이 나오면 그 즉시 게임이 종료되며,
        </p>
        <p className="mb-6 text-base md:text-lg text-gray-700">
          통과한 말들은 꼴등이 되고 그 당시에 결승선에 가장 가까운 말을 맡은 팀이 1등이 됩니다.
        </p>
        <p className="mb-6 text-base md:text-lg text-red-500 font-bold">
          🚫 웹 화면을 직접적으로 다른 사람에게 보여주는 건 <span className="underline">‘규칙 위반’</span>입니다.
        </p>
        <div className="relative w-full mb-4">
          <Image
            src="/images/rule/horse/horsesTab.avif"
            alt="경주마 탭 화면"
            width={425}
            height={605}
            quality={90}
            className="rounded-lg shadow-md mx-auto"
            sizes="(max-width: 768px) 100vw, 540px"
            style={{ width: '100%', height: 'auto' }}
          />
        </div>
        <div className="relative w-full">
          <Image
            src="/images/rule/horse/myHorseWin.avif"
            alt="게임 종료 후 승리 화면"
            width={425}
            height={607}
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
