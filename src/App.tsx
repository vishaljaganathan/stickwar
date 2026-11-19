import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  GameState,
  RowIndex,
  ROW_NUMBERS,
  DiceRoll,
  DICE_NUMBERS,
  StickmanStage,
  PlayerId,
  WeaponType,
  WEAPONS,
  AttackAnimationData,
  RollAnnouncement,
  createInitialGameState
} from './types/game';
import { NotebookHeader } from './components/NotebookHeader';
import { NotebookGrid } from './components/NotebookGrid';
import { SidePlayerDie } from './components/SidePlayerDie';
import { BattleStatus } from './components/BattleStatus';
import { DiceAnnouncementOverlay } from './components/DiceAnnouncementOverlay';
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
  const [initialRoomCode, setInitialRoomCode] = useState<string>('');

  // Dice visual state (can show 0-9 or '?')
  const [p1Display, setP1Display] = useState<number | string>('?');
  const [p2Display, setP2Display] = useState<number | string>('?');
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
      setInitialRoomCode(roomParam);
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

  // Animated Die Roll Trigger (rolls 0-9)
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
      const tempVal = DICE_NUMBERS[Math.floor(Math.random() * DICE_NUMBERS.length)];
      if (playerId === 'p1') setP1Display(tempVal);
      else setP2Display(tempVal);

      counter++;
      if (counter > 8) {
        clearInterval(interval);
        const finalVal = DICE_NUMBERS[Math.floor(Math.random() * DICE_NUMBERS.length)];
        if (playerId === 'p1') setP1Display(finalVal);
        else setP2Display(finalVal);

        setRollingPlayer(null);
        handleRollResolution(playerId, finalVal);
      }
    }, 85);
  };

  // Roll Resolution (Shows center reveal for 1.2s to both players, then executes action)
  const handleRollResolution = (playerId: PlayerId, rolledNumber: DiceRoll) => {
    const currentState = gameStateRef.current;
    if (currentState.currentTurn !== playerId) return;

    const { currentTurn, players } = currentState;
    const activePlayer = players[currentTurn];
    const nextTurn = getNextPlayer(currentTurn);

    // Case 1: ODD NUMBER (1, 3, 5, 7, 9) -> Turn skipped!
    if (rolledNumber % 2 !== 0) {
      sounds.playOddRoll();
      const announcement: RollAnnouncement = {
        playerId,
        roll: rolledNumber,
        type: 'odd_miss',
        title: '⚠️ ODD ROLL — TURN SKIPPED',
        subtitle: `${activePlayer.name} must wait for an even number next turn.`
      };

      const revealState: GameState = {
        ...currentState,
        lastRoll: rolledNumber,
        lastRollPlayer: playerId,
        rollAnnouncement: announcement,
        phase: 'revealing_roll'
      };
      setGameState(revealState);
      broadcastState(revealState);

      setTimeout(() => {
        const cur = gameStateRef.current;
        const nextState: GameState = {
          ...cur,
          currentTurn: nextTurn,
          phase: 'turn_ready',
          rollAnnouncement: null,
          pendingRowTarget: null,
          log: [
            ...cur.log,
            `⚠️ ${activePlayer.name} rolled ODD (${rolledNumber})! Missed turn — wait for an even number next time!`
          ]
        };
        setGameState(nextState);
        broadcastState(nextState);
      }, 1200);
      return;
    }

    // Rolled number is EVEN (0, 2, 4, 6, 8) -> Targets specific Lane
    const targetRow = rolledNumber as RowIndex;
    const targetCell = activePlayer.cells[targetRow];

    // Case 2: Target row is ALREADY DESTROYED -> Dead Roll with Adrenaline Re-roll!
    if (targetCell.isDestroyed) {
      sounds.playDeadRoll();
      const announcement: RollAnnouncement = {
        playerId,
        roll: rolledNumber,
        type: 'dead_roll',
        title: '💀 LANE DESTROYED — ADRENALINE RE-ROLL!',
        subtitle: `${activePlayer.name} gets a free re-roll to stay in the battle!`
      };

      const revealState: GameState = {
        ...currentState,
        lastRoll: rolledNumber,
        lastRollPlayer: playerId,
        rollAnnouncement: announcement,
        phase: 'revealing_roll'
      };
      setGameState(revealState);
      broadcastState(revealState);

      setTimeout(() => {
        const cur = gameStateRef.current;
        const nextState: GameState = {
          ...cur,
          phase: 'turn_ready',
          rollAnnouncement: null,
          pendingRowTarget: null,
          log: [
            ...cur.log,
            `💀 ${activePlayer.name} rolled #${targetRow} (Destroyed)! Adrenaline Re-roll awarded!`
          ]
        };
        setGameState(nextState);
        broadcastState(nextState);
      }, 1200);
      return;
    }

    // Case 3: Stickman Stages 0 to 4 -> Draw Head Circle -> Face -> Body -> Hands -> Legs
    if (targetCell.stage < 5) {
      sounds.playPencilScribble();
      const newStage = (targetCell.stage + 1) as StickmanStage;
      const stageNames: Record<number, string> = {
        1: 'Head Circle',
        2: 'Face & Smile',
        3: 'Torso & Spine',
        4: 'Hands & Arms',
        5: 'Legs (Stickman Ready!)'
      };
      const stageDescription = stageNames[newStage] || `Stage ${newStage}`;

      const announcement: RollAnnouncement = {
        playerId,
        roll: rolledNumber,
        type: 'even_draw',
        title: `✏️ LANE #${targetRow} — ${stageDescription.toUpperCase()}`,
        subtitle: `${activePlayer.name} drew ${stageDescription}!`,
        stageName: stageDescription
      };

      const revealState: GameState = {
        ...currentState,
        lastRoll: rolledNumber,
        lastRollPlayer: playerId,
        rollAnnouncement: announcement,
        phase: 'revealing_roll'
      };
      setGameState(revealState);
      broadcastState(revealState);

      setTimeout(() => {
        const cur = gameStateRef.current;
        const curActive = cur.players[cur.currentTurn];
        const nextTargetCells = {
          ...curActive.cells,
          [targetRow]: {
            ...curActive.cells[targetRow],
            stage: newStage
          }
        };
        const nextPlayers = {
          ...cur.players,
          [cur.currentTurn]: {
            ...curActive,
            cells: nextTargetCells
          }
        };

        const nextState: GameState = {
          ...cur,
          players: nextPlayers,
          currentTurn: nextTurn,
          phase: 'turn_ready',
          rollAnnouncement: null,
          pendingRowTarget: null,
          log: [
            ...cur.log,
            `✏️ ${activePlayer.name} rolled ${targetRow}: Drew ${stageDescription} on Lane #${targetRow}!`
          ]
        };
        setGameState(nextState);
        broadcastState(nextState);
      }, 1200);
      return;
    }

    // Case 4: Stickman Stage 5 (Fully assembled body) -> Trigger Weapon Selection
    if (targetCell.stage === 5) {
      sounds.playDiceRoll();
      const announcement: RollAnnouncement = {
        playerId,
        roll: rolledNumber,
        type: 'even_arm',
        title: `⚔️ LANE #${targetRow} — STICKMAN ASSEMBLED!`,
        subtitle: `${activePlayer.name} unlocked the weapon armory!`
      };

      const revealState: GameState = {
        ...currentState,
        lastRoll: rolledNumber,
        lastRollPlayer: playerId,
        rollAnnouncement: announcement,
        phase: 'revealing_roll'
      };
      setGameState(revealState);
      broadcastState(revealState);

      setTimeout(() => {
        const cur = gameStateRef.current;
        const nextState: GameState = {
          ...cur,
          pendingRowTarget: targetRow,
          phase: 'weapon_select',
          rollAnnouncement: null,
          log: [
            ...cur.log,
            `⚔️ ${activePlayer.name} rolled ${targetRow}: Stickman #${targetRow} is ready! Choose a weapon from the armory.`
          ]
        };
        setGameState(nextState);
        broadcastState(nextState);
      }, 1200);
      return;
    }

    // Case 5: Stickman Stage 6 (Armed with weapon) -> Trigger Attack Phase!
    if (targetCell.stage === 6) {
      sounds.playDiceRoll();
      const announcement: RollAnnouncement = {
        playerId,
        roll: rolledNumber,
        type: 'even_attack',
        title: `🎯 LANE #${targetRow} — ATTACK READY!`,
        subtitle: `${activePlayer.name} is targeting an enemy lane to strike!`
      };

      const revealState: GameState = {
        ...currentState,
        lastRoll: rolledNumber,
        lastRollPlayer: playerId,
        rollAnnouncement: announcement,
        phase: 'revealing_roll'
      };
      setGameState(revealState);
      broadcastState(revealState);

      setTimeout(() => {
        const cur = gameStateRef.current;
        const nextState: GameState = {
          ...cur,
          pendingRowTarget: targetRow,
          phase: 'attack_target',
          rollAnnouncement: null,
          log: [
            ...cur.log,
            `🎯 ${activePlayer.name} rolled ${targetRow}: Armed Stickman ready! Tap an enemy lane to strike!`
          ]
        };
        setGameState(nextState);
        broadcastState(nextState);
      }, 1200);
      return;
    }
  };

  // Weapon Pick Handler (Upgrades stickman from stage 5 to stage 6)
  const handleSelectWeapon = (weapon: WeaponType) => {
    const currentState = gameStateRef.current;
    const { currentTurn, players, pendingRowTarget } = currentState;
    if (pendingRowTarget === null) return;

    const activePlayer = players[currentTurn];
    const updatedCells = { ...activePlayer.cells };

    updatedCells[pendingRowTarget] = {
      ...updatedCells[pendingRowTarget],
      stage: 6,
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
        `🗡️ ${activePlayer.name} equipped Stickman #${pendingRowTarget} with ${weaponInfo?.icon} ${weaponInfo?.name}!`
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

  // Step 2: Complete Attack (Game Rule: 1 attack immediately ELIMINATES the target stickman!)
  const handleAnimationComplete = () => {
    const currentState = gameStateRef.current;
    const { attackAnim, players, currentTurn } = currentState;
    if (!attackAnim) return;

    const { targetPlayer, targetRow, fromRow } = attackAnim;
    const attacker = players[currentTurn];
    const victim = players[targetPlayer];
    const targetCell = victim.cells[targetRow];
    const attackerCell = attacker.cells[fromRow];

    // Attacker's weapon is spent in the strike!
    // The attacker's stickman remains assembled (Stage 5 - READY), but loses the weapon so they must roll again to re-arm.
    const updatedAttackerCells = {
      ...attacker.cells,
      [fromRow]: {
        ...attackerCell,
        stage: 5 as StickmanStage,
        weapon: undefined
      }
    };

    // GAME RULE: ONE STRIKE ELIMINATES THE TARGET STICKMAN!
    // Even if the target stickman has a weapon, it is 100% ELIMINATED!
    sounds.playDestroyScribble();
    const updatedVictimCells = {
      ...victim.cells,
      [targetRow]: {
        ...targetCell,
        isDestroyed: true
      }
    };

    const nextPlayers = {
      ...players,
      [currentTurn]: {
        ...attacker,
        cells: updatedAttackerCells
      },
      [targetPlayer]: {
        ...victim,
        cells: updatedVictimCells
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
        `💥 ${attacker.name}'s Stickman #${fromRow} ELIMINATED ${victim.name}'s Lane #${targetRow}!`,
        ...(isWin ? [`🏆 VICTORY! ${attacker.name} conquered the notebook!`] : [])
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
        (err) => console.error('Host error:', err)
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
        (err) => console.error('Join error:', err)
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
    <div className="h-[100dvh] max-h-[100dvh] w-screen max-w-full overflow-hidden flex flex-col justify-between bg-[#f3f0e8] p-0.5 sm:p-2 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-[max(0.25rem,env(safe-area-inset-top))] select-none">
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
      <div className="flex-1 min-h-0 w-full max-w-5xl mx-auto flex items-stretch justify-between my-0.5">
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

      {/* Center Screen Dice Result Reveal Overlay (Visible to both players for 1.2s) */}
      <DiceAnnouncementOverlay
        announcement={gameState.rollAnnouncement}
        players={gameState.players}
      />

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
        initialRoomCode={initialRoomCode}
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
