import React, { useState, useEffect } from 'react';
import { PlayerId, PlayerState } from '../types/game';
import { voiceManager, VoiceState } from '../utils/voiceChat';

interface VoiceChatBarProps {
  isOnline: boolean;
  localPlayerId: PlayerId;
  players: Record<PlayerId, PlayerState>;
}

export const VoiceChatBar: React.FC<VoiceChatBarProps> = ({
  isOnline,
  localPlayerId,
  players
}) => {
  const [voiceState, setVoiceState] = useState<VoiceState>(() => voiceManager.getState());

  useEffect(() => {
    const unsub = voiceManager.subscribe((next) => {
      setVoiceState(next);
    });
    return () => unsub();
  }, []);

  if (!isOnline || !voiceState.isSupported) {
    return null;
  }

  const handleJoin = async () => {
    const localPlayer = players[localPlayerId];
    const name = localPlayer?.name || localPlayerId.toUpperCase();
    await voiceManager.joinVoice(localPlayerId, name);
  };

  const handleToggleMute = () => {
    voiceManager.toggleMute();
  };

  const handleLeave = () => {
    voiceManager.leaveVoice();
  };

  // Find who is currently speaking among active slots
  const speakingPlayer = (['p1', 'p2', 'p3', 'p4'] as PlayerId[]).find(
    (pid) => voiceState.speakingSlots[pid]
  );
  const speakingName = speakingPlayer ? players[speakingPlayer]?.name || speakingPlayer.toUpperCase() : null;

  return (
    <div className="shrink-0 flex items-center gap-1 select-none">
      {voiceState.error && (
        <span
          className="text-[8px] sm:text-[9px] font-mono font-bold text-rose-300 bg-rose-950/80 border border-rose-700 px-2 py-0.5 rounded-lg truncate max-w-[140px] xs:max-w-[200px]"
          title={voiceState.error}
        >
          ⚠️ {voiceState.error}
        </span>
      )}

      {!voiceState.isJoined ? (
        <button
          type="button"
          onClick={handleJoin}
          disabled={voiceState.isConnecting}
          className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl border font-retro font-black text-[9px] sm:text-xs flex items-center gap-1 shadow-xs transition-all cursor-pointer ${
            voiceState.isConnecting
              ? 'bg-amber-300/80 text-slate-900 border-amber-600 animate-pulse'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-[#0f172a] hover:scale-103 active:scale-95'
          }`}
          title="Join live voice chat with players in this room"
        >
          <span className="text-xs sm:text-sm">🎙️</span>
          <span>{voiceState.isConnecting ? 'CONNECTING...' : 'JOIN VOICE'}</span>
        </button>
      ) : (
        <div className="flex items-center gap-1 bg-[#0f172a]/90 border border-slate-700/80 px-1.5 py-0.5 rounded-lg sm:rounded-xl shadow-xs backdrop-blur-xs">
          {/* Mute / Unmute Button */}
          <button
            type="button"
            onClick={handleToggleMute}
            className={`px-1.5 py-0.5 rounded-md sm:rounded-lg border font-retro font-black text-[8px] sm:text-[10px] flex items-center gap-1 transition-all cursor-pointer ${
              voiceState.isMuted
                ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-800'
                : voiceState.isSpeaking
                ? 'bg-emerald-500 text-slate-950 border-emerald-300 animate-pulse ring-2 ring-emerald-400'
                : 'bg-emerald-600/90 hover:bg-emerald-500 text-white border-emerald-400'
            }`}
            title={voiceState.isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            <span>{voiceState.isMuted ? '🔇' : '🎙️'}</span>
            <span className="hidden xs:inline">{voiceState.isMuted ? 'MUTED' : 'MIC ON'}</span>
          </button>

          {/* Speaking Indicator or Connected Count */}
          {speakingName ? (
            <span className="px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-500 text-emerald-300 font-retro font-black text-[7px] sm:text-[9px] flex items-center gap-1 animate-pulse truncate max-w-[80px] xs:max-w-[120px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span className="truncate">{speakingName} speaking...</span>
            </span>
          ) : (
            <span className="text-[7px] sm:text-[9px] font-mono font-bold text-slate-300 px-1 hidden sm:inline">
              👥 {voiceState.activePeersCount} in voice
            </span>
          )}

          {/* Leave Voice Button */}
          <button
            type="button"
            onClick={handleLeave}
            className="text-[8px] sm:text-[10px] text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 p-0.5 rounded transition-colors"
            title="Leave Voice Chat"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
