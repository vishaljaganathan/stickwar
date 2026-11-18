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
        return '2P Local';
      case 'ai':
        return 'vs AI';
      case 'online_p2p':
        return roomCode || 'P2P';
      case 'online_firebase':
        return roomCode || 'Firebase';
      default:
        return 'Match';
    }
  };

  return (
    <header className="w-full max-w-4xl mx-auto px-1 pt-0.5 shrink-0 select-none">
      <div className="flex items-center justify-between gap-1 bg-[#fdfbf7] border-2 border-gray-800 rounded-xl px-2 py-1 shadow-[2px_2px_0px_#1e293b]">
        {/* Brand */}
        <div className="flex items-center gap-1 min-w-0 shrink-0">
          <span className="text-base sm:text-lg">✏️</span>
          <h1
            className="font-extrabold text-sm sm:text-lg tracking-wide text-gray-900 leading-none truncate"
            style={{ fontFamily: "'Architects Daughter', cursive" }}
          >
            STICKMAN WAR
          </h1>
        </div>

        {/* Action Controls - One clean compact row */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Quick Match Button */}
          <button
            onClick={onOpenCreateRoom}
            className="px-1.5 sm:px-2 py-0.5 bg-emerald-500 hover:bg-emerald-400 text-white border border-gray-900 rounded-md text-[10px] sm:text-xs font-hand font-bold shadow-xs active:scale-95 flex items-center gap-0.5"
            title="Create or Join Room Match"
          >
            <span>⚔️</span>
            <span className="hidden xs:inline sm:inline">Room</span>
          </button>

          {/* Mode Pill */}
          <button
            onClick={onOpenModes}
            className="px-1.5 sm:px-2 py-0.5 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-md text-[10px] sm:text-xs font-hand font-bold text-amber-900 shadow-xs active:scale-95 flex items-center gap-0.5"
            title="Switch Game Mode"
          >
            <span>🎮</span>
            <span className="truncate max-w-[60px] sm:max-w-none">{getModeLabel()}</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleAudio}
            className="p-1 bg-white hover:bg-gray-100 border border-gray-700 rounded-md text-xs shadow-xs active:scale-95"
            title={isAudioEnabled ? 'Mute Sound' : 'Unmute Sound'}
          >
            {isAudioEnabled ? '🔊' : '🔇'}
          </button>

          {/* Rules */}
          <button
            onClick={onOpenRules}
            className="p-1 sm:px-1.5 py-0.5 bg-white hover:bg-gray-100 border border-gray-700 rounded-md text-xs font-hand font-bold text-gray-800 shadow-xs active:scale-95"
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
            className="p-1 sm:px-1.5 py-0.5 bg-rose-500 hover:bg-rose-600 text-white border border-gray-900 rounded-md text-xs font-hand font-bold shadow-xs active:scale-95"
            title="Reset Match"
          >
            🔄
          </button>
        </div>
      </div>
    </header>
  );
};
