import React from 'react';
import { GameState, RowIndex, ROW_NUMBERS, PlayerId } from '../types/game';
import { StickmanCell } from './StickmanCell';

interface NotebookGridProps {
  gameState: GameState;
  onAttackCell: (targetPlayerId: PlayerId, targetRow: RowIndex) => void;
  localPlayerId?: PlayerId;
}

export const NotebookGrid: React.FC<NotebookGridProps> = ({
  gameState,
  onAttackCell,
  localPlayerId
}) => {
  const { players, currentTurn, phase, lastRoll, pendingRowTarget } = gameState;
  const opponentId: PlayerId = currentTurn === 'p1' ? 'p2' : 'p1';
  const currentTurnPlayer = players[currentTurn];

  const isMyTurnToAttack = !localPlayerId || localPlayerId === currentTurn;

  const canAttackTarget = (targetPlayerId: PlayerId, targetRow: RowIndex) => {
    if (phase !== 'attack_target') return false;
    if (!isMyTurnToAttack) return false;
    if (targetPlayerId !== opponentId) return false;
    return !players[targetPlayerId].cells[targetRow].isDestroyed;
  };

  return (
    <div className="relative flex-1 min-h-0 h-full w-full bg-[#fffefb] rounded-2xl border-2 sm:border-3 border-[#0f172a] shadow-[4px_4px_0px_#0f172a] overflow-hidden notebook-paper flex flex-col select-none">
      {/* Retro Chrome Binder Clips (Left edge) */}
      <div className="absolute left-1 sm:left-2 top-0 bottom-0 z-30 flex flex-col justify-around py-2 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-slate-300 border-2 border-[#0f172a] shadow-inner" />
            <div className="w-1.5 h-1 sm:w-2 sm:h-1.5 -ml-1 bg-slate-500 rounded-xs" />
          </div>
        ))}
      </div>

      {/* Retro Double Margin Line */}
      <div className="absolute left-6 sm:left-10 top-0 bottom-0 w-0.5 bg-rose-400/90 z-20 pointer-events-none" />
      <div className="absolute left-7 sm:left-11 top-0 bottom-0 w-0.5 bg-rose-300/40 z-20 pointer-events-none hidden sm:block" />

      {/* Main Table Container */}
      <div className="pl-8 sm:pl-14 pr-2 sm:pr-4 py-1.5 flex flex-col h-full flex-1 min-h-0 justify-between">
        {/* Table Header Row */}
        <div className="grid grid-cols-12 gap-1.5 pb-1 border-b-2 border-blue-400/80 font-retro font-extrabold text-[#0f172a] text-[11px] sm:text-xs shrink-0 items-center">
          <div className="col-span-2 text-center text-slate-500 font-mono tracking-wider">
            ROW #
          </div>
          <div className="col-span-5 text-center flex items-center justify-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 border border-[#0f172a] shrink-0" />
            <span className="text-blue-900 font-extrabold tracking-wide truncate">{players.p1.name}</span>
            {currentTurn === 'p1' && (
              <span className="px-1.5 py-0.2 rounded bg-amber-300 border border-[#0f172a] text-[9px] font-mono font-black animate-pulse shadow-xs">
                TURN
              </span>
            )}
          </div>
          <div className="col-span-5 text-center flex items-center justify-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 border border-[#0f172a] shrink-0" />
            <span className="text-rose-900 font-extrabold tracking-wide truncate">{players.p2.name}</span>
            {currentTurn === 'p2' && (
              <span className="px-1.5 py-0.2 rounded bg-amber-300 border border-[#0f172a] text-[9px] font-mono font-black animate-pulse shadow-xs">
                TURN
              </span>
            )}
          </div>
        </div>

        {/* 5 Rows: Grid Rows 5 strictly guarantees equal vertical space per row */}
        <div className="grid grid-rows-5 flex-1 min-h-0 h-full gap-1.5 py-0.5">
          {ROW_NUMBERS.map((rowNum) => {
            const isP1TurnRow = currentTurn === 'p1' && lastRoll === rowNum;
            const isP2TurnRow = currentTurn === 'p2' && lastRoll === rowNum;

            const isP1Attacker = currentTurn === 'p1' && pendingRowTarget === rowNum;
            const isP2Attacker = currentTurn === 'p2' && pendingRowTarget === rowNum;

            const p1CanBeAttacked = canAttackTarget('p1', rowNum);
            const p2CanBeAttacked = canAttackTarget('p2', rowNum);

            return (
              <div key={rowNum} className="grid grid-cols-12 gap-1.5 items-stretch min-h-0 h-full">
                {/* Column 1: Retro Embossed Number Stamp */}
                <div className="col-span-2 flex items-center justify-center h-full">
                  <div
                    className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl border-2 border-[#0f172a] bg-amber-300 flex items-center justify-center font-retro font-black text-sm sm:text-base text-[#0f172a] shadow-[1.5px_1.5px_0px_#0f172a] select-none"
                  >
                    {rowNum}
                  </div>
                </div>

                {/* Column 2: Player 1 Cell */}
                <div className="col-span-5 h-full min-h-0">
                  <StickmanCell
                    rowIndex={rowNum}
                    cell={players.p1.cells[rowNum]}
                    playerId="p1"
                    inkColor={players.p1.inkColor}
                    isCurrentTurnRow={isP1TurnRow}
                    isAttacker={isP1Attacker}
                    canBeAttacked={p1CanBeAttacked}
                    onAttackClick={() => onAttackCell('p1', rowNum)}
                  />
                </div>

                {/* Column 3: Player 2 Cell */}
                <div className="col-span-5 h-full min-h-0">
                  <StickmanCell
                    rowIndex={rowNum}
                    cell={players.p2.cells[rowNum]}
                    playerId="p2"
                    inkColor={players.p2.inkColor}
                    isCurrentTurnRow={isP2TurnRow}
                    isAttacker={isP2Attacker}
                    canBeAttacked={p2CanBeAttacked}
                    onAttackClick={() => onAttackCell('p2', rowNum)}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Attack Phase Instruction Banner (Retro Warning Tape) */}
        {phase === 'attack_target' && (
          <div className="py-1 px-2 rounded-xl bg-amber-300 border-2 border-[#0f172a] text-center shadow-[2px_2px_0px_#0f172a] shrink-0 mt-0.5 animate-pulse">
            {isMyTurnToAttack ? (
              <span className="font-retro font-black text-[#0f172a] text-xs sm:text-sm tracking-wide">
                💥 STICKMAN #{pendingRowTarget} ARMED! CLICK AN ENEMY CELL TO OBLITERATE IT!
              </span>
            ) : (
              <span className="font-retro font-extrabold text-rose-900 text-xs sm:text-sm flex items-center justify-center gap-1.5">
                <span>🛡️</span>
                <span>INCOMING ATTACK! <strong>{currentTurnPlayer.name}</strong> is aiming at your army...</span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
