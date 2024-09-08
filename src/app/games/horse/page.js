'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Header from '@/components/header/Header';

export default function GameRulePage() {
  const [activeTab, setActiveTab] = useState('overview');
  const { data: session, status } = useSession();

  const tabs = [
    { key: 'overview',  label: '게임 개요' },
    { key: 'statusInfo',label: '역할 분배' },
    { key: 'betting',   label: '베팅탭 설명' },
    { key: 'vote',      label: '예측탭 설명' },
    { key: 'chips',     label: '칩 개수 탭 설명' },
    { key: 'horses',    label: '경주마 탭 설명' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="text-center p-4">
            <h2 className="text-2xl font-bold mb-4 yeogieottae-font">경마게임이란?</h2>
            <p className="mb-2">경마게임은 오프라인에서 대화를 통해 진행되며, 액션 및 정보 확인은 웹에서 지원되는 하이브리드 게임입니다.</p>
            <p className="mb-2">게임은 2명이 1마리의 경주마를 맡아 팀전으로 진행되며 팀원은 공개되지않고 대화를 통해 찾아야합니다.</p>
            <p className="mb-2">🤫홀수인원으로 게임을 진행할 경우 발생하는 '솔로 플레이어'는 혼자만 알 수 있는 비밀 혜택이 있습니다.🤫</p>
            <p className="mb-2">최초로 결승선을 통과하는 말이 나오면 그 즉시 게임이 종료되며, </p>
            <p className="mb-2">통과한 말들은 꼴등이 되고 그 당시에 결승선에 가장 가까운 말을 맡은 팀이 1등이 됩니다.</p>
            <p className="mb-2 text-red-500">웹 화면을 직접적으로 다른사람에게 보여주는건 '규칙위반' 입니다.</p>
            <img src="/rule/horse/horsesTab.png"  alt="경주마 게임 이미지" className="mx-auto rounded-lg shadow-md"/>
            <img src="/rule/horse/myHorseWin.png" alt="게임종료 후 승리 이미지" className="mx-auto rounded-lg shadow-md mt-5"/>
          </div>
        );
    case 'statusInfo':
        return (
          <div className="text-center p-4">
            <h2 className="text-2xl font-bold mb-4 yeogieottae-font">내 상태 보기란?</h2>
            <p className="mb-2">플레이할 인원이 모두 게임방에 들어오면 방장이 '역할 분배'를 클릭할거에요.</p>
            <p className="mb-2">그러면 '익명이름', '내 경주마', '남은 칩 개수'가 초기화됩니다.</p>
            <p className="mb-2">'익명이름'은 '칩 개수'탭에서 표기될 나의 익명이름입니다.</p>
            <p className="mb-2">'내 경주마'는 팀원을 찾고 힘을 합쳐 2등의 위치를 사수해야합니다.</p>
            <p className="mb-2">2명당 1팀이기때문에 전체인원수/2 만큼의 '경주마'가 존재합니다.</p>
            <p className="mb-2">'남은 칩 개수'는 '베팅'탭에 사용되며 '예측'탭을 통해 다시 증가할 수 있습니다.</p>
            <img src="/rule/horse/statusInfo.png" alt="내 상태 보기" className="mx-auto rounded-lg shadow-md"/>
          </div>
        );
      case 'betting':
        return (
          <div className="text-center p-4">
            <h2 className="text-2xl font-bold mb-4 yeogieottae-font">베팅탭 설명</h2>
            <p className="mb-2">각 라운드마다 플레이어는 경주마에 칩을 베팅합니다.</p>
            <p className="mb-2">라운드 종료시마다 최다득표 말은 2칸, 차다득표 말은 1칸 전진합니다. (동률은 함께 전진)</p>
            <p className="mb-2">하단에 라운드마다 내가 베팅했던 내역을 확인할 수 있습니다.</p>
            <p className="mb-2">Tip : 베팅은 필수가 아닙니다. 칩을 아껴 후반을 노리는 것도 좋겠죠!</p>
            <img src="/rule/horse/bettingTab.png" alt="베팅탭 이미지" className="mx-auto rounded-lg shadow-md"/>
          </div>
        );
      case 'vote':
        return (
          <div className="text-center p-4">
            <h2 className="text-2xl font-bold mb-4 yeogieottae-font">예측탭 설명</h2>
            <p className="mb-2">각 라운드마다 플레이어는 최다득표 경주마를 예측합니다.</p>
            <p className="mb-2">예측에 성공할 경우 칩 2개를 획득합니다.</p>
            <p className="mb-2">하단에 라운드마다 내가 예측했던 내역을 확인할 수 있습니다.</p>
            <p className="mb-2">(예측에 성공한 경우 초록색으로 표기돼요)</p>
            <p className="mb-2">Tip : 예측탭에는 라운드마다 반드시 투표하는게 좋아요!</p>
            <img src="/rule/horse/voteTab.png" alt="예측탭 이미지" className="mx-auto rounded-lg shadow-md"/>
          </div>
        );
      case 'chips':
        return (
          <div className="text-center p-4">
            <h2 className="text-2xl font-bold mb-4 yeogieottae-font">칩 개수 탭 설명</h2>
            <p className="mb-2">어떤 플레이어가 몇 개의 칩이 남았는지는 알 수 없습니다.</p>
            <p className="mb-2">다만 각 플레이어들의 '익명이름'을 통해 남은 칩 개수를 확인할 수 있습니다.</p>
            <p className="mb-2">본인의 '익명이름'은 '내 상태 보기'를 통해 확인할 수 있습니다.</p>
            <p className="mb-2">각 플레이어의 남은 칩개수는 '라운드 종료'시 업데이트됩니다.</p>
            <img src="/rule/horse/chips.png" alt="칩 개수 탭 이미지" className="mx-auto rounded-lg shadow-md"/>
            <img src="/rule/horse/statusInfo.png" alt="내 상태 보기" className="mx-auto rounded-lg shadow-md mt-5"/>
          </div>
        );
      case 'horses':
        return (
          <div className="text-center p-4">
            <h2 className="text-2xl font-bold mb-4 yeogieottae-font">경주마 탭 설명</h2>
            <p className="mb-2">각 경주마의 위치를 볼 수 있습니다.</p>
            <p className="mb-2">경주마가 1마리라도 결승선(현재는 아래에 '결승선'으로 표기됨)을 통과하면 그 즉시 게임이 종료됩니다.</p>
            <p className="mb-2">종료 시점에 결승선을 통과하지 않은 말(A, C)중 결승선에 가장 가까운 말(C)이 우승자가 됩니다.</p>
            <p className="mb-2">'내 경주마'는 '내 상태 보기'를 통해 확인할 수 있습니다.</p>
            <p className="mb-2">각 플레이어의 경주마 위치는 '라운드 종료'시 업데이트됩니다.</p>
            <img src="/rule/horse/horsesTab.png" alt="경주마 탭 이미지" className="mx-auto rounded-lg shadow-md"/>
            <img src="/rule/horse/statusInfo.png" alt="내 상태 보기" className="mx-auto rounded-lg shadow-md mt-5"/>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
        <Header session={session} />
        <div className="p-8 bg-gradient-to-br from-blue-100 to-purple-200 min-h-screen">
        <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 yeogieottae-font">🏇 경마게임 룰 설명 🏇</h1>
            <p className="text-xl">경마게임의 모든 규칙을 쉽게 이해하세요!</p>
        </div>

        <div className="flex justify-center space-x-4 mb-8">
            {tabs.map((tab) => (
            <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-white font-semibold ${
                activeTab === tab.key ? 'bg-blue-500' : 'bg-gray-400 hover:bg-blue-400'
                }`}
            >
                {tab.label}
            </button>
            ))}
        </div>

        <div>{renderTabContent()}</div>
        </div>
    </>
  );
}
