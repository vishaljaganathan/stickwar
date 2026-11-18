import React from 'react';
import { WEAPONS, WeaponType, RowIndex } from '../types/game';
import { sounds } from '../utils/audio';

interface WeaponSelectModalProps {
  isOpen: boolean;
  rowIndex: RowIndex;
  playerName: string;
  playerColor: string;
  canInteract: boolean;
  onSelectWeapon: (weapon: WeaponType) => void;
}

export const WeaponSelectModal: React.FC<WeaponSelectModalProps> = ({
  isOpen,
  rowIndex,
  playerName,
  playerColor,
  canInteract,
  onSelectWeapon
}) => {
  if (!isOpen) return null;

  const handlePick = (weaponId: WeaponType) => {
    if (!canInteract) return;
    sounds.playWeaponEquip();
    onSelectWeapon(weaponId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fade-in select-none">
      <div className="relative w-full max-w-md bg-[#fffefb] rounded-3xl border-3 sm:border-4 border-[#0f172a] shadow-[8px_8px_0px_#0f172a] p-5 sm:p-6 overflow-hidden">
        {/* Retro Header Tape */}
        <div className="absolute top-0 left-0 right-0 h-3.5 bg-amber-400 border-b-2 border-[#0f172a]" />

        <div className="mt-1 text-center">
          <div className="inline-block px-3 py-0.5 bg-amber-300 border-2 border-[#0f172a] rounded-full text-[11px] font-retro font-extrabold text-[#0f172a] mb-1.5 shadow-xs">
            STICKMAN ASSEMBLED! ROW {rowIndex}
          </div>
          <h2
            className="text-2xl sm:text-3xl font-retro font-extrabold text-[#0f172a] leading-tight uppercase tracking-wide"
          >
            {canInteract ? 'EQUIP YOUR STICKMAN!' : `${playerName}'S ARMORY`}
          </h2>

          {canInteract ? (
            <p className="text-xs sm:text-sm font-hand font-bold text-slate-600 mt-0.5">
              <span className="font-extrabold" style={{ color: playerColor }}>{playerName}</span>, choose your signature weapon:
            </p>
          ) : (
            <div className="mt-2 p-3 rounded-2xl bg-amber-50 border-2 border-dashed border-[#0f172a] flex flex-col items-center gap-1.5">
              <span className="text-2xl animate-bounce">🔒</span>
              <span className="font-retro font-extrabold text-sm text-[#0f172a]">
                Waiting for <strong style={{ color: playerColor }}>{playerName}</strong> to choose...
              </span>
              <span className="text-[10px] text-slate-500 font-mono">You cannot choose for your opponent!</span>
            </div>
          )}
        </div>

        {/* Weapons List */}
        <div className="grid grid-cols-1 gap-2 mt-4">
          {WEAPONS.map((w) => (
            <button
              key={w.id}
              onClick={() => handlePick(w.id)}
              disabled={!canInteract}
              className={`flex items-center gap-3 p-2.5 rounded-2xl border-2 transition-all text-left ${
                canInteract
                  ? 'border-[#0f172a] bg-white hover:bg-amber-100 active:translate-x-[2px] active:translate-y-[2px] shadow-[3px_3px_0px_#0f172a] cursor-pointer group'
                  : 'border-slate-300 bg-slate-50 opacity-60 cursor-not-allowed shadow-none'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center text-2xl shrink-0 ${
                  canInteract
                    ? 'bg-amber-300 border-[#0f172a] group-hover:scale-110 transition-transform shadow-xs'
                    : 'bg-slate-200 border-slate-400'
                }`}
              >
                {w.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-retro font-extrabold text-[#0f172a] text-sm sm:text-base flex items-center justify-between">
                  <span className="truncate">{w.name}</span>
                  {canInteract && (
                    <span className="text-xs text-amber-600 font-retro font-black shrink-0">EQUIP →</span>
                  )}
                </div>
                <div className="text-[11px] font-hand font-bold text-slate-500 truncate">
                  {w.doodleDesc}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
