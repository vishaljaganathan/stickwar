import React from 'react';
import { GameState, ROW_NUMBERS } from '../types/game';

interface BattleStatusProps {
  gameState: GameState;
  reactionNotice?: { emoji: string; from: string } | null;
}

export const BattleStatus: React.FC<BattleStatusProps> = ({
  gameState,
  reactionNotice
}) => {
  const { players, log } = gameState;

  const p1Alive = ROW_NUMBERS.filter((r) => !players.p1.cells[r].isDestroyed).length;
  const p2Alive = ROW_NUMBERS.filter((r) => !players.p2.cells[r].isDestroyed).length;

  const lastLogEntry = log[log.length - 1] || 'Roll to draft stickmen!';

  return (
    <div className="w-full max-w-5xl mx-auto px-1 shrink-0 select-none">
      {/* Floating Reaction popup */}
      {reactionNotice && (
        <div className="fixed top-12 right-3 z-50 animate-bounce bg-[#fffefb] border-2 border-[#0f172a] rounded-xl px-3 py-1 shadow-[3px_3px_0px_#0f172a] flex items-center gap-1.5">
          <span className="text-xl">{reactionNotice.emoji}</span>
          <span className="text-[10px] font-retro font-bold text-gray-700">{reactionNotice.from}</span>
        </div>
      )}

      {/* Retro Arcade Status Bar */}
      <div className="flex items-center justify-between gap-1.5 bg-[#fef9c3] border-2 border-[#0f172a] rounded-xl px-2.5 py-0.5 shadow-[2px_2px_0px_#0f172a] text-xs">
        {/* P1 Score Pill */}
        <div className="flex items-center gap-1 shrink-0 bg-blue-100 border border-blue-600 px-1.5 py-0.2 rounded-md">
          <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
          <span className="font-retro font-extrabold text-blue-950 text-[10px] sm:text-xs truncate max-w-[75px] sm:max-w-none">
            {players.p1.name}
          </span>
          <span className="font-mono font-black text-blue-800 text-[10px] sm:text-xs">[{p1Alive}/5]</span>
        </div>

        {/* Center: Retro Ticker Note */}
        <div className="flex-1 min-w-0 text-center px-1 truncate text-[#0f172a] font-hand font-bold text-xs sm:text-sm">
          ✏️ {lastLogEntry}
        </div>

        {/* P2 Score Pill */}
        <div className="flex items-center gap-1 shrink-0 bg-rose-100 border border-rose-600 px-1.5 py-0.2 rounded-md">
          <span className="font-mono font-black text-rose-800 text-[10px] sm:text-xs">[{p2Alive}/5]</span>
          <span className="font-retro font-extrabold text-rose-950 text-[10px] sm:text-xs truncate max-w-[75px] sm:max-w-none">
            {players.p2.name}
          </span>
          <span className="w-2 h-2 rounded-full bg-rose-600 inline-block" />
        </div>
      </div>
    </div>
  );
};
