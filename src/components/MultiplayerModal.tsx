import React, { useState, useEffect } from 'react';
import { P2PNetworkManager, networkManager } from '../utils/network';
import { firebaseSync } from '../utils/firebaseSync';
import { voiceManager } from '../utils/voiceChat';
import { PlayerId, PLAYER_CONFIGS } from '../types/game';

interface MultiplayerModalProps {
  isOpen: boolean;
  initialTab?: 'modes' | 'host' | 'join' | 'host_setup' | 'guest_lobby';
  initialRoomCode?: string;
  onClose: () => void;
  onSelectLocal: (maxPlayers?: number) => void;
  onSelectAI: () => void;
  onStartOnlineHost: (mode: 'online_p2p' | 'online_firebase', roomCode: string, playerName?: string, maxPlayers?: number) => void;
  onStartOnlineJoin: (mode: 'online_p2p' | 'online_firebase', roomCode: string, playerName?: string) => void;
  onUpdateHostName?: (newName: string) => void;
  onStartMatch?: (finalPlayerCount: number) => void;
  onOpenFirebaseConfig: () => void;
}

export const MultiplayerModal: React.FC<MultiplayerModalProps> = ({
  isOpen,
  initialTab = 'modes',
  initialRoomCode = '',
  onClose,
  onSelectLocal,
  onSelectAI,
  onStartOnlineHost,
  onStartOnlineJoin,
  onUpdateHostName,
  onStartMatch,
  onOpenFirebaseConfig
}) => {
  const [activeTab, setActiveTab] = useState<'modes' | 'host' | 'join' | 'host_setup' | 'guest_lobby'>(initialTab);
  const [onlineType, setOnlineType] = useState<'p2p' | 'firebase'>('p2p');
  const [roomCode, setRoomCode] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>(initialRoomCode);
  const [selectedMaxPlayers, setSelectedMaxPlayers] = useState<number>(2);
  const [localMaxPlayers, setLocalMaxPlayers] = useState<number>(2);

  const [copyCodeSuccess, setCopyCodeSuccess] = useState<boolean>(false);
  const [copyLinkSuccess, setCopyLinkSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [networkStatus, setNetworkStatus] = useState<string>('');

  // Voice Chat preference (saved in localStorage)
  const [enableVoiceChat, setEnableVoiceChat] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('stickman_voice_enabled');
      return saved !== null ? saved !== 'false' : true;
    } catch {
      return true;
    }
  });
  const [voiceStatus, setVoiceStatus] = useState(() => voiceManager.getState());

  useEffect(() => {
    const unsub = voiceManager.subscribe((st) => setVoiceStatus(st));
    return () => unsub();
  }, []);

  const handleToggleVoicePreference = (val: boolean) => {
    setEnableVoiceChat(val);
    try {
      localStorage.setItem('stickman_voice_enabled', String(val));
    } catch {}
    if (!val && voiceManager.isJoined) {
      voiceManager.leaveVoice();
    }
  };

  // Persistent Player Name State
  const [playerName, setPlayerName] = useState<string>(() => {
    try {
      return localStorage.getItem('stickman_commander_name') || '';
    } catch {
      return '';
    }
  });

  // Guest Assigned State
  const [assignedSlot, setAssignedSlot] = useState<PlayerId>('p2');
  const [hostCommanderName, setHostCommanderName] = useState<string>('Host Player');

  // Live Roster State: Record<PlayerId, string>
  const [connectedRoster, setConnectedRoster] = useState<Record<PlayerId, string>>({
    p1: playerName.trim() || 'Player 1',
    p2: 'Waiting for Player 2...',
    p3: 'Waiting for Player 3...',
    p4: 'Waiting for Player 4...'
  });
  const [totalJoinedCount, setTotalJoinedCount] = useState<number>(1);

  // Active speaker detection in lobby
  const speakingSlot = (['p1', 'p2', 'p3', 'p4'] as PlayerId[]).find(
    (pid) => voiceStatus.speakingSlots[pid]
  );
  const speakingCommanderName = speakingSlot ? (connectedRoster[speakingSlot] || speakingSlot.toUpperCase()) : null;

  const savePlayerName = (name: string) => {
    setPlayerName(name);
    try {
      localStorage.setItem('stickman_commander_name', name);
    } catch {}

    // Live update if already hosting
    if (activeTab === 'host') {
      networkManager.updateLocalName(name);
      onUpdateHostName?.(name);
      setConnectedRoster((prev) => ({
        ...prev,
        p1: name.trim() || 'Player 1'
      }));
    } else if (activeTab === 'guest_lobby') {
      networkManager.updateLocalName(name);
      setConnectedRoster((prev) => ({
        ...prev,
        [assignedSlot]: name.trim() || `Player ${assignedSlot.slice(1)}`
      }));
    }
  };

  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      setNetworkStatus('');
      setIsConnecting(false);

      if (initialRoomCode) {
        setInputCode(initialRoomCode);
      }

      const currentName = playerName.trim() || 'Player 1';
      setConnectedRoster({
        p1: currentName,
        p2: 'Waiting for Player 2...',
        p3: 'Waiting for Player 3...',
        p4: 'Waiting for Player 4...'
      });
      setTotalJoinedCount(1);

      if (initialTab === 'host') {
        setActiveTab('host_setup');
      } else {
        setActiveTab(initialTab);
      }
    }
  }, [isOpen, initialTab, initialRoomCode]);

  // Hook into live network manager multi-subscriber events
  useEffect(() => {
    const unsubJoin = networkManager.addListener('playerJoined', (playerId, name, count, max, roster) => {
      console.log(`[MultiplayerModal] playerJoined: ${name} as ${playerId} (${count}/${max})`);
      setTotalJoinedCount(count);
      setSelectedMaxPlayers(max);
      setConnectedRoster((prev) => {
        const next = { ...prev };
        (Object.keys(roster) as PlayerId[]).forEach((pid) => {
          if (roster[pid]) {
            next[pid] = roster[pid];
          }
        });
        next[playerId] = name;
        return next;
      });
      setNetworkStatus(`⚡ ${name} joined as ${PLAYER_CONFIGS[playerId]?.label || playerId.toUpperCase()} (${count}/${max})`);
      if (enableVoiceChat && voiceManager.isJoined) {
        voiceManager.announcePresence();
      }
    });

    const unsubRoster = networkManager.addListener('rosterUpdated', (roster) => {
      setTotalJoinedCount(Object.keys(roster).length);
      setSelectedMaxPlayers(networkManager.maxPlayers);
      setConnectedRoster((prev) => {
        const next: Record<PlayerId, string> = {
          p1: prev.p1 || hostCommanderName || 'Host',
          p2: 'Waiting for Player 2...',
          p3: 'Waiting for Player 3...',
          p4: 'Waiting for Player 4...'
        };
        Object.values(roster).forEach((entry) => {
          if (entry.id && entry.name) {
            next[entry.id] = entry.name;
          }
        });
        return next;
      });
    });

    const unsubName = networkManager.addListener('nameUpdated', (playerId, newName) => {
      setConnectedRoster((prev) => ({
        ...prev,
        [playerId]: newName
      }));
      if (playerId === 'p1') {
        setHostCommanderName(newName);
      }
    });

    const unsubGuest = networkManager.addListener('guestConnected', (assignedId, roster, hostName) => {
      console.log(`[MultiplayerModal] guestConnected: assigned=${assignedId}, host=${hostName}`);
      setIsConnecting(false);
      setAssignedSlot(assignedId);
      setHostCommanderName(hostName);
      setRoomCode(networkManager.roomCode);
      setSelectedMaxPlayers(networkManager.maxPlayers);

      if (enableVoiceChat) {
        voiceManager.joinVoice(assignedId, playerName.trim() || 'Player');
      }

      const namedRoster: Record<PlayerId, string> = {
        p1: hostName,
        p2: 'Waiting for Player 2...',
        p3: 'Waiting for Player 3...',
        p4: 'Waiting for Player 4...'
      };
      Object.values(roster).forEach((entry) => {
        if (entry.id && entry.name) {
          namedRoster[entry.id] = entry.name;
        }
      });
      setConnectedRoster(namedRoster);
      setTotalJoinedCount(Object.keys(roster).length);
      setActiveTab('guest_lobby');
    });

    const unsubStart = networkManager.addListener('matchStarted', () => {
      onClose();
    });

    const unsubStatus = networkManager.addListener('statusChange', (status: string) => {
      setNetworkStatus(status);
      if (status.toLowerCase().includes('error') || status.toLowerCase().includes('failed') || status.toLowerCase().includes('could not reach')) {
        setIsConnecting(false);
        setErrorMessage(status);
      }
    });

    return () => {
      unsubJoin();
      unsubRoster();
      unsubName();
      unsubGuest();
      unsubStart();
      unsubStatus();
    };
  }, [onClose]);

  if (!isOpen) return null;

  // Step 1: Host launches room after picking player count and name
  const handleLaunchRoom = () => {
    const finalHostName = playerName.trim();
    if (!finalHostName) {
      setErrorMessage('Please enter your Commander Name before creating a room!');
      return;
    }

    const code = P2PNetworkManager.generateRoomCode();
    setRoomCode(code);
    setActiveTab('host');
    setErrorMessage('');

    setConnectedRoster({
      p1: finalHostName,
      p2: 'Waiting for Player 2...',
      p3: 'Waiting for Player 3...',
      p4: 'Waiting for Player 4...'
    });
    setTotalJoinedCount(1);

    onStartOnlineHost(
      onlineType === 'firebase' ? 'online_firebase' : 'online_p2p',
      code,
      finalHostName,
      selectedMaxPlayers
    );

    if (enableVoiceChat) {
      voiceManager.joinVoice('p1', finalHostName);
    }
  };

  // Host launches battle when ready
  const handleHostStartBattle = () => {
    if (totalJoinedCount < 2) return;
    networkManager.startMatch(totalJoinedCount);
    onStartMatch?.(totalJoinedCount);
    onClose();
  };

  // Guest clicks Join Match
  const submitJoin = () => {
    const cleanGuestName = playerName.trim();
    if (!cleanGuestName) {
      setErrorMessage('Please enter your Commander Name before joining the match!');
      return;
    }

    const normalized = P2PNetworkManager.normalizeRoomCode(inputCode);
    if (!normalized.cleanCode) {
      setErrorMessage('Please enter a valid room code (e.g. SM-7492)');
      return;
    }
    setIsConnecting(true);
    setErrorMessage('');
    setNetworkStatus(`Connecting to room ${normalized.displayCode}...`);

    onStartOnlineJoin(
      onlineType === 'firebase' ? 'online_firebase' : 'online_p2p',
      normalized.displayCode,
      cleanGuestName
    );
  };

  const handlePasteCode = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const normalized = P2PNetworkManager.normalizeRoomCode(text);
      if (normalized.displayCode) {
        setInputCode(normalized.displayCode);
      } else {
        setInputCode(text.trim().toUpperCase());
      }
    } catch {}
  };

  const copyCodeOnly = () => {
    navigator.clipboard.writeText(roomCode);
    setCopyCodeSuccess(true);
    setTimeout(() => setCopyCodeSuccess(false), 2000);
  };

  const copyMatchLink = () => {
    const origin = window.location.origin + window.location.pathname;
    const inviteUrl = `${origin}?room=${roomCode}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopyLinkSuccess(true);
    setTimeout(() => setCopyLinkSuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/65 backdrop-blur-sm animate-fade-in select-none">
      <div className="relative w-full max-w-lg bg-[#fffefb] rounded-3xl border-3 sm:border-4 border-[#0f172a] shadow-[8px_8px_0px_#0f172a] p-4 sm:p-6 overflow-hidden max-h-[95vh] overflow-y-auto">
        {/* Retro Header Ribbon */}
        <div className="absolute top-0 left-0 right-0 h-3.5 bg-amber-400 border-b-2 border-[#0f172a]" />

        {/* Modal Top Bar */}
        <div className="flex items-center justify-between mt-1 mb-2.5 border-b-2 border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">
              {activeTab === 'guest_lobby' ? '🛡️' : '🎮'}
            </span>
            <h2 className="text-xl sm:text-2xl font-retro font-black text-[#0f172a] uppercase tracking-wide">
              {activeTab === 'host'
                ? 'HOST WAITING LOBBY'
                : activeTab === 'guest_lobby'
                ? 'MATCH ROOM LOBBY'
                : activeTab === 'host_setup'
                ? 'CREATE MATCH (2-4 PLAYERS)'
                : activeTab === 'join'
                ? 'JOIN ROOM MATCH'
                : 'SELECT BATTLE MODE'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full border-2 border-[#0f172a] bg-white hover:bg-slate-100 flex items-center justify-center font-retro font-bold text-slate-800 text-xs shadow-xs"
          >
            ✕
          </button>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="mb-2.5 p-2 rounded-xl bg-rose-100 border-2 border-rose-400 text-rose-800 text-xs font-retro font-bold flex items-start gap-1.5">
            <span className="text-base shrink-0">⚠️</span>
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        {/* Live Network Status Indicator */}
        {networkStatus && !errorMessage && (
          <div className="mb-2.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-300 text-blue-900 text-[11px] font-mono font-bold flex items-center gap-2 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
            <span className="truncate">{networkStatus}</span>
          </div>
        )}

        {/* TAB 1: MODES */}
        {activeTab === 'modes' && (
          <div className="space-y-2.5 font-retro">
            {/* Quick Commander Name Bar */}
            <div className="p-2.5 bg-amber-50 border-2 border-[#0f172a] rounded-xl flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-amber-400 border border-[#0f172a] flex items-center justify-center text-base shrink-0 shadow-xs">
                  🤠
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block text-[8px] font-mono font-black text-amber-900 uppercase tracking-wider">
                    YOUR COMMANDER NAME:
                  </span>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => savePlayerName(e.target.value)}
                    placeholder="Enter your name (e.g. Vishal, Sasithra)"
                    maxLength={14}
                    className="w-full text-xs sm:text-sm font-retro font-black text-blue-900 bg-transparent border-b border-dashed border-amber-600 focus:outline-none focus:border-blue-700 px-0.5"
                  />
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-full border border-amber-400 shrink-0">
                {playerName.trim() ? '✓ READY' : 'TYPE NAME'}
              </span>
            </div>

            {/* Realtime Cloud Relay Section */}
            <div className="p-3.5 bg-amber-100/70 border-2 sm:border-3 border-[#0f172a] rounded-2xl shadow-[3px_3px_0px_#0f172a]">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xl">🌐</span>
                  <span className="font-black text-sm sm:text-base text-[#0f172a]">ONLINE ROOM MATCH</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-400 border border-[#0f172a] text-[9px] font-mono font-black text-[#0f172a]">
                  PORT 443 HTTPS/WSS
                </span>
              </div>
              <p className="text-xs font-hand font-bold text-slate-600 mb-1">
                Play across any phone & city (Pondicherry ⇄ Bengaluru) on phone 4G/5G or Wi-Fi with 2 to 4 players!
              </p>
              <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-800 mb-2.5">
                <span>✓ Direct Port 443 relay with live player name sync</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setOnlineType('p2p');
                    setActiveTab('host_setup');
                  }}
                  className="btn-retro py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#0f172a]"
                >
                  <span>👑</span> CREATE ROOM
                </button>
                <button
                  onClick={() => {
                    setOnlineType('p2p');
                    setActiveTab('join');
                  }}
                  className="btn-retro py-2.5 px-3 bg-amber-400 hover:bg-amber-300 text-[#0f172a] rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#0f172a]"
                >
                  <span>⚔️</span> JOIN ROOM
                </button>
              </div>
            </div>

            {/* Local Modes (Pass & Play + AI) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <div className="p-3 bg-white border-2 border-[#0f172a] rounded-2xl shadow-[2px_2px_0px_#0f172a] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black text-xs sm:text-sm text-[#0f172a]">📱 PASS & PLAY</span>
                    <span className="text-[9px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">
                      SAME SCREEN
                    </span>
                  </div>
                  <p className="text-[11px] font-hand font-bold text-slate-500 mb-2">
                    Take turns rolling the die on this device.
                  </p>
                  {/* Select player count */}
                  <div className="flex items-center gap-1 mb-2">
                    {[2, 3, 4].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setLocalMaxPlayers(count)}
                        className={`flex-1 py-1 rounded-lg text-[10px] font-black border transition-all ${
                          localMaxPlayers === count
                            ? 'bg-blue-600 text-white border-blue-900 shadow-xs'
                            : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {count}P
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => {
                    onSelectLocal(localMaxPlayers);
                    onClose();
                  }}
                  className="btn-retro w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-[#0f172a] rounded-xl text-xs font-black border border-[#0f172a]"
                >
                  START {localMaxPlayers}P MATCH
                </button>
              </div>

              <div className="p-3 bg-white border-2 border-[#0f172a] rounded-2xl shadow-[2px_2px_0px_#0f172a] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black text-xs sm:text-sm text-[#0f172a]">🤖 VS STICKBOT</span>
                    <span className="text-[9px] font-mono font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                      SOLO AI
                    </span>
                  </div>
                  <p className="text-[11px] font-hand font-bold text-slate-500 mb-2">
                    Test your tactical skill against AI warrior.
                  </p>
                </div>
                <button
                  onClick={() => {
                    onSelectAI();
                    onClose();
                  }}
                  className="btn-retro w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-[#0f172a] rounded-xl text-xs font-black border border-[#0f172a]"
                >
                  FIGHT AI NOW
                </button>
              </div>
            </div>

            <div className="text-center pt-2">
              <button
                onClick={onOpenFirebaseConfig}
                className="text-[10px] font-mono text-slate-500 hover:text-slate-800 underline"
              >
                ⚙️ Advanced Cloud Database Setup (Optional)
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: HOST SETUP (SELECT NUMBER OF PLAYERS & NAME) */}
        {activeTab === 'host_setup' && (
          <div className="py-2 space-y-3 font-retro">
            {/* Step 1: Host Name Input */}
            <div className="p-3 bg-blue-50 border-2 border-[#0f172a] rounded-2xl space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-mono font-black text-blue-950 uppercase tracking-wider">
                  YOUR COMMANDER NAME: <span className="text-rose-600">*</span>
                </label>
                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  playerName.trim() ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse'
                }`}>
                  {playerName.trim() ? '✓ READY' : 'REQUIRED'}
                </span>
              </div>
              <input
                type="text"
                value={playerName}
                onChange={(e) => savePlayerName(e.target.value)}
                placeholder="Enter host name (e.g. Vishal, Sasithra)"
                maxLength={14}
                className="w-full text-base font-retro font-black text-blue-950 bg-white border-2 border-[#0f172a] rounded-xl py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-xs"
              />
            </div>

            {/* Step 2: Player Count Selector (2, 3, or 4 Players) */}
            <div className="p-3 bg-amber-50 border-2 border-[#0f172a] rounded-2xl space-y-2">
              <label className="block text-[10px] font-mono font-black text-amber-950 uppercase tracking-wider">
                CHOOSE NUMBER OF PLAYERS:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { count: 2, label: '2 PLAYERS', icon: '👥', desc: '1v1 Classic Duel' },
                  { count: 3, label: '3 PLAYERS', icon: '⚔️', desc: '3-Way Free For All' },
                  { count: 4, label: '4 PLAYERS', icon: '🛡️', desc: '4-Squad Rumble' }
                ].map((item) => (
                  <button
                    key={item.count}
                    type="button"
                    onClick={() => setSelectedMaxPlayers(item.count)}
                    className={`p-2.5 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                      selectedMaxPlayers === item.count
                        ? 'bg-blue-600 text-white border-[#0f172a] shadow-[3px_3px_0px_#0f172a] scale-102 ring-2 ring-amber-300'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 hover:border-slate-400'
                    }`}
                  >
                    <span className="text-xl mb-0.5">{item.icon}</span>
                    <span className="text-xs font-black">{item.label}</span>
                    <span className={`text-[8px] font-mono ${selectedMaxPlayers === item.count ? 'text-blue-100' : 'text-slate-500'}`}>
                      {item.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Squads Preview */}
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[9px] font-mono font-black text-slate-500 uppercase tracking-wider block">
                ACTIVE SQUADS IN THIS MATCH:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 rounded-lg bg-blue-100 border border-blue-300 text-[10px] font-black text-blue-900 flex items-center gap-1">
                  🤠 P1 (Host)
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-rose-100 border border-rose-300 text-[10px] font-black text-rose-900 flex items-center gap-1">
                  🥷 P2 (Guest)
                </span>
                {selectedMaxPlayers >= 3 && (
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-100 border border-emerald-300 text-[10px] font-black text-emerald-900 flex items-center gap-1">
                    🧙 P3 (Guest)
                  </span>
                )}
                {selectedMaxPlayers >= 4 && (
                  <span className="px-2 py-0.5 rounded-lg bg-purple-100 border border-purple-300 text-[10px] font-black text-purple-900 flex items-center gap-1">
                    🤖 P4 (Guest)
                  </span>
                )}
              </div>
            </div>

            {/* Live Voice Chat Option */}
            <div
              onClick={() => handleToggleVoicePreference(!enableVoiceChat)}
              className={`p-2.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                enableVoiceChat
                  ? 'bg-emerald-50/90 border-emerald-600 shadow-xs'
                  : 'bg-slate-50 border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg border ${
                    enableVoiceChat
                      ? 'bg-emerald-500 border-emerald-700 text-white'
                      : 'bg-slate-200 border-slate-400 text-slate-500'
                  }`}
                >
                  {enableVoiceChat ? '🎙️' : '🔇'}
                </div>
                <div>
                  <div className="text-xs font-black font-retro text-[#0f172a] flex items-center gap-1.5">
                    ENABLE LIVE VOICE CHAT
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-black ${
                        enableVoiceChat ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {enableVoiceChat ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono font-bold text-slate-500">
                    {enableVoiceChat
                      ? 'Auto-connect microphone to talk with players'
                      : 'Microphone disabled (tap to enable)'}
                  </div>
                </div>
              </div>

              <div
                className={`w-11 h-6 rounded-full p-0.5 border-2 border-[#0f172a] transition-colors ${
                  enableVoiceChat ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    enableVoiceChat ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setActiveTab('modes')}
                className="btn-retro flex-1 py-2 bg-slate-100 text-[#0f172a] rounded-xl text-xs font-black border border-[#0f172a]"
              >
                ← BACK
              </button>
              <button
                type="button"
                onClick={handleLaunchRoom}
                disabled={!playerName.trim()}
                className={`btn-retro flex-2 py-2 rounded-xl text-xs font-black transition-all ${
                  !playerName.trim()
                    ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed shadow-none'
                    : 'bg-amber-400 hover:bg-amber-300 text-[#0f172a] shadow-[2px_2px_0px_#0f172a]'
                }`}
              >
                GENERATE {selectedMaxPlayers}-PLAYER ROOM ➔
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: HOST WAITING LOBBY (LIVE ROSTER) */}
        {activeTab === 'host' && (
          <div className="py-2 space-y-3 font-retro">
            {/* Room Code Card */}
            <div className="p-3 bg-amber-50 border-2 sm:border-3 border-[#0f172a] rounded-2xl text-center shadow-[3px_3px_0px_#0f172a]">
              <span className="text-[10px] font-mono font-bold text-amber-900 uppercase tracking-widest block mb-0.5">
                SHARE THIS MATCH CODE WITH YOUR FRIENDS:
              </span>
              <div className="text-3xl sm:text-4xl font-mono font-black text-[#0f172a] tracking-widest uppercase my-1 select-all">
                {roomCode}
              </div>

              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  onClick={copyCodeOnly}
                  className="btn-retro py-1.5 px-3 bg-white hover:bg-slate-50 text-[#0f172a] rounded-xl text-xs font-black flex items-center gap-1 shadow-xs"
                >
                  <span>{copyCodeSuccess ? '✓ COPIED!' : '📋 COPY CODE'}</span>
                </button>
                <button
                  onClick={copyMatchLink}
                  className="btn-retro py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black flex items-center gap-1 shadow-xs"
                >
                  <span>{copyLinkSuccess ? '✓ LINK COPIED!' : '🔗 SHARE INVITE LINK'}</span>
                </button>
              </div>
            </div>

            {/* Live Voice Chat Lobby Bar */}
            <div className="p-2.5 rounded-2xl border-2 border-[#0f172a] bg-slate-50 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm border ${
                    voiceStatus.isJoined
                      ? voiceStatus.isMuted
                        ? 'bg-rose-100 border-rose-300 text-rose-700'
                        : 'bg-emerald-500 border-emerald-600 text-white animate-pulse'
                      : 'bg-slate-200 border-slate-300 text-slate-500'
                  }`}
                >
                  {voiceStatus.isJoined ? (voiceStatus.isMuted ? '🔇' : '🎙️') : '🔈'}
                </div>
                <div>
                  <div className="text-xs font-black font-retro text-[#0f172a] flex items-center gap-1.5 flex-wrap">
                    {voiceStatus.isJoined ? 'VOICE CHAT CONNECTED' : 'VOICE CHAT OFF'}
                    {voiceStatus.isJoined && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                        {voiceStatus.activePeersCount} IN CALL
                      </span>
                    )}
                    {speakingCommanderName && (
                      <span className="px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-500 text-emerald-300 font-retro font-black text-[8px] flex items-center gap-1 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        <span>🎙️ {speakingCommanderName} speaking...</span>
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">
                    {voiceStatus.isJoined
                      ? voiceStatus.isMuted
                        ? 'Your mic is muted (tap Unmute)'
                        : 'Mic is live • Talk while waiting for players!'
                      : 'Tap Join to speak with other players'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {voiceStatus.isJoined ? (
                  <>
                    <button
                      type="button"
                      onClick={() => voiceManager.toggleMute()}
                      className={`btn-retro px-2.5 py-1 rounded-xl text-[10px] font-black border ${
                        voiceStatus.isMuted
                          ? 'bg-rose-500 text-white border-rose-700'
                          : 'bg-emerald-500 text-white border-emerald-700'
                      }`}
                    >
                      {voiceStatus.isMuted ? 'UNMUTE' : 'MUTE'}
                    </button>
                    <button
                      type="button"
                      onClick={() => voiceManager.leaveVoice()}
                      className="btn-retro px-2 py-1 rounded-xl text-[10px] font-black bg-slate-200 text-slate-700 border border-slate-400"
                    >
                      LEAVE
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      handleToggleVoicePreference(true);
                      voiceManager.joinVoice('p1', playerName.trim() || 'Host');
                    }}
                    className="btn-retro px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-[10px] font-black shadow-xs border border-emerald-700"
                  >
                    🎙️ JOIN VOICE
                  </button>
                )}
              </div>
            </div>

            {/* Host Commander Name Live Edit */}
            <div className="p-2.5 bg-blue-50 border-2 border-blue-400 rounded-xl flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-xl">🤠</span>
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] font-mono font-black text-blue-900 block">HOSTING AS (SLOT P1):</span>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => savePlayerName(e.target.value)}
                    placeholder="Enter your name"
                    maxLength={14}
                    className="w-full text-xs font-retro font-black text-blue-950 bg-white border border-blue-300 rounded px-1.5 py-0.5 focus:outline-none"
                  />
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold text-blue-800 bg-blue-200 px-2 py-0.5 rounded-full shrink-0">
                HOST
              </span>
            </div>

            {/* Live Player Slots (All 2, 3, or 4 Players) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-mono font-black text-slate-600 uppercase">
                  CONNECTED PLAYERS ({totalJoinedCount} OF {selectedMaxPlayers}):
                </span>
                <span className="text-[10px] font-mono font-bold text-amber-700 animate-pulse">
                  {totalJoinedCount >= selectedMaxPlayers ? 'ROOM FULL' : 'WAITING FOR PLAYERS...'}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-1.5">
                {/* Slot 1: Host */}
                <div className="p-2 rounded-xl border bg-blue-50 border-blue-300 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{PLAYER_CONFIGS.p1.avatar}</span>
                    <div>
                      <div className="font-retro font-black text-xs text-blue-950 flex items-center gap-1.5">
                        <span>{connectedRoster.p1 || playerName.trim() || 'Player 1'}</span>
                        {voiceStatus.speakingSlots.p1 && (
                          <span className="text-[7px] bg-emerald-500 text-slate-950 px-1 py-0.2 rounded font-bold animate-pulse">
                            🎙️ TALKING
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] font-mono text-slate-500">Slot P1 (Host) • Blue Squad</span>
                    </div>
                  </div>
                  <span className="text-xs text-emerald-600 font-bold">✓ HOST READY</span>
                </div>

                {/* Slot 2: Player 2 */}
                <div
                  className={`p-2 rounded-xl border flex items-center justify-between transition-all ${
                    connectedRoster.p2 && !connectedRoster.p2.includes('Waiting')
                      ? 'bg-rose-50 border-rose-400 shadow-xs'
                      : 'bg-slate-50 border-dashed border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{PLAYER_CONFIGS.p2.avatar}</span>
                    <div>
                      <div className="font-retro font-black text-xs text-rose-950 flex items-center gap-1.5">
                        <span>{connectedRoster.p2 || 'Waiting for Player 2...'}</span>
                        {voiceStatus.speakingSlots.p2 && (
                          <span className="text-[7px] bg-emerald-500 text-slate-950 px-1 py-0.2 rounded font-bold animate-pulse">
                            🎙️ TALKING
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] font-mono text-slate-500">Slot P2 • Red Squad</span>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-bold ${
                      connectedRoster.p2 && !connectedRoster.p2.includes('Waiting')
                        ? 'text-emerald-600'
                        : 'text-amber-600 animate-pulse'
                    }`}
                  >
                    {connectedRoster.p2 && !connectedRoster.p2.includes('Waiting') ? '✓ CONNECTED' : 'WAITING...'}
                  </span>
                </div>

                {/* Slot 3 (if 3 or 4 players) */}
                {selectedMaxPlayers >= 3 && (
                  <div
                    className={`p-2 rounded-xl border flex items-center justify-between transition-all ${
                      connectedRoster.p3 && !connectedRoster.p3.includes('Waiting')
                        ? 'bg-emerald-50 border-emerald-400 shadow-xs'
                        : 'bg-slate-50 border-dashed border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{PLAYER_CONFIGS.p3.avatar}</span>
                      <div>
                        <div className="font-retro font-black text-xs text-emerald-950 flex items-center gap-1.5">
                          <span>{connectedRoster.p3 || 'Waiting for Player 3...'}</span>
                          {voiceStatus.speakingSlots.p3 && (
                            <span className="text-[7px] bg-emerald-500 text-slate-950 px-1 py-0.2 rounded font-bold animate-pulse">
                              🎙️ TALKING
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] font-mono text-slate-500">Slot P3 • Green Squad</span>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-bold ${
                        connectedRoster.p3 && !connectedRoster.p3.includes('Waiting')
                          ? 'text-emerald-600'
                          : 'text-amber-600 animate-pulse'
                      }`}
                    >
                      {connectedRoster.p3 && !connectedRoster.p3.includes('Waiting') ? '✓ CONNECTED' : 'WAITING...'}
                    </span>
                  </div>
                )}

                {/* Slot 4 (if 4 players) */}
                {selectedMaxPlayers >= 4 && (
                  <div
                    className={`p-2 rounded-xl border flex items-center justify-between transition-all ${
                      connectedRoster.p4 && !connectedRoster.p4.includes('Waiting')
                        ? 'bg-purple-50 border-purple-400 shadow-xs'
                        : 'bg-slate-50 border-dashed border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{PLAYER_CONFIGS.p4.avatar}</span>
                      <div>
                        <div className="font-retro font-black text-xs text-purple-950 flex items-center gap-1.5">
                          <span>{connectedRoster.p4 || 'Waiting for Player 4...'}</span>
                          {voiceStatus.speakingSlots.p4 && (
                            <span className="text-[7px] bg-emerald-500 text-slate-950 px-1 py-0.2 rounded font-bold animate-pulse">
                              🎙️ TALKING
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] font-mono text-slate-500">Slot P4 • Purple Squad</span>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-bold ${
                        connectedRoster.p4 && !connectedRoster.p4.includes('Waiting')
                          ? 'text-emerald-600'
                          : 'text-amber-600 animate-pulse'
                      }`}
                    >
                      {connectedRoster.p4 && !connectedRoster.p4.includes('Waiting') ? '✓ CONNECTED' : 'WAITING...'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Launch Game Action Button */}
            <div className="pt-1">
              <button
                onClick={handleHostStartBattle}
                disabled={totalJoinedCount < 2}
                className={`btn-retro w-full py-2.5 px-4 rounded-xl text-sm font-black transition-all ${
                  totalJoinedCount >= 2
                    ? 'bg-amber-400 hover:bg-amber-300 text-[#0f172a] shadow-[3px_3px_0px_#0f172a] animate-bounce'
                    : 'bg-slate-200 text-slate-500 border-slate-300 cursor-not-allowed'
                }`}
              >
                {totalJoinedCount >= 2
                  ? `⚔️ ENTER BATTLEFIELD NOW (${totalJoinedCount} PLAYERS)!`
                  : `WAITING FOR PLAYERS (MINIMUM 2 NEEDED)...`}
              </button>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <button
                onClick={() => {
                  networkManager.disconnect();
                  setActiveTab('modes');
                }}
                className="text-xs text-slate-600 font-bold hover:underline"
              >
                ← Cancel & Return to Modes
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: GUEST WAITING LOBBY (SHOWN ONCE GUEST JOINS ROOM) */}
        {activeTab === 'guest_lobby' && (
          <div className="py-2 space-y-3 font-retro">
            {/* Room Code & Connection Confirmation */}
            <div className="p-3 bg-emerald-50 border-2 sm:border-3 border-emerald-600 rounded-2xl text-center shadow-[3px_3px_0px_#0f172a]">
              <div className="flex items-center justify-center gap-1.5 mb-1 text-emerald-800">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-mono font-black uppercase tracking-wider">
                  ✓ CONNECTED TO ROOM MATCH
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-mono font-black text-[#0f172a] tracking-widest uppercase my-0.5">
                {roomCode}
              </div>
              <p className="text-[11px] font-hand font-bold text-slate-600">
                Hosted by <strong className="text-blue-900">{hostCommanderName || connectedRoster.p1}</strong> • {selectedMaxPlayers}-Player Battle
              </p>
            </div>

            {/* Live Voice Chat Lobby Bar */}
            <div className="p-2.5 rounded-2xl border-2 border-[#0f172a] bg-slate-50 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm border ${
                    voiceStatus.isJoined
                      ? voiceStatus.isMuted
                        ? 'bg-rose-100 border-rose-300 text-rose-700'
                        : 'bg-emerald-500 border-emerald-600 text-white animate-pulse'
                      : 'bg-slate-200 border-slate-300 text-slate-500'
                  }`}
                >
                  {voiceStatus.isJoined ? (voiceStatus.isMuted ? '🔇' : '🎙️') : '🔈'}
                </div>
                <div>
                  <div className="text-xs font-black font-retro text-[#0f172a] flex items-center gap-1.5 flex-wrap">
                    {voiceStatus.isJoined ? 'VOICE CHAT CONNECTED' : 'VOICE CHAT OFF'}
                    {voiceStatus.isJoined && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                        {voiceStatus.activePeersCount} IN CALL
                      </span>
                    )}
                    {speakingCommanderName && (
                      <span className="px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-500 text-emerald-300 font-retro font-black text-[8px] flex items-center gap-1 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        <span>🎙️ {speakingCommanderName} speaking...</span>
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">
                    {voiceStatus.isJoined
                      ? voiceStatus.isMuted
                        ? 'Your mic is muted (tap Unmute)'
                        : 'Mic is live • Talk while waiting for players!'
                      : 'Tap Join to speak with other players'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {voiceStatus.isJoined ? (
                  <>
                    <button
                      type="button"
                      onClick={() => voiceManager.toggleMute()}
                      className={`btn-retro px-2.5 py-1 rounded-xl text-[10px] font-black border ${
                        voiceStatus.isMuted
                          ? 'bg-rose-500 text-white border-rose-700'
                          : 'bg-emerald-500 text-white border-emerald-700'
                      }`}
                    >
                      {voiceStatus.isMuted ? 'UNMUTE' : 'MUTE'}
                    </button>
                    <button
                      type="button"
                      onClick={() => voiceManager.leaveVoice()}
                      className="btn-retro px-2 py-1 rounded-xl text-[10px] font-black bg-slate-200 text-slate-700 border border-slate-400"
                    >
                      LEAVE
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      handleToggleVoicePreference(true);
                      voiceManager.joinVoice(assignedSlot, playerName.trim() || 'Player');
                    }}
                    className="btn-retro px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-[10px] font-black shadow-xs border border-emerald-700"
                  >
                    🎙️ JOIN VOICE
                  </button>
                )}
              </div>
            </div>

            {/* Guest's Assigned Squad Card */}
            <div className="p-3 bg-white border-2 border-[#0f172a] rounded-2xl shadow-xs space-y-1.5">
              <span className="text-[9px] font-mono font-black text-slate-500 uppercase tracking-wider block">
                YOUR COMMANDER PROFILE:
              </span>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl text-white shadow-xs"
                    style={{ backgroundColor: PLAYER_CONFIGS[assignedSlot]?.inkColor || '#dc2626' }}
                  >
                    {PLAYER_CONFIGS[assignedSlot]?.avatar || '🥷'}
                  </div>
                  <div>
                    <div className="font-retro font-black text-sm text-[#0f172a]">
                      {playerName.trim() || 'You'} <span className="text-xs text-emerald-600 font-bold">(YOU)</span>
                    </div>
                    <div className="text-[10px] font-mono font-bold text-slate-500">
                      Slot {assignedSlot.toUpperCase()} • {PLAYER_CONFIGS[assignedSlot]?.label || 'SQUAD'}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-black text-emerald-700 bg-emerald-100 border border-emerald-400 px-2 py-0.5 rounded-full">
                  ✓ READY
                </span>
              </div>
            </div>

            {/* Match Roster Overview */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-mono font-black text-slate-600 uppercase">
                  COMMANDERS IN ROOM ({totalJoinedCount} OF {selectedMaxPlayers}):
                </span>
                <span className="text-[10px] font-mono font-bold text-blue-700">
                  {totalJoinedCount >= selectedMaxPlayers ? 'ALL SLOTS FULL' : 'WAITING FOR OTHERS...'}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-1.5">
                {/* Slot 1: Host */}
                <div className="p-2 rounded-xl border bg-blue-50 border-blue-300 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{PLAYER_CONFIGS.p1.avatar}</span>
                    <div>
                      <div className="font-retro font-black text-xs text-blue-950 flex items-center gap-1.5">
                        <span>{connectedRoster.p1 || hostCommanderName}</span>
                        {voiceStatus.speakingSlots.p1 && (
                          <span className="text-[7px] bg-emerald-500 text-slate-950 px-1 py-0.2 rounded font-bold animate-pulse">
                            🎙️ TALKING
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] font-mono text-slate-500">Slot P1 (Host) • Blue Squad</span>
                    </div>
                  </div>
                  <span className="text-xs text-blue-700 font-bold">✓ HOST</span>
                </div>

                {/* Slot 2 */}
                <div
                  className={`p-2 rounded-xl border flex items-center justify-between ${
                    connectedRoster.p2 && !connectedRoster.p2.includes('Waiting')
                      ? 'bg-rose-50 border-rose-300 shadow-xs'
                      : 'bg-slate-50 border-dashed border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{PLAYER_CONFIGS.p2.avatar}</span>
                    <div>
                      <div className="font-retro font-black text-xs text-rose-950 flex items-center gap-1.5 flex-wrap">
                        <span>{connectedRoster.p2 || 'Waiting for Player 2...'}</span>
                        {assignedSlot === 'p2' && <span className="text-[10px] text-emerald-600">(YOU)</span>}
                        {voiceStatus.speakingSlots.p2 && (
                          <span className="text-[7px] bg-emerald-500 text-slate-950 px-1 py-0.2 rounded font-bold animate-pulse">
                            🎙️ TALKING
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] font-mono text-slate-500">Slot P2 • Red Squad</span>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-bold ${
                      connectedRoster.p2 && !connectedRoster.p2.includes('Waiting')
                        ? 'text-emerald-600'
                        : 'text-amber-600 animate-pulse'
                    }`}
                  >
                    {connectedRoster.p2 && !connectedRoster.p2.includes('Waiting') ? '✓ CONNECTED' : 'WAITING...'}
                  </span>
                </div>

                {/* Slot 3 */}
                {selectedMaxPlayers >= 3 && (
                  <div
                    className={`p-2 rounded-xl border flex items-center justify-between ${
                      connectedRoster.p3 && !connectedRoster.p3.includes('Waiting')
                        ? 'bg-emerald-50 border-emerald-300 shadow-xs'
                        : 'bg-slate-50 border-dashed border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{PLAYER_CONFIGS.p3.avatar}</span>
                      <div>
                        <div className="font-retro font-black text-xs text-emerald-950 flex items-center gap-1.5 flex-wrap">
                          <span>{connectedRoster.p3 || 'Waiting for Player 3...'}</span>
                          {assignedSlot === 'p3' && <span className="text-[10px] text-emerald-600">(YOU)</span>}
                          {voiceStatus.speakingSlots.p3 && (
                            <span className="text-[7px] bg-emerald-500 text-slate-950 px-1 py-0.2 rounded font-bold animate-pulse">
                              🎙️ TALKING
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] font-mono text-slate-500">Slot P3 • Green Squad</span>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-bold ${
                        connectedRoster.p3 && !connectedRoster.p3.includes('Waiting')
                          ? 'text-emerald-600'
                          : 'text-amber-600 animate-pulse'
                      }`}
                    >
                      {connectedRoster.p3 && !connectedRoster.p3.includes('Waiting') ? '✓ CONNECTED' : 'WAITING...'}
                    </span>
                  </div>
                )}

                {/* Slot 4 */}
                {selectedMaxPlayers >= 4 && (
                  <div
                    className={`p-2 rounded-xl border flex items-center justify-between ${
                      connectedRoster.p4 && !connectedRoster.p4.includes('Waiting')
                        ? 'bg-purple-50 border-purple-300 shadow-xs'
                        : 'bg-slate-50 border-dashed border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{PLAYER_CONFIGS.p4.avatar}</span>
                      <div>
                        <div className="font-retro font-black text-xs text-purple-950 flex items-center gap-1.5 flex-wrap">
                          <span>{connectedRoster.p4 || 'Waiting for Player 4...'}</span>
                          {assignedSlot === 'p4' && <span className="text-[10px] text-emerald-600">(YOU)</span>}
                          {voiceStatus.speakingSlots.p4 && (
                            <span className="text-[7px] bg-emerald-500 text-slate-950 px-1 py-0.2 rounded font-bold animate-pulse">
                              🎙️ TALKING
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] font-mono text-slate-500">Slot P4 • Purple Squad</span>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-bold ${
                        connectedRoster.p4 && !connectedRoster.p4.includes('Waiting')
                          ? 'text-emerald-600'
                          : 'text-amber-600 animate-pulse'
                      }`}
                    >
                      {connectedRoster.p4 && !connectedRoster.p4.includes('Waiting') ? '✓ CONNECTED' : 'WAITING...'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Waiting for Host Status Banner */}
            <div className="p-3 bg-amber-100/90 border-2 border-[#0f172a] rounded-2xl text-center space-y-1 shadow-[2px_2px_0px_#0f172a]">
              <div className="flex items-center justify-center gap-2 text-amber-950 font-black text-xs sm:text-sm">
                <span className="animate-spin text-base">⏳</span>
                <span>
                  {totalJoinedCount >= selectedMaxPlayers
                    ? `ALL PLAYERS IN ROOM! WAITING FOR HOST TO START...`
                    : `WAITING FOR OTHER PLAYERS OR FOR HOST TO START...`}
                </span>
              </div>
              <p className="text-[10px] font-mono text-amber-900">
                The match will automatically launch when Host ({hostCommanderName || 'Host'}) taps "Enter Battlefield"!
              </p>
            </div>

            <div className="pt-1 text-center">
              <button
                onClick={() => {
                  networkManager.disconnect();
                  setActiveTab('modes');
                }}
                className="btn-retro px-4 py-1.5 bg-white text-slate-700 hover:text-rose-700 rounded-xl text-xs font-black border border-slate-300"
              >
                ← Leave Room
              </button>
            </div>
          </div>
        )}

        {/* TAB 5: JOIN ROOM (ENTER CODE) */}
        {activeTab === 'join' && (
          <div className="py-2 space-y-3 font-retro">
            {/* Step 1: Commander Name */}
            <div className="p-3 bg-amber-50 border-2 border-[#0f172a] rounded-2xl space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-mono font-black text-amber-950 uppercase tracking-wider">
                  YOUR COMMANDER NAME: <span className="text-rose-600">*</span>
                </label>
                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  playerName.trim() ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse'
                }`}>
                  {playerName.trim() ? '✓ READY' : 'REQUIRED'}
                </span>
              </div>
              <input
                type="text"
                value={playerName}
                onChange={(e) => savePlayerName(e.target.value)}
                placeholder="Enter your name (e.g. Sasithra, Vishal)"
                maxLength={14}
                className="w-full text-base font-retro font-black text-blue-950 bg-white border-2 border-[#0f172a] rounded-xl py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-xs"
              />
            </div>

            {/* Step 2: Match Code */}
            <div className="max-w-xs mx-auto space-y-2">
              <div className="text-center">
                <h3 className="text-sm font-black text-[#0f172a] uppercase">ENTER 4-LETTER MATCH CODE</h3>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  placeholder="SM-XXXX"
                  maxLength={10}
                  className="w-full text-center text-3xl font-mono font-black tracking-widest uppercase bg-white border-3 border-[#0f172a] rounded-2xl py-2 px-3 focus:outline-none focus:ring-4 focus:ring-amber-300 shadow-[3px_3px_0px_#0f172a]"
                  autoFocus
                />
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handlePasteCode}
                  className="text-xs font-hand font-bold text-blue-700 hover:underline flex items-center gap-1"
                >
                  📋 Paste from Clipboard
                </button>
              </div>
            </div>

            {/* Live Voice Chat Preference Toggle on Join */}
            <div
              onClick={() => handleToggleVoicePreference(!enableVoiceChat)}
              className={`p-2.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                enableVoiceChat
                  ? 'bg-emerald-50/90 border-emerald-600 shadow-xs'
                  : 'bg-slate-50 border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg border ${
                    enableVoiceChat
                      ? 'bg-emerald-500 border-emerald-700 text-white'
                      : 'bg-slate-200 border-slate-400 text-slate-500'
                  }`}
                >
                  {enableVoiceChat ? '🎙️' : '🔇'}
                </div>
                <div>
                  <div className="text-xs font-black font-retro text-[#0f172a] flex items-center gap-1.5">
                    ENABLE LIVE VOICE CHAT
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-black ${
                        enableVoiceChat ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {enableVoiceChat ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono font-bold text-slate-500">
                    {enableVoiceChat
                      ? 'Talk with players using microphone'
                      : 'Microphone disabled (tap to enable)'}
                  </div>
                </div>
              </div>

              <div
                className={`w-11 h-6 rounded-full p-0.5 border-2 border-[#0f172a] transition-colors ${
                  enableVoiceChat ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    enableVoiceChat ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </div>
            </div>

            <div className="flex justify-center gap-2 pt-1">
              <button
                onClick={() => {
                  setIsConnecting(false);
                  setActiveTab('modes');
                }}
                className="btn-retro px-4 py-2 bg-white text-[#0f172a] rounded-xl text-xs font-black"
              >
                BACK
              </button>
              {errorMessage && !isConnecting ? (
                <button
                  onClick={submitJoin}
                  disabled={!playerName.trim() || !inputCode.trim()}
                  className="btn-retro px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5"
                >
                  <span>🔄</span> RETRY JOIN
                </button>
              ) : (
                <button
                  onClick={submitJoin}
                  disabled={isConnecting || !playerName.trim() || !inputCode.trim()}
                  className={`btn-retro px-5 py-2 rounded-xl text-xs font-black transition-all ${
                    isConnecting || !playerName.trim() || !inputCode.trim()
                      ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed shadow-none'
                      : 'bg-amber-400 hover:bg-amber-300 text-[#0f172a] shadow-xs'
                  }`}
                >
                  {isConnecting ? (
                    <span className="flex items-center gap-1.5">
                      <span className="animate-spin text-sm">⏳</span> CONNECTING...
                    </span>
                  ) : (
                    '⚔️ JOIN MATCH'
                  )}
                </button>
              )}
            </div>

            <div className="text-center pt-1">
              <span className="text-[10px] font-mono text-slate-400">
                High-speed WSS relay • Supports 2, 3, or 4 players
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiplayerModal;
