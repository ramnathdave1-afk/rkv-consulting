import { NextRequest, NextResponse } from 'next/server';
import { captureException, captureMessage } from '@/lib/monitoring/sentry';
import { getUserOrg } from '@/lib/auth/get-user-org';
import { requireFeature } from '@/lib/billing/gate';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';

export async function GET(request: NextRequest) {
  const { user, orgId } = await getUserOrg();
  if (!user || !orgId) return new NextResponse('Unauthorized', { status: 401 });

  const gate = await requireFeature(orgId, 'voice_ai');
  if (!gate.allowed) return gate.response;

  const text = request.nextUrl.searchParams.get('text');
  if (!text) return new NextResponse('Missing text param', { status: 400 });
  if (!ELEVENLABS_API_KEY) return new NextResponse('ElevenLabs not configured', { status: 500 });

  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.3,
          use_speaker_boost: true,
        },
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      captureMessage('TTS ElevenLabs error', 'error', { status: res.status, errorText });
      return new NextResponse('TTS failed', { status: 500 });
    }

    const audioBuffer = await res.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err) {
    captureException(err, { route: 'voice/tts' });
    return new NextResponse('TTS error', { status: 500 });
  }
}
