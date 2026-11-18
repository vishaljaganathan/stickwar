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
    const end = Date.now() + 2.5 * 1000;
    const colors = ['#2563eb', '#dc2626', '#f59e0b', '#10b981', '#a855f7'];

    (function frame() {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors
      });
      confetti({
        particleCount: 5,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fade-in select-none">
      <div className="relative w-full max-w-md bg-[#fffefb] rounded-3xl border-3 sm:border-4 border-[#0f172a] shadow-[10px_10px_0px_#0f172a] p-6 text-center overflow-hidden">
        {/* Retro Header Ribbon */}
        <div className="absolute top-0 left-0 right-0 h-4 bg-amber-400 border-b-2 border-[#0f172a]" />

        <div className="mt-3">
          {/* Trophy Doodle */}
          <div className="w-22 h-22 mx-auto mb-2 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
              <path
                d="M 30 20 L 70 20 L 65 55 Q 50 70 35 55 Z"
                fill="#facc15"
                stroke="#0f172a"
                strokeWidth="3.5"
                strokeLinejoin="round"
              />
              <path
                d="M 30 25 C 16 25 16 45 31 45 M 70 25 C 84 25 84 45 69 45"
                fill="none"
                stroke="#0f172a"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <rect x="46" y="66" width="8" height="15" fill="#eab308" stroke="#0f172a" strokeWidth="3" />
              <rect x="30" y="81" width="40" height="11" rx="3" fill="#ca8a04" stroke="#0f172a" strokeWidth="3" />
              <path
                d="M 50 32 L 53 40 L 61 40 L 55 45 L 57 53 L 50 48 L 43 53 L 45 45 L 39 40 L 47 40 Z"
                fill="#ffffff"
                stroke="#0f172a"
                strokeWidth="1.5"
              />
            </svg>
          </div>

          <span className="px-2.5 py-0.5 rounded-full bg-amber-300 border border-[#0f172a] text-[10px] font-mono font-extrabold uppercase tracking-widest text-[#0f172a] shadow-xs">
            ★ NOTEBOOK CHAMPION ★
          </span>

          <h2
            className="text-4xl sm:text-5xl font-retro font-black mt-2 text-[#0f172a] tracking-wider"
          >
            VICTORY!
          </h2>

          <p className="mt-2 text-base sm:text-lg font-retro font-bold text-slate-800">
            <span style={{ color: winner.inkColor }}>{winner.name}</span> wiped out the entire enemy army!
          </p>

          <p className="text-xs font-hand font-bold text-slate-500 mt-0.5">
            All 5 opponent rows have been crossed out in red ink!
          </p>

          <div className="mt-6">
            <button
              onClick={onPlayAgain}
              className="btn-retro w-full py-3 px-6 bg-amber-400 hover:bg-amber-300 active:translate-x-[2px] active:translate-y-[2px] text-[#0f172a] font-retro font-black text-lg sm:text-xl rounded-2xl border-3 border-[#0f172a] shadow-[4px_4px_0px_#0f172a]"
            >
              🔄 PLAY ANOTHER MATCH!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
