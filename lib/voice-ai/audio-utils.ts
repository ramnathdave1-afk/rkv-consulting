/**
 * Audio Conversion Utilities for Voice AI Pipeline
 *
 * Handles conversion between:
 * - ElevenLabs PCM 16-bit 16kHz output -> mulaw 8kHz for Twilio
 * - Twilio mulaw 8kHz -> raw PCM for Deepgram
 * - Base64 encoding/decoding for Twilio Media Streams
 *
 * Pure JS implementation — no ffmpeg dependency.
 */

// mulaw encoding/decoding tables
const MULAW_MAX = 0x1fff;
const MULAW_BIAS = 33;

/**
 * Encode a 16-bit linear PCM sample to 8-bit mu-law.
 */
function linearToMulaw(sample: number): number {
  const sign = sample < 0 ? 0x80 : 0;
  if (sample < 0) sample = -sample;

  sample = Math.min(sample, MULAW_MAX);
  sample += MULAW_BIAS;

  let exponent = 7;
  let mask = 0x4000;
  while (exponent > 0 && (sample & mask) === 0) {
    exponent--;
    mask >>= 1;
  }

  const mantissa = (sample >> (exponent + 3)) & 0x0f;
  const mulawByte = ~(sign | (exponent << 4) | mantissa) & 0xff;
  return mulawByte;
}

/**
 * Decode an 8-bit mu-law sample to 16-bit linear PCM.
 */
function mulawToLinear(mulawByte: number): number {
  mulawByte = ~mulawByte & 0xff;
  const sign = mulawByte & 0x80;
  const exponent = (mulawByte >> 4) & 0x07;
  const mantissa = mulawByte & 0x0f;

  let sample = ((mantissa << 3) + MULAW_BIAS) << exponent;
  sample -= MULAW_BIAS;

  return sign ? -sample : sample;
}

/**
 * Downsample PCM 16-bit from sourceRate to targetRate using linear interpolation.
 */
function downsample(
  input: Int16Array,
  sourceRate: number,
  targetRate: number,
): Int16Array {
  if (sourceRate === targetRate) return input;

  const ratio = sourceRate / targetRate;
  const outputLength = Math.floor(input.length / ratio);
  const output = new Int16Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio;
    const srcFloor = Math.floor(srcIndex);
    const srcCeil = Math.min(srcFloor + 1, input.length - 1);
    const frac = srcIndex - srcFloor;
    output[i] = Math.round(input[srcFloor] * (1 - frac) + input[srcCeil] * frac);
  }

  return output;
}

/**
 * Convert PCM 16-bit signed LE buffer (from ElevenLabs at any sample rate)
 * to mu-law 8kHz buffer for Twilio Media Streams.
 */
export function pcmToMulaw(pcmBuffer: Buffer, sourceSampleRate = 16000): Buffer {
  // Parse PCM 16-bit LE into Int16Array
  const sampleCount = pcmBuffer.length / 2;
  const samples = new Int16Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    samples[i] = pcmBuffer.readInt16LE(i * 2);
  }

  // Downsample to 8000 Hz
  const downsampled = downsample(samples, sourceSampleRate, 8000);

  // Encode each sample to mu-law
  const mulaw = Buffer.alloc(downsampled.length);
  for (let i = 0; i < downsampled.length; i++) {
    mulaw[i] = linearToMulaw(downsampled[i]);
  }

  return mulaw;
}

/**
 * Convert mu-law 8kHz buffer (from Twilio) to PCM 16-bit signed LE buffer.
 * Useful if Deepgram needs linear PCM instead of mu-law.
 */
export function mulawToPcm(mulawBuffer: Buffer): Buffer {
  const pcm = Buffer.alloc(mulawBuffer.length * 2);
  for (let i = 0; i < mulawBuffer.length; i++) {
    const sample = mulawToLinear(mulawBuffer[i]);
    pcm.writeInt16LE(sample, i * 2);
  }
  return pcm;
}

/**
 * Encode a buffer as base64 string for Twilio Media Stream.
 */
export function mulawToBase64(buffer: Buffer): string {
  return buffer.toString('base64');
}

/**
 * Decode a base64 string from Twilio Media Stream back to a buffer.
 */
export function base64ToMulaw(base64: string): Buffer {
  return Buffer.from(base64, 'base64');
}

/**
 * Split a mu-law buffer into chunks suitable for Twilio Media Stream messages.
 * Twilio expects audio in ~20ms frames. At 8000 Hz mu-law, 20ms = 160 bytes.
 */
export function splitIntoFrames(
  mulawBuffer: Buffer,
  frameSizeBytes = 160,
): Buffer[] {
  const frames: Buffer[] = [];
  for (let offset = 0; offset < mulawBuffer.length; offset += frameSizeBytes) {
    const end = Math.min(offset + frameSizeBytes, mulawBuffer.length);
    frames.push(mulawBuffer.subarray(offset, end));
  }
  return frames;
}
