import MurderMysteryGameScreen from '@/components/murderMystery/MurderMysteryGameScreen';

interface MurderMysteryHostPageProps {
  params: {
    roomId: string;
  };
}

export default function MurderMysteryHostPage({
  params,
}: MurderMysteryHostPageProps) {
  return <MurderMysteryGameScreen roomId={params.roomId} isHostView={true} />;
}
