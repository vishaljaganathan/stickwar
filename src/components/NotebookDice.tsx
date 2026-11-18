import React, { useState } from 'react';
import { RowIndex, ROW_NUMBERS } from '../types/game';
import { sounds } from '../utils/audio';

interface NotebookDiceProps {
  currentRoll: RowIndex | null;
  isRolling: boolean;
  disabled: boolean;
  onRoll: (value: RowIndex) => void;
  turnPlayerName: string;
  turnPlayerColor: string;
}

export const NotebookDice: React.FC<NotebookDiceProps> = ({
  currentRoll,
  isRolling,
  disabled,
  onRoll,
  turnPlayerName,
  turnPlayerColor
}) => {
  const [displayValue, setDisplayValue] = useState<RowIndex | string>(currentRoll !== null ? currentRoll : '?');
  const [tumbleClass, setTumbleClass] = useState<string>('');

  const handleRollClick = () => {
    if (disabled || isRolling) return;

    sounds.playDiceRoll();
    setTumbleClass('animate-die-tumble');

    // Rolling jitter effect through numbers [0, 2, 4, 6, 8]
    let counter = 0;
    const interval = setInterval(() => {
      const randomTemp = ROW_NUMBERS[Math.floor(Math.random() * ROW_NUMBERS.length)];
      setDisplayValue(randomTemp);
      counter++;

      if (counter > 8) {
        clearInterval(interval);
        // Final roll selection with uniform 20% weight:
        const finalValue = ROW_NUMBERS[Math.floor(Math.random() * ROW_NUMBERS.length)];
        setDisplayValue(finalValue);
        setTumbleClass('');
        onRoll(finalValue);
      }
    }, 90);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 bg-amber-50/80 border-2 border-dashed border-amber-300 rounded-xl p-4 shadow-inner">
      <div className="text-sm font-hand font-bold text-gray-700 flex items-center gap-1.5">
        <span>Turn:</span>
        <span
          className="px-2 py-0.5 rounded font-bold text-white shadow-sm text-sm"
          style={{ backgroundColor: turnPlayerColor }}
        >
          {turnPlayerName}
        </span>
      </div>

      {/* 3D-effect Notebook Paper Die */}
      <div
        className={`relative w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-2xl border-4 border-gray-800 shadow-[6px_6px_0px_#1e293b] flex items-center justify-center cursor-pointer transition-transform duration-200 select-none
          ${tumbleClass}
          ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:scale-105 active:scale-95 hover:shadow-[4px_4px_0px_#1e293b]'}
        `}
        onClick={handleRollClick}
      >
        {/* Paper texture dots on corners */}
        <span className="absolute top-1.5 left-2 text-[10px] text-gray-400 font-mono">🎲</span>
        <span className="absolute bottom-1.5 right-2 text-[10px] text-gray-400 font-mono">0-8</span>

        {/* Die Face Number */}
        <span
          className="font-hand font-extrabold text-4xl sm:text-5xl text-gray-900 transition-all"
          style={{ fontFamily: "'Architects Daughter', cursive, sans-serif" }}
        >
          {isRolling ? displayValue : currentRoll !== null ? currentRoll : '?'}
        </span>
      </div>

      {/* Action Button */}
      <button
        onClick={handleRollClick}
        disabled={disabled || isRolling}
        className={`px-5 py-2 font-hand font-bold text-base sm:text-lg rounded-lg border-2 border-gray-800 shadow-[3px_3px_0px_#1e293b] transition-all flex items-center gap-2
          ${disabled || isRolling
            ? 'bg-gray-200 text-gray-400 border-gray-400 shadow-none cursor-not-allowed'
            : 'bg-amber-400 hover:bg-amber-300 text-gray-900 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#1e293b]'
          }
        `}
      >
        <span>🎲</span>
        <span>{isRolling ? 'Rolling...' : 'Roll Notebook Die'}</span>
      </button>

      <div className="text-xs text-gray-500 font-hand text-center">
        Equal 20% weight: <span className="font-bold text-gray-700">[0, 2, 4, 6, 8]</span>
      </div>
    </div>
  );
};
