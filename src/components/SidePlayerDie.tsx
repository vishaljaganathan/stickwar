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
      className={`h-full flex flex-col items-center justify-center p-1 sm:p-2 transition-all duration-200 shrink-0 select-none ${
        position === 'left' ? 'pr-0.5 sm:pr-1.5' : 'pl-0.5 sm:pl-1.5'
      }`}
    >
      {/* Side Die Tray / Card */}
      <div
        onClick={() => !isLocked && onRoll()}
        className={`w-13 xs:w-15 sm:w-20 md:w-24 flex flex-col items-center justify-center py-2 px-1 rounded-xl sm:rounded-2xl border-2 transition-all duration-200 cursor-pointer ${
          isCurrentTurn
            ? isP1
              ? 'bg-blue-50/95 border-blue-600 shadow-[2px_2px_0px_#1d4ed8] ring-2 ring-blue-400/50 hover:bg-blue-100/80 active:scale-[0.97]'
              : 'bg-rose-50/95 border-rose-600 shadow-[2px_2px_0px_#be123c] ring-2 ring-rose-400/50 hover:bg-rose-100/80 active:scale-[0.97]'
            : 'bg-white/60 border-gray-300 opacity-60 cursor-not-allowed'
        }`}
        title={
          isLocked
            ? `${playerState.name}'s Die is Locked (Opponent's Turn)`
            : `Click to Roll ${playerState.name}'s Die!`
        }
      >
        {/* Player Name / Tag */}
        <div className="flex items-center gap-1 mb-1 sm:mb-1.5 max-w-full px-0.5">
          <span
            className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0"
            style={{ backgroundColor: playerState.inkColor }}
          />
          <span
            className="font-hand font-extrabold text-[10px] sm:text-xs truncate"
            style={{ color: playerState.inkColor }}
          >
            {isP1 ? 'P1' : 'P2'}
          </span>
        </div>

        {/* Tactile 3D Die Box */}
        <div
          className={`relative w-10 h-10 xs:w-12 xs:h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-white rounded-xl sm:rounded-2xl border-2 sm:border-3 flex items-center justify-center shadow-xs transition-transform ${
            isP1 ? 'border-blue-900' : 'border-rose-900'
          } ${isRolling ? 'animate-die-tumble' : ''} ${
            !isLocked && isCurrentTurn ? 'hover:scale-105 active:scale-95' : ''
          }`}
        >
          {/* Lock Overlay */}
          {isLocked && (
            <div className="absolute inset-0 bg-gray-900/25 backdrop-blur-[0.5px] rounded-xl sm:rounded-2xl flex items-center justify-center z-20">
              <span className="text-xs sm:text-sm">🔒</span>
            </div>
          )}

          {/* Die Face Number */}
          <span
            className="font-hand font-extrabold text-2xl xs:text-3xl sm:text-4xl leading-none select-none"
            style={{
              fontFamily: "'Architects Daughter', cursive",
              color: isP1 ? '#1e3a8a' : '#881337'
            }}
          >
            {displayValue}
          </span>
        </div>

        {/* Status Prompt */}
        <div className="mt-1 sm:mt-1.5 text-center">
          {isLocked ? (
            <span className="text-[9px] sm:text-[10px] font-mono font-bold text-gray-400">
              LOCKED
            </span>
          ) : isRolling ? (
            <span className="text-[9px] sm:text-[10px] font-mono font-bold text-amber-600 animate-pulse">
              ROLLING...
            </span>
          ) : (
            <span
              className="text-[9px] sm:text-[11px] font-hand font-bold animate-bounce block leading-tight"
              style={{ color: isP1 ? '#1d4ed8' : '#be123c' }}
            >
              TAP DIE 🎲
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
