import React from 'react';
import { PlayerId, PlayerState } from '../types/game';

interface SidePlayerDieProps {
  playerId: PlayerId;
  playerState: PlayerState;
  isCurrentTurn: boolean;
  isLocked: boolean;
  isRolling: boolean;
  displayValue: number | string;
  onRoll: () => void;
  position: 'left' | 'right';
  isCompact?: boolean;
  canKick?: boolean;
  onKick?: () => void;
  isEliminated?: boolean;
  isSpeaking?: boolean;
  isVoiceMuted?: boolean;
}

export const SidePlayerDie: React.FC<SidePlayerDieProps> = ({
  playerId,
  playerState,
  isCurrentTurn,
  isLocked,
  isRolling,
  displayValue,
  onRoll,
  position,
  isCompact = false,
  canKick = false,
  onKick,
  isEliminated = false,
  isSpeaking = false,
  isVoiceMuted = false
}) => {
  const isNumeric = typeof displayValue === 'number';
  const isOdd = isNumeric && (displayValue as number) % 2 !== 0;

  const getTheme = (id: PlayerId) => {
    switch (id) {
      case 'p1': return { bg: 'from-blue-500 to-blue-700 border-blue-300 ring-blue-400/50 shadow-[0_0_18px_rgba(59,130,246,0.7)]', dot: '#60a5fa', text: '#1d4ed8' };
      case 'p2': return { bg: 'from-rose-500 to-rose-700 border-rose-300 ring-rose-400/50 shadow-[0_0_18px_rgba(244,63,94,0.7)]', dot: '#fb7185', text: '#dc2626' };
      case 'p3': return { bg: 'from-emerald-500 to-emerald-700 border-emerald-300 ring-emerald-400/50 shadow-[0_0_18px_rgba(16,185,129,0.7)]', dot: '#34d399', text: '#059669' };
      case 'p4': return { bg: 'from-purple-500 to-purple-700 border-purple-300 ring-purple-400/50 shadow-[0_0_18px_rgba(168,85,247,0.7)]', dot: '#c084fc', text: '#7c3aed' };
    }
  };

  const theme = getTheme(playerId);

  return (
    <div
      className={`flex flex-col items-center justify-center p-0 sm:p-1 transition-all duration-200 shrink-0 select-none ${
        position === 'left' ? 'pr-0.5 sm:pr-1.5' : 'pl-0.5 sm:pl-1.5'
      }`}
    >
      {/* 3D Dice Battle Shrine / Pedestal */}
      <div
        onClick={() => !isLocked && !isEliminated && onRoll()}
        className={`w-13 xs:w-16 sm:w-22 md:w-26 flex flex-col items-center justify-center rounded-xl sm:rounded-2xl border-2 sm:border-3 transition-all duration-200 cursor-pointer ${
          isCompact ? 'py-1 px-1 my-0.5' : 'py-1 sm:py-2 px-1 my-1'
        } ${
          isEliminated
            ? 'bg-slate-900/40 border-slate-800 opacity-40 cursor-not-allowed'
            : isCurrentTurn
            ? `bg-gradient-to-b ${theme.bg} ring-1 sm:ring-3 hover:scale-[1.03] active:translate-y-0.5`
            : 'bg-slate-900/70 border-slate-700 opacity-50 cursor-not-allowed shadow-[0_4px_10px_rgba(0,0,0,0.5)]'
        }`}
        title={
          isEliminated
            ? `${playerState.name} was defeated / forfeited`
            : isLocked
            ? `${playerState.name}'s Die is Locked`
            : `Click to Roll ${playerState.name}'s Die!`
        }
      >
        {/* Commander Ribbon */}
        <div
          className={`flex items-center justify-between gap-0.5 sm:gap-1 mb-0.5 max-w-full px-1 py-0.2 rounded-full border transition-all ${
            isSpeaking
              ? 'bg-emerald-950/90 border-emerald-400 ring-1 ring-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
              : 'bg-black/40 border-white/20'
          }`}
        >
          <div className="flex items-center gap-0.5 sm:gap-1 min-w-0">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 shadow-xs ${isSpeaking ? 'bg-emerald-400 animate-ping' : ''}`}
              style={{ backgroundColor: isSpeaking ? '#34d399' : theme.dot }}
            />
            <span className="font-retro font-black text-[7px] xs:text-[8px] sm:text-[10px] text-white tracking-wider truncate max-w-[36px] xs:max-w-[48px] sm:max-w-[65px]">
              {playerState.name || playerId.toUpperCase()}
            </span>
            {isSpeaking && <span className="text-[7px] xs:text-[8px] shrink-0 animate-bounce">🎙️</span>}
            {isVoiceMuted && !isSpeaking && <span className="text-[6px] xs:text-[7px] text-slate-400 shrink-0">🔇</span>}
          </div>
          {canKick && onKick && !isEliminated && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onKick();
              }}
              className="shrink-0 text-[7px] text-rose-300 hover:text-white hover:bg-rose-600 rounded px-1 transition-all"
              title={`Kick ${playerState.name} from match`}
            >
              🥾
            </button>
          )}
        </div>

        {/* 3D Tactile Die Cube */}
        <div
          className={`relative rounded-xl sm:rounded-2xl border-2 sm:border-3 border-[#0f172a] shadow-[0_4px_12px_rgba(0,0,0,0.35)] flex items-center justify-center transition-all ${
            isEliminated
              ? 'bg-slate-200/50 opacity-60 cursor-not-allowed'
              : isLocked
              ? 'bg-slate-100/90 opacity-80 cursor-not-allowed'
              : 'bg-gradient-to-br from-white to-slate-100 hover:scale-105 active:scale-95'
          } ${
            isCompact
              ? 'w-9 h-9 xs:w-10 xs:h-10 sm:w-13 sm:h-13'
              : 'w-10 h-10 xs:w-12 xs:h-12 sm:w-15 sm:h-15 md:w-17 md:h-17'
          } ${isRolling ? 'animate-die-tumble' : ''}`}
        >
          {/* Subtle Corner Lock Pin */}
          {(isLocked || isEliminated) && (
            <span className="absolute -top-1.5 -right-1.5 text-[10px] sm:text-xs z-20 select-none filter drop-shadow">
              {isEliminated ? '💀' : '🔒'}
            </span>
          )}

          {/* Golden Die Edge Glints */}
          <span className="absolute top-0.5 left-1 text-[6px] text-slate-300 font-mono hidden sm:inline">✦</span>
          <span className="absolute bottom-0.5 right-1 text-[6px] text-slate-300 font-mono hidden sm:inline">✦</span>

          {/* Die Digit (Always clearly visible showing the last rolled number or skull) */}
          <span
            className={`font-retro font-black leading-none select-none drop-shadow-sm ${
              isCompact ? 'text-xl xs:text-2xl sm:text-3xl' : 'text-2xl xs:text-3xl sm:text-4xl md:text-5xl'
            }`}
            style={{
              color: isEliminated ? '#94a3b8' : isOdd ? '#d97706' : theme.text
            }}
          >
            {isEliminated ? '💀' : displayValue}
          </span>

          {/* Odd/Even Badge */}
          {isNumeric && !isRolling && !isEliminated && (
            <span
              className={`absolute -bottom-1 px-0.5 sm:px-1 rounded border border-[#0f172a] text-[6px] sm:text-[7px] font-retro font-black shadow-xs ${
                isOdd ? 'bg-amber-400 text-slate-950' : 'bg-emerald-400 text-slate-950'
              }`}
            >
              {isOdd ? 'ODD' : 'EVEN'}
            </span>
          )}
        </div>

        {/* Tactile Roll Button / Action Prompt */}
        <div className="mt-1 w-full text-center">
          {isEliminated ? (
            <span className="text-[6px] sm:text-[8px] font-mono font-bold text-rose-400 uppercase tracking-widest block">
              OUT
            </span>
          ) : isLocked ? (
            <span className="text-[6px] sm:text-[8px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
              WAIT
            </span>
          ) : isRolling ? (
            <span className="text-[7px] sm:text-[10px] font-retro font-black text-amber-300 animate-pulse block tracking-wider">
              ROLL...
            </span>
          ) : (
            <span className="px-1 sm:px-1.5 py-0.2 rounded sm:rounded-md bg-amber-400 hover:bg-amber-300 text-slate-950 font-retro font-black text-[7px] sm:text-[10px] block shadow-xs border border-[#0f172a] animate-bounce">
              ROLL 🎲
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
