import React from 'react';
import { WEAPONS, WeaponType, RowIndex } from '../types/game';
import { sounds } from '../utils/audio';

interface WeaponSelectModalProps {
  isOpen: boolean;
  rowIndex: RowIndex;
  playerName: string;
  playerColor: string;
  onSelectWeapon: (weapon: WeaponType) => void;
}

export const WeaponSelectModal: React.FC<WeaponSelectModalProps> = ({
  isOpen,
  rowIndex,
  playerName,
  playerColor,
  onSelectWeapon
}) => {
  if (!isOpen) return null;

  const handlePick = (weaponId: WeaponType) => {
    sounds.playWeaponEquip();
    onSelectWeapon(weaponId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-[#fdfbf7] rounded-2xl border-4 border-gray-900 shadow-[8px_8px_0px_#1e293b] p-6 overflow-hidden">
        {/* Notebook header ribbon */}
        <div className="absolute top-0 left-0 right-0 h-4 bg-amber-400 border-b-2 border-gray-800" />

        <div className="mt-2 text-center">
          <div className="inline-block px-3 py-1 bg-amber-100 border border-amber-300 rounded-full text-xs font-hand font-bold text-amber-900 mb-2">
            Stickman Assembled! Row {rowIndex}
          </div>
          <h2
            className="text-2xl sm:text-3xl font-extrabold text-gray-900"
            style={{ fontFamily: "'Patrick Hand', cursive" }}
          >
            Equip Your Stickman!
          </h2>
          <p className="text-sm font-hand text-gray-600 mt-1">
            <span className="font-bold" style={{ color: playerColor }}>{playerName}</span>, choose a signature doodle weapon:
          </p>
        </div>

        {/* Weapons List */}
        <div className="grid grid-cols-1 gap-2.5 mt-5">
          {WEAPONS.map((w) => (
            <button
              key={w.id}
              onClick={() => handlePick(w.id)}
              className="flex items-center gap-3 p-3 rounded-xl border-2 border-gray-800 bg-white hover:bg-amber-100/60 active:scale-[0.98] transition-all text-left shadow-[2px_2px_0px_#1e293b] hover:shadow-[3px_3px_0px_#1e293b] group"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-200/60 border border-gray-800 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                {w.icon}
              </div>
              <div className="flex-1">
                <div className="font-hand font-bold text-gray-900 text-base flex items-center justify-between">
                  <span>{w.name}</span>
                  <span className="text-xs text-amber-600 font-normal">Equip →</span>
                </div>
                <div className="text-xs font-hand text-gray-500">
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
