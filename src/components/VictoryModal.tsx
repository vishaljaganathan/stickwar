import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { PlayerId, PlayerState } from '../types/game';
import { sounds } from '../utils/audio';

interface VictoryModalProps {
  winnerId: PlayerId | null;
  players: Record<PlayerId, PlayerState>;
  onPlayAgain: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  winnerId,
  players,
  onPlayAgain
}) => {
  if (!winnerId) return null;

  const winner = players[winnerId];

  useEffect(() => {
    sounds.playVictory();
    // Confetti burst
    const end = Date.now() + 2.5 * 1000;
    const colors = ['#2563eb', '#dc2626', '#f59e0b', '#10b981'];

    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }, [winnerId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-[#fdfbf7] rounded-3xl border-4 border-gray-900 shadow-[10px_10px_0px_#1e293b] p-6 text-center overflow-hidden">
        {/* Notebook top spiral bar */}
        <div className="absolute top-0 left-0 right-0 h-4 bg-amber-400 border-b-2 border-gray-800" />

        <div className="mt-3">
          {/* Trophy Doodle SVG */}
          <div className="w-24 h-24 mx-auto mb-2 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {/* Cup */}
              <path
                d="M 30 20 L 70 20 L 65 55 Q 50 70 35 55 Z"
                fill="#facc15"
                stroke="#1e293b"
                strokeWidth="3.5"
                strokeLinejoin="round"
              />
              {/* Handles */}
              <path
                d="M 30 25 C 18 25 18 45 31 45 M 70 25 C 82 25 82 45 69 45"
                fill="none"
                stroke="#1e293b"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              {/* Stem & Base */}
              <rect x="46" y="66" width="8" height="15" fill="#eab308" stroke="#1e293b" strokeWidth="3" />
              <rect x="32" y="81" width="36" height="10" rx="3" fill="#ca8a04" stroke="#1e293b" strokeWidth="3" />
              {/* Star doodle on trophy */}
              <path
                d="M 50 32 L 53 40 L 61 40 L 55 45 L 57 53 L 50 48 L 43 53 L 45 45 L 39 40 L 47 40 Z"
                fill="#ffffff"
                stroke="#1e293b"
                strokeWidth="1.5"
              />
            </svg>
          </div>

          <span className="text-xs uppercase tracking-widest font-bold text-gray-500 font-mono">
            Notebook Classroom Champion
          </span>

          <h2
            className="text-3xl sm:text-4xl font-extrabold mt-1 text-gray-900"
            style={{ fontFamily: "'Architects Daughter', cursive" }}
          >
            VICTORY!
          </h2>

          <p className="mt-2 text-lg sm:text-xl font-hand font-bold text-gray-800">
            <span style={{ color: winner.inkColor }}>{winner.name}</span> wiped out the entire enemy stickman army!
          </p>

          <p className="text-sm font-hand text-gray-500 mt-1">
            All 5 opponent rows have been crossed out in red ink!
          </p>

          <div className="mt-6 flex flex-col gap-2">
            <button
              onClick={onPlayAgain}
              className="w-full py-3 px-6 bg-amber-400 hover:bg-amber-300 active:scale-95 text-gray-900 font-hand font-extrabold text-xl rounded-xl border-2 border-gray-900 shadow-[4px_4px_0px_#1e293b] transition-all"
            >
              🔄 Play Another Match!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
