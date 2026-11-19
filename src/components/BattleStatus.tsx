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
  const { currentTurn, phase, players, lastRoll, lastRollPlayer } = gameState;
  const currentTurnPlayer = players[currentTurn];
  const wasLastRollOdd = lastRoll !== null && lastRoll % 2 !== 0 && lastRollPlayer !== null;
  const lastRoller = lastRollPlayer ? players[lastRollPlayer] : null;

  return (
    <div className="w-full max-w-5xl mx-auto px-0.5 sm:px-1 shrink-0 select-none my-0.5 flex items-center justify-between gap-1 sm:gap-1.5">
      {/* Reaction popup */}
      {reactionNotice && (
        <div className="fixed top-12 right-3 z-50 animate-bounce bg-white border-2 border-[#0f172a] rounded-2xl px-2.5 py-0.5 shadow-[4px_4px_0px_#0f172a] flex items-center gap-1">
          <span className="text-xl">{reactionNotice.emoji}</span>
          <span className="text-[9px] font-retro font-bold text-slate-800">{reactionNotice.from}</span>
        </div>
      )}

      {/* Main Tactical Status Indicator */}
      <div
        className={`flex-1 px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg sm:rounded-xl border sm:border-2 flex items-center justify-center gap-1.5 shadow-xs transition-all ${
          phase === 'attack_target'
            ? 'bg-rose-500 text-white border-rose-900 animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.6)]'
            : currentTurn === 'p1'
            ? 'bg-blue-600/90 text-white border-blue-950 shadow-[0_0_10px_rgba(37,99,235,0.4)]'
            : currentTurn === 'p2'
            ? 'bg-rose-600/90 text-white border-rose-950 shadow-[0_0_10px_rgba(225,29,72,0.4)]'
            : currentTurn === 'p3'
            ? 'bg-emerald-600/90 text-white border-emerald-950 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
            : 'bg-purple-600/90 text-white border-purple-950 shadow-[0_0_10px_rgba(168,85,247,0.4)]'
        }`}
      >
        <span className="text-xs sm:text-sm shrink-0">
          {phase === 'attack_target' ? '⚔️' : phase === 'weapon_select' ? '🛠️' : '🎲'}
        </span>
        <span className="font-retro font-black text-[10px] sm:text-xs tracking-wide uppercase truncate">
          {phase === 'revealing_roll'
            ? `🎲 ${lastRoller ? lastRoller.name : currentTurnPlayer.name} ROLLED ${lastRoll}!`
            : phase === 'attack_target'
            ? `TARGETING: ${currentTurnPlayer.name} TAP AN ENEMY LANE!`
            : phase === 'weapon_select'
            ? `${currentTurnPlayer.name} IS SELECTING A WEAPON...`
            : wasLastRollOdd && lastRoller
            ? `⚠️ ${lastRoller.name} ROLLED ODD (${lastRoll})! ${currentTurnPlayer.name}'S TURN!`
            : `${currentTurnPlayer.name}'S TURN: ROLL YOUR DIE!`}
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
