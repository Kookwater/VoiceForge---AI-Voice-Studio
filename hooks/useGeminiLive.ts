import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { ConnectionState, VoiceConfig } from '../types';
import { createPcmBlob, decodeAudioData, decodeBase64, PCM_SAMPLE_RATE, OUTPUT_SAMPLE_RATE } from '../utils/audio';

export const useGeminiLive = (config: VoiceConfig, clonedStyleInstruction?: string) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Refs for audio processing and connection
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const sessionRef = useRef<Promise<any> | null>(null); // Holds the session promise
  const nextStartTimeRef = useRef<number>(0);
  const scheduledSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Helper to update system instructions dynamically if needed (though best done at connection)
  const updateVoiceParams = async (newConfig: VoiceConfig, newClonedStyle?: string) => {
     if (connectionState !== ConnectionState.CONNECTED || !sessionRef.current) return;
     
     const session = await sessionRef.current;
     
     // Construct dynamic instruction
     let instruction = `[System Update] Adjust voice settings:`;
     instruction += ` Speed: ${newConfig.speed > 1.2 ? 'faster' : newConfig.speed < 0.8 ? 'slower' : 'normal'}.`;
     instruction += ` Tone: ${newConfig.tone}.`;
     if (newClonedStyle) {
        instruction += ` Style: ${newClonedStyle}`;
     }
     
     session.sendRealtimeInput({ text: instruction });
  };

  const connect = async () => {
    try {
      setConnectionState(ConnectionState.CONNECTING);
      setError(null);

      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        throw new Error("API Key not found in environment.");
      }

      const ai = new GoogleGenAI({ apiKey });
      
      // Initialize Audio Contexts
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: PCM_SAMPLE_RATE });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });
      
      // Setup Analyser for visualization
      analyserRef.current = outputAudioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      // Setup Gain node for volume control if needed
      gainNodeRef.current = outputAudioContextRef.current.createGain();
      gainNodeRef.current.connect(analyserRef.current);
      analyserRef.current.connect(outputAudioContextRef.current.destination);

      // Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Construct System Instruction based on config
      // Merging Base Config instructions + Cloned Voice Instructions
      const systemInstruction = `
        ${config.systemInstruction}
        
        You are a helpful AI voice assistant with a specific persona.
        
        VOICE SETTINGS:
        - Base Tone: ${config.tone}
        - Speed Preference: ${config.speed} (1.0 is normal, higher is faster)
        
        ${clonedStyleInstruction ? `
        CRITICAL VOICE CLONING INSTRUCTION:
        Adopt the following speaking style extracted from a user's voice sample:
        "${clonedStyleInstruction}"
        
        Mimic this style strictly in terms of pacing, vocabulary choices, and energy.
        ` : ''}
        
        Adopt this persona and voice style immediately. 
        Keep responses concise and conversational unless asked to elaborate.
      `;

      // Connect to Live API
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            console.log('Gemini Live Session Opened');
            setConnectionState(ConnectionState.CONNECTED);
            
            // Start Audio Streaming
            if (!inputAudioContextRef.current || !streamRef.current) return;
            
            const source = inputAudioContextRef.current.createMediaStreamSource(streamRef.current);
            inputSourceRef.current = source;
            
            // Use ScriptProcessor for raw PCM access (Standard for this API usage currently)
            const processor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              
              // Calculate volume for visual feedback (input)
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
              setVolume(Math.sqrt(sum / inputData.length));

              // Send to Gemini
              sessionPromise.then(session => {
                  session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(processor);
            processor.connect(inputAudioContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
             // Handle Audio Output
             const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
             if (base64Audio && outputAudioContextRef.current && gainNodeRef.current) {
                const ctx = outputAudioContextRef.current;
                
                // Decode
                const audioBuffer = await decodeAudioData(
                  decodeBase64(base64Audio),
                  ctx,
                  OUTPUT_SAMPLE_RATE,
                  1
                );

                // Schedule Playback
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(gainNodeRef.current);
                
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                
                scheduledSourcesRef.current.add(source);
                
                source.onended = () => {
                   scheduledSourcesRef.current.delete(source);
                };
             }

             // Handle Interruption
             if (message.serverContent?.interrupted) {
                console.log('Interrupted');
                scheduledSourcesRef.current.forEach(source => {
                   try { source.stop(); } catch(e) {}
                });
                scheduledSourcesRef.current.clear();
                nextStartTimeRef.current = 0;
             }
          },
          onclose: (e) => {
            console.log('Session Closed', e);
            setConnectionState(ConnectionState.DISCONNECTED);
          },
          onerror: (err) => {
            console.error('Session Error', err);
            setError(err instanceof Error ? err.message : String(err));
            setConnectionState(ConnectionState.ERROR);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: config.voiceName }
            }
          },
          systemInstruction: systemInstruction,
        }
      });
      
      sessionRef.current = sessionPromise;

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to connect");
      setConnectionState(ConnectionState.ERROR);
    }
  };

  const disconnect = async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    
    if (inputSourceRef.current) {
      inputSourceRef.current.disconnect();
      inputSourceRef.current = null;
    }

    if (inputAudioContextRef.current) {
      await inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    
    if (outputAudioContextRef.current) {
       await outputAudioContextRef.current.close();
       outputAudioContextRef.current = null;
    }

    if (sessionRef.current) {
      sessionRef.current.then((session: any) => {
          if (typeof session.close === 'function') {
            session.close();
          }
      }).catch(() => {});
    }

    setConnectionState(ConnectionState.DISCONNECTED);
    setVolume(0);
    scheduledSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  };

  useEffect(() => {
    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    connectionState,
    connect,
    disconnect,
    volume,
    error,
    updateVoiceParams,
    analyser: analyserRef.current
  };
};