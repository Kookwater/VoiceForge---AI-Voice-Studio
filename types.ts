export interface ClonedVoice {
  id: string;
  name: string;
  baseVoice: string;
  styleInstruction: string;
  tags: string[];
}

export interface VoiceConfig {
  voiceName: string;
  speed: number; // 0.5 to 2.0
  pitch: number; // -10 to 10 (Abstracted concept for prompt)
  tone: string; // "Cheerful", "Serious", "Calm", etc.
  systemInstruction: string;
  activeClonedVoiceId?: string | null;
}

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export interface AudioFrequencyData {
  values: Uint8Array;
}