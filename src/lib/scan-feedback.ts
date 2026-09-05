import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useCallback, useEffect } from 'react';

type ToneSegment = { frequency: number; durationMs: number; volume?: number };

function writeAscii(bytes: number[], value: string) {
  for (let index = 0; index < value.length; index += 1) bytes.push(value.charCodeAt(index));
}

function writeUint16(bytes: number[], value: number) {
  bytes.push(value & 0xff, (value >> 8) & 0xff);
}

function writeUint32(bytes: number[], value: number) {
  bytes.push(value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >> 24) & 0xff);
}

function toneDataUri(segments: ToneSegment[]) {
  const sampleRate = 8000;
  const samples = segments.flatMap((segment) => {
    const count = Math.max(1, Math.round(sampleRate * segment.durationMs / 1000));
    const amplitude = 105 * (segment.volume ?? 1);
    return Array.from({ length: count }, (_, index) => {
      if (!segment.frequency) return 128;
      const envelope = Math.sin(Math.PI * index / Math.max(1, count - 1));
      const wave = Math.sin(2 * Math.PI * segment.frequency * index / sampleRate);
      return Math.max(0, Math.min(255, Math.round(128 + amplitude * envelope * wave)));
    });
  });
  const bytes: number[] = [];
  writeAscii(bytes, 'RIFF'); writeUint32(bytes, 36 + samples.length); writeAscii(bytes, 'WAVE');
  writeAscii(bytes, 'fmt '); writeUint32(bytes, 16); writeUint16(bytes, 1); writeUint16(bytes, 1);
  writeUint32(bytes, sampleRate); writeUint32(bytes, sampleRate); writeUint16(bytes, 1); writeUint16(bytes, 8);
  writeAscii(bytes, 'data'); writeUint32(bytes, samples.length); bytes.push(...samples);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:audio/wav;base64,${btoa(binary)}`;
}

const SUCCESS_SOUND = toneDataUri([
  { frequency: 1050, durationMs: 55, volume: 0.8 },
  { frequency: 0, durationMs: 12 },
  { frequency: 1550, durationMs: 70 },
]);

const ERROR_SOUND = toneDataUri([
  { frequency: 330, durationMs: 80, volume: 0.75 },
  { frequency: 0, durationMs: 18 },
  { frequency: 235, durationMs: 105, volume: 0.75 },
]);

export function useScanFeedback() {
  const successPlayer = useAudioPlayer(SUCCESS_SOUND, { downloadFirst: true });
  const errorPlayer = useAudioPlayer(ERROR_SOUND, { downloadFirst: true });

  useEffect(() => {
    void setAudioModeAsync({
      allowsRecording: false,
      interruptionMode: 'mixWithOthers',
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    }).catch(() => undefined);
  }, []);

  const replay = useCallback(async (player: typeof successPlayer) => {
    try {
      player.pause();
      await player.seekTo(0);
      player.volume = 0.9;
      player.play();
    } catch {
      // Scan processing must continue even if the phone cannot play audio.
    }
  }, []);

  const playScanSuccess = useCallback(() => { void replay(successPlayer); }, [replay, successPlayer]);
  const playScanError = useCallback(() => { void replay(errorPlayer); }, [errorPlayer, replay]);

  return { playScanSuccess, playScanError };
}
