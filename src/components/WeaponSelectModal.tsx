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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-sm animate-fade-in select-none">
      <div className="relative w-full max-w-md bg-[#fdfbf7] rounded-3xl border-4 border-gray-900 shadow-[8px_8px_0px_#1e293b] p-5 sm:p-6 overflow-hidden">
        {/* Notebook top ribbon */}
        <div className="absolute top-0 left-0 right-0 h-3.5 bg-amber-400 border-b-2 border-gray-800" />

        <div className="mt-1 text-center">
          <div className="inline-block px-3 py-0.5 bg-amber-100 border border-amber-300 rounded-full text-xs font-hand font-bold text-amber-900 mb-1.5">
            Stickman Assembled! Row {rowIndex}
          </div>
          <h2
            className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight"
            style={{ fontFamily: "'Patrick Hand', cursive" }}
          >
            {canInteract ? 'Equip Your Stickman!' : `${playerName}'s Armory`}
          </h2>

          {canInteract ? (
            <p className="text-xs sm:text-sm font-hand text-gray-600 mt-1">
              <span className="font-bold" style={{ color: playerColor }}>{playerName}</span>, choose a signature doodle weapon:
            </p>
          ) : (
            <div className="mt-2 p-3 rounded-xl bg-gray-100 border-2 border-dashed border-gray-400 flex flex-col items-center gap-1.5">
              <span className="text-2xl animate-bounce">🔒</span>
              <span className="font-hand font-bold text-sm text-gray-700">
                Waiting for <strong style={{ color: playerColor }}>{playerName}</strong> to pick their weapon...
              </span>
              <span className="text-xs text-gray-400 font-mono">You cannot choose for the opponent!</span>
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
              className={`flex items-center gap-3 p-2.5 rounded-xl border-2 transition-all text-left ${
                canInteract
                  ? 'border-gray-800 bg-white hover:bg-amber-100/60 active:scale-[0.98] shadow-[2px_2px_0px_#1e293b] cursor-pointer group'
                  : 'border-gray-300 bg-gray-50 opacity-60 cursor-not-allowed shadow-none'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-lg border flex items-center justify-center text-xl shrink-0 ${
                  canInteract
                    ? 'bg-amber-200/60 border-gray-800 group-hover:scale-110 transition-transform'
                    : 'bg-gray-200 border-gray-400'
                }`}
              >
                {w.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-hand font-bold text-gray-900 text-sm sm:text-base flex items-center justify-between">
                  <span className="truncate">{w.name}</span>
                  {canInteract && (
                    <span className="text-xs text-amber-600 font-normal shrink-0">Equip →</span>
                  )}
                </div>
                <div className="text-[11px] font-hand text-gray-500 truncate">
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
