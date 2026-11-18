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

  // Clean hand-drawn weapons with ZERO body/head collisions
  // Stickman anatomy: Head center (44, 23), Torso (44, 34 -> 44, 62), Right Hand at (58, 48)
  // All weapons originate cleanly at the right hand (58, 48) and extend outward to the right
  const renderWeapon = (wType?: WeaponType) => {
    switch (wType) {
      case 'sword':
        return (
          <g className="weapon-doodle animate-weapon-pop">
            {/* Handle / Grip in hand */}
            <line x1="54" y1="53" x2="60" y2="46" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
            {/* Handguard */}
            <line x1="56" y1="44" x2="64" y2="50" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
            {/* Katana Blade pointing up-right */}
            <path
              d="M 60 46 Q 74 34 88 18"
              fill="none"
              stroke={inkColor}
              strokeWidth="2.8"
              strokeLinecap="round"
            />
            {/* Blade edge shine & sparkles */}
            <line x1="80" y1="16" x2="85" y2="21" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="89" y1="20" x2="94" y2="18" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        );
      case 'sniper':
        return (
          <g className="weapon-doodle animate-weapon-pop">
            {/* Stock near body */}
            <line x1="48" y1="48" x2="56" y2="48" stroke="#475569" strokeWidth="2.5" />
            {/* Receiver / Scope */}
            <rect x="56" y="44" width="12" height="4" rx="1" fill={inkColor} />
            <circle cx="62" cy="42" r="2.5" stroke="#ef4444" strokeWidth="1" fill="none" />
            {/* Long thin rifle barrel pointing forward */}
            <line x1="68" y1="46" x2="94" y2="46" stroke={inkColor} strokeWidth="2.2" strokeLinecap="round" />
            {/* Muzzle flash / laser dot */}
            <circle cx="94" cy="46" r="1.5" fill="#ef4444" />
          </g>
        );
      case 'bazooka':
        return (
          <g className="weapon-doodle animate-weapon-pop">
            {/* Bazooka launcher tube resting over shoulder angled up */}
            <rect
              x="46"
              y="32"
              width="42"
              height="7"
              rx="1.5"
              fill="none"
              stroke={inkColor}
              strokeWidth="2.2"
              transform="rotate(-18 56 38)"
            />
            {/* Rocket tip */}
            <path d="M 85 24 L 91 22 L 89 29 Z" fill="#ef4444" stroke="#ef4444" strokeWidth="0.8" />
            {/* Smoke rings behind */}
            <circle cx="44" cy="40" r="2.5" fill="none" stroke="#94a3b8" strokeDasharray="2 1" />
          </g>
        );
      case 'bow':
        return (
          <g className="weapon-doodle animate-weapon-pop">
            {/* Wooden ruler bow stave */}
            <path d="M 64 24 Q 78 48 64 72" fill="none" stroke="#b45309" strokeWidth="2.4" strokeLinecap="round" />
            {/* Bowstring */}
            <path d="M 64 24 L 56 48 L 64 72" fill="none" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 1" />
            {/* Arrow nocked & drawn forward */}
            <line x1="54" y1="48" x2="86" y2="48" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
            <path d="M 86 48 L 81 45 M 86 48 L 81 51" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round" />
          </g>
        );
      case 'laser':
        return (
          <g className="weapon-doodle animate-weapon-pop">
            {/* Futuristic blaster in hand */}
            <rect x="58" y="44" width="16" height="7" rx="1.5" fill="none" stroke={inkColor} strokeWidth="2" />
            <line x1="74" y1="47.5" x2="88" y2="47.5" stroke="#06b6d4" strokeWidth="3" strokeLinecap="round" />
            {/* Laser power ring */}
            <circle cx="82" cy="47.5" r="4" stroke="#facc15" strokeWidth="1" fill="none" />
          </g>
        );
      default:
        return null;
    }
  };

  return (
    <div
      onClick={canBeAttacked ? onAttackClick : undefined}
      className={`relative w-full h-full min-h-[44px] rounded-lg transition-all duration-200 flex items-center justify-center select-none overflow-hidden border
        ${
          isCurrentTurnRow && !isDestroyed
            ? 'bg-amber-100/70 border-amber-400 ring-2 ring-amber-300 shadow-xs'
            : isAttacker
            ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-300'
            : canBeAttacked
            ? 'bg-rose-50/80 border-rose-500 ring-2 ring-dashed ring-rose-400 cursor-pointer hover:bg-rose-100 active:scale-95'
            : 'bg-transparent border-blue-200/70'
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
      {/* Subtle notebook horizontal ruling guides */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between py-1 opacity-20">
        <div className="w-full border-b border-blue-400" />
        <div className="w-full border-b border-blue-400" />
      </div>

      {/* Target indicator badge for attack phase (Corner icon, never blocks stickman) */}
      {canBeAttacked && (
        <div className="absolute top-1 right-1 z-20 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[9px] shadow animate-pulse">
          🎯
        </div>
      )}

      {/* Rolled indicator dot (Non-intrusive) */}
      {isCurrentTurnRow && !isDestroyed && (
        <div className="absolute top-1 left-1 z-20 w-2 h-2 rounded-full bg-amber-500 shadow-xs animate-ping" />
      )}

      {/* Stage 0: Clean Blueprint Slot */}
      {stage === 0 && !isDestroyed && (
        <div className="text-gray-300 text-xs sm:text-sm font-mono select-none">
          +
        </div>
      )}

      {/* Hand-Drawn Stickman SVG */}
      {stage > 0 && (
        <svg
          viewBox="0 0 100 100"
          className="h-full w-auto max-h-[95%] aspect-square z-10 transition-transform duration-200 pointer-events-none"
        >
          {/* STAGE 1: Head */}
          <g className="stickman-head animate-draw-stroke">
            {/* Hand-drawn head circle */}
            <circle
              cx="44"
              cy="23"
              r="11"
              fill="none"
              stroke={inkColor}
              strokeWidth="2.6"
              strokeLinecap="round"
            />
            {isDestroyed ? (
              // Dead eyes
              <>
                <path d="M 39 20 L 43 24 M 43 20 L 39 24" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M 45 20 L 49 24 M 49 20 L 45 24" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" />
              </>
            ) : (
              // Doodle Face
              <>
                <circle cx="41" cy="21.5" r="1.3" fill={inkColor} />
                <circle cx="47" cy="21.5" r="1.3" fill={inkColor} />
                <path
                  d={stage === 3 ? "M 40 27 Q 44 31 48 27" : "M 41 26.5 Q 44 29.5 47 26.5"}
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
              <line x1="44" y1="34" x2="44" y2="62" stroke={inkColor} strokeWidth="2.8" strokeLinecap="round" />

              {/* Arms */}
              {stage === 3 ? (
                // Armed pose: left arm braced back, right arm forward holding weapon
                <path
                  d="M 44 42 L 30 52 M 44 42 L 58 48"
                  stroke={inkColor}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              ) : (
                // Normal pose
                <path
                  d="M 44 42 L 30 52 M 44 42 L 58 52"
                  stroke={inkColor}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              )}

              {/* Legs */}
              <path
                d="M 44 62 L 31 88 M 44 62 L 57 88"
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

      {/* DESTROYED OVERLAY: Clean, stylish red pencil scribble cross */}
      {isDestroyed && (
        <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center p-1">
          <svg viewBox="0 0 100 100" className="w-full h-full animate-scribble-slash">
            {/* Crisp hand-drawn Red X */}
            <line x1="15" y1="18" x2="85" y2="82" stroke="#dc2626" strokeWidth="4.5" strokeLinecap="round" />
            <line x1="18" y1="18" x2="82" y2="82" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="14 3" />
            <line x1="85" y1="18" x2="15" y2="82" stroke="#dc2626" strokeWidth="4.5" strokeLinecap="round" />
            <line x1="82" y1="18" x2="18" y2="82" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="14 3" />
          </svg>
          {/* Subtle small K.O. corner tag */}
          <div className="absolute bottom-0.5 right-1 text-[9px] font-doodle font-bold text-rose-600/90 tracking-wider">
            K.O.
          </div>
        </div>
      )}
    </div>
  );
};
