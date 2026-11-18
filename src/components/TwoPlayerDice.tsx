import React, { useState, useEffect } from 'react';
import { RowIndex, ROW_NUMBERS, PlayerId, PlayerState, GamePhase } from '../types/game';
import { sounds } from '../utils/audio';

interface TwoPlayerDiceProps {
  currentTurn: PlayerId;
  lastRoll: RowIndex | null;
  lastRollPlayer: PlayerId | null;
  phase: GamePhase;
  players: Record<PlayerId, PlayerState>;
  disabledP1: boolean;
  disabledP2: boolean;
  onRollP1: (val: RowIndex) => void;
  onRollP2: (val: RowIndex) => void;
  localPlayerId?: PlayerId;
  isOnline: boolean;
}

export const TwoPlayerDice: React.FC<TwoPlayerDiceProps> = ({
  currentTurn,
  lastRoll,
  lastRollPlayer,
  phase,
  players,
  disabledP1,
  disabledP2,
  onRollP1,
  onRollP2,
  localPlayerId,
  isOnline
}) => {
  const [p1Display, setP1Display] = useState<RowIndex | string>(
    lastRollPlayer === 'p1' && lastRoll !== null ? lastRoll : '?'
  );
  const [p2Display, setP2Display] = useState<RowIndex | string>(
    lastRollPlayer === 'p2' && lastRoll !== null ? lastRoll : '?'
  );
  const [rollingPlayer, setRollingPlayer] = useState<PlayerId | null>(null);

  useEffect(() => {
    if (lastRoll !== null && lastRollPlayer) {
      if (lastRollPlayer === 'p1') setP1Display(lastRoll);
      if (lastRollPlayer === 'p2') setP2Display(lastRoll);
    }
  }, [lastRoll, lastRollPlayer]);

  const triggerRoll = (playerId: PlayerId) => {
    if (playerId === 'p1' && disabledP1) return;
    if (playerId === 'p2' && disabledP2) return;
    if (rollingPlayer !== null) return;

    sounds.playDiceRoll();
    setRollingPlayer(playerId);

    let counter = 0;
    const interval = setInterval(() => {
      const tempVal = ROW_NUMBERS[Math.floor(Math.random() * ROW_NUMBERS.length)];
      if (playerId === 'p1') setP1Display(tempVal);
      else setP2Display(tempVal);

      counter++;
      if (counter > 8) {
        clearInterval(interval);
        const finalVal = ROW_NUMBERS[Math.floor(Math.random() * ROW_NUMBERS.length)];
        if (playerId === 'p1') {
          setP1Display(finalVal);
          setRollingPlayer(null);
          onRollP1(finalVal);
        } else {
          setP2Display(finalVal);
          setRollingPlayer(null);
          onRollP2(finalVal);
        }
      }
    }, 85);
  };

  const isP1Locked = disabledP1 || currentTurn !== 'p1' || (isOnline && localPlayerId === 'p2');
  const isP2Locked = disabledP2 || currentTurn !== 'p2' || (isOnline && localPlayerId === 'p1');

  return (
    <div className="w-full max-w-4xl mx-auto flex items-center justify-between gap-1.5 sm:gap-4 bg-[#fdfbf7] border-2 border-gray-800 rounded-xl px-2.5 py-1.5 shadow-[2px_2px_0px_#1e293b] shrink-0 select-none">
      {/* Player 1 Die Box */}
      <div
        onClick={() => !isP1Locked && triggerRoll('p1')}
        className={`flex-1 flex items-center gap-2 p-1.5 rounded-lg border transition-all duration-200 cursor-pointer ${
          currentTurn === 'p1'
            ? 'bg-blue-50 border-blue-600 shadow-[1px_1px_0px_#1d4ed8] hover:bg-blue-100/70 active:scale-[0.98]'
            : 'bg-gray-100/60 border-gray-300 opacity-60 cursor-not-allowed'
        }`}
      >
        {/* Die Face */}
        <div
          className={`relative w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl border-2 border-blue-900 flex items-center justify-center shrink-0 shadow-xs ${
            rollingPlayer === 'p1' ? 'animate-die-tumble' : ''
          }`}
        >
          {isP1Locked && (
            <div className="absolute inset-0 bg-gray-900/20 backdrop-blur-[0.5px] rounded-xl flex items-center justify-center">
              <span className="text-xs">🔒</span>
            </div>
          )}
          <span
            className="font-hand font-extrabold text-2xl sm:text-3xl text-blue-950"
            style={{ fontFamily: "'Architects Daughter', cursive" }}
          >
            {p1Display}
          </span>
        </div>

        {/* Player Info & Status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 leading-tight">
            <span className="w-2 h-2 rounded-full bg-blue-700 shrink-0" />
            <span className="font-hand font-bold text-xs sm:text-sm text-blue-950 truncate">
              {players.p1.name}
            </span>
          </div>
          <div className="text-[10px] font-mono mt-0.5 font-bold">
            {isP1Locked ? (
              <span className="text-gray-400">LOCKED</span>
            ) : rollingPlayer === 'p1' ? (
              <span className="text-amber-600 animate-pulse">ROLLING...</span>
            ) : (
              <span className="text-blue-600 animate-bounce inline-block">TAP TO ROLL 🎲</span>
            )}
          </div>
        </div>
      </div>

      {/* Center Turn Pill */}
      <div className="flex flex-col items-center justify-center px-1 text-center shrink-0">
        <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-gray-500">TURN</span>
        <div
          className="text-[11px] sm:text-xs font-hand font-extrabold px-2 py-0.5 rounded-full border shadow-xs text-white"
          style={{
            backgroundColor: currentTurn === 'p1' ? players.p1.inkColor : players.p2.inkColor,
            borderColor: '#1e293b'
          }}
        >
          {currentTurn === 'p1' ? 'P1' : 'P2'}
        </div>
        <span className="text-[8px] text-gray-400 font-mono mt-0.5">[0, 2, 4, 6, 8]</span>
      </div>

      {/* Player 2 Die Box */}
      <div
        onClick={() => !isP2Locked && triggerRoll('p2')}
        className={`flex-1 flex items-center justify-end gap-2 p-1.5 rounded-lg border transition-all duration-200 cursor-pointer ${
          currentTurn === 'p2'
            ? 'bg-rose-50 border-rose-600 shadow-[1px_1px_0px_#be123c] hover:bg-rose-100/70 active:scale-[0.98]'
            : 'bg-gray-100/60 border-gray-300 opacity-60 cursor-not-allowed'
        }`}
      >
        {/* Player Info & Status */}
        <div className="flex-1 min-w-0 text-right">
          <div className="flex items-center justify-end gap-1 leading-tight">
            <span className="font-hand font-bold text-xs sm:text-sm text-rose-950 truncate">
              {players.p2.name}
            </span>
            <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
          </div>
          <div className="text-[10px] font-mono mt-0.5 font-bold">
            {isP2Locked ? (
              <span className="text-gray-400">LOCKED</span>
            ) : rollingPlayer === 'p2' ? (
              <span className="text-amber-600 animate-pulse">ROLLING...</span>
            ) : (
              <span className="text-rose-600 animate-bounce inline-block">TAP TO ROLL 🎲</span>
            )}
          </div>
        </div>

        {/* Die Face */}
        <div
          className={`relative w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl border-2 border-rose-900 flex items-center justify-center shrink-0 shadow-xs ${
            rollingPlayer === 'p2' ? 'animate-die-tumble' : ''
          }`}
        >
          {isP2Locked && (
            <div className="absolute inset-0 bg-gray-900/20 backdrop-blur-[0.5px] rounded-xl flex items-center justify-center">
              <span className="text-xs">🔒</span>
            </div>
          )}
          <span
            className="font-hand font-extrabold text-2xl sm:text-3xl text-rose-950"
            style={{ fontFamily: "'Architects Daughter', cursive" }}
          >
            {p2Display}
          </span>
        </div>
      </div>
    </div>
  );
};
