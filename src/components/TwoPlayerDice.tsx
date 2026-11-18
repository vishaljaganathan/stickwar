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
    lastRollPlayer === 'p1' && lastRoll !== null ? lastRoll : '-'
  );
  const [p2Display, setP2Display] = useState<RowIndex | string>(
    lastRollPlayer === 'p2' && lastRoll !== null ? lastRoll : '-'
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
    <div className="w-full max-w-4xl mx-auto flex items-center justify-between gap-2 sm:gap-4 bg-white/80 backdrop-blur-sm border-2 border-gray-800 rounded-xl px-3 py-1.5 sm:py-2 shadow-[3px_3px_0px_#1e293b]">
      {/* Player 1 Die Box */}
      <div
        className={`flex-1 flex items-center justify-between sm:justify-start gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-lg border-2 transition-all duration-200 ${
          currentTurn === 'p1'
            ? 'bg-blue-50/90 border-blue-600 shadow-[2px_2px_0px_#1d4ed8]'
            : 'bg-gray-100/70 border-gray-300 opacity-65'
        }`}
      >
        {/* Die Face */}
        <div
          onClick={() => !isP1Locked && triggerRoll('p1')}
          className={`relative w-11 h-11 sm:w-13 sm:h-13 bg-white rounded-xl border-3 border-blue-900 flex items-center justify-center select-none shadow-[2px_2px_0px_#1e3a8a] transition-transform ${
            rollingPlayer === 'p1' ? 'animate-die-tumble' : ''
          } ${
            isP1Locked
              ? 'cursor-not-allowed bg-gray-50'
              : 'cursor-pointer hover:scale-105 active:scale-95'
          }`}
        >
          {isP1Locked && (
            <div className="absolute -top-1.5 -right-1.5 bg-gray-800 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow">
              🔒
            </div>
          )}
          <span
            className="font-hand font-extrabold text-2xl sm:text-3xl text-blue-900"
            style={{ fontFamily: "'Architects Daughter', cursive" }}
          >
            {rollingPlayer === 'p1' ? p1Display : p1Display}
          </span>
        </div>

        {/* Info & Roll Button */}
        <div className="flex flex-col items-start min-w-0">
          <div className="flex items-center gap-1 leading-tight truncate">
            <span className="w-2 h-2 rounded-full bg-blue-700 inline-block shrink-0" />
            <span className="font-hand font-bold text-xs sm:text-sm text-blue-950 truncate">
              {players.p1.name}
            </span>
          </div>
          <button
            onClick={() => triggerRoll('p1')}
            disabled={isP1Locked || rollingPlayer !== null}
            className={`mt-1 px-2.5 py-0.5 sm:py-1 rounded-md text-[11px] sm:text-xs font-hand font-bold border transition-all flex items-center gap-1 ${
              isP1Locked || rollingPlayer !== null
                ? 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-950 shadow-[1px_1px_0px_#1e293b] active:scale-95'
            }`}
          >
            <span>{isP1Locked ? '🔒 Locked' : rollingPlayer === 'p1' ? 'Rolling...' : '🎲 Roll P1'}</span>
          </button>
        </div>
      </div>

      {/* Center Status / Divider */}
      <div className="flex flex-col items-center justify-center px-1 text-center select-none shrink-0">
        <div className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider text-gray-500">
          Current Turn
        </div>
        <div
          className="text-xs sm:text-sm font-hand font-extrabold px-2 py-0.5 rounded-full border shadow-sm text-white"
          style={{
            backgroundColor: currentTurn === 'p1' ? players.p1.inkColor : players.p2.inkColor,
            borderColor: '#1e293b'
          }}
        >
          {currentTurn === 'p1' ? players.p1.name : players.p2.name}
        </div>
        <span className="text-[9px] text-gray-400 font-mono mt-0.5">[0, 2, 4, 6, 8]</span>
      </div>

      {/* Player 2 Die Box */}
      <div
        className={`flex-1 flex items-center justify-between sm:justify-end gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-lg border-2 transition-all duration-200 ${
          currentTurn === 'p2'
            ? 'bg-rose-50/90 border-rose-600 shadow-[2px_2px_0px_#be123c]'
            : 'bg-gray-100/70 border-gray-300 opacity-65'
        }`}
      >
        {/* Info & Roll Button */}
        <div className="flex flex-col items-end min-w-0">
          <div className="flex items-center gap-1 leading-tight truncate">
            <span className="font-hand font-bold text-xs sm:text-sm text-rose-950 truncate">
              {players.p2.name}
            </span>
            <span className="w-2 h-2 rounded-full bg-rose-600 inline-block shrink-0" />
          </div>
          <button
            onClick={() => triggerRoll('p2')}
            disabled={isP2Locked || rollingPlayer !== null}
            className={`mt-1 px-2.5 py-0.5 sm:py-1 rounded-md text-[11px] sm:text-xs font-hand font-bold border transition-all flex items-center gap-1 ${
              isP2Locked || rollingPlayer !== null
                ? 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed'
                : 'bg-rose-600 hover:bg-rose-500 text-white border-rose-950 shadow-[1px_1px_0px_#1e293b] active:scale-95'
            }`}
          >
            <span>{isP2Locked ? '🔒 Locked' : rollingPlayer === 'p2' ? 'Rolling...' : '🎲 Roll P2'}</span>
          </button>
        </div>

        {/* Die Face */}
        <div
          onClick={() => !isP2Locked && triggerRoll('p2')}
          className={`relative w-11 h-11 sm:w-13 sm:h-13 bg-white rounded-xl border-3 border-rose-900 flex items-center justify-center select-none shadow-[2px_2px_0px_#881337] transition-transform ${
            rollingPlayer === 'p2' ? 'animate-die-tumble' : ''
          } ${
            isP2Locked
              ? 'cursor-not-allowed bg-gray-50'
              : 'cursor-pointer hover:scale-105 active:scale-95'
          }`}
        >
          {isP2Locked && (
            <div className="absolute -top-1.5 -right-1.5 bg-gray-800 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow">
              🔒
            </div>
          )}
          <span
            className="font-hand font-extrabold text-2xl sm:text-3xl text-rose-900"
            style={{ fontFamily: "'Architects Daughter', cursive" }}
          >
            {rollingPlayer === 'p2' ? p2Display : p2Display}
          </span>
        </div>
      </div>
    </div>
  );
};
