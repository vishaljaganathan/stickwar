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
    <div className="relative flex-1 min-h-0 h-full w-full bg-[#fdfbf7] rounded-xl border-2 sm:border-3 border-gray-800 shadow-[3px_3px_0px_#1e293b] overflow-hidden notebook-paper flex flex-col select-none">
      {/* Notebook Binder Rings (Left edge) */}
      <div className="absolute left-1 sm:left-2 top-0 bottom-0 z-30 flex flex-col justify-around py-2 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center">
            <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-gray-300 border border-gray-400 shadow-inner" />
            <div className="w-1 h-0.5 sm:w-1.5 sm:h-1 -ml-0.5 bg-gray-400 rounded-xs" />
          </div>
        ))}
      </div>

      {/* Vertical Red Margin Lines */}
      <div className="absolute left-5 sm:left-9 top-0 bottom-0 w-0.5 bg-rose-400/90 z-20 pointer-events-none" />
      <div className="absolute left-5.5 sm:left-10 top-0 bottom-0 w-0.5 bg-rose-300/40 z-20 pointer-events-none hidden sm:block" />

      {/* Main Table Grid Container */}
      <div className="pl-7 sm:pl-12 pr-1.5 sm:pr-3 py-1 flex flex-col h-full flex-1 min-h-0 justify-between">
        {/* Table Header Row */}
        <div className="grid grid-cols-12 gap-1 pb-1 border-b border-blue-400/80 font-hand font-bold text-gray-700 text-[11px] sm:text-xs shrink-0">
          <div className="col-span-2 text-center text-gray-500 font-mono">
            Row
          </div>
          <div className="col-span-5 text-center flex items-center justify-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-700 shrink-0" />
            <span className="text-blue-900 font-bold truncate">{players.p1.name}</span>
            {currentTurn === 'p1' && (
              <span className="text-[9px] text-amber-600 animate-pulse font-mono font-bold">● TURN</span>
            )}
          </div>
          <div className="col-span-5 text-center flex items-center justify-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
            <span className="text-rose-900 font-bold truncate">{players.p2.name}</span>
            {currentTurn === 'p2' && (
              <span className="text-[9px] text-amber-600 animate-pulse font-mono font-bold">● TURN</span>
            )}
          </div>
        </div>

        {/* 5 Rows - Grid Rows 5 guarantees exactly 20% vertical space per row */}
        <div className="grid grid-rows-5 flex-1 min-h-0 h-full gap-1 py-0.5">
          {ROW_NUMBERS.map((rowNum) => {
            const isP1TurnRow = currentTurn === 'p1' && lastRoll === rowNum;
            const isP2TurnRow = currentTurn === 'p2' && lastRoll === rowNum;

            const isP1Attacker = currentTurn === 'p1' && pendingRowTarget === rowNum;
            const isP2Attacker = currentTurn === 'p2' && pendingRowTarget === rowNum;

            const p1CanBeAttacked = canAttackTarget('p1', rowNum);
            const p2CanBeAttacked = canAttackTarget('p2', rowNum);

            return (
              <div key={rowNum} className="grid grid-cols-12 gap-1 items-stretch min-h-0 h-full">
                {/* Column 1: Row Number Badge */}
                <div className="col-span-2 flex items-center justify-center h-full">
                  <div
                    className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-gray-700 bg-amber-50 flex items-center justify-center font-hand font-extrabold text-sm sm:text-lg text-gray-800 shadow-xs"
                    style={{ fontFamily: "'Architects Daughter', cursive" }}
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

        {/* Attack Phase Instruction Banner (Ultra Compact) */}
        {phase === 'attack_target' && (
          <div className="py-0.5 px-1.5 rounded bg-rose-100 border border-rose-400 text-center animate-pulse shrink-0">
            {isMyTurnToAttack ? (
              <span className="font-hand font-bold text-rose-800 text-[11px] sm:text-xs">
                💥 Stickman #{pendingRowTarget} is ready! Tap an alive opponent cell to DESTROY it!
              </span>
            ) : (
              <span className="font-hand font-bold text-rose-700 text-[11px] sm:text-xs flex items-center justify-center gap-1">
                <span>🛡️</span>
                <span><strong>{currentTurnPlayer.name}</strong> is aiming their attack at your army...</span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
