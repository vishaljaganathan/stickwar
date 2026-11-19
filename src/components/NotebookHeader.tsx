import React from 'react';
import { GameMode, PlayerState, ROW_NUMBERS } from '../types/game';

interface NotebookHeaderProps {
  mode: GameMode;
  roomCode?: string;
  isAudioEnabled: boolean;
  onToggleAudio: () => void;
  onOpenRules: () => void;
  onOpenModes: () => void;
  onResetGame: () => void;
  onOpenCreateRoom: () => void;
  player1: PlayerState;
  player2: PlayerState;
  currentTurn: 'p1' | 'p2';
  lastLogEntry: string;
  localPlayerId?: 'p1' | 'p2' | null;
}

export const NotebookHeader: React.FC<NotebookHeaderProps> = ({
  mode,
  roomCode,
  isAudioEnabled,
  onToggleAudio,
  onOpenRules,
  onOpenModes,
  onResetGame,
  onOpenCreateRoom,
  player1,
  player2,
  currentTurn,
  lastLogEntry,
  localPlayerId
}) => {
  return (
    <header className="w-full max-w-5xl mx-auto px-0.5 sm:px-1 pt-0.5 sm:pt-1 shrink-0 select-none">
      {/* Top Main Game Navigation Bar */}
      <div className="flex items-center justify-between gap-1 sm:gap-1.5 bg-[#1e293b]/95 border sm:border-2 border-[#0f172a] rounded-xl sm:rounded-2xl px-1.5 py-1 sm:px-2.5 sm:py-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.35)] text-white backdrop-blur-md">
        {/* PLAYER 1 HUD CARD */}
        <div
          className={`flex items-center gap-1 sm:gap-2 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg sm:rounded-xl border sm:border-2 transition-all ${
            currentTurn === 'p1'
              ? 'bg-blue-900/80 border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.6)] ring-1 ring-blue-300'
              : 'bg-slate-800/60 border-slate-700 opacity-75'
          }`}
        >
          {/* Avatar Icon */}
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg bg-blue-600 border border-white flex items-center justify-center text-xs sm:text-sm shadow-xs shrink-0">
            🤠
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-0.5 sm:gap-1">
              <span className="font-retro font-black text-[10px] sm:text-sm text-blue-200 tracking-wider truncate max-w-[75px] xs:max-w-[100px] sm:max-w-[140px]">
                {player1.name}
              </span>
              {localPlayerId === 'p1' && (
                <span className="px-1 py-0 rounded bg-emerald-500 text-slate-950 font-mono font-black text-[7px] sm:text-[8px] leading-tight shrink-0">
                  YOU
                </span>
              )}
              {currentTurn === 'p1' && (
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-400 animate-ping inline-block" />
              )}
            </div>
            {/* Health Hearts */}
            <div className="flex gap-0.5 text-[8px] sm:text-[11px] leading-none">
              {ROW_NUMBERS.map((r) => (
                <span key={r} className={player1.cells[r].isDestroyed ? 'opacity-25 grayscale' : 'animate-pulse'}>
                  ❤️
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* CENTER VS BADGE & ACTION TICKER */}
        <div className="flex-1 min-w-0 px-0.5 sm:px-1 text-center flex flex-col items-center justify-center">
          <div className="flex items-center gap-1">
            <span className="px-1.5 py-0 sm:px-2 sm:py-0.2 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 border border-amber-300 text-[#0f172a] font-retro font-black text-[9px] sm:text-xs tracking-wider shadow-xs uppercase">
              ⚔️ VS ⚔️
            </span>
            <span className="hidden sm:inline-block text-[10px] font-mono font-bold text-amber-300 bg-black/40 px-2 py-0.2 rounded border border-amber-500/30">
              {mode === 'local' ? 'PASS & PLAY' : mode === 'ai' ? 'VS AI' : `ROOM: ${roomCode || 'CLOUD'}`}
            </span>
          </div>
          {/* Realtime Action Prompt */}
          <div className="text-[9px] sm:text-xs font-hand font-bold text-amber-200 truncate mt-0.5 max-w-full drop-shadow">
            ✏️ {lastLogEntry}
          </div>
        </div>

        {/* PLAYER 2 HUD CARD */}
        <div
          className={`flex items-center gap-1 sm:gap-2 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg sm:rounded-xl border sm:border-2 transition-all ${
            currentTurn === 'p2'
              ? 'bg-rose-900/80 border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.6)] ring-1 ring-rose-300'
              : 'bg-slate-800/60 border-slate-700 opacity-75'
          }`}
        >
          <div className="min-w-0 text-right">
            <div className="flex items-center justify-end gap-0.5 sm:gap-1">
              {localPlayerId === 'p2' && (
                <span className="px-1 py-0 rounded bg-emerald-500 text-slate-950 font-mono font-black text-[7px] sm:text-[8px] leading-tight shrink-0">
                  YOU
                </span>
              )}
              {currentTurn === 'p2' && (
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-400 animate-ping inline-block" />
              )}
              <span className="font-retro font-black text-[10px] sm:text-sm text-rose-200 tracking-wider truncate max-w-[75px] xs:max-w-[100px] sm:max-w-[140px]">
                {player2.name}
              </span>
            </div>
            {/* Health Hearts */}
            <div className="flex justify-end gap-0.5 text-[8px] sm:text-[11px] leading-none">
              {ROW_NUMBERS.map((r) => (
                <span key={r} className={player2.cells[r].isDestroyed ? 'opacity-25 grayscale' : 'animate-pulse'}>
                  ❤️
                </span>
              ))}
            </div>
          </div>
          {/* Avatar Icon */}
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg bg-rose-600 border border-white flex items-center justify-center text-xs sm:text-sm shadow-xs shrink-0">
            {mode === 'ai' ? '🤖' : '🥷'}
          </div>
        </div>

        {/* COMPACT MENU BUTTONS */}
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 ml-0.5 sm:ml-1">
          <button
            onClick={onOpenCreateRoom}
            className="game-btn px-1.5 py-0.5 sm:px-2 sm:py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-retro font-black rounded-md sm:rounded-lg text-[9px] sm:text-xs flex items-center gap-0.5 shadow-xs"
            title="Create or Join Room Match"
          >
            <span>🌐</span>
            <span className="hidden md:inline">ROOM</span>
          </button>
          <button
            onClick={onOpenModes}
            className="game-btn p-1 sm:px-1.5 sm:py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-retro font-black rounded-md sm:rounded-lg text-[9px] sm:text-xs shadow-xs"
            title="Switch Mode"
          >
            🎮
          </button>
          <button
            onClick={onToggleAudio}
            className="game-btn p-1 bg-slate-700 hover:bg-slate-600 text-white rounded-md sm:rounded-lg text-[10px] sm:text-xs shadow-xs"
            title={isAudioEnabled ? 'Mute' : 'Unmute'}
          >
            {isAudioEnabled ? '🔊' : '🔇'}
          </button>
          <button
            onClick={onOpenRules}
            className="game-btn p-1 bg-slate-700 hover:bg-slate-600 text-white rounded-md sm:rounded-lg text-[10px] sm:text-xs shadow-xs"
            title="Rules"
          >
            📖
          </button>
          <button
            onClick={() => {
              if (window.confirm('Reset this battle and start over?')) {
                onResetGame();
              }
            }}
            className="game-btn p-1 bg-rose-600 hover:bg-rose-500 text-white rounded-md sm:rounded-lg text-[10px] sm:text-xs shadow-xs"
            title="Reset Game"
          >
            🔄
          </button>
        </div>
      </div>
    </header>
  );
};
