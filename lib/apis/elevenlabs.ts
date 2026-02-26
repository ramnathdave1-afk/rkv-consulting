import axios, { AxiosError } from 'axios'

const BASE_URL = 'https://api.elevenlabs.io/v1'

// "Josh" – a professional, clear male voice well-suited for business contexts.
const DEFAULT_VOICE_ID = 'TxGEqnHWrfWFTfGW9XjX'

const elevenlabsClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    Accept: 'audio/mpeg',
    'Content-Type': 'application/json',
    'xi-api-key': process.env.ELEVENLABS_API_KEY || '',
  },
})

// ── Types ───────────────────────────────────────────────────────────────────

export interface VoiceSettings {
  stability: number
  similarity_boost: number
  style?: number
  use_speaker_boost?: boolean
}

export interface SpeechOptions {
  /** ElevenLabs voice ID. Defaults to a professional male voice. */
  voiceId?: string
  /** Model to use for generation. Defaults to multilingual v2. */
  modelId?: string
  /** Fine-tune voice characteristics. */
  voiceSettings?: VoiceSettings
}

// ── API Functions ───────────────────────────────────────────────────────────

/**
 * Generate speech audio from text using ElevenLabs Text-to-Speech.
 *
 * @param text    - The text to convert to speech.
 * @param voiceId - Optional ElevenLabs voice ID (defaults to a professional male voice).
 * @returns A Buffer containing the MP3 audio data, or null on failure.
 */
export async function generateSpeech(
  text: string,
  voiceId: string = DEFAULT_VOICE_ID
): Promise<Buffer | null> {
  try {
    const response = await elevenlabsClient.post(
      `/text-to-speech/${voiceId}`,
      {
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      },
      {
        responseType: 'arraybuffer',
      }
    )

    return Buffer.from(response.data)
  } catch (error) {
    if (error instanceof AxiosError) {
      // The arraybuffer response might contain a JSON error; try to decode it.
      let detail = error.message
      if (error.response?.data) {
        try {
          const decoded = new TextDecoder().decode(error.response.data)
          detail = decoded
        } catch {
          // Keep the original message
        }
      }
      console.error(
        `[ElevenLabs] generateSpeech failed:`,
        error.response?.status,
        detail
      )
    } else {
      console.error('[ElevenLabs] generateSpeech failed:', error)
    }
    return null
  }
}

/**
 * Generate speech with full options control.
 *
 * @param text    - The text to convert to speech.
 * @param options - Configuration for voice, model, and voice settings.
 * @returns A Buffer containing the MP3 audio data, or null on failure.
 */
export async function generateSpeechAdvanced(
  text: string,
  options: SpeechOptions = {}
): Promise<Buffer | null> {
  const {
    voiceId = DEFAULT_VOICE_ID,
    modelId = 'eleven_multilingual_v2',
    voiceSettings = {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: true,
    },
  } = options

  try {
    const response = await elevenlabsClient.post(
      `/text-to-speech/${voiceId}`,
      {
        text,
        model_id: modelId,
        voice_settings: voiceSettings,
      },
      {
        responseType: 'arraybuffer',
      }
    )

    return Buffer.from(response.data)
  } catch (error) {
    if (error instanceof AxiosError) {
      let detail = error.message
      if (error.response?.data) {
        try {
          const decoded = new TextDecoder().decode(error.response.data)
          detail = decoded
        } catch {
          // Keep the original message
        }
      }
      console.error(
        `[ElevenLabs] generateSpeechAdvanced failed:`,
        error.response?.status,
        detail
      )
    } else {
      console.error('[ElevenLabs] generateSpeechAdvanced failed:', error)
    }
    return null
  }
}
