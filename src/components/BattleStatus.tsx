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

  const lastLogEntry = log[log.length - 1] || 'Match ready!';

  return (
    <div className="w-full max-w-4xl mx-auto px-1 shrink-0 font-hand select-none">
      {/* Floating Reaction popup */}
      {reactionNotice && (
        <div className="fixed top-12 right-3 z-50 animate-bounce bg-white border-2 border-gray-900 rounded-xl px-3 py-1 shadow-[3px_3px_0px_#1e293b] flex items-center gap-1.5">
          <span className="text-xl">{reactionNotice.emoji}</span>
          <span className="text-[10px] font-bold text-gray-700">{reactionNotice.from}</span>
        </div>
      )}

      {/* 1-Line Clean Score Bar */}
      <div className="flex items-center justify-between gap-1.5 bg-[#fef9c3] border border-yellow-400 rounded-lg px-2 py-0.5 shadow-xs text-xs">
        {/* P1 Score */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="w-2 h-2 rounded-full bg-blue-700 inline-block" />
          <span className="font-bold text-blue-950 text-[11px] sm:text-xs truncate max-w-[70px] sm:max-w-none">
            {players.p1.name}
          </span>
          <span className="font-mono font-bold text-blue-800 text-[11px] sm:text-xs">{p1Alive}/5</span>
        </div>

        {/* Center: Latest Action Note */}
        <div className="flex-1 min-w-0 text-center px-1 truncate text-gray-800 font-bold text-[10px] sm:text-xs">
          ✏️ {lastLogEntry}
        </div>

        {/* P2 Score */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="font-mono font-bold text-rose-800 text-[11px] sm:text-xs">{p2Alive}/5</span>
          <span className="font-bold text-rose-950 text-[11px] sm:text-xs truncate max-w-[70px] sm:max-w-none">
            {players.p2.name}
          </span>
          <span className="w-2 h-2 rounded-full bg-rose-600 inline-block" />
        </div>
      </div>
    </div>
  );
};
