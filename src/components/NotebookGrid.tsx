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

  const isMyTurnToAttack = !localPlayerId || localPlayerId === currentTurn;

  const canAttackTarget = (targetPlayerId: PlayerId, targetRow: RowIndex) => {
    if (phase !== 'attack_target') return false;
    if (!isMyTurnToAttack) return false;
    if (targetPlayerId !== opponentId) return false;
    return !players[targetPlayerId].cells[targetRow].isDestroyed;
  };

  return (
    <div className="relative flex-1 min-h-0 w-full bg-[#fffefb] rounded-xl sm:rounded-3xl border-2 sm:border-4 border-[#0f172a] shadow-[0_8px_25px_rgba(0,0,0,0.4)] overflow-hidden notebook-arena flex flex-col select-none">
      {/* Retro Chrome Binder Clips (Left edge) */}
      <div className="absolute left-0.5 sm:left-2 top-0 bottom-0 z-30 flex flex-col justify-around py-1 sm:py-2 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center">
            <div className="w-1.5 h-1.5 sm:w-3 sm:h-3 rounded-full bg-slate-300 border border-[#0f172a] shadow-inner" />
            <div className="w-1 h-0.5 sm:w-2 sm:h-1.5 -ml-0.5 sm:-ml-1 bg-slate-500 rounded-xs" />
          </div>
        ))}
      </div>

      {/* Red Double Margin Line */}
      <div className="absolute left-4 sm:left-10 top-0 bottom-0 w-0.5 bg-rose-400/90 z-20 pointer-events-none" />
      <div className="absolute left-5 sm:left-11 top-0 bottom-0 w-0.5 bg-rose-300/40 z-20 pointer-events-none hidden sm:block" />

      {/* Main Arena Container */}
      <div className="pl-5 sm:pl-14 pr-1 sm:pr-4 py-0.5 sm:py-1.5 flex flex-col flex-1 min-h-0">
        {/* Arena Lane Header */}
        <div className="grid grid-cols-12 gap-0.5 sm:gap-1.5 pb-0.5 sm:pb-1 border-b border-slate-300 font-retro font-black text-[8px] sm:text-xs shrink-0 items-center">
          <div className="col-span-2 text-center text-slate-500 font-mono tracking-widest text-[8px] sm:text-xs">
            LANE
          </div>
          <div className="col-span-5 text-center flex items-center justify-center gap-0.5 sm:gap-1 bg-blue-50 py-0.2 sm:py-0.5 rounded sm:rounded-lg border border-blue-200">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-600 shrink-0" />
            <span className="text-blue-900 tracking-wider truncate uppercase">{players.p1.name} SQUAD</span>
          </div>
          <div className="col-span-5 text-center flex items-center justify-center gap-0.5 sm:gap-1 bg-rose-50 py-0.2 sm:py-0.5 rounded sm:rounded-lg border border-rose-200">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-600 shrink-0" />
            <span className="text-rose-900 tracking-wider truncate uppercase">{players.p2.name} SQUAD</span>
          </div>
        </div>

        {/* 5 Combat Lanes: Strict Grid Rows 5 strictly guarantees equal vertical space */}
        <div className="grid grid-rows-5 flex-1 min-h-0 gap-0.5 sm:gap-1.5 py-0.5">
          {ROW_NUMBERS.map((rowNum) => {
            const isP1TurnRow = currentTurn === 'p1' && lastRoll === rowNum;
            const isP2TurnRow = currentTurn === 'p2' && lastRoll === rowNum;

            const isP1Attacker = currentTurn === 'p1' && pendingRowTarget === rowNum;
            const isP2Attacker = currentTurn === 'p2' && pendingRowTarget === rowNum;

            const p1CanBeAttacked = canAttackTarget('p1', rowNum);
            const p2CanBeAttacked = canAttackTarget('p2', rowNum);

            return (
              <div key={rowNum} className="grid grid-cols-12 gap-0.5 sm:gap-1.5 items-stretch min-h-0 h-full">
                {/* Column 1: Lane Shield Badge */}
                <div className="col-span-2 flex items-center justify-center h-full">
                  <div
                    className="w-5 h-5 xs:w-6 xs:h-6 sm:w-9 sm:h-9 rounded sm:rounded-xl border sm:border-2 border-[#0f172a] bg-gradient-to-b from-amber-300 to-amber-400 flex items-center justify-center font-retro font-black text-[10px] sm:text-base text-[#0f172a] shadow-xs select-none"
                  >
                    {rowNum}
                  </div>
                </div>

                {/* Column 2: Player 1 Combat Cell */}
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

                {/* Column 3: Player 2 Combat Cell */}
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
      </div>
    </div>
  );
};
