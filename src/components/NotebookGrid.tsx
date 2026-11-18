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

  const canAttackTarget = (targetPlayerId: PlayerId, targetRow: RowIndex) => {
    if (phase !== 'attack_target') return false;
    if (localPlayerId && localPlayerId !== currentTurn) return false;
    if (targetPlayerId !== opponentId) return false;
    return !players[targetPlayerId].cells[targetRow].isDestroyed;
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto flex-1 min-h-0 bg-[#fdfbf7] rounded-xl border-3 border-gray-800 shadow-[4px_4px_0px_#1e293b] overflow-hidden notebook-paper flex flex-col justify-between my-1">
      {/* Notebook Binder Spiral / Punch Holes on the left edge */}
      <div className="absolute left-1.5 sm:left-2 top-0 bottom-0 z-30 flex flex-col justify-around py-2 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-gray-300 border border-gray-400 shadow-inner" />
            <div className="w-1.5 h-1 sm:w-2 sm:h-1.5 -ml-0.5 bg-gradient-to-r from-gray-400 to-gray-500 rounded-sm" />
          </div>
        ))}
      </div>

      {/* Vertical Red Margin Lines */}
      <div className="absolute left-8 sm:left-10 top-0 bottom-0 w-0.5 bg-rose-400/90 z-20 pointer-events-none" />
      <div className="absolute left-9 sm:left-11 top-0 bottom-0 w-0.5 bg-rose-300/40 z-20 pointer-events-none" />

      {/* Main Table Grid Container */}
      <div className="pl-11 sm:pl-14 pr-2 sm:pr-4 py-1.5 flex flex-col h-full justify-between">
        {/* Table Header Row */}
        <div className="grid grid-cols-12 gap-1.5 pb-1 border-b-2 border-blue-400 font-hand font-bold text-gray-700 text-xs sm:text-sm shrink-0">
          <div className="col-span-2 text-center text-gray-500 font-mono">
            Row
          </div>
          <div className="col-span-5 text-center flex items-center justify-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-700 inline-block shrink-0" />
            <span className="text-blue-900 font-bold truncate">{players.p1.name}</span>
            {currentTurn === 'p1' && (
              <span className="text-[10px] text-amber-600 animate-pulse font-mono font-bold">● TURN</span>
            )}
          </div>
          <div className="col-span-5 text-center flex items-center justify-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block shrink-0" />
            <span className="text-rose-900 font-bold truncate">{players.p2.name}</span>
            {currentTurn === 'p2' && (
              <span className="text-[10px] text-amber-600 animate-pulse font-mono font-bold">● TURN</span>
            )}
          </div>
        </div>

        {/* 5 Rows for [0, 2, 4, 6, 8] - Distributes available height evenly */}
        <div className="flex-1 min-h-0 flex flex-col justify-between divide-y divide-blue-200/70">
          {ROW_NUMBERS.map((rowNum) => {
            const isP1TurnRow = currentTurn === 'p1' && lastRoll === rowNum;
            const isP2TurnRow = currentTurn === 'p2' && lastRoll === rowNum;

            const isP1Attacker = currentTurn === 'p1' && pendingRowTarget === rowNum;
            const isP2Attacker = currentTurn === 'p2' && pendingRowTarget === rowNum;

            const p1CanBeAttacked = canAttackTarget('p1', rowNum);
            const p2CanBeAttacked = canAttackTarget('p2', rowNum);

            return (
              <div key={rowNum} className="grid grid-cols-12 gap-1.5 py-0.5 items-center flex-1 min-h-0">
                {/* Column 1: Row Number (0, 2, 4, 6, 8) */}
                <div className="col-span-2 flex items-center justify-center h-full">
                  <div
                    className="w-7 h-7 sm:w-9 sm:h-9 rounded-full border-2 border-gray-700 bg-amber-50 flex items-center justify-center font-hand font-extrabold text-base sm:text-xl text-gray-800 shadow-[1px_1px_0px_#1e293b]"
                    style={{ fontFamily: "'Architects Daughter', cursive" }}
                  >
                    {rowNum}
                  </div>
                </div>

                {/* Column 2: Player 1 Cell */}
                <div className="col-span-5 h-full">
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
                <div className="col-span-5 h-full">
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

        {/* Attack Phase Instruction Banner */}
        {phase === 'attack_target' && (
          <div className="py-1 px-2 rounded-lg bg-rose-100 border border-rose-400 text-center animate-pulse shrink-0 mt-0.5">
            <span className="font-hand font-bold text-rose-800 text-xs sm:text-sm">
              💥 Stickman on Row {pendingRowTarget} is ready! Click an alive opponent row to DESTROY it!
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
