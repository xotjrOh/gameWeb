import { NextResponse } from 'next/server';
import { getMurderMysteryScenarioCatalog } from '@/pages/api/socket/services/murderMysteryScenarioService';

export async function GET() {
  try {
    const scenarios = getMurderMysteryScenarioCatalog();
    return NextResponse.json({ scenarios });
  } catch (error) {
    return NextResponse.json(
      { scenarios: [], message: (error as Error).message },
      { status: 500 }
    );
  }
}
