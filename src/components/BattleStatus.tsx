import React from 'react';
import { GameState } from '../types/game';

interface BattleStatusProps {
  gameState: GameState;
  reactionNotice?: { emoji: string; from: string } | null;
  onSendReaction?: (reaction: string) => void;
}

const QUICK_EMOJIS = ['💥', '🎯', '💀', '🔥', '🏆', '😱'];

export const BattleStatus: React.FC<BattleStatusProps> = ({
  gameState,
  reactionNotice,
  onSendReaction
}) => {
  const { currentTurn, phase, players } = gameState;
  const currentTurnPlayer = players[currentTurn];

  return (
    <div className="w-full max-w-5xl mx-auto px-1 shrink-0 select-none my-0.5 flex items-center justify-between gap-1.5">
      {/* Reaction popup */}
      {reactionNotice && (
        <div className="fixed top-14 right-4 z-50 animate-bounce bg-white border-2 border-[#0f172a] rounded-2xl px-3 py-1 shadow-[4px_4px_0px_#0f172a] flex items-center gap-1.5">
          <span className="text-2xl">{reactionNotice.emoji}</span>
          <span className="text-[10px] font-retro font-bold text-slate-800">{reactionNotice.from}</span>
        </div>
      )}

      {/* Main Tactical Status Indicator */}
      <div
        className={`flex-1 px-3 py-1 rounded-xl border-2 flex items-center justify-center gap-2 shadow-sm transition-all ${
          phase === 'attack_target'
            ? 'bg-rose-500 text-white border-rose-900 animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.6)]'
            : currentTurn === 'p1'
            ? 'bg-blue-600/90 text-white border-blue-950 shadow-[0_0_10px_rgba(37,99,235,0.4)]'
            : 'bg-rose-600/90 text-white border-rose-950 shadow-[0_0_10px_rgba(225,29,72,0.4)]'
        }`}
      >
        <span className="text-sm">
          {phase === 'attack_target' ? '⚔️' : phase === 'weapon_select' ? '🛠️' : '🎲'}
        </span>
        <span className="font-retro font-black text-xs sm:text-sm tracking-wide uppercase">
          {phase === 'attack_target'
            ? `TARGETING PHASE: ${currentTurnPlayer.name} CHOOSE AN ENEMY ROW TO STRIKE!`
            : phase === 'weapon_select'
            ? `${currentTurnPlayer.name} IS SELECTING A WEAPON...`
            : `${currentTurnPlayer.name}'S TURN: TAP YOUR DICE PEDESTAL!`}
        </span>
      </div>

      {/* Quick Reaction Emotes */}
      {onSendReaction && (
        <div className="hidden sm:flex items-center gap-1 shrink-0 bg-[#1e293b]/80 border border-slate-700 px-2 py-0.5 rounded-xl">
          <span className="text-[10px] font-retro text-amber-300 font-bold mr-0.5">EMOTE:</span>
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onSendReaction(emoji)}
              className="text-xs hover:scale-130 active:scale-95 transition-transform p-0.5"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
