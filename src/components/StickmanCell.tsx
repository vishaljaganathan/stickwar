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

  // Modern-Retro Weapons rendered with zero body/head collision
  // Hand grip: (60, 46). Weapons project cleanly into open space (x: 60..94, y: 16..60)
  const renderWeapon = (wType?: WeaponType) => {
    switch (wType) {
      case 'sword':
        return (
          <g className="weapon-doodle animate-weapon-pop">
            {/* Grip in right hand */}
            <line x1="56" y1="52" x2="62" y2="44" stroke="#334155" strokeWidth="2.8" strokeLinecap="round" />
            {/* Gold Tsuba / Handguard */}
            <ellipse cx="61" cy="45" rx="4.5" ry="2" fill="#fbbf24" stroke="#0f172a" strokeWidth="1.2" transform="rotate(-35 61 45)" />
            {/* Curved Steel Katana Blade */}
            <path
              d="M 62 44 Q 76 30 89 16"
              fill="none"
              stroke={inkColor}
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Shiny edge glints */}
            <line x1="82" y1="14" x2="87" y2="19" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="89" y1="19" x2="94" y2="16" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" />
          </g>
        );
      case 'sniper':
        return (
          <g className="weapon-doodle animate-weapon-pop">
            {/* Stock rested against body */}
            <line x1="52" y1="46" x2="60" y2="46" stroke="#334155" strokeWidth="2.8" strokeLinecap="round" />
            {/* Scope mounted on top */}
            <rect x="63" y="39" width="12" height="4.5" rx="1.5" fill="#0f172a" />
            <circle cx="69" cy="37" r="2.5" stroke="#ef4444" strokeWidth="1.2" fill="none" />
            {/* Long thin rifle barrel pointing forward */}
            <line x1="60" y1="45" x2="95" y2="45" stroke={inkColor} strokeWidth="2.4" strokeLinecap="round" />
            {/* Laser pointer glow */}
            <circle cx="95" cy="45" r="2" fill="#ef4444" className="animate-pulse" />
          </g>
        );
      case 'bazooka':
        return (
          <g className="weapon-doodle animate-weapon-pop">
            {/* Launcher tube resting over shoulder, pointing up-right */}
            <rect
              x="52"
              y="31"
              width="39"
              height="8"
              rx="2"
              fill="#ffffff"
              stroke={inkColor}
              strokeWidth="2.4"
              transform="rotate(-15 62 35)"
            />
            {/* Rocket tip */}
            <path d="M 89 22 L 95 20 L 93 27 Z" fill="#ef4444" stroke="#0f172a" strokeWidth="1" />
            {/* Comic smoke puffs behind */}
            <circle cx="49" cy="39" r="2.5" fill="none" stroke="#94a3b8" strokeDasharray="2 1" />
            <circle cx="44" cy="41" r="1.5" fill="none" stroke="#cbd5e1" />
          </g>
        );
      case 'bow':
        return (
          <g className="weapon-doodle animate-weapon-pop">
            {/* Wooden ruler bow stave with markings */}
            <path d="M 68 22 Q 83 46 68 70" fill="none" stroke="#b45309" strokeWidth="2.8" strokeLinecap="round" />
            {/* Bowstring drawn to hand */}
            <path d="M 68 22 L 58 46 L 68 70" fill="none" stroke="#64748b" strokeWidth="1.2" strokeDasharray="3 1" />
            {/* Arrow nocked & pointing forward */}
            <line x1="56" y1="46" x2="89" y2="46" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M 89 46 L 84 43 M 89 46 L 84 49" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
          </g>
        );
      case 'laser':
        return (
          <g className="weapon-doodle animate-weapon-pop">
            {/* Futuristic neon raygun */}
            <rect x="60" y="41" width="16" height="8" rx="2" fill="#ffffff" stroke={inkColor} strokeWidth="2.2" />
            <line x1="76" y1="45" x2="91" y2="45" stroke="#06b6d4" strokeWidth="3.5" strokeLinecap="round" />
            {/* Energy glow ring */}
            <circle cx="85" cy="45" r="4.5" stroke="#facc15" strokeWidth="1.5" fill="none" className="animate-pulse" />
          </g>
        );
      default:
        return null;
    }
  };

  return (
    <div
      onClick={canBeAttacked ? onAttackClick : undefined}
      className={`relative w-full h-full rounded-xl transition-all duration-150 flex items-center justify-center select-none overflow-hidden p-0.5 border-2 ${
        isCurrentTurnRow && !isDestroyed
          ? 'bg-amber-100/80 border-amber-500 shadow-xs ring-2 ring-amber-300'
          : isAttacker
          ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-300'
          : canBeAttacked
          ? 'bg-rose-50/90 border-rose-500 ring-2 ring-dashed ring-rose-400 cursor-pointer hover:bg-rose-100 active:scale-95'
          : 'bg-white/40 border-[#0f172a]/20 hover:border-[#0f172a]/40'
      }`}
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

      {/* Target indicator icon (Corner only, never obstructs drawing) */}
      {canBeAttacked && (
        <div className="absolute top-1 right-1 z-20 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[9px] shadow animate-pulse">
          🎯
        </div>
      )}

      {/* Rolled indicator dot */}
      {isCurrentTurnRow && !isDestroyed && (
        <div className="absolute top-1 left-1 z-20 w-2 h-2 rounded-full bg-amber-500 shadow-xs animate-ping" />
      )}

      {/* Stage 0: Clean Blueprint Slot */}
      {stage === 0 && !isDestroyed && (
        <div className="text-gray-300 text-sm sm:text-base font-retro font-bold select-none opacity-60">
          +
        </div>
      )}

      {/* Hand-Drawn Stickman SVG - Scales cleanly inside cell without distortion */}
      {stage > 0 && (
        <svg
          viewBox="0 0 100 100"
          className="h-full w-full max-h-full max-w-full aspect-square z-10 transition-transform duration-200 pointer-events-none animate-idle-doodle"
        >
          {/* STAGE 1: Head & Face */}
          <g className="stickman-head animate-draw-stroke">
            <circle
              cx="48"
              cy="21"
              r="11"
              fill="#ffffff"
              stroke={inkColor}
              strokeWidth="2.8"
              strokeLinecap="round"
            />
            {isDestroyed ? (
              // Knocked out dead X eyes
              <>
                <path d="M 43 18 L 47 22 M 47 18 L 43 22" stroke="#dc2626" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M 49 18 L 53 22 M 53 18 L 49 22" stroke="#dc2626" strokeWidth="1.6" strokeLinecap="round" />
              </>
            ) : (
              // Lively stickman face with smile & brows
              <>
                <circle cx="45" cy="19" r="1.4" fill={inkColor} />
                <circle cx="51" cy="19" r="1.4" fill={inkColor} />
                <path
                  d={stage === 3 ? "M 44 25 Q 48 29 52 25" : "M 45 24.5 Q 48 27.5 51 24.5"}
                  fill="none"
                  stroke={inkColor}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </>
            )}
          </g>

          {/* STAGE 2 & 3: Torso, Arms, and Legs */}
          {stage >= 2 && (
            <g className="stickman-body animate-draw-stroke">
              {/* Torso */}
              <line x1="48" y1="32" x2="48" y2="60" stroke={inkColor} strokeWidth="3" strokeLinecap="round" />

              {/* Arms */}
              {stage === 3 ? (
                // Armed pose: left arm braced back, right arm forward holding weapon
                <path
                  d="M 48 40 L 34 50 M 48 40 L 60 46"
                  stroke={inkColor}
                  strokeWidth="2.6"
                  strokeLinecap="round"
                />
              ) : (
                // Normal pose
                <path
                  d="M 48 40 L 34 50 M 48 40 L 62 50"
                  stroke={inkColor}
                  strokeWidth="2.6"
                  strokeLinecap="round"
                />
              )}

              {/* Legs */}
              <path
                d="M 48 60 L 35 88 M 48 60 L 61 88"
                stroke={inkColor}
                strokeWidth="3"
                strokeLinecap="round"
              />
            </g>
          )}

          {/* STAGE 3: Equipped Weapon */}
          {stage >= 3 && renderWeapon(weapon)}
        </svg>
      )}

      {/* DESTROYED OVERLAY: Stylish red pencil cross with K.O. stamp */}
      {isDestroyed && (
        <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center p-0.5">
          <svg viewBox="0 0 100 100" className="w-full h-full animate-scribble-slash">
            <line x1="14" y1="14" x2="86" y2="86" stroke="#dc2626" strokeWidth="4.8" strokeLinecap="round" />
            <line x1="17" y1="14" x2="83" y2="86" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="12 3" />
            <line x1="86" y1="14" x2="14" y2="86" stroke="#dc2626" strokeWidth="4.8" strokeLinecap="round" />
            <line x1="83" y1="14" x2="17" y2="86" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="12 3" />
          </svg>
          <div className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-rose-600 text-white text-[8px] font-retro font-black tracking-wider shadow-xs -rotate-6">
            K.O.
          </div>
        </div>
      )}
    </div>
  );
};
