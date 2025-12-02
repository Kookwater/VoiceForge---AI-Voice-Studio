import React, { useState } from 'react';
import { VoiceConfig, ClonedVoice } from '../types';
import { Settings2, Activity, User, Save, Plus, Trash2, Pencil, Check, X } from 'lucide-react';

interface VoiceControlsProps {
  config: VoiceConfig;
  onChange: (config: VoiceConfig) => void;
  disabled: boolean;
  onApply: () => void;
  clonedVoices: ClonedVoice[];
  onAddClone: () => void;
  onDeleteClone: (id: string) => void;
  onRenameClone: (id: string, newName: string) => void;
}

const VOICE_NAMES = ['Kore', 'Fenrir', 'Puck', 'Charon', 'Zephyr'];
const TONES = ['Cheerful', 'Professional', 'Calm', 'Authoritative', 'Whispery', 'Energetic'];

const VoiceControls: React.FC<VoiceControlsProps> = ({ 
  config, 
  onChange, 
  disabled, 
  onApply,
  clonedVoices,
  onAddClone,
  onDeleteClone,
  onRenameClone
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  
  const handleChange = (key: keyof VoiceConfig, value: any) => {
    onChange({ ...config, [key]: value });
  };

  const handleVoiceSelect = (voiceName: string) => {
    onChange({
       ...config,
       voiceName: voiceName,
       activeClonedVoiceId: null // Reset clone when picking standard
    });
  };

  const handleCloneSelect = (clone: ClonedVoice) => {
    if (editingId) return; // Prevent selection while editing
    onChange({
       ...config,
       voiceName: clone.baseVoice, // Use the base voice derived from clone
       activeClonedVoiceId: clone.id
    });
  };

  const startEditing = (e: React.MouseEvent, clone: ClonedVoice) => {
    e.stopPropagation();
    setEditingId(clone.id);
    setEditName(clone.name);
  };

  const saveEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (editingId && editName.trim()) {
      onRenameClone(editingId, editName.trim());
      setEditingId(null);
    }
  };

  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 flex flex-col gap-6">
      <div className="flex items-center gap-2 border-b border-slate-700 pb-4">
        <Settings2 className="w-5 h-5 text-indigo-400" />
        <h2 className="text-lg font-semibold text-white">Voice Designer</h2>
      </div>

      {/* Voice Selection Tabs */}
      <div className="space-y-4">
        <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
          <User className="w-4 h-4" /> Voice Model
        </label>
        
        {/* Presets */}
        <div className="space-y-2">
           <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Standard Voices</span>
           <div className="grid grid-cols-3 gap-2">
            {VOICE_NAMES.map(name => (
              <button
                key={name}
                onClick={() => handleVoiceSelect(name)}
                disabled={disabled}
                className={`px-3 py-2 rounded-lg text-sm transition-all ${
                  config.voiceName === name && !config.activeClonedVoiceId
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {name}
              </button>
            ))}
           </div>
        </div>

        {/* Cloned Voices */}
        <div className="space-y-2">
           <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">My Clones</span>
              <button 
                 onClick={onAddClone}
                 className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                 <Plus className="w-3 h-3" /> New Clone
              </button>
           </div>
           
           <div className="grid grid-cols-1 gap-2">
              {clonedVoices.length === 0 ? (
                 <div onClick={onAddClone} className="border border-dashed border-slate-700 rounded-lg p-3 text-center cursor-pointer hover:bg-slate-800/50 transition-colors">
                    <p className="text-xs text-slate-500">No cloned voices yet. Tap to create one.</p>
                 </div>
              ) : (
                 clonedVoices.map(clone => (
                    <div 
                      key={clone.id}
                      onClick={() => handleCloneSelect(clone)}
                      className={`group flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all cursor-pointer ${
                         config.activeClonedVoiceId === clone.id
                         ? 'bg-indigo-500/20 border-indigo-500/50 text-white'
                         : 'bg-slate-700/50 border-transparent text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                       {editingId === clone.id ? (
                         <div className="flex items-center gap-2 w-full" onClick={e => e.stopPropagation()}>
                           <input 
                             type="text" 
                             value={editName}
                             onChange={(e) => setEditName(e.target.value)}
                             className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
                             autoFocus
                           />
                           <button onClick={saveEdit} className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded">
                             <Check className="w-4 h-4" />
                           </button>
                           <button onClick={cancelEdit} className="p-1 text-slate-400 hover:bg-slate-600 rounded">
                             <X className="w-4 h-4" />
                           </button>
                         </div>
                       ) : (
                         <>
                           <div className="flex flex-col items-start overflow-hidden">
                              <span className="text-sm font-medium truncate max-w-[150px]">{clone.name}</span>
                              <span className="text-[10px] text-slate-400">{clone.tags.slice(0, 2).join(', ')}</span>
                           </div>
                           
                           <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button 
                                onClick={(e) => startEditing(e, clone)}
                                className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded transition-colors"
                             >
                                <Pencil className="w-4 h-4" />
                             </button>
                             <button 
                                onClick={(e) => { e.stopPropagation(); onDeleteClone(clone.id); }}
                                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                             >
                                <Trash2 className="w-4 h-4" />
                             </button>
                           </div>
                         </>
                       )}
                    </div>
                 ))
              )}
           </div>
        </div>
      </div>

      {/* Tone Selection */}
      <div className="space-y-3">
         <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <Activity className="w-4 h-4" /> Emotional Tone
         </label>
         <select 
            value={config.tone}
            onChange={(e) => handleChange('tone', e.target.value)}
            disabled={disabled}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none disabled:opacity-50"
         >
            {TONES.map(t => <option key={t} value={t}>{t}</option>)}
         </select>
      </div>

      {/* Speed Slider */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
           <label className="text-sm font-medium text-slate-300">Speech Rate</label>
           <span className="text-xs text-indigo-400 font-mono bg-indigo-500/10 px-2 py-1 rounded">
             {config.speed.toFixed(1)}x
           </span>
        </div>
        <input 
          type="range" 
          min="0.5" 
          max="2.0" 
          step="0.1" 
          value={config.speed} 
          onChange={(e) => handleChange('speed', parseFloat(e.target.value))}
          disabled={disabled}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
        <div className="flex justify-between text-xs text-slate-500 font-medium">
          <span>Slow</span>
          <span>Normal</span>
          <span>Fast</span>
        </div>
      </div>

      {disabled && (
        <button 
           onClick={onApply}
           className="mt-4 w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm transition-colors"
        >
           <Save className="w-4 h-4" /> Apply Changes Live
        </button>
      )}

    </div>
  );
};

export default VoiceControls;