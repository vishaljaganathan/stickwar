import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  GameState,
  RowIndex,
  ROW_NUMBERS,
  PlayerId,
  WeaponType,
  WEAPONS,
  AttackAnimationData,
  createInitialGameState
} from './types/game';
import { NotebookHeader } from './components/NotebookHeader';
import { NotebookGrid } from './components/NotebookGrid';
import { SidePlayerDie } from './components/SidePlayerDie';
import { BattleStatus } from './components/BattleStatus';
import { WeaponSelectModal } from './components/WeaponSelectModal';
import { AttackAnimationOverlay } from './components/AttackAnimationOverlay';
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

  // Dice visual state
  const [p1Display, setP1Display] = useState<RowIndex | string>('?');
  const [p2Display, setP2Display] = useState<RowIndex | string>('?');
  const [rollingPlayer, setRollingPlayer] = useState<PlayerId | null>(null);

  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  // Sync dice display with last rolls
  useEffect(() => {
    if (gameState.lastRoll !== null && gameState.lastRollPlayer) {
      if (gameState.lastRollPlayer === 'p1') setP1Display(gameState.lastRoll);
      if (gameState.lastRollPlayer === 'p2') setP2Display(gameState.lastRoll);
    }
  }, [gameState.lastRoll, gameState.lastRollPlayer]);

  // Check URL parameter for room code (?room=SM-XXXX)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setMultiplayerTab('join');
      setIsMultiplayerOpen(true);
    }
  }, []);

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

  // Animated Die Roll Trigger
  const triggerRollForPlayer = (playerId: PlayerId) => {
    const currentState = gameStateRef.current;
    if (currentState.currentTurn !== playerId) return;
    if (currentState.phase !== 'turn_ready') return;
    if (currentState.winner !== null) return;
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
        if (playerId === 'p1') setP1Display(finalVal);
        else setP2Display(finalVal);

        setRollingPlayer(null);
        handleRollResolution(playerId, finalVal);
      }
    }, 85);
  };

  // Roll Resolution
  const handleRollResolution = (playerId: PlayerId, rolledNumber: RowIndex) => {
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
          `${activePlayer.name} rolled ${rolledNumber}: Stickman #${rolledNumber} assembled! Select a weapon.`
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
          `🎯 ${activePlayer.name} rolled ${rolledNumber}: Armed Stickman ready! Tap an opponent row to DESTROY!`
        ]
      };
      setGameState(nextState);
      broadcastState(nextState);
      return;
    }
  };

  // Weapon Pick Handler
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

  // Step 1: Initiate Attack (Triggers Weapon Animation)
  const handleAttackCell = (targetPlayerId: PlayerId, targetRow: RowIndex) => {
    const currentState = gameStateRef.current;
    const { currentTurn, players, pendingRowTarget } = currentState;

    const attackerRow = pendingRowTarget !== null ? pendingRowTarget : 0;
    const attackerCell = players[currentTurn].cells[attackerRow];
    const weaponType = attackerCell.weapon || 'sword';

    sounds.playAttack(weaponType);

    const animData: AttackAnimationData = {
      fromPlayer: currentTurn,
      fromRow: attackerRow,
      targetPlayer: targetPlayerId,
      targetRow: targetRow,
      weapon: weaponType
    };

    const nextState: GameState = {
      ...currentState,
      phase: 'animating_attack',
      attackAnim: animData,
      log: [
        ...currentState.log,
        `💥 ${players[currentTurn].name}'s Stickman #${attackerRow} launched ${weaponType.toUpperCase()} at Row #${targetRow}!`
      ]
    };

    setGameState(nextState);
    broadcastState(nextState);
  };

  // Step 2: Complete Attack
  const handleAnimationComplete = () => {
    const currentState = gameStateRef.current;
    const { attackAnim, players, currentTurn } = currentState;
    if (!attackAnim) return;

    const { targetPlayer, targetRow } = attackAnim;

    sounds.playDestroyScribble();

    const victim = players[targetPlayer];
    const nextTargetCells = {
      ...victim.cells,
      [targetRow]: {
        ...victim.cells[targetRow],
        isDestroyed: true
      }
    };

    const nextPlayers = {
      ...players,
      [targetPlayer]: {
        ...victim,
        cells: nextTargetCells
      }
    };

    const isWin = checkVictory({ ...currentState, players: nextPlayers }, targetPlayer);
    const nextTurn = getNextPlayer(currentTurn);

    const nextState: GameState = {
      ...currentState,
      players: nextPlayers,
      pendingRowTarget: null,
      attackAnim: null,
      phase: isWin ? 'game_over' : 'turn_ready',
      currentTurn: isWin ? currentTurn : nextTurn,
      winner: isWin ? currentTurn : null,
      log: [
        ...currentState.log,
        `❌ ${players[targetPlayer].name}'s Row #${targetRow} has been DESTROYED!`,
        ...(isWin ? [`🏆 VICTORY! ${players[currentTurn].name} conquered the notebook!`] : [])
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
        triggerRollForPlayer('p2');
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
    setP1Display('?');
    setP2Display('?');
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

  // Player 1 Die Lock State
  const disabledP1 =
    gameState.phase !== 'turn_ready' ||
    gameState.winner !== null ||
    gameState.currentTurn !== 'p1' ||
    (isOnline && localPlayerId !== 'p1');

  // Player 2 Die Lock State
  const disabledP2 =
    gameState.phase !== 'turn_ready' ||
    gameState.winner !== null ||
    gameState.currentTurn !== 'p2' ||
    (gameState.mode === 'ai' && gameState.currentTurn === 'p2') ||
    (isOnline && localPlayerId !== 'p2');

  const canInteractWithWeapon =
    gameState.phase === 'weapon_select' &&
    (gameState.mode !== 'ai' || gameState.currentTurn === 'p1') &&
    (!isOnline || localPlayerId === gameState.currentTurn);

  const currentTurnPlayer = gameState.players[gameState.currentTurn];

  return (
    <div className="h-screen h-[100dvh] max-h-screen max-h-[100dvh] w-screen max-w-full overflow-hidden flex flex-col justify-between bg-[#f3f0e8] p-1 sm:p-2 select-none">
      {/* 1. Real Game HUD Bar */}
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
        player1={gameState.players.p1}
        player2={gameState.players.p2}
        currentTurn={gameState.currentTurn}
        lastLogEntry={gameState.log[gameState.log.length - 1] || 'Battle ready! Roll to recruit stickmen.'}
      />

      {/* 2. Tactical Status & Emote Ribbon */}
      <BattleStatus
        gameState={gameState}
        reactionNotice={reactionNotice}
        onSendReaction={handleSendReaction}
      />

      {/* 3. Main Battlefield Area: Left P1 Die + Center Notebook + Right P2 Die */}
      <div className="flex-1 min-h-0 w-full max-w-5xl mx-auto flex items-stretch justify-between my-0.5 h-full">
        {/* Left Side: Player 1 Die */}
        <SidePlayerDie
          playerId="p1"
          playerState={gameState.players.p1}
          isCurrentTurn={gameState.currentTurn === 'p1'}
          isLocked={disabledP1}
          isRolling={rollingPlayer === 'p1'}
          displayValue={p1Display}
          onRoll={() => triggerRollForPlayer('p1')}
          position="left"
        />

        {/* Center: The Notebook Grid */}
        <NotebookGrid
          gameState={gameState}
          onAttackCell={handleAttackCell}
          localPlayerId={isOnline ? localPlayerId : undefined}
        />

        {/* Right Side: Player 2 Die */}
        <SidePlayerDie
          playerId="p2"
          playerState={gameState.players.p2}
          isCurrentTurn={gameState.currentTurn === 'p2'}
          isLocked={disabledP2}
          isRolling={rollingPlayer === 'p2'}
          displayValue={p2Display}
          onRoll={() => triggerRollForPlayer('p2')}
          position="right"
        />
      </div>

      {/* Weapon Attack Animation Overlay */}
      <AttackAnimationOverlay
        animData={gameState.attackAnim}
        onAnimationComplete={handleAnimationComplete}
      />

      {/* Weapon Selection Modal */}
      <WeaponSelectModal
        isOpen={gameState.phase === 'weapon_select'}
        rowIndex={gameState.pendingRowTarget || 0}
        playerName={currentTurnPlayer.name}
        playerColor={currentTurnPlayer.inkColor}
        canInteract={canInteractWithWeapon}
        onSelectWeapon={handleSelectWeapon}
      />

      {/* Victory Celebration Modal */}
      <VictoryModal
        winnerId={gameState.winner}
        players={gameState.players}
        onPlayAgain={handleResetGame}
      />

      {/* Rules Modal */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

      {/* Multiplayer Match Modal */}
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

      {/* Firebase Config Modal */}
      <FirebaseConfigModal
        isOpen={isFirebaseConfigOpen}
        onClose={() => setIsFirebaseConfigOpen(false)}
        onSaved={() => alert('Firebase config saved successfully!')}
      />
    </div>
  );
};

export default App;
