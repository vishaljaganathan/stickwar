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

  // Clean hand-drawn weapons designed to NEVER collide with body or head
  // Center: x=48. Head: x=36..60, y=10..32. Torso: x=48, y=32..62. Legs: y=62..90.
  // Right hand holds weapons at (60, 46).
  // All weapons project into open right quadrant (x: 60..94, y: 20..60), perfectly clear of head & body!
  const renderWeapon = (wType?: WeaponType) => {
    switch (wType) {
      case 'sword':
        return (
          <g className="weapon-doodle animate-weapon-pop">
            {/* Grip in right hand */}
            <line x1="56" y1="52" x2="62" y2="44" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
            {/* Handguard */}
            <line x1="58" y1="43" x2="66" y2="49" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
            {/* Sword Blade pointing up and right into open space */}
            <path
              d="M 62 44 Q 75 32 88 18"
              fill="none"
              stroke={inkColor}
              strokeWidth="2.8"
              strokeLinecap="round"
            />
            {/* Blade sparkle glints */}
            <line x1="82" y1="16" x2="86" y2="21" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="89" y1="20" x2="94" y2="18" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        );
      case 'sniper':
        return (
          <g className="weapon-doodle animate-weapon-pop">
            {/* Stock near chest */}
            <line x1="52" y1="46" x2="60" y2="46" stroke="#475569" strokeWidth="2.5" />
            {/* Scope mounted on top */}
            <rect x="62" y="40" width="12" height="4" rx="1" fill={inkColor} />
            <circle cx="68" cy="38" r="2.5" stroke="#ef4444" strokeWidth="1" fill="none" />
            {/* Long thin rifle barrel pointing forward */}
            <line x1="60" y1="45" x2="94" y2="45" stroke={inkColor} strokeWidth="2.2" strokeLinecap="round" />
            {/* Laser pointer dot */}
            <circle cx="94" cy="45" r="1.5" fill="#ef4444" />
          </g>
        );
      case 'bazooka':
        return (
          <g className="weapon-doodle animate-weapon-pop">
            {/* Launcher tube resting cleanly above right shoulder, pointing up-right */}
            <rect
              x="52"
              y="32"
              width="38"
              height="7"
              rx="1.5"
              fill="none"
              stroke={inkColor}
              strokeWidth="2.2"
              transform="rotate(-15 62 36)"
            />
            {/* Rocket tip */}
            <path d="M 88 23 L 94 21 L 92 28 Z" fill="#ef4444" stroke="#ef4444" strokeWidth="0.8" />
            {/* Comic smoke puffs behind tube */}
            <circle cx="50" cy="39" r="2.5" fill="none" stroke="#94a3b8" strokeDasharray="2 1" />
          </g>
        );
      case 'bow':
        return (
          <g className="weapon-doodle animate-weapon-pop">
            {/* Ruler bow stave held forward */}
            <path d="M 68 24 Q 82 46 68 68" fill="none" stroke="#b45309" strokeWidth="2.4" strokeLinecap="round" />
            {/* Bowstring drawn to hand */}
            <path d="M 68 24 L 58 46 L 68 68" fill="none" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 1" />
            {/* Arrow pointing forward */}
            <line x1="56" y1="46" x2="88" y2="46" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
            <path d="M 88 46 L 83 43 M 88 46 L 83 49" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round" />
          </g>
        );
      case 'laser':
        return (
          <g className="weapon-doodle animate-weapon-pop">
            {/* Futuristic raygun held in hand */}
            <rect x="60" y="42" width="16" height="7" rx="1.5" fill="none" stroke={inkColor} strokeWidth="2" />
            <line x1="76" y1="45.5" x2="90" y2="45.5" stroke="#06b6d4" strokeWidth="3" strokeLinecap="round" />
            {/* Floating energy ring */}
            <circle cx="84" cy="45.5" r="4" stroke="#facc15" strokeWidth="1" fill="none" />
          </g>
        );
      default:
        return null;
    }
  };

  return (
    <div
      onClick={canBeAttacked ? onAttackClick : undefined}
      className={`relative w-full h-full rounded-lg transition-all duration-200 flex items-center justify-center select-none overflow-hidden border p-0.5
        ${
          isCurrentTurnRow && !isDestroyed
            ? 'bg-amber-100/70 border-amber-400 ring-2 ring-amber-300 shadow-xs'
            : isAttacker
            ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-300'
            : canBeAttacked
            ? 'bg-rose-50/80 border-rose-500 ring-2 ring-dashed ring-rose-400 cursor-pointer hover:bg-rose-100 active:scale-95'
            : 'bg-transparent border-blue-200/60'
        }
      `}
      title={
        canBeAttacked
          ? `Click to attack Row ${rowIndex}!`
          : isDestroyed
          ? `Row ${rowIndex} is destroyed`
          : `Row ${rowIndex}: Stage ${stage}/3`
      }
    >
      {/* Subtle notebook ruled guide lines */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between py-1 opacity-15">
        <div className="w-full border-b border-blue-400" />
        <div className="w-full border-b border-blue-400" />
      </div>

      {/* Target indicator icon (Corner only, never obstructs drawing) */}
      {canBeAttacked && (
        <div className="absolute top-0.5 right-0.5 z-20 w-3.5 h-3.5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[8px] shadow animate-pulse">
          🎯
        </div>
      )}

      {/* Rolled indicator dot */}
      {isCurrentTurnRow && !isDestroyed && (
        <div className="absolute top-0.5 left-0.5 z-20 w-2 h-2 rounded-full bg-amber-500 shadow-xs animate-ping" />
      )}

      {/* Stage 0: Clean Blueprint Slot */}
      {stage === 0 && !isDestroyed && (
        <div className="text-gray-300 text-xs sm:text-sm font-mono select-none">
          +
        </div>
      )}

      {/* Hand-Drawn Stickman SVG - Scales cleanly inside cell without distortion */}
      {stage > 0 && (
        <svg
          viewBox="0 0 100 100"
          className="h-full w-full max-h-full max-w-full aspect-square z-10 transition-transform duration-200 pointer-events-none"
        >
          {/* STAGE 1: Head & Face */}
          <g className="stickman-head animate-draw-stroke">
            <circle
              cx="48"
              cy="21"
              r="11"
              fill="none"
              stroke={inkColor}
              strokeWidth="2.6"
              strokeLinecap="round"
            />
            {isDestroyed ? (
              // Knocked out dead X eyes
              <>
                <path d="M 43 18 L 47 22 M 47 18 L 43 22" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M 49 18 L 53 22 M 53 18 L 49 22" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" />
              </>
            ) : (
              // Friendly stickman face
              <>
                <circle cx="45" cy="19.5" r="1.3" fill={inkColor} />
                <circle cx="51" cy="19.5" r="1.3" fill={inkColor} />
                <path
                  d={stage === 3 ? "M 44 25 Q 48 29 52 25" : "M 45 24.5 Q 48 27.5 51 24.5"}
                  fill="none"
                  stroke={inkColor}
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </>
            )}
          </g>

          {/* STAGE 2 & 3: Torso, Arms, and Legs */}
          {stage >= 2 && (
            <g className="stickman-body animate-draw-stroke">
              {/* Torso */}
              <line x1="48" y1="32" x2="48" y2="60" stroke={inkColor} strokeWidth="2.8" strokeLinecap="round" />

              {/* Arms */}
              {stage === 3 ? (
                // Armed pose: left arm braced down-left, right arm forward holding weapon
                <path
                  d="M 48 40 L 34 50 M 48 40 L 60 46"
                  stroke={inkColor}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              ) : (
                // Normal pose
                <path
                  d="M 48 40 L 34 50 M 48 40 L 62 50"
                  stroke={inkColor}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              )}

              {/* Legs */}
              <path
                d="M 48 60 L 35 88 M 48 60 L 61 88"
                stroke={inkColor}
                strokeWidth="2.8"
                strokeLinecap="round"
              />
            </g>
          )}

          {/* STAGE 3: Equipped Weapon */}
          {stage >= 3 && renderWeapon(weapon)}
        </svg>
      )}

      {/* DESTROYED OVERLAY: Stylish red pencil cross */}
      {isDestroyed && (
        <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center p-0.5">
          <svg viewBox="0 0 100 100" className="w-full h-full animate-scribble-slash">
            <line x1="15" y1="15" x2="85" y2="85" stroke="#dc2626" strokeWidth="4.5" strokeLinecap="round" />
            <line x1="18" y1="15" x2="82" y2="85" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="12 3" />
            <line x1="85" y1="15" x2="15" y2="85" stroke="#dc2626" strokeWidth="4.5" strokeLinecap="round" />
            <line x1="82" y1="15" x2="18" y2="85" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="12 3" />
          </svg>
          <div className="absolute bottom-0.5 right-1 text-[8px] font-doodle font-bold text-rose-600/90 tracking-wider">
            K.O.
          </div>
        </div>
      )}
    </div>
  );
};
