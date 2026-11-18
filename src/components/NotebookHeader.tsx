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

export const NotebookHeader: React.FC<NotebookHeaderProps> = ({
  mode,
  roomCode,
  isAudioEnabled,
  onToggleAudio,
  onOpenRules,
  onOpenModes,
  onResetGame,
  onOpenCreateRoom
}) => {
  const getModeLabel = () => {
    switch (mode) {
      case 'local':
        return '2P LOCAL';
      case 'ai':
        return 'VS BOT';
      case 'online_p2p':
        return roomCode || 'P2P';
      case 'online_firebase':
        return roomCode || 'FIREBASE';
      default:
        return 'MATCH';
    }
  };

  return (
    <header className="w-full max-w-5xl mx-auto px-1 pt-0.5 shrink-0 select-none">
      <div className="flex items-center justify-between gap-1.5 bg-[#fffefb] border-2 sm:border-3 border-[#0f172a] rounded-xl px-2.5 py-1 shadow-[3px_3px_0px_#0f172a]">
        {/* Brand / Logo */}
        <div className="flex items-center gap-1.5 min-w-0 shrink-0">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-amber-400 border-2 border-[#0f172a] flex items-center justify-center font-bold text-xs sm:text-sm shadow-[1.5px_1.5px_0px_#0f172a]">
            ⚔️
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <h1
              className="font-extrabold text-xs sm:text-base tracking-wider text-[#0f172a] uppercase font-retro leading-none"
            >
              STICKMAN WAR
            </h1>
            <span className="hidden md:inline-block px-1.5 py-0.2 rounded bg-amber-300 border border-[#0f172a] text-[9px] font-mono font-bold tracking-tight shadow-xs -rotate-1">
              RETRO EDITION
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Quick Room Match Button */}
          <button
            onClick={onOpenCreateRoom}
            className="btn-retro px-2 py-0.5 bg-emerald-400 hover:bg-emerald-300 text-[#0f172a] rounded-lg text-[10px] sm:text-xs font-retro font-extrabold flex items-center gap-1"
            title="Create or Join Room Match"
          >
            <span>🌐</span>
            <span className="hidden xs:inline sm:inline">ROOM MATCH</span>
          </button>

          {/* Mode Pill */}
          <button
            onClick={onOpenModes}
            className="btn-retro px-1.5 sm:px-2 py-0.5 bg-amber-300 hover:bg-amber-200 rounded-lg text-[10px] sm:text-xs font-retro font-extrabold text-[#0f172a] flex items-center gap-0.5"
            title="Switch Game Mode"
          >
            <span>🎮</span>
            <span className="truncate max-w-[65px] sm:max-w-none">{getModeLabel()}</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleAudio}
            className="btn-retro p-1 sm:px-1.5 py-0.5 bg-white hover:bg-gray-100 rounded-lg text-xs"
            title={isAudioEnabled ? 'Mute Sound' : 'Unmute Sound'}
          >
            {isAudioEnabled ? '🔊' : '🔇'}
          </button>

          {/* Rules */}
          <button
            onClick={onOpenRules}
            className="btn-retro px-1.5 py-0.5 bg-white hover:bg-gray-100 rounded-lg text-[10px] sm:text-xs font-retro font-extrabold text-[#0f172a]"
            title="How To Play Rules"
          >
            📖
          </button>

          {/* Reset Game */}
          <button
            onClick={() => {
              if (window.confirm('Reset this match and start over?')) {
                onResetGame();
              }
            }}
            className="btn-retro px-1.5 py-0.5 bg-rose-500 hover:bg-rose-400 text-white rounded-lg text-xs"
            title="Reset Match"
          >
            🔄
          </button>
        </div>
      </div>
    </header>
  );
};
