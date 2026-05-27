import MurderMysteryPreReadClient from '@/components/murderMystery/MurderMysteryPreReadClient';
import { verifyMurderMysteryPreReadToken } from '@/lib/murderMysteryPreReadToken';
import { getMurderMysteryScenario } from '@/pages/api/socket/services/murderMysteryScenarioService';

export const dynamic = 'force-dynamic';

interface MurderMysteryPreReadPageProps {
  params: {
    token: string;
  };
}

const InvalidPreReadLink = () => (
  <main
    style={{
      minHeight: '100dvh',
      display: 'grid',
      placeItems: 'center',
      padding: 24,
      background: '#101918',
      color: '#f7f1de',
    }}
  >
    <section
      style={{
        width: '100%',
        maxWidth: 520,
        padding: 24,
        borderRadius: 16,
        background: 'rgba(247,241,222,0.08)',
        border: '1px solid rgba(247,241,222,0.18)',
      }}
    >
      <h1 style={{ margin: 0, fontSize: 28 }}>유효하지 않은 링크입니다.</h1>
      <p style={{ lineHeight: 1.7, color: '#d8d0bd' }}>
        사전 룰지 링크가 잘못되었거나 더 이상 확인할 수 없습니다. 방장에게
        카카오톡 공유 링크를 다시 요청해주세요.
      </p>
    </section>
  </main>
);

export default function MurderMysteryPreReadPage({
  params,
}: MurderMysteryPreReadPageProps) {
  const payload = verifyMurderMysteryPreReadToken(params.token);
  if (!payload) {
    return <InvalidPreReadLink />;
  }

  try {
    const scenario = getMurderMysteryScenario(payload.scenarioId);
    if (scenario.id !== payload.scenarioId) {
      return <InvalidPreReadLink />;
    }

    const role = scenario.roles.find((entry) => entry.id === payload.roleId);
    if (!role) {
      return <InvalidPreReadLink />;
    }

    return (
      <MurderMysteryPreReadClient
        token={params.token}
        scenarioTitle={scenario.title}
        roleDisplayName={role.displayName}
        rolePublicText={role.publicText}
        portraitSrc={role.portraitSrc}
        portraitAlt={role.portraitAlt}
        introText={scenario.intro.readAloud}
        secretText={role.secretText}
      />
    );
  } catch {
    return <InvalidPreReadLink />;
  }
}
