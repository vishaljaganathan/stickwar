import React from 'react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#fdfbf7] rounded-3xl border-4 border-gray-900 shadow-[10px_10px_0px_#1e293b] p-6 max-h-[90vh] overflow-y-auto">
        {/* Header Ribbon */}
        <div className="absolute top-0 left-0 right-0 h-4 bg-amber-400 border-b-2 border-gray-800" />

        <div className="flex items-center justify-between mt-2 mb-3 border-b-2 border-blue-200 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📖</span>
            <h2
              className="text-2xl sm:text-3xl font-extrabold text-gray-900"
              style={{ fontFamily: "'Patrick Hand', cursive" }}
            >
              School Notebook Rules
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border-2 border-gray-700 bg-white hover:bg-gray-100 flex items-center justify-center font-bold text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 font-hand text-gray-800 text-sm sm:text-base leading-relaxed">
          <div className="p-3 bg-amber-100/70 rounded-xl border border-amber-300">
            <span className="font-bold text-amber-900">🎯 Objective:</span> Wipe out all 5 rows of your opponent's stickman army before they wipe out yours!
          </div>

          <div>
            <h3 className="font-bold text-lg text-gray-900 flex items-center gap-1.5">
              <span>🎲</span> The Custom Die:
            </h3>
            <p className="text-gray-600 text-sm">
              The die features 5 numbers: <strong className="text-gray-800">[0, 2, 4, 6, 8]</strong> with equal 20% weight. Rolling a number targets that specific row on your notebook grid.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-lg text-gray-900 flex items-center gap-1.5">
              <span>✏️</span> Stickman Progression Stages:
            </h3>
            <ul className="space-y-2 mt-1 text-sm">
              <li className="flex items-start gap-2">
                <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 font-bold text-xs">Stage 1</span>
                <span><strong>Draw Head:</strong> 1st roll on row draws the stickman head.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 font-bold text-xs">Stage 2</span>
                <span><strong>Draw Body:</strong> 2nd roll on row adds torso, arms, and legs.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 font-bold text-xs">Stage 3</span>
                <span><strong>Armed Stickman:</strong> 3rd roll completes the stickman and opens the <em>Weapon Selection Modal</em> (Katana, Sniper, Bazooka, etc.).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-900 font-bold text-xs">Attack!</span>
                <span><strong>Armed Attack Phase:</strong> Any roll on an already armed row triggers an attack! Click <strong>any alive opponent row</strong> to cross it out with red scribble ink!</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-lg text-rose-900 flex items-center gap-1.5">
              <span>⚠️</span> Dead Rolls:
            </h3>
            <p className="text-gray-600 text-sm">
              If you roll a row that has already been destroyed by an enemy attack, it is a <strong>Dead Roll</strong>! Your turn ends immediately. Defend wisely!
            </p>
          </div>

          <div className="pt-2 text-center">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-amber-400 hover:bg-amber-300 font-bold text-gray-900 border-2 border-gray-900 rounded-xl shadow-[3px_3px_0px_#1e293b]"
            >
              Got it! Back to Battle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
