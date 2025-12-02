import React, { useState, useEffect } from 'react';
import { useGeminiLive } from './hooks/useGeminiLive';
import VoiceControls from './components/VoiceControls';
import AudioVisualizer from './components/AudioVisualizer';
import VoiceCloner from './components/VoiceCloner';
import { VoiceConfig, ConnectionState, ClonedVoice } from './types';
import { Mic, MicOff, AlertCircle, Waves, Power, Loader2, Sparkles } from 'lucide-react';

const INITIAL_CONFIG: VoiceConfig = {
  voiceName: 'Kore',
  speed: 1.0,
  pitch: 0,
  tone: 'Professional',
  systemInstruction: "You are an advanced voice AI. Respond succinctly.",
};

function App() {
  const [config, setConfig] = useState<VoiceConfig>(INITIAL_CONFIG);
  const [showCloner, setShowCloner] = useState(false);

  // Initialize clones from Local Storage
  const [clonedVoices, setClonedVoices] = useState<ClonedVoice[]>(() => {
    try {
      const saved = localStorage.getItem('voiceforge_clones');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load voices", e);
      return [];
    }
  });

  // Save clones to Local Storage whenever they change
  useEffect(() => {
    localStorage.setItem('voiceforge_clones', JSON.stringify(clonedVoices));
  }, [clonedVoices]);

  // Get current active clone style if applicable
  const activeClone = clonedVoices.find(v => v.id === config.activeClonedVoiceId);

  const { connectionState, connect, disconnect, volume, error, analyser, updateVoiceParams } = useGeminiLive(config, activeClone?.styleInstruction);
  const [isMicOn, setIsMicOn] = useState(true);

  // Toggle Connection
  const handleToggleConnect = () => {
    if (connectionState === ConnectionState.CONNECTED || connectionState === ConnectionState.CONNECTING) {
      disconnect();
    } else {
      connect();
    }
  };

  const handleApplySettings = () => {
     updateVoiceParams(config, activeClone?.styleInstruction);
  };

  const handleCloneCreated = (voice: ClonedVoice) => {
    setClonedVoices(prev => [...prev, voice]);
    setShowCloner(false);
    // Auto-select the new voice
    setConfig(prev => ({
       ...prev,
       voiceName: voice.baseVoice,
       activeClonedVoiceId: voice.id
    }));
  };

  const handleRenameClone = (id: string, newName: string) => {
    setClonedVoices(prev => prev.map(v => 
      v.id === id ? { ...v, name: newName } : v
    ));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 flex flex-col items-center font-sans">
      
      {showCloner && (
         <VoiceCloner 
            onCloneCreated={handleCloneCreated}
            onCancel={() => setShowCloner(false)}
         />
      )}

      {/* Header */}
      <header className="w-full max-w-6xl flex justify-between items-center mb-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Waves className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">VoiceForge</h1>
            <p className="text-slate-400 text-sm">Gemini Live Audio + Voice Cloning</p>
          </div>
        </div>
        
        <div className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-2 ${
            connectionState === ConnectionState.CONNECTED ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
            connectionState === ConnectionState.CONNECTING ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
            'bg-slate-800 text-slate-400 border border-slate-700'
        }`}>
            <span className={`w-2 h-2 rounded-full ${
                connectionState === ConnectionState.CONNECTED ? 'bg-emerald-400 animate-pulse' :
                connectionState === ConnectionState.CONNECTING ? 'bg-amber-400 animate-pulse' :
                'bg-slate-500'
            }`} />
            {connectionState}
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Voice Controls */}
        <div className="lg:col-span-4 space-y-6">
          <VoiceControls 
            config={config} 
            onChange={setConfig} 
            disabled={connectionState === ConnectionState.CONNECTING}
            onApply={handleApplySettings}
            clonedVoices={clonedVoices}
            onAddClone={() => setShowCloner(true)}
            onDeleteClone={(id) => {
              setClonedVoices(prev => prev.filter(v => v.id !== id));
              if (config.activeClonedVoiceId === id) {
                 setConfig(prev => ({ ...prev, activeClonedVoiceId: null, voiceName: 'Kore' }));
              }
            }}
            onRenameClone={handleRenameClone}
          />
          
          <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800">
             <h3 className="text-slate-400 text-sm font-medium mb-2 uppercase tracking-wide">About Voice Cloning</h3>
             <p className="text-slate-300 text-sm leading-relaxed">
               Clone your voice to create a custom speaking style. The AI analyzes your tone and pacing, then applies it to the closest matching high-quality base voice.
             </p>
          </div>
        </div>

        {/* Right Column: Visualizer & Actions */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Visualizer Area */}
          <div className="flex-1 bg-slate-900 rounded-3xl border border-slate-800 p-8 relative min-h-[400px] flex flex-col justify-between overflow-hidden group">
            
            {/* Background Gradient */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
            
            <div className="relative z-10 flex justify-between items-start">
               <div>
                  <h2 className="text-3xl font-light text-white mb-1">
                    {connectionState === ConnectionState.CONNECTED ? 'Listening...' : 'Ready to Connect'}
                  </h2>
                  <p className="text-slate-400 font-light">
                    {activeClone 
                      ? `Using cloned voice style: ${activeClone.name}`
                      : 'Speak naturally to interact with the model.'}
                  </p>
               </div>
               
               {connectionState === ConnectionState.CONNECTED && (
                 <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 text-red-400 rounded-full text-xs font-medium border border-red-500/20 animate-pulse">
                   <div className="w-1.5 h-1.5 bg-red-500 rounded-full" /> LIVE
                 </div>
               )}
            </div>

            {/* The Visualizer */}
            <div className="flex-1 flex items-center justify-center py-8">
               <div className="w-full h-48">
                  <AudioVisualizer analyser={analyser} isPlaying={connectionState === ConnectionState.CONNECTED} />
               </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="absolute bottom-24 left-8 right-8 bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-xl flex items-center gap-3">
                 <AlertCircle className="w-5 h-5 shrink-0" />
                 <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Controls Bar */}
            <div className="relative z-10 flex items-center justify-center gap-6">
               
               <button 
                  className={`p-4 rounded-full transition-all duration-300 ${
                     isMicOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}
                  onClick={() => setIsMicOn(!isMicOn)}
                  disabled={connectionState !== ConnectionState.CONNECTED}
               >
                  {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
               </button>

               <button
                  onClick={handleToggleConnect}
                  disabled={connectionState === ConnectionState.CONNECTING}
                  className={`
                    h-16 px-8 rounded-full flex items-center gap-3 font-semibold text-lg transition-all duration-300 shadow-xl
                    ${connectionState === ConnectionState.CONNECTED 
                      ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20' 
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
                    }
                    disabled:opacity-70 disabled:cursor-not-allowed
                  `}
               >
                  {connectionState === ConnectionState.CONNECTING ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" /> Connecting...
                    </>
                  ) : connectionState === ConnectionState.CONNECTED ? (
                    <>
                      <Power className="w-6 h-6" /> End Session
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-6 h-6" /> Start Voice Chat
                    </>
                  )}
               </button>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}

export default App;