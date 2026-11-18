import React from 'react';
import { PlayerId, PlayerState, RowIndex } from '../types/game';

interface SidePlayerDieProps {
  playerId: PlayerId;
  playerState: PlayerState;
  isCurrentTurn: boolean;
  isLocked: boolean;
  isRolling: boolean;
  displayValue: RowIndex | string;
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

  return (
    <div
      className={`h-full flex flex-col items-center justify-center p-0.5 sm:p-1.5 transition-all duration-200 shrink-0 select-none ${
        position === 'left' ? 'pr-0.5 sm:pr-2' : 'pl-0.5 sm:pl-2'
      }`}
    >
      {/* Side Die Tray Card */}
      <div
        onClick={() => !isLocked && onRoll()}
        className={`w-14 xs:w-16 sm:w-22 md:w-26 flex flex-col items-center justify-center py-2 px-1 sm:px-1.5 rounded-2xl border-2 sm:border-3 transition-all duration-200 cursor-pointer ${
          isCurrentTurn
            ? isP1
              ? 'bg-blue-100/90 border-blue-900 shadow-[3px_3px_0px_#1e3a8a] ring-2 sm:ring-3 ring-blue-400 hover:scale-[1.03] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
              : 'bg-rose-100/90 border-rose-900 shadow-[3px_3px_0px_#881337] ring-2 sm:ring-3 ring-rose-400 hover:scale-[1.03] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
            : 'bg-white/70 border-gray-400/80 shadow-[2px_2px_0px_#64748b] opacity-60 cursor-not-allowed'
        }`}
        title={
          isLocked
            ? `${playerState.name}'s Die is Locked (Opponent's Turn)`
            : `Click to Roll ${playerState.name}'s Die!`
        }
      >
        {/* Player Name Badge */}
        <div className="flex items-center gap-1 mb-1 max-w-full px-0.5">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: playerState.inkColor }}
          />
          <span
            className="font-retro font-extrabold text-[10px] sm:text-xs truncate"
            style={{ color: playerState.inkColor }}
          >
            {isP1 ? 'PLAYER 1' : 'PLAYER 2'}
          </span>
        </div>

        {/* 3D Embossed Retro Die Box */}
        <div
          className={`relative w-11 h-11 xs:w-12 xs:h-12 sm:w-15 sm:h-15 md:w-17 md:h-17 bg-white rounded-xl sm:rounded-2xl border-2 sm:border-3 border-[#0f172a] shadow-[2.5px_2.5px_0px_#0f172a] flex items-center justify-center transition-all ${
            isRolling ? 'animate-die-tumble' : ''
          } ${
            !isLocked && isCurrentTurn ? 'hover:scale-105 active:scale-95 hover:shadow-[1px_1px_0px_#0f172a]' : ''
          }`}
        >
          {/* Lock Overlay */}
          {isLocked && (
            <div className="absolute inset-0 bg-slate-900/35 backdrop-blur-[0.5px] rounded-xl sm:rounded-2xl flex items-center justify-center z-20">
              <span className="text-xs sm:text-base">🔒</span>
            </div>
          )}

          {/* Paper texture pips on corners */}
          <span className="absolute top-1 left-1.5 text-[8px] text-gray-300 font-mono hidden sm:inline">●</span>
          <span className="absolute bottom-1 right-1.5 text-[8px] text-gray-300 font-mono hidden sm:inline">●</span>

          {/* Die Face Digit */}
          <span
            className="font-retro font-extrabold text-2xl xs:text-3xl sm:text-4xl leading-none select-none transition-transform"
            style={{
              color: isP1 ? '#1d4ed8' : '#dc2626'
            }}
          >
            {displayValue}
          </span>
        </div>

        {/* Action Prompt Tag */}
        <div className="mt-1.5 text-center w-full">
          {isLocked ? (
            <span className="text-[8px] sm:text-[9px] font-mono font-bold text-gray-500 uppercase tracking-wider block">
              LOCKED
            </span>
          ) : isRolling ? (
            <span className="text-[8px] sm:text-[10px] font-retro font-bold text-amber-700 animate-pulse block">
              ROLLING...
            </span>
          ) : (
            <span
              className="text-[9px] sm:text-xs font-retro font-black animate-bounce block leading-tight px-1 py-0.5 rounded-md bg-white border border-[#0f172a] shadow-xs"
              style={{ color: isP1 ? '#1d4ed8' : '#dc2626' }}
            >
              ROLL 🎲
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
