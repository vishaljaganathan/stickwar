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
}

export const SidePlayerDie: React.FC<SidePlayerDieProps> = ({
  playerId,
  playerState,
  isCurrentTurn,
  isLocked,
  isRolling,
  displayValue,
  onRoll,
  position
}) => {
  const isP1 = playerId === 'p1';
  const isNumeric = typeof displayValue === 'number';
  const isOdd = isNumeric && (displayValue as number) % 2 !== 0;

  return (
    <div
      className={`h-full flex flex-col items-center justify-center p-0.5 sm:p-2 transition-all duration-200 shrink-0 select-none ${
        position === 'left' ? 'pr-0.5 sm:pr-2' : 'pl-0.5 sm:pl-2'
      }`}
    >
      {/* 3D Dice Battle Shrine / Pedestal */}
      <div
        onClick={() => !isLocked && onRoll()}
        className={`w-15 xs:w-18 sm:w-24 md:w-28 flex flex-col items-center justify-center py-2.5 px-1.5 rounded-2xl sm:rounded-3xl border-3 sm:border-4 transition-all duration-200 cursor-pointer ${
          isCurrentTurn
            ? isP1
              ? 'bg-gradient-to-b from-blue-500 to-blue-700 border-blue-300 shadow-[0_0_25px_rgba(59,130,246,0.7)] ring-2 sm:ring-4 ring-blue-400/50 hover:scale-[1.03] active:translate-y-1'
              : 'bg-gradient-to-b from-rose-500 to-rose-700 border-rose-300 shadow-[0_0_25px_rgba(244,63,94,0.7)] ring-2 sm:ring-4 ring-rose-400/50 hover:scale-[1.03] active:translate-y-1'
            : 'bg-slate-900/70 border-slate-700 opacity-50 cursor-not-allowed shadow-[0_4px_10px_rgba(0,0,0,0.5)]'
        }`}
        title={
          isLocked
            ? `${playerState.name}'s Die is Locked (Opponent's Turn)`
            : `Click to Roll ${playerState.name}'s Die!`
        }
      >
        {/* Commander Ribbon */}
        <div className="flex items-center gap-1 mb-1.5 max-w-full px-1 py-0.5 rounded-full bg-black/40 border border-white/20">
          <span
            className="w-2 h-2 rounded-full shrink-0 shadow-xs"
            style={{ backgroundColor: isP1 ? '#60a5fa' : '#fb7185' }}
          />
          <span className="font-retro font-black text-[9px] sm:text-[11px] text-white tracking-wider truncate">
            {isP1 ? 'PLAYER 1' : 'PLAYER 2'}
          </span>
        </div>

        {/* 3D Tactile Die Cube */}
        <div
          className={`relative w-12 h-12 xs:w-14 xs:h-14 sm:w-16 sm:h-16 md:w-18 md:h-18 bg-gradient-to-br from-white to-slate-100 rounded-2xl sm:rounded-3xl border-3 sm:border-4 border-[#0f172a] shadow-[0_8px_16px_rgba(0,0,0,0.4)] flex items-center justify-center transition-all ${
            isRolling ? 'animate-die-tumble' : ''
          } ${
            !isLocked && isCurrentTurn ? 'hover:scale-110 active:scale-95' : ''
          }`}
        >
          {/* Iron Chains / Lock Overlay */}
          {isLocked && (
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[1px] rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center z-20">
              <span className="text-base sm:text-lg">🔒</span>
              <span className="text-[7px] sm:text-[8px] font-mono font-black text-slate-300 mt-0.5 tracking-tighter">
                LOCKED
              </span>
            </div>
          )}

          {/* Golden Die Edge Glints */}
          <span className="absolute top-1 left-2 text-[7px] text-slate-300 font-mono hidden sm:inline">✦</span>
          <span className="absolute bottom-1 right-2 text-[7px] text-slate-300 font-mono hidden sm:inline">✦</span>

          {/* Die Digit */}
          <span
            className="font-retro font-black text-3xl xs:text-4xl sm:text-5xl leading-none select-none drop-shadow-sm"
            style={{
              color: isOdd ? '#d97706' : isP1 ? '#1d4ed8' : '#dc2626'
            }}
          >
            {displayValue}
          </span>

          {/* Odd/Even Badge */}
          {isNumeric && !isRolling && !isLocked && (
            <span
              className={`absolute -bottom-1.5 px-1 rounded border border-[#0f172a] text-[7px] font-retro font-black shadow-xs ${
                isOdd ? 'bg-amber-400 text-slate-950' : 'bg-emerald-400 text-slate-950'
              }`}
            >
              {isOdd ? 'ODD' : 'EVEN'}
            </span>
          )}
        </div>

        {/* Tactile Roll Button / Action Prompt */}
        <div className="mt-2 w-full text-center">
          {isLocked ? (
            <span className="text-[8px] sm:text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
              WAITING
            </span>
          ) : isRolling ? (
            <span className="text-[9px] sm:text-[11px] font-retro font-black text-amber-300 animate-pulse block tracking-wider">
              ROLLING...
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-retro font-black text-[9px] sm:text-xs block shadow-xs border border-[#0f172a] animate-bounce">
              ROLL 🎲
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
