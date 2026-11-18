import React from 'react';
import { GameMode } from '../types/game';

interface NotebookHeaderProps {
  mode: GameMode;
  roomCode?: string;
  isAudioEnabled: boolean;
  onToggleAudio: () => void;
  onOpenRules: () => void;
  onOpenModes: () => void;
  onResetGame: () => void;
  onOpenCreateRoom: () => void;
  onSendReaction?: (reaction: string) => void;
}

const REACTIONS = ['✏️', '💥', '💀', '🎯', '🏆', '🔥'];

export const NotebookHeader: React.FC<NotebookHeaderProps> = ({
  mode,
  roomCode,
  isAudioEnabled,
  onToggleAudio,
  onOpenRules,
  onOpenModes,
  onResetGame,
  onOpenCreateRoom,
  onSendReaction
}) => {
  const getModeLabel = () => {
    switch (mode) {
      case 'local':
        return '👥 Pass & Play';
      case 'ai':
        return '🤖 vs StickBot';
      case 'online_p2p':
        return `🌐 ${roomCode || 'P2P'}`;
      case 'online_firebase':
        return `🔥 ${roomCode || 'Firebase'}`;
      default:
        return 'Match';
    }
  };

  return (
    <header className="w-full max-w-4xl mx-auto px-1 pt-1 shrink-0 flex flex-col gap-1">
      <div className="flex items-center justify-between gap-1.5 bg-[#fdfbf7] border-2 border-gray-800 rounded-xl px-2.5 py-1 shadow-[2px_2px_0px_#1e293b]">
        {/* Brand */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-amber-400 border border-gray-800 flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
            ✏️
          </div>
          <div className="truncate">
            <h1
              className="font-extrabold text-base sm:text-lg tracking-wide text-gray-900 leading-none truncate"
              style={{ fontFamily: "'Architects Daughter', cursive" }}
            >
              STICKMAN WAR
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0 flex-wrap">
          {/* Quick Create Room Button */}
          <button
            onClick={onOpenCreateRoom}
            className="px-2 py-0.5 bg-emerald-500 hover:bg-emerald-400 text-white border border-gray-900 rounded-md text-[11px] sm:text-xs font-hand font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1"
          >
            <span>⚔️</span>
            <span>Room Match</span>
          </button>

          {/* Mode Badge */}
          <div className="px-2 py-0.5 bg-amber-100 border border-amber-300 rounded-md text-[10px] sm:text-xs font-hand font-bold text-amber-900">
            {getModeLabel()}
          </div>

          {/* Sound Toggle */}
          <button
            onClick={onToggleAudio}
            className="p-1 bg-white hover:bg-gray-100 border border-gray-700 rounded-md text-xs shadow-xs active:scale-95"
            title={isAudioEnabled ? 'Mute' : 'Unmute'}
          >
            {isAudioEnabled ? '🔊' : '🔇'}
          </button>

          {/* Rules */}
          <button
            onClick={onOpenRules}
            className="px-1.5 py-0.5 bg-white hover:bg-gray-100 border border-gray-700 rounded-md text-[11px] sm:text-xs font-hand font-bold text-gray-800 shadow-xs active:scale-95"
          >
            📖
          </button>

          {/* Modes */}
          <button
            onClick={onOpenModes}
            className="px-2 py-0.5 bg-amber-400 hover:bg-amber-300 border border-gray-900 rounded-md text-[11px] sm:text-xs font-hand font-bold text-gray-900 shadow-xs active:scale-95"
          >
            🎮 Mode
          </button>

          {/* Reset */}
          <button
            onClick={() => {
              if (window.confirm('Reset this match and start over?')) {
                onResetGame();
              }
            }}
            className="px-1.5 py-0.5 bg-rose-500 hover:bg-rose-600 text-white border border-gray-900 rounded-md text-[11px] sm:text-xs font-hand font-bold shadow-xs active:scale-95"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Tiny Reaction Bar */}
      {onSendReaction && (
        <div className="flex items-center justify-center gap-1.5 py-0.5">
          <span className="text-[10px] font-hand text-gray-500 mr-0.5 select-none">React:</span>
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onSendReaction(emoji)}
              className="text-xs sm:text-sm hover:scale-125 active:scale-90 transition-transform bg-white/70 hover:bg-amber-100 rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center border border-gray-300 shadow-xs"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </header>
  );
};
