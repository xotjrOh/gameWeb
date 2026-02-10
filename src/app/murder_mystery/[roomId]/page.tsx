import MurderMysteryGameScreen from '@/components/murderMystery/MurderMysteryGameScreen';

interface MurderMysteryPlayerPageProps {
  params: {
    roomId: string;
  };
}

export default function MurderMysteryPlayerPage({
  params,
}: MurderMysteryPlayerPageProps) {
  return <MurderMysteryGameScreen roomId={params.roomId} isHostView={false} />;
}
