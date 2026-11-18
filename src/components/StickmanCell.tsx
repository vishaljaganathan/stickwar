import React from 'react';
import { CellState, RowIndex, PlayerId, WeaponType } from '../types/game';

interface StickmanCellProps {
  rowIndex: RowIndex;
  cell: CellState;
  playerId: PlayerId;
  inkColor: string;
  isCurrentTurnRow?: boolean;
  canBeAttacked?: boolean;
  isAttacker?: boolean;
  onAttackClick?: () => void;
}

export const StickmanCell: React.FC<StickmanCellProps> = ({
  rowIndex,
  cell,
  playerId,
  inkColor,
  isCurrentTurnRow = false,
  canBeAttacked = false,
  isAttacker = false,
  onAttackClick
}) => {
  const { stage, weapon, isDestroyed } = cell;

  // Render weapon SVG doodle based on weapon type
  const renderWeapon = (wType?: WeaponType) => {
    switch (wType) {
      case 'sword':
        return (
          <g className="weapon-doodle animate-weapon-pop">
            <path
              d="M 58 50 L 82 26 M 55 53 L 61 47 M 54 55 L 50 61"
              stroke={inkColor}
              strokeWidth="2.8"
              strokeLinecap="round"
            />
            <path d="M 74 24 L 79 19 M 82 28 L 88 28" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        );
      case 'sniper':
        return (
          <g className="weapon-doodle animate-weapon-pop">
            <line x1="48" y1="52" x2="88" y2="40" stroke={inkColor} strokeWidth="3" strokeLinecap="round" />
            <rect x="62" y="36" width="10" height="4" rx="1" fill={inkColor} />
            <line x1="50" y1="53" x2="48" y2="60" stroke={inkColor} strokeWidth="2.5" />
            <circle cx="67" cy="38" r="3" stroke="#ef4444" strokeWidth="1" fill="none" />
          </g>
        );
      case 'bazooka':
        return (
          <g className="weapon-doodle animate-weapon-pop">
            <rect x="36" y="38" width="46" height="9" rx="2" fill="none" stroke={inkColor} strokeWidth="2.5" transform="rotate(-15 60 42)" />
            <path d="M 82 28 L 88 26 L 86 33 Z" fill="#ef4444" stroke="#ef4444" strokeWidth="1" />
            <circle cx="34" cy="46" r="3" fill="none" stroke="#94a3b8" strokeDasharray="2 1" />
            <circle cx="28" cy="48" r="2" fill="none" stroke="#cbd5e1" />
          </g>
        );
      case 'bow':
        return (
          <g className="weapon-doodle animate-weapon-pop">
            <path d="M 60 30 Q 75 50 60 70" fill="none" stroke={inkColor} strokeWidth="2.5" strokeLinecap="round" />
            <line x1="60" y1="30" x2="60" y2="70" stroke="#64748b" strokeWidth="1" strokeDasharray="3 2" />
            <line x1="48" y1="50" x2="74" y2="50" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
            <path d="M 74 50 L 69 47 M 74 50 L 69 53" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
          </g>
        );
      case 'laser':
        return (
          <g className="weapon-doodle animate-weapon-pop">
            <path d="M 52 52 L 76 46 L 76 56 L 52 56 Z" fill="none" stroke={inkColor} strokeWidth="2.5" />
            <line x1="76" y1="51" x2="90" y2="51" stroke="#06b6d4" strokeWidth="3.5" strokeLinecap="round" />
            <circle cx="82" cy="51" r="5" stroke="#facc15" strokeWidth="1" fill="none" />
          </g>
        );
      default:
        return null;
    }
  };

  return (
    <div
      onClick={canBeAttacked ? onAttackClick : undefined}
      className={`relative w-full h-full min-h-[48px] border border-blue-200/80 rounded-md transition-all duration-200 flex items-center justify-center select-none overflow-hidden
        ${isCurrentTurnRow ? 'bg-amber-100/60 ring-2 ring-amber-400 shadow-md' : 'bg-transparent'}
        ${isAttacker ? 'ring-2 ring-emerald-500 bg-emerald-50/50' : ''}
        ${canBeAttacked ? 'cursor-pointer hover:bg-rose-100/70 hover:scale-[1.02] active:scale-95 ring-2 ring-dashed ring-rose-500 animate-pulse' : ''}
      `}
      title={
        canBeAttacked
          ? `Click to attack Row ${rowIndex}!`
          : isDestroyed
          ? `Row ${rowIndex} is destroyed`
          : `Row ${rowIndex}: Stage ${stage}/3`
      }
    >
      {/* Faint ruling lines inside cell */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between py-1 opacity-25">
        <div className="w-full border-b border-blue-300/40" />
        <div className="w-full border-b border-blue-300/40" />
      </div>

      {/* Target indicator badge for attack phase */}
      {canBeAttacked && (
        <div className="absolute top-0.5 right-0.5 z-20 bg-rose-600 text-white text-[9px] sm:text-[10px] font-bold px-1 py-0.2 rounded shadow animate-bounce">
          🎯 ATTACK
        </div>
      )}

      {/* Active turn badge */}
      {isCurrentTurnRow && !isDestroyed && (
        <div className="absolute top-0.5 left-0.5 z-10 bg-amber-400 text-amber-950 text-[9px] font-bold px-1 py-0.2 rounded shadow-sm">
          ROLLED
        </div>
      )}

      {/* Stage 0: Empty slot */}
      {stage === 0 && !isDestroyed && (
        <div className="text-gray-400/35 text-[11px] sm:text-xs font-hand italic tracking-wide select-none">
          empty slot
        </div>
      )}

      {/* Stickman SVG Drawing */}
      {stage > 0 && (
        <svg
          viewBox="0 0 100 100"
          className="h-full w-auto max-h-[92%] aspect-square z-10 transition-transform duration-200 filter drop-shadow-[0.5px_0.5px_0px_rgba(0,0,0,0.15)]"
        >
          {/* STAGE 1: Head */}
          <g className="stickman-head animate-draw-stroke">
            <path
              d="M 50 15 C 60 14, 66 22, 65 31 C 64 39, 58 45, 49 45 C 41 45, 34 38, 35 29 C 36 21, 41 15, 50 15 Z"
              fill="none"
              stroke={inkColor}
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="45" cy="27" r="1.4" fill={inkColor} />
            <circle cx="55" cy="27" r="1.4" fill={inkColor} />
            {isDestroyed ? (
              <path d="M 43 25 L 47 29 M 47 25 L 43 29 M 53 25 L 57 29 M 57 25 L 53 29" stroke="#b91c1c" strokeWidth="1.2" />
            ) : (
              <path
                d={stage === 3 ? "M 44 35 Q 50 40 56 35" : "M 45 34 Q 50 38 55 34"}
                fill="none"
                stroke={inkColor}
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            )}
          </g>

          {/* STAGE 2 & 3: Torso, Arms, and Legs */}
          {stage >= 2 && (
            <g className="stickman-body animate-draw-stroke">
              <path
                d="M 50 45 L 49.5 70"
                stroke={inkColor}
                strokeWidth="2.8"
                strokeLinecap="round"
              />

              {/* Arms */}
              {stage === 3 ? (
                <path
                  d="M 50 53 L 34 60 M 50 53 L 62 50"
                  stroke={inkColor}
                  strokeWidth="2.6"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M 50 53 L 34 61 M 50 53 L 66 61"
                  stroke={inkColor}
                  strokeWidth="2.6"
                  strokeLinecap="round"
                />
              )}

              {/* Legs */}
              <path
                d="M 49.5 70 L 36 93 M 49.5 70 L 63 93"
                stroke={inkColor}
                strokeWidth="2.8"
                strokeLinecap="round"
              />
            </g>
          )}

          {/* STAGE 3: Weapon */}
          {stage >= 3 && renderWeapon(weapon)}
        </svg>
      )}

      {/* DESTROYED OVERLAY */}
      {isDestroyed && (
        <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center p-0.5">
          <svg viewBox="0 0 100 100" className="w-full h-full animate-scribble-slash">
            <line x1="8" y1="12" x2="92" y2="88" stroke="#dc2626" strokeWidth="5.5" strokeLinecap="round" />
            <line x1="12" y1="16" x2="88" y2="92" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeDasharray="30 4" />
            <line x1="92" y1="12" x2="8" y2="88" stroke="#dc2626" strokeWidth="5.5" strokeLinecap="round" />
            <line x1="88" y1="16" x2="12" y2="92" stroke="#ef4444" strokeWidth="3.2" strokeLinecap="round" strokeDasharray="25 6" />
            <path
              d="M 20 50 Q 30 35 45 60 T 70 40 T 85 55"
              fill="none"
              stroke="#b91c1c"
              strokeWidth="3"
              strokeLinecap="round"
              opacity="0.85"
            />
          </svg>
          <div className="absolute -rotate-12 bg-rose-600/95 text-white font-doodle text-[10px] sm:text-xs font-bold px-1.5 py-0.2 rounded shadow border border-white/60">
            DESTROYED
          </div>
        </div>
      )}
    </div>
  );
};
