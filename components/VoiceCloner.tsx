import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Wand2, X } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { ClonedVoice } from '../types';
import { blobToBase64 } from '../utils/audio';

interface VoiceClonerProps {
  onCloneCreated: (voice: ClonedVoice) => void;
  onCancel: () => void;
}

const VoiceCloner: React.FC<VoiceClonerProps> = ({ onCloneCreated, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number>();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const analyzeAndClone = async () => {
    if (!audioBlob) return;
    
    try {
      setIsAnalyzing(true);
      const base64Audio = await blobToBase64(audioBlob);
      
      const apiKey = process.env.API_KEY;
      if (!apiKey) throw new Error("No API Key");
      
      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `
        Listen to this voice sample. I want to create a "Voice Clone" profile for a TTS system.
        
        1. Identify the closest match among these base voices:
           - 'Kore' (Female, calm, soothing)
           - 'Fenrir' (Male, deep, resonant)
           - 'Puck' (Male, playful, higher pitch)
           - 'Charon' (Male, authoritative, serious)
           - 'Zephyr' (Female, gentle, airy)
           
        2. Analyze the speaker's specific style, pacing, emotional tone, and prosody.
        
        3. Create a JSON response with:
           - 'name': A creative name for this voice (e.g. "Energetic Storyteller").
           - 'baseVoice': The voiceName from the list above.
           - 'styleInstruction': A detailed instruction string for the AI to mimic this person's speaking style (e.g. "Speak with a rapid, enthusiastic pace, using colloquialisms and varying pitch frequently.").
           - 'tags': Array of 3 descriptive words (e.g. "Fast", "Male", "Cheerful").
           
        Return ONLY valid JSON.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            { inlineData: { mimeType: 'audio/webm', data: base64Audio } },
            { text: prompt }
          ]
        },
        config: {
          responseMimeType: 'application/json'
        }
      });

      const result = JSON.parse(response.text || '{}');
      
      const newVoice: ClonedVoice = {
        id: crypto.randomUUID(),
        name: result.name || "Custom Voice",
        baseVoice: result.baseVoice || "Kore",
        styleInstruction: result.styleInstruction || "Speak naturally.",
        tags: result.tags || ["Custom"]
      };

      onCloneCreated(newVoice);

    } catch (error) {
      console.error("Analysis failed", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <button onClick={onCancel} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center gap-6">
          <div className="text-center">
             <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Wand2 className="w-6 h-6 text-indigo-400" />
             </div>
             <h2 className="text-xl font-bold text-white mb-2">Clone Your Voice</h2>
             <p className="text-slate-400 text-sm">
               Record a 5-10 second sample. We'll analyze your tone and style to create a custom voice profile.
             </p>
          </div>

          <div className="w-full h-32 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700 relative overflow-hidden">
             {isRecording && (
                <div className="absolute inset-0 flex items-center justify-center">
                   <div className="w-24 h-24 bg-red-500/20 rounded-full animate-ping absolute" />
                   <div className="w-16 h-16 bg-red-500/40 rounded-full animate-pulse absolute" />
                </div>
             )}
             
             {audioBlob && !isRecording && (
                <div className="text-emerald-400 font-medium flex items-center gap-2">
                   <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                   Recording captured
                </div>
             )}
             
             {!audioBlob && !isRecording && (
                <div className="text-slate-500 text-sm">Ready to record...</div>
             )}
             
             {isAnalyzing && (
                 <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center z-10">
                    <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-2" />
                    <span className="text-xs text-indigo-300">Analyzing voice biometrics...</span>
                 </div>
             )}
          </div>

          <div className="text-4xl font-mono font-light text-slate-200">
             00:0{recordingTime}
          </div>

          <div className="flex gap-4 w-full">
            {!isRecording && !audioBlob && (
               <button 
                  onClick={startRecording}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
               >
                  <Mic className="w-5 h-5" /> Start Recording
               </button>
            )}

            {isRecording && (
               <button 
                  onClick={stopRecording}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
               >
                  <Square className="w-5 h-5 fill-current" /> Stop
               </button>
            )}

            {audioBlob && !isRecording && !isAnalyzing && (
               <>
                 <button 
                    onClick={() => { setAudioBlob(null); setRecordingTime(0); }}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl font-medium transition-colors"
                 >
                    Retry
                 </button>
                 <button 
                    onClick={analyzeAndClone}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                 >
                    <Wand2 className="w-5 h-5" /> Clone Voice
                 </button>
               </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceCloner;