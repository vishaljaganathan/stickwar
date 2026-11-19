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
  PLAYER_CONFIGS,
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
  const [gameState, setGameState] = useState<GameState>(() => createInitialGameState('local', 2));
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(true);
  const [localPlayerId, setLocalPlayerId] = useState<PlayerId>('p1');
  const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);
  const [isMultiplayerOpen, setIsMultiplayerOpen] = useState<boolean>(false);
  const [multiplayerTab, setMultiplayerTab] = useState<'modes' | 'host' | 'join' | 'host_setup'>('modes');
  const [isFirebaseConfigOpen, setIsFirebaseConfigOpen] = useState<boolean>(false);
  const [reactionNotice, setReactionNotice] = useState<{ emoji: string; from: string } | null>(null);
  const [initialRoomCode, setInitialRoomCode] = useState<string>('');

  // Dice visual state for each of the 4 players (can show 0-9 or '?')
  const [diceDisplays, setDiceDisplays] = useState<Record<PlayerId, number | string>>({
    p1: '?',
    p2: '?',
    p3: '?',
    p4: '?'
  });
  const [rollingPlayer, setRollingPlayer] = useState<PlayerId | null>(null);

  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  // Sync dice display with last rolls
  useEffect(() => {
    if (gameState.lastRoll !== null && gameState.lastRollPlayer) {
      setDiceDisplays((prev) => ({
        ...prev,
        [gameState.lastRollPlayer!]: gameState.lastRoll!
      }));
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

  // Turn rotation cycles among living players in playerOrder (2-4 players)
  const getNextPlayer = (current: PlayerId, state?: GameState): PlayerId => {
    const cur = state || gameStateRef.current;
    const order: PlayerId[] = cur.playerOrder && cur.playerOrder.length > 0 ? cur.playerOrder : ['p1', 'p2'];
    const currentIndex = order.indexOf(current);
    const startIdx = currentIndex >= 0 ? currentIndex : 0;

    for (let i = 1; i <= order.length; i++) {
      const nextCandidate = order[(startIdx + i) % order.length];
      const isEliminated = ROW_NUMBERS.every((r) => cur.players[nextCandidate].cells[r].isDestroyed);
      if (!isEliminated) {
        return nextCandidate;
      }
    }
    return current;
  };

  // Victory Condition: A player wins when all opponent players have all 5 stickmen destroyed
  const checkVictory = (state: GameState): PlayerId | null => {
    const order: PlayerId[] = state.playerOrder && state.playerOrder.length > 0 ? state.playerOrder : ['p1', 'p2'];
    const alivePlayers = order.filter((pid) =>
      ROW_NUMBERS.some((r) => !state.players[pid].cells[r].isDestroyed)
    );

    if (alivePlayers.length === 1) {
      return alivePlayers[0];
    }
    return null;
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
      setDiceDisplays((prev) => ({ ...prev, [playerId]: tempVal }));

      counter++;
      if (counter > 8) {
        clearInterval(interval);
        const finalVal = DICE_NUMBERS[Math.floor(Math.random() * DICE_NUMBERS.length)];
        setDiceDisplays((prev) => ({ ...prev, [playerId]: finalVal }));

        setRollingPlayer(null);
        handleRollResolution(playerId, finalVal);
      }
    }, 85);
  };

  // Roll Resolution (Shows center reveal for 1.2s to all players, then executes action)
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
        `💥 ${players[currentTurn].name}'s Stickman #${attackerRow} launched ${weaponType.toUpperCase()} at ${players[targetPlayerId].name}'s Lane #${targetRow}!`
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

    const potentialNextState = { ...currentState, players: nextPlayers };
    const winnerId = checkVictory(potentialNextState);
    const isWin = winnerId !== null;
    const nextTurn = getNextPlayer(currentTurn, potentialNextState);

    const nextState: GameState = {
      ...currentState,
      players: nextPlayers,
      pendingRowTarget: null,
      attackAnim: null,
      phase: isWin ? 'game_over' : 'turn_ready',
      currentTurn: isWin ? currentTurn : nextTurn,
      winner: winnerId,
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

  // Network Listeners (Multiplayer state, real-time name sync, match start, reactions)
  useEffect(() => {
    const unsubSync = networkManager.addListener('stateSync', (incomingState) => {
      setGameState((prev) => {
        const mergedPlayers = { ...prev.players };
        if (incomingState.players) {
          (['p1', 'p2', 'p3', 'p4'] as PlayerId[]).forEach((pid) => {
            if (incomingState.players?.[pid]) {
              mergedPlayers[pid] = {
                ...mergedPlayers[pid],
                ...incomingState.players[pid],
                name: incomingState.players[pid]?.name || mergedPlayers[pid].name
              };
            }
          });
        }

        return {
          ...prev,
          ...incomingState,
          players: mergedPlayers
        };
      });
    });

    const unsubName = networkManager.addListener('nameUpdated', (playerId, newName) => {
      setGameState((prev) => ({
        ...prev,
        players: {
          ...prev.players,
          [playerId]: {
            ...prev.players[playerId],
            name: newName
          }
        }
      }));
    });

    const unsubMatch = networkManager.addListener('matchStarted', (payload) => {
      sounds.playDiceRoll();
      const maxP = payload?.maxPlayers || networkManager.maxPlayers || 2;
      const activeOrder: PlayerId[] = (['p1', 'p2', 'p3', 'p4'] as PlayerId[]).slice(0, maxP);

      setGameState((prev) => {
        const nextPlayers = { ...prev.players };
        if (payload?.namedRoster) {
          (Object.keys(payload.namedRoster) as PlayerId[]).forEach((pid) => {
            if (payload.namedRoster[pid]) {
              nextPlayers[pid] = { ...nextPlayers[pid], name: payload.namedRoster[pid] };
            }
          });
        }

        return {
          ...prev,
          maxPlayers: maxP,
          playerOrder: activeOrder,
          players: nextPlayers,
          log: [
            ...prev.log,
            `⚔️ Match launched with ${maxP} commanders! Roll to recruit warriors.`
          ]
        };
      });

      setIsMultiplayerOpen(false);
    });

    const unsubReaction = networkManager.addListener('reaction', (reaction) => {
      const oppName = networkManager.roster
        ? Object.values(networkManager.roster).find((r) => r.id !== localPlayerId)?.name || 'Opponent'
        : 'Opponent';
      setReactionNotice({
        emoji: reaction,
        from: oppName
      });
      setTimeout(() => setReactionNotice(null), 2500);
    });

    const unsubDisc = networkManager.addListener('opponentDisconnected', (name) => {
      setReactionNotice({
        emoji: '📡',
        from: `${name || 'Player'} Left Room`
      });
      setTimeout(() => setReactionNotice(null), 3000);
    });

    return () => {
      unsubSync();
      unsubName();
      unsubMatch();
      unsubReaction();
      unsubDisc();
      networkManager.disconnect();
      firebaseSync.stopListening();
    };
  }, [localPlayerId]);

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
    const initial = createInitialGameState(gameState.mode, gameState.maxPlayers || 2);
    initial.roomCode = gameState.roomCode;
    initial.playerOrder = gameState.playerOrder;
    (['p1', 'p2', 'p3', 'p4'] as PlayerId[]).forEach((pid) => {
      initial.players[pid].name = gameState.players[pid].name;
    });
    setDiceDisplays({ p1: '?', p2: '?', p3: '?', p4: '?' });
    setGameState(initial);
    broadcastState(initial);
  };

  // Host updates name while in waiting lobby
  const handleUpdateHostName = (newName: string) => {
    const cleanName = newName.trim();
    if (!cleanName) return;
    setGameState((prev) => {
      const updated: GameState = {
        ...prev,
        players: {
          ...prev.players,
          p1: { ...prev.players.p1, name: cleanName }
        }
      };
      broadcastState(updated);
      return updated;
    });
    networkManager.updateLocalName(cleanName);
  };

  // Host launches match from waiting lobby
  const handleHostStartMatch = (finalPlayerCount: number) => {
    const activeOrder: PlayerId[] = (['p1', 'p2', 'p3', 'p4'] as PlayerId[]).slice(0, finalPlayerCount);
    setGameState((prev) => {
      const updated: GameState = {
        ...prev,
        maxPlayers: finalPlayerCount,
        playerOrder: activeOrder,
        log: [
          ...prev.log,
          `⚔️ Match launched by host with ${finalPlayerCount} commanders!`
        ]
      };
      broadcastState(updated);
      return updated;
    });
    setIsMultiplayerOpen(false);
  };

  const handleStartOnlineHost = (
    mode: 'online_p2p' | 'online_firebase',
    roomCode: string,
    playerName?: string,
    maxPlayers: number = 2
  ) => {
    const hostName = (playerName || 'Player 1').trim() || 'Player 1';
    setLocalPlayerId('p1');
    const newGame = createInitialGameState(mode, maxPlayers);
    newGame.roomCode = roomCode;
    newGame.players.p1.name = hostName;
    newGame.log = [`Match hosted by ${hostName}! Waiting for players in lobby (${roomCode})...`];
    setGameState(newGame);

    if (mode === 'online_p2p') {
      networkManager.hostRoom(
        roomCode,
        hostName,
        maxPlayers,
        () => console.log(`Host room ready (${maxPlayers}P):`, roomCode),
        (err) => console.error('Host error:', err)
      );

      networkManager.addListener('playerJoined', (newPlayerId, newName, currentCount, max, namedRoster) => {
        setGameState((prev) => {
          const nextPlayers = { ...prev.players };
          (Object.keys(namedRoster) as PlayerId[]).forEach((pid) => {
            if (namedRoster[pid]) {
              nextPlayers[pid] = { ...nextPlayers[pid], name: namedRoster[pid] };
            }
          });

          const updated: GameState = {
            ...prev,
            players: nextPlayers,
            log: [
              ...prev.log,
              `🎮 ${newName} joined as ${PLAYER_CONFIGS[newPlayerId]?.label || newPlayerId.toUpperCase()}! (${currentCount}/${max})`
            ]
          };
          broadcastState(updated);
          return updated;
        });
      });
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

  const handleStartOnlineJoin = (
    mode: 'online_p2p' | 'online_firebase',
    roomCode: string,
    playerName?: string
  ) => {
    const guestName = (playerName || 'Player 2').trim() || 'Player 2';
    const newGame = createInitialGameState(mode, 2);
    newGame.roomCode = roomCode;
    newGame.players.p1.name = 'Connecting to Host...';
    newGame.log = [`Connecting to room ${roomCode} as ${guestName}...`];
    setGameState(newGame);

    if (mode === 'online_p2p') {
      networkManager.joinRoom(
        roomCode,
        guestName,
        (assignedId, roster, hostName) => {
          setLocalPlayerId(assignedId);
          setGameState((prev) => {
            const nextPlayers = { ...prev.players };
            nextPlayers[assignedId] = { ...nextPlayers[assignedId], name: guestName };
            if (hostName) nextPlayers.p1 = { ...nextPlayers.p1, name: hostName };

            // Populate all roster entries
            Object.values(roster).forEach((entry) => {
              if (entry.id && entry.name) {
                nextPlayers[entry.id] = { ...nextPlayers[entry.id], name: entry.name };
              }
            });

            const maxP = networkManager.maxPlayers || 2;
            const activeOrder: PlayerId[] = (['p1', 'p2', 'p3', 'p4'] as PlayerId[]).slice(0, maxP);

            return {
              ...prev,
              maxPlayers: maxP,
              playerOrder: activeOrder,
              players: nextPlayers,
              log: [
                ...prev.log,
                `🎮 Joined ${hostName}'s match as ${PLAYER_CONFIGS[assignedId]?.label || assignedId.toUpperCase()}! In waiting lobby.`
              ]
            };
          });
          // Note: Modal stays open on guest_lobby tab until host launches the match!
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

  const canInteractWithWeapon =
    gameState.phase === 'weapon_select' &&
    (gameState.mode !== 'ai' || gameState.currentTurn === 'p1') &&
    (!isOnline || localPlayerId === gameState.currentTurn);

  const currentTurnPlayer = gameState.players[gameState.currentTurn];

  const hasP3 = (gameState.playerOrder || []).includes('p3');
  const hasP4 = (gameState.playerOrder || []).includes('p4');

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
          setMultiplayerTab('host_setup');
          setIsMultiplayerOpen(true);
        }}
        onResetGame={handleResetGame}
        players={gameState.players}
        playerOrder={gameState.playerOrder || ['p1', 'p2']}
        currentTurn={gameState.currentTurn}
        lastLogEntry={gameState.log[gameState.log.length - 1] || 'Battle ready! Roll to recruit stickmen.'}
        localPlayerId={localPlayerId}
      />

      {/* 2. Tactical Status & Emote Ribbon */}
      <BattleStatus
        gameState={gameState}
        reactionNotice={reactionNotice}
        onSendReaction={handleSendReaction}
      />

      {/* 3. Main Battlefield Area: Left Pedestals + Center Notebook + Right Pedestals */}
      <div className="flex-1 min-h-0 w-full max-w-5xl mx-auto flex items-stretch justify-between my-0.5">
        {/* Left Side: Player 1 (and Player 3 if 3P or 4P) */}
        <div className="flex flex-col justify-center gap-1 shrink-0 z-10">
          <SidePlayerDie
            playerId="p1"
            playerState={gameState.players.p1}
            isCurrentTurn={gameState.currentTurn === 'p1'}
            isLocked={
              gameState.phase !== 'turn_ready' ||
              gameState.winner !== null ||
              gameState.currentTurn !== 'p1' ||
              (isOnline && localPlayerId !== 'p1')
            }
            isRolling={rollingPlayer === 'p1'}
            displayValue={diceDisplays.p1}
            onRoll={() => triggerRollForPlayer('p1')}
            position="left"
            isCompact={hasP3}
          />

          {hasP3 && (
            <SidePlayerDie
              playerId="p3"
              playerState={gameState.players.p3}
              isCurrentTurn={gameState.currentTurn === 'p3'}
              isLocked={
                gameState.phase !== 'turn_ready' ||
                gameState.winner !== null ||
                gameState.currentTurn !== 'p3' ||
                (isOnline && localPlayerId !== 'p3')
              }
              isRolling={rollingPlayer === 'p3'}
              displayValue={diceDisplays.p3}
              onRoll={() => triggerRollForPlayer('p3')}
              position="left"
              isCompact={true}
            />
          )}
        </div>

        {/* Center: The Notebook Grid */}
        <NotebookGrid
          gameState={gameState}
          onAttackCell={handleAttackCell}
          localPlayerId={isOnline ? localPlayerId : undefined}
        />

        {/* Right Side: Player 2 (and Player 4 if 4P) */}
        <div className="flex flex-col justify-center gap-1 shrink-0 z-10">
          <SidePlayerDie
            playerId="p2"
            playerState={gameState.players.p2}
            isCurrentTurn={gameState.currentTurn === 'p2'}
            isLocked={
              gameState.phase !== 'turn_ready' ||
              gameState.winner !== null ||
              gameState.currentTurn !== 'p2' ||
              (gameState.mode === 'ai' && gameState.currentTurn === 'p2') ||
              (isOnline && localPlayerId !== 'p2')
            }
            isRolling={rollingPlayer === 'p2'}
            displayValue={diceDisplays.p2}
            onRoll={() => triggerRollForPlayer('p2')}
            position="right"
            isCompact={hasP4}
          />

          {hasP4 && (
            <SidePlayerDie
              playerId="p4"
              playerState={gameState.players.p4}
              isCurrentTurn={gameState.currentTurn === 'p4'}
              isLocked={
                gameState.phase !== 'turn_ready' ||
                gameState.winner !== null ||
                gameState.currentTurn !== 'p4' ||
                (isOnline && localPlayerId !== 'p4')
              }
              isRolling={rollingPlayer === 'p4'}
              displayValue={diceDisplays.p4}
              onRoll={() => triggerRollForPlayer('p4')}
              position="right"
              isCompact={true}
            />
          )}
        </div>
      </div>

      {/* Center Screen Dice Result Reveal Overlay (Visible to all players for 1.2s) */}
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
        onSelectLocal={(maxP) => {
          const pCount = maxP || 2;
          setGameState(createInitialGameState('local', pCount));
          setLocalPlayerId('p1');
        }}
        onSelectAI={() => {
          setGameState(createInitialGameState('ai', 2));
          setLocalPlayerId('p1');
        }}
        onStartOnlineHost={handleStartOnlineHost}
        onStartOnlineJoin={handleStartOnlineJoin}
        onUpdateHostName={handleUpdateHostName}
        onStartMatch={handleHostStartMatch}
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
