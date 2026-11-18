import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  GameState,
  RowIndex,
  ROW_NUMBERS,
  PlayerId,
  WeaponType,
  WEAPONS,
  createInitialGameState
} from './types/game';
import { NotebookHeader } from './components/NotebookHeader';
import { NotebookGrid } from './components/NotebookGrid';
import { TwoPlayerDice } from './components/TwoPlayerDice';
import { BattleStatus } from './components/BattleStatus';
import { WeaponSelectModal } from './components/WeaponSelectModal';
import { VictoryModal } from './components/VictoryModal';
import { RulesModal } from './components/RulesModal';
import { MultiplayerModal } from './components/MultiplayerModal';
import { FirebaseConfigModal } from './components/FirebaseConfigModal';
import { sounds } from './utils/audio';
import { networkManager } from './utils/network';
import { firebaseSync } from './utils/firebaseSync';

export const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(() => createInitialGameState('local'));
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(true);
  const [localPlayerId, setLocalPlayerId] = useState<PlayerId>('p1');
  const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);
  const [isMultiplayerOpen, setIsMultiplayerOpen] = useState<boolean>(false);
  const [multiplayerTab, setMultiplayerTab] = useState<'modes' | 'host' | 'join'>('modes');
  const [isFirebaseConfigOpen, setIsFirebaseConfigOpen] = useState<boolean>(false);
  const [reactionNotice, setReactionNotice] = useState<{ emoji: string; from: string } | null>(null);

  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  // Check URL parameter for room code (?room=SM-XXXX)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setMultiplayerTab('join');
      setIsMultiplayerOpen(true);
    }
  }, []);

  // Audio Toggle
  const handleToggleAudio = () => {
    const next = !isAudioEnabled;
    setIsAudioEnabled(next);
    sounds.enabled = next;
  };

  const getNextPlayer = (current: PlayerId): PlayerId => (current === 'p1' ? 'p2' : 'p1');

  const checkVictory = (state: GameState, targetPlayer: PlayerId): boolean => {
    return ROW_NUMBERS.every((r) => state.players[targetPlayer].cells[r].isDestroyed);
  };

  const broadcastState = useCallback((nextState: GameState) => {
    if (nextState.mode === 'online_p2p') {
      networkManager.syncState(nextState);
    } else if (nextState.mode === 'online_firebase' && nextState.roomCode) {
      firebaseSync.syncState(nextState.roomCode, nextState);
    }
  }, []);

  // Roll Handler for active player
  const handleRollForPlayer = (playerId: PlayerId, rolledNumber: RowIndex) => {
    const currentState = gameStateRef.current;
    if (currentState.currentTurn !== playerId) return;

    const { currentTurn, players } = currentState;
    const activePlayer = players[currentTurn];
    const targetCell = activePlayer.cells[rolledNumber];

    const nextPlayers = { ...players };
    const updatedCells = { ...activePlayer.cells };

    // Case 1: Target row is ALREADY DESTROYED -> Dead Roll!
    if (targetCell.isDestroyed) {
      sounds.playDeadRoll();
      const nextTurn = getNextPlayer(currentTurn);
      const nextState: GameState = {
        ...currentState,
        lastRoll: rolledNumber,
        lastRollPlayer: playerId,
        currentTurn: nextTurn,
        phase: 'turn_ready',
        log: [
          ...currentState.log,
          `${activePlayer.name} rolled ${rolledNumber}: Dead Roll! (Row was already destroyed). Turn passed!`
        ]
      };
      setGameState(nextState);
      broadcastState(nextState);
      return;
    }

    // Case 2: Stickman Stage 0 or 1 -> Increment stage
    if (targetCell.stage < 2) {
      const newStage = (targetCell.stage + 1) as 1 | 2;
      updatedCells[rolledNumber] = {
        ...targetCell,
        stage: newStage
      };
      nextPlayers[currentTurn] = {
        ...activePlayer,
        cells: updatedCells
      };

      sounds.playPencilScribble();
      const stageName = newStage === 1 ? 'Head' : 'Body';
      const nextTurn = getNextPlayer(currentTurn);

      const nextState: GameState = {
        ...currentState,
        players: nextPlayers,
        lastRoll: rolledNumber,
        lastRollPlayer: playerId,
        currentTurn: nextTurn,
        phase: 'turn_ready',
        log: [
          ...currentState.log,
          `${activePlayer.name} rolled ${rolledNumber}: Drew ${stageName} for Stickman #${rolledNumber}!`
        ]
      };
      setGameState(nextState);
      broadcastState(nextState);
      return;
    }

    // Case 3: Stickman Stage 2 -> Complete stickman and trigger Weapon Selection
    if (targetCell.stage === 2) {
      updatedCells[rolledNumber] = {
        ...targetCell,
        stage: 3
      };
      nextPlayers[currentTurn] = {
        ...activePlayer,
        cells: updatedCells
      };

      sounds.playPencilScribble();
      const nextState: GameState = {
        ...currentState,
        players: nextPlayers,
        lastRoll: rolledNumber,
        lastRollPlayer: playerId,
        pendingRowTarget: rolledNumber,
        phase: 'weapon_select',
        log: [
          ...currentState.log,
          `${activePlayer.name} rolled ${rolledNumber}: Stickman #${rolledNumber} is fully assembled! Select a weapon.`
        ]
      };
      setGameState(nextState);
      broadcastState(nextState);
      return;
    }

    // Case 4: Stickman Stage 3 -> Already armed! Trigger Attack Phase!
    if (targetCell.stage === 3) {
      const nextState: GameState = {
        ...currentState,
        lastRoll: rolledNumber,
        lastRollPlayer: playerId,
        pendingRowTarget: rolledNumber,
        phase: 'attack_target',
        log: [
          ...currentState.log,
          `🎯 ${activePlayer.name} rolled ${rolledNumber}: Armed Stickman ready! Click an opponent row to DESTROY!`
        ]
      };
      setGameState(nextState);
      broadcastState(nextState);
      return;
    }
  };

  // Weapon Pick
  const handleSelectWeapon = (weapon: WeaponType) => {
    const currentState = gameStateRef.current;
    const { currentTurn, players, pendingRowTarget } = currentState;
    if (pendingRowTarget === null) return;

    const activePlayer = players[currentTurn];
    const updatedCells = { ...activePlayer.cells };

    updatedCells[pendingRowTarget] = {
      ...updatedCells[pendingRowTarget],
      weapon
    };

    const nextPlayers = {
      ...players,
      [currentTurn]: {
        ...activePlayer,
        cells: updatedCells
      }
    };

    const weaponInfo = WEAPONS.find((w) => w.id === weapon);
    const nextTurn = getNextPlayer(currentTurn);

    const nextState: GameState = {
      ...currentState,
      players: nextPlayers,
      phase: 'turn_ready',
      currentTurn: nextTurn,
      pendingRowTarget: null,
      log: [
        ...currentState.log,
        `${activePlayer.name} equipped Stickman #${pendingRowTarget} with ${weaponInfo?.icon} ${weaponInfo?.name}!`
      ]
    };

    setGameState(nextState);
    broadcastState(nextState);
  };

  // Attack Execution
  const handleAttackCell = (targetPlayerId: PlayerId, targetRow: RowIndex) => {
    const currentState = gameStateRef.current;
    const { currentTurn, players, pendingRowTarget } = currentState;

    const attackerRow = pendingRowTarget !== null ? pendingRowTarget : 0;
    const attackerCell = players[currentTurn].cells[attackerRow];
    const weaponType = attackerCell.weapon || 'sword';

    sounds.playAttack(weaponType);
    setTimeout(() => {
      sounds.playDestroyScribble();
    }, 180);

    const targetPlayer = players[targetPlayerId];
    const nextTargetCells = {
      ...targetPlayer.cells,
      [targetRow]: {
        ...targetPlayer.cells[targetRow],
        isDestroyed: true
      }
    };

    const nextPlayers = {
      ...players,
      [targetPlayerId]: {
        ...targetPlayer,
        cells: nextTargetCells
      }
    };

    const isWin = checkVictory({ ...currentState, players: nextPlayers }, targetPlayerId);
    const nextTurn = getNextPlayer(currentTurn);

    const nextState: GameState = {
      ...currentState,
      players: nextPlayers,
      pendingRowTarget: null,
      phase: isWin ? 'game_over' : 'turn_ready',
      currentTurn: isWin ? currentTurn : nextTurn,
      winner: isWin ? currentTurn : null,
      log: [
        ...currentState.log,
        `💥 ${players[currentTurn].name}'s Stickman #${attackerRow} obliterated ${targetPlayer.name}'s Row #${targetRow}!`,
        ...(isWin ? [`🏆 VICTORY! ${players[currentTurn].name} wiped out the entire enemy army!`] : [])
      ]
    };

    setGameState(nextState);
    broadcastState(nextState);
  };

  // AI Turn Automator
  useEffect(() => {
    if (gameState.mode !== 'ai') return;
    if (gameState.currentTurn !== 'p2') return;
    if (gameState.winner) return;

    if (gameState.phase === 'turn_ready') {
      const timer = setTimeout(() => {
        const roll = ROW_NUMBERS[Math.floor(Math.random() * ROW_NUMBERS.length)];
        handleRollForPlayer('p2', roll);
      }, 1000);
      return () => clearTimeout(timer);
    }

    if (gameState.phase === 'weapon_select') {
      const timer = setTimeout(() => {
        const randomWeapon = WEAPONS[Math.floor(Math.random() * WEAPONS.length)].id;
        handleSelectWeapon(randomWeapon);
      }, 900);
      return () => clearTimeout(timer);
    }

    if (gameState.phase === 'attack_target') {
      const timer = setTimeout(() => {
        const p1AliveRows = ROW_NUMBERS.filter((r) => !gameState.players.p1.cells[r].isDestroyed);
        if (p1AliveRows.length > 0) {
          p1AliveRows.sort((a, b) => gameState.players.p1.cells[b].stage - gameState.players.p1.cells[a].stage);
          const chosenTarget = p1AliveRows[0];
          handleAttackCell('p1', chosenTarget);
        }
      }, 1100);
      return () => clearTimeout(timer);
    }
  }, [gameState.mode, gameState.currentTurn, gameState.phase, gameState.winner]);

  // Network Listeners
  useEffect(() => {
    networkManager.onStateSync = (incomingState) => {
      setGameState((prev) => ({
        ...prev,
        ...incomingState
      }));
    };

    networkManager.onReaction = (reaction) => {
      setReactionNotice({
        emoji: reaction,
        from: 'Opponent'
      });
      setTimeout(() => setReactionNotice(null), 2500);
    };

    return () => {
      networkManager.disconnect();
      firebaseSync.stopListening();
    };
  }, []);

  const handleSendReaction = (emoji: string) => {
    setReactionNotice({
      emoji,
      from: 'You'
    });
    setTimeout(() => setReactionNotice(null), 2500);

    if (gameState.mode === 'online_p2p') {
      networkManager.sendReaction(emoji);
    }
  };

  const handleResetGame = () => {
    const initial = createInitialGameState(gameState.mode);
    initial.roomCode = gameState.roomCode;
    setGameState(initial);
    broadcastState(initial);
  };

  const handleStartOnlineHost = (mode: 'online_p2p' | 'online_firebase', roomCode: string) => {
    setLocalPlayerId('p1');
    const newGame = createInitialGameState(mode);
    newGame.roomCode = roomCode;
    setGameState(newGame);

    if (mode === 'online_p2p') {
      networkManager.hostRoom(
        roomCode,
        () => console.log('Host room ready:', roomCode),
        (err) => alert(err)
      );
      networkManager.onOpponentConnected = () => {
        broadcastState(newGame);
        setIsMultiplayerOpen(false);
      };
    } else {
      firebaseSync.createRoom(roomCode, newGame).then(() => {
        firebaseSync.listenToRoom(roomCode, (data) => {
          setGameState((prev) => ({ ...prev, ...data }));
          if (data.guestConnected) {
            setIsMultiplayerOpen(false);
          }
        });
      });
    }
  };

  const handleStartOnlineJoin = (mode: 'online_p2p' | 'online_firebase', roomCode: string) => {
    setLocalPlayerId('p2');
    const newGame = createInitialGameState(mode);
    newGame.roomCode = roomCode;
    newGame.players.p2.name = 'Player 2 (You)';
    newGame.players.p1.name = 'Host Player';

    if (mode === 'online_p2p') {
      networkManager.joinRoom(
        roomCode,
        () => {
          setGameState(newGame);
          setIsMultiplayerOpen(false);
        },
        (err) => alert(err)
      );
    } else {
      firebaseSync.joinRoom(roomCode).then(() => {
        setGameState(newGame);
        setIsMultiplayerOpen(false);
        firebaseSync.listenToRoom(roomCode, (data) => {
          setGameState((prev) => ({ ...prev, ...data }));
        });
      }).catch((err) => alert(err.message));
    }
  };

  const isOnline = gameState.mode === 'online_p2p' || gameState.mode === 'online_firebase';

  // Lock status calculation for P1 and P2 dice
  const disabledP1 =
    gameState.phase !== 'turn_ready' ||
    gameState.winner !== null ||
    gameState.currentTurn !== 'p1' ||
    (isOnline && localPlayerId !== 'p1');

  const disabledP2 =
    gameState.phase !== 'turn_ready' ||
    gameState.winner !== null ||
    gameState.currentTurn !== 'p2' ||
    (gameState.mode === 'ai' && gameState.currentTurn === 'p2') ||
    (isOnline && localPlayerId !== 'p2');

  const currentTurnPlayer = gameState.players[gameState.currentTurn];

  return (
    <div className="h-screen max-h-screen w-screen max-w-full overflow-hidden flex flex-col justify-between bg-[#f3f0e8] p-1.5 sm:p-2.5 select-none">
      {/* 1. Compact Header Bar */}
      <NotebookHeader
        mode={gameState.mode}
        roomCode={gameState.roomCode}
        isAudioEnabled={isAudioEnabled}
        onToggleAudio={handleToggleAudio}
        onOpenRules={() => setIsRulesOpen(true)}
        onOpenModes={() => {
          setMultiplayerTab('modes');
          setIsMultiplayerOpen(true);
        }}
        onOpenCreateRoom={() => {
          setMultiplayerTab('host');
          setIsMultiplayerOpen(true);
        }}
        onResetGame={handleResetGame}
        onSendReaction={handleSendReaction}
      />

      {/* 2. Compact Status & Scoreboard */}
      <BattleStatus gameState={gameState} reactionNotice={reactionNotice} />

      {/* 3. Flexible 3-Column Notebook Grid (auto-fits viewport height) */}
      <NotebookGrid
        gameState={gameState}
        onAttackCell={handleAttackCell}
        localPlayerId={isOnline ? localPlayerId : undefined}
      />

      {/* 4. Two Player Dice (One active, one locked) */}
      <TwoPlayerDice
        currentTurn={gameState.currentTurn}
        lastRoll={gameState.lastRoll}
        lastRollPlayer={gameState.lastRollPlayer}
        phase={gameState.phase}
        players={gameState.players}
        disabledP1={disabledP1}
        disabledP2={disabledP2}
        onRollP1={(val) => handleRollForPlayer('p1', val)}
        onRollP2={(val) => handleRollForPlayer('p2', val)}
        localPlayerId={isOnline ? localPlayerId : undefined}
        isOnline={isOnline}
      />

      {/* Modals */}
      <WeaponSelectModal
        isOpen={gameState.phase === 'weapon_select'}
        rowIndex={gameState.pendingRowTarget || 0}
        playerName={currentTurnPlayer.name}
        playerColor={currentTurnPlayer.inkColor}
        onSelectWeapon={handleSelectWeapon}
      />

      <VictoryModal
        winnerId={gameState.winner}
        players={gameState.players}
        onPlayAgain={handleResetGame}
      />

      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

      <MultiplayerModal
        isOpen={isMultiplayerOpen}
        initialTab={multiplayerTab}
        onClose={() => setIsMultiplayerOpen(false)}
        onSelectLocal={() => {
          setGameState(createInitialGameState('local'));
          setLocalPlayerId('p1');
        }}
        onSelectAI={() => {
          setGameState(createInitialGameState('ai'));
          setLocalPlayerId('p1');
        }}
        onStartOnlineHost={handleStartOnlineHost}
        onStartOnlineJoin={handleStartOnlineJoin}
        onOpenFirebaseConfig={() => setIsFirebaseConfigOpen(true)}
      />

      <FirebaseConfigModal
        isOpen={isFirebaseConfigOpen}
        onClose={() => setIsFirebaseConfigOpen(false)}
        onSaved={() => alert('Firebase config saved successfully!')}
      />
    </div>
  );
};

export default App;
