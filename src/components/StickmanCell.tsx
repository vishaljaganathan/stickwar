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

  // Real Game Hand-Drawn Weapons
  const renderWeapon = (wType?: WeaponType) => {
    switch (wType) {
      case 'sword':
        return (
          <g className="weapon-doodle animate-weapon-pop">
            <line x1="56" y1="52" x2="62" y2="44" stroke="#334155" strokeWidth="2.8" strokeLinecap="round" />
            <ellipse cx="61" cy="45" rx="4.5" ry="2" fill="#fbbf24" stroke="#0f172a" strokeWidth="1.2" transform="rotate(-35 61 45)" />
            <path
              d="M 62 44 Q 76 30 89 16"
              fill="none"
              stroke={inkColor}
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            <line x1="82" y1="14" x2="87" y2="19" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
            <line x1="89" y1="19" x2="94" y2="16" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
          </g>
        );
      case 'sniper':
        return (
          <g className="weapon-doodle animate-weapon-pop">
            <line x1="52" y1="46" x2="60" y2="46" stroke="#334155" strokeWidth="2.8" strokeLinecap="round" />
            <rect x="63" y="39" width="12" height="4.5" rx="1.5" fill="#0f172a" />
            <circle cx="69" cy="37" r="2.5" stroke="#ef4444" strokeWidth="1.2" fill="none" />
            <line x1="60" y1="45" x2="95" y2="45" stroke={inkColor} strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="95" cy="45" r="2.2" fill="#ef4444" className="animate-pulse" />
          </g>
        );
      case 'bazooka':
        return (
          <g className="weapon-doodle animate-weapon-pop">
            <rect
              x="52"
              y="31"
              width="39"
              height="8"
              rx="2"
              fill="#ffffff"
              stroke={inkColor}
              strokeWidth="2.5"
              transform="rotate(-15 62 35)"
            />
            <path d="M 89 22 L 95 20 L 93 27 Z" fill="#ef4444" stroke="#0f172a" strokeWidth="1" />
            <circle cx="49" cy="39" r="2.5" fill="none" stroke="#94a3b8" strokeDasharray="2 1" />
            <circle cx="44" cy="41" r="1.5" fill="none" stroke="#cbd5e1" />
          </g>
        );
      case 'bow':
        return (
          <g className="weapon-doodle animate-weapon-pop">
            <path d="M 68 22 Q 83 46 68 70" fill="none" stroke="#b45309" strokeWidth="3" strokeLinecap="round" />
            <path d="M 68 22 L 58 46 L 68 70" fill="none" stroke="#64748b" strokeWidth="1.4" strokeDasharray="3 1" />
            <line x1="56" y1="46" x2="89" y2="46" stroke="#dc2626" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M 89 46 L 84 43 M 89 46 L 84 49" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
          </g>
        );
      case 'laser':
        return (
          <g className="weapon-doodle animate-weapon-pop">
            <rect x="60" y="41" width="16" height="8" rx="2" fill="#ffffff" stroke={inkColor} strokeWidth="2.4" />
            <line x1="76" y1="45" x2="91" y2="45" stroke="#06b6d4" strokeWidth="4" strokeLinecap="round" />
            <circle cx="85" cy="45" r="4.5" stroke="#facc15" strokeWidth="1.8" fill="none" className="animate-pulse" />
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
          ? 'bg-amber-100/90 border-amber-500 shadow-inner ring-2 ring-amber-400'
          : isAttacker
          ? 'bg-emerald-100/90 border-emerald-500 ring-2 ring-emerald-400 shadow-sm'
          : canBeAttacked
          ? 'bg-rose-100/90 border-rose-500 ring-2 ring-dashed ring-rose-500 cursor-pointer hover:scale-[1.02] active:scale-95 animate-pulse'
          : 'bg-white/60 border-slate-300 hover:border-slate-400'
      }`}
      title={
        canBeAttacked
          ? `Click to attack Lane ${rowIndex}!`
          : isDestroyed
          ? `Lane ${rowIndex} is destroyed`
          : `Lane ${rowIndex}: Stage ${stage}/3`
      }
    >
      {/* Target Crosshair Badge */}
      {canBeAttacked && (
        <div className="absolute top-1 right-1 z-20 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[9px] shadow animate-bounce">
          🎯
        </div>
      )}

      {/* Rolled Highlight Dot */}
      {isCurrentTurnRow && !isDestroyed && (
        <div className="absolute top-1 left-1 z-20 w-2 h-2 rounded-full bg-amber-500 shadow-xs animate-ping" />
      )}

      {/* Stage 0: Tactical Summoning Slot */}
      {stage === 0 && !isDestroyed && (
        <div className="flex flex-col items-center justify-center gap-0.5 opacity-40">
          <div className="w-5 h-5 rounded-full border border-dashed border-slate-500 flex items-center justify-center text-[10px] text-slate-500 font-mono">
            +
          </div>
          <span className="text-[8px] font-retro font-bold text-slate-500 tracking-wider">
            SUMMON
          </span>
        </div>
      )}

      {/* Hand-Drawn Stickman SVG */}
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
                <path d="M 43 18 L 47 22 M 47 18 L 43 22" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M 49 18 L 53 22 M 53 18 L 49 22" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round" />
              </>
            ) : (
              // Fighter facial expressions
              <>
                <circle cx="45" cy="19" r="1.4" fill={inkColor} />
                <circle cx="51" cy="19" r="1.4" fill={inkColor} />
                <path
                  d={stage === 3 ? "M 44 25 Q 48 29 52 25" : "M 45 24.5 Q 48 27.5 51 24.5"}
                  fill="none"
                  stroke={inkColor}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </>
            )}
          </g>

          {/* STAGE 2 & 3: Torso, Arms, and Legs */}
          {stage >= 2 && (
            <g className="stickman-body animate-draw-stroke">
              <line x1="48" y1="32" x2="48" y2="60" stroke={inkColor} strokeWidth="3.2" strokeLinecap="round" />

              {/* Arms */}
              {stage === 3 ? (
                <path
                  d="M 48 40 L 34 50 M 48 40 L 60 46"
                  stroke={inkColor}
                  strokeWidth="2.8"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M 48 40 L 34 50 M 48 40 L 62 50"
                  stroke={inkColor}
                  strokeWidth="2.8"
                  strokeLinecap="round"
                />
              )}

              {/* Legs */}
              <path
                d="M 48 60 L 35 88 M 48 60 L 61 88"
                stroke={inkColor}
                strokeWidth="3.2"
                strokeLinecap="round"
              />
            </g>
          )}

          {/* STAGE 3: Equipped Weapon */}
          {stage >= 3 && renderWeapon(weapon)}
        </svg>
      )}

      {/* Stage Badge on Bottom */}
      {stage > 0 && !isDestroyed && (
        <div className="absolute bottom-0.5 left-1 z-20">
          <span
            className="px-1 py-0.2 rounded text-[7px] sm:text-[8px] font-retro font-black uppercase shadow-xs border"
            style={{
              backgroundColor: stage === 3 ? '#fef08a' : '#f1f5f9',
              color: stage === 3 ? '#854d0e' : '#475569',
              borderColor: '#0f172a'
            }}
          >
            {stage === 3 && weapon ? weapon.toUpperCase() : `LVL ${stage}`}
          </span>
        </div>
      )}

      {/* Destroyed Overlay */}
      {isDestroyed && (
        <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center p-0.5">
          <svg viewBox="0 0 100 100" className="w-full h-full animate-scribble-slash">
            <line x1="14" y1="14" x2="86" y2="86" stroke="#dc2626" strokeWidth="5" strokeLinecap="round" />
            <line x1="17" y1="14" x2="83" y2="86" stroke="#ef4444" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="12 3" />
            <line x1="86" y1="14" x2="14" y2="86" stroke="#dc2626" strokeWidth="5" strokeLinecap="round" />
            <line x1="83" y1="14" x2="17" y2="86" stroke="#ef4444" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="12 3" />
          </svg>
          <div className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-rose-600 text-white text-[8px] font-retro font-black tracking-wider shadow-xs -rotate-6">
            K.O.
          </div>
        </div>
      )}
    </div>
  );
};
