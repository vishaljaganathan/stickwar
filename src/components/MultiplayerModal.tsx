import React, { useState, useEffect } from 'react';
import { P2PNetworkManager, networkManager } from '../utils/network';
import { firebaseSync } from '../utils/firebaseSync';
import { PlayerId, PLAYER_CONFIGS } from '../types/game';

interface MultiplayerModalProps {
  isOpen: boolean;
  initialTab?: 'modes' | 'host' | 'join' | 'host_setup';
  initialRoomCode?: string;
  onClose: () => void;
  onSelectLocal: (maxPlayers?: number) => void;
  onSelectAI: () => void;
  onStartOnlineHost: (mode: 'online_p2p' | 'online_firebase', roomCode: string, playerName?: string, maxPlayers?: number) => void;
  onStartOnlineJoin: (mode: 'online_p2p' | 'online_firebase', roomCode: string, playerName?: string) => void;
  onUpdateHostName?: (newName: string) => void;
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
  onOpenFirebaseConfig
}) => {
  const [activeTab, setActiveTab] = useState<'modes' | 'host' | 'join' | 'host_setup'>(initialTab);
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

  // Persistent Player Name State
  const [playerName, setPlayerName] = useState<string>(() => {
    try {
      return localStorage.getItem('stickman_commander_name') || '';
    } catch {
      return '';
    }
  });

  // Host Live Roster State: Record<PlayerId, string>
  const [connectedRoster, setConnectedRoster] = useState<Record<PlayerId, string>>({
    p1: playerName.trim() || 'Player 1',
    p2: 'Waiting...',
    p3: 'Waiting...',
    p4: 'Waiting...'
  });
  const [totalJoinedCount, setTotalJoinedCount] = useState<number>(1);

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

      const hostName = playerName.trim() || 'Player 1';
      setConnectedRoster({
        p1: hostName,
        p2: 'Waiting...',
        p3: 'Waiting...',
        p4: 'Waiting...'
      });
      setTotalJoinedCount(1);

      if (initialTab === 'host') {
        setActiveTab('host_setup');
      } else {
        setActiveTab(initialTab);
      }
    }
  }, [isOpen, initialTab, initialRoomCode]);

  // Hook into live network manager roster updates & joining events
  useEffect(() => {
    networkManager.onPlayerJoined = (playerId, name, count, max, roster) => {
      console.log(`[MultiplayerModal] ${name} joined as ${playerId} (${count}/${max})`);
      setTotalJoinedCount(count);
      setConnectedRoster((prev) => ({
        ...prev,
        ...roster,
        [playerId]: name
      }));
      setNetworkStatus(`⚡ ${name} joined as ${playerId.toUpperCase()} (${count}/${max})`);
    };

    networkManager.onNameUpdated = (playerId, newName) => {
      setConnectedRoster((prev) => ({
        ...prev,
        [playerId]: newName
      }));
    };

    networkManager.onStatusChange = (status: string) => {
      setNetworkStatus(status);
      if (status.toLowerCase().includes('assigned') || status.toLowerCase().includes('connected')) {
        setIsConnecting(false);
      }
      if (status.toLowerCase().includes('error') || status.toLowerCase().includes('failed')) {
        setIsConnecting(false);
        setErrorMessage(status);
      }
    };
  }, []);

  if (!isOpen) return null;

  // Step 1: Host launches room after picking player count and name
  const handleLaunchRoom = () => {
    const code = P2PNetworkManager.generateRoomCode();
    setRoomCode(code);
    setActiveTab('host');
    setErrorMessage('');
    const finalHostName = playerName.trim() || 'Player 1';

    setConnectedRoster({
      p1: finalHostName,
      p2: 'Waiting...',
      p3: 'Waiting...',
      p4: 'Waiting...'
    });
    setTotalJoinedCount(1);

    onStartOnlineHost(
      onlineType === 'firebase' ? 'online_firebase' : 'online_p2p',
      code,
      finalHostName,
      selectedMaxPlayers
    );
  };

  const submitJoin = () => {
    const normalized = P2PNetworkManager.normalizeRoomCode(inputCode);
    if (!normalized.cleanCode) {
      setErrorMessage('Please enter a valid room code (e.g. SM-7492)');
      return;
    }
    setIsConnecting(true);
    setErrorMessage('');
    const defaultGuestName = playerName.trim() || 'Player 2';
    setNetworkStatus(`Connecting to room ${normalized.displayCode} on Port 443...`);
    onStartOnlineJoin(
      onlineType === 'firebase' ? 'online_firebase' : 'online_p2p',
      normalized.displayCode,
      defaultGuestName
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
            <span className="text-2xl">🎮</span>
            <h2 className="text-xl sm:text-2xl font-retro font-black text-[#0f172a] uppercase tracking-wide">
              {activeTab === 'host'
                ? 'ROOM WAITING LOBBY'
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
                <span>✓ Works across different networks with live player name sync</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setOnlineType('p2p');
                    setActiveTab('host_setup');
                  }}
                  className="btn-retro py-2 px-3 bg-amber-400 hover:bg-amber-300 rounded-xl font-retro font-black text-xs text-[#0f172a]"
                >
                  ⚔️ CREATE MATCH (2-4P)
                </button>
                <button
                  onClick={() => {
                    setOnlineType('p2p');
                    setActiveTab('join');
                  }}
                  className="btn-retro py-2 px-3 bg-white hover:bg-slate-100 rounded-xl font-retro font-black text-xs text-[#0f172a]"
                >
                  🔑 JOIN MATCH
                </button>
              </div>
            </div>

            {/* Local Pass & Play with 2-4 Player Selection */}
            <div className="p-3 bg-white hover:bg-blue-50 border-2 border-[#0f172a] rounded-2xl shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-200 border border-[#0f172a] flex items-center justify-center text-lg shrink-0">
                    👥
                  </div>
                  <div>
                    <div className="font-black text-xs sm:text-sm text-[#0f172a]">PASS & PLAY (SAME DEVICE)</div>
                    <div className="text-[10px] font-hand font-bold text-slate-500">Play together on this phone or screen</div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    onSelectLocal(localMaxPlayers);
                    onClose();
                  }}
                  className="btn-retro px-3 py-1 bg-blue-600 text-white font-black text-xs rounded-lg"
                >
                  PLAY {localMaxPlayers}P →
                </button>
              </div>

              {/* Player Count Buttons for Local */}
              <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                <span className="text-[10px] font-mono font-bold text-slate-500">Players:</span>
                {[2, 3, 4].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setLocalMaxPlayers(n)}
                    className={`px-2.5 py-0.5 rounded-lg border text-xs font-retro font-black transition-all ${
                      localMaxPlayers === n
                        ? 'bg-blue-600 text-white border-blue-900 shadow-xs scale-105'
                        : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {n} Players
                  </button>
                ))}
              </div>
            </div>

            {/* Solo vs AI */}
            <button
              onClick={() => {
                onSelectAI();
                onClose();
              }}
              className="btn-retro w-full flex items-center justify-between p-2.5 bg-white hover:bg-purple-50 rounded-2xl text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-200 border border-[#0f172a] flex items-center justify-center text-lg shrink-0 shadow-xs">
                  🤖
                </div>
                <div>
                  <div className="font-black text-xs sm:text-sm text-[#0f172a]">SOLO VS STICKBOT (AI)</div>
                  <div className="text-[10px] font-hand font-bold text-slate-500">Battle against the automated notebook bot</div>
                </div>
              </div>
              <span className="text-xs font-black text-purple-700">FIGHT →</span>
            </button>
          </div>
        )}

        {/* TAB 2: HOST SETUP (SELECT NUMBER OF PLAYERS & CONFIRM NAME) */}
        {activeTab === 'host_setup' && (
          <div className="py-2 space-y-3 font-retro">
            {/* Step 1: Commander Name */}
            <div className="p-3 bg-amber-50 border-2 border-[#0f172a] rounded-2xl space-y-1">
              <label className="block text-[10px] font-mono font-black text-amber-950 uppercase tracking-wider">
                1. YOUR COMMANDER NAME:
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => savePlayerName(e.target.value)}
                placeholder="Enter your name (e.g. Vishal, Sasithra)"
                maxLength={14}
                autoFocus
                className="w-full text-base font-retro font-black text-blue-950 bg-white border-2 border-[#0f172a] rounded-xl py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-xs"
              />
            </div>

            {/* Step 2: Player Count Selection */}
            <div className="p-3 bg-blue-50 border-2 border-[#0f172a] rounded-2xl space-y-2">
              <label className="block text-[10px] font-mono font-black text-blue-950 uppercase tracking-wider">
                2. HOW MANY PLAYERS IN THIS MATCH?
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[2, 3, 4].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setSelectedMaxPlayers(num)}
                    className={`py-2 px-1 rounded-xl border-2 font-retro font-black text-center transition-all ${
                      selectedMaxPlayers === num
                        ? 'bg-amber-400 text-slate-950 border-[#0f172a] shadow-[2px_2px_0px_#0f172a] scale-102 ring-2 ring-amber-300'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-base sm:text-lg">
                      {num === 2 ? '👥 2P' : num === 3 ? '⚔️ 3P' : '🛡️ 4P'}
                    </div>
                    <div className="text-[9px] font-mono font-bold uppercase mt-0.5">
                      {num === 2 ? 'DUEL' : num === 3 ? 'TRIO WAR' : '4-WAY BRAWL'}
                    </div>
                  </button>
                ))}
              </div>

              {/* Roster Squad Preview */}
              <div className="pt-2 border-t border-blue-200">
                <span className="text-[9px] font-mono font-bold text-slate-500 block mb-1">
                  Squad Colors in this battle:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 border border-blue-500 text-blue-900 text-[10px] font-black">
                    🔵 P1: {playerName.trim() || 'You'} (Host)
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 border border-rose-500 text-rose-900 text-[10px] font-black">
                    🔴 P2 (Guest 1)
                  </span>
                  {selectedMaxPlayers >= 3 && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-500 text-emerald-900 text-[10px] font-black">
                      🟢 P3 (Guest 2)
                    </span>
                  )}
                  {selectedMaxPlayers >= 4 && (
                    <span className="px-2 py-0.5 rounded-full bg-purple-100 border border-purple-500 text-purple-900 text-[10px] font-black">
                      🟣 P4 (Guest 3)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Launch Action */}
            <div className="pt-1 flex items-center justify-between gap-2">
              <button
                onClick={() => setActiveTab('modes')}
                className="btn-retro px-4 py-2 bg-white text-slate-700 rounded-xl text-xs font-black"
              >
                ← BACK
              </button>
              <button
                onClick={handleLaunchRoom}
                className="btn-retro flex-1 py-2.5 px-4 bg-amber-400 hover:bg-amber-300 text-[#0f172a] rounded-xl text-sm font-black shadow-[3px_3px_0px_#0f172a]"
              >
                🚀 LAUNCH {selectedMaxPlayers}-PLAYER ROOM →
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: HOST WAITING LOBBY */}
        {activeTab === 'host' && (
          <div className="text-center py-2 space-y-3 font-retro">
            {/* Room Code Badge */}
            <div className="space-y-1">
              <span className="px-3 py-0.5 bg-amber-300 border-2 border-[#0f172a] rounded-full text-[10px] font-black uppercase tracking-wider text-[#0f172a] shadow-xs inline-block">
                MATCH ROOM CODE ({totalJoinedCount}/{selectedMaxPlayers} PLAYERS)
              </span>

              <div
                className="text-4xl sm:text-5xl font-mono font-black tracking-widest text-blue-900 select-all cursor-pointer bg-white py-2.5 px-4 rounded-2xl border-3 border-dashed border-blue-500 max-w-xs mx-auto shadow-inner"
                onClick={copyCodeOnly}
              >
                {roomCode}
              </div>
              <span className="text-[11px] font-hand font-bold text-slate-500">Tap code to copy</span>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={copyCodeOnly}
                className="btn-retro px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black inline-flex items-center gap-1"
              >
                <span>{copyCodeSuccess ? '✓ COPIED!' : '📋 COPY CODE'}</span>
              </button>
              <button
                onClick={copyMatchLink}
                className="btn-retro px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-[#0f172a] rounded-xl text-xs font-black inline-flex items-center gap-1"
              >
                <span>{copyLinkSuccess ? '✓ LINK COPIED!' : '🔗 COPY MATCH LINK'}</span>
              </button>
            </div>

            {/* Live Player Slots Grid */}
            <div className="p-3 bg-white border-2 sm:border-3 border-[#0f172a] rounded-2xl shadow-xs space-y-2 text-left">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                <span className="font-retro font-black text-xs text-slate-800">
                  PLAYER SLOTS ({totalJoinedCount}/{selectedMaxPlayers} READY):
                </span>
                <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.2 rounded-full border border-emerald-400">
                  PORT 443 WSS
                </span>
              </div>

              <div className="space-y-1.5">
                {/* Slot 1: Host */}
                <div className="p-2 rounded-xl bg-blue-50 border border-blue-400 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{PLAYER_CONFIGS.p1.avatar}</span>
                    <div>
                      <div className="font-retro font-black text-xs text-blue-950 flex items-center gap-1">
                        <span>{connectedRoster.p1 || playerName.trim() || 'Player 1'}</span>
                        <span className="px-1 py-0 rounded bg-blue-600 text-white text-[8px] font-mono font-black">
                          HOST (YOU)
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-blue-700">Slot P1 • Blue Squad</span>
                    </div>
                  </div>
                  <span className="text-xs text-emerald-600 font-bold">✓ READY</span>
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
                      <div className="font-retro font-black text-xs text-rose-950">
                        {connectedRoster.p2 || 'Waiting for Player 2...'}
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
                        <div className="font-retro font-black text-xs text-emerald-950">
                          {connectedRoster.p3 || 'Waiting for Player 3...'}
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
                        <div className="font-retro font-black text-xs text-purple-950">
                          {connectedRoster.p4 || 'Waiting for Player 4...'}
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
                onClick={() => onClose()}
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

        {/* TAB 4: JOIN ROOM */}
        {activeTab === 'join' && (
          <div className="py-2 space-y-3 font-retro">
            {/* Step 1: Commander Name */}
            <div className="p-3 bg-amber-50 border-2 border-[#0f172a] rounded-2xl space-y-1">
              <label className="block text-[10px] font-mono font-black text-amber-950 uppercase tracking-wider">
                YOUR COMMANDER NAME:
              </label>
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

            <div className="flex justify-center gap-2 pt-1">
              <button
                onClick={() => {
                  setIsConnecting(false);
                  setActiveTab('modes');
                }}
                className="btn-retro px-4 py-1.5 bg-white text-[#0f172a] rounded-xl text-xs font-black"
              >
                BACK
              </button>
              <button
                onClick={submitJoin}
                disabled={isConnecting}
                className={`btn-retro px-5 py-1.5 text-[#0f172a] rounded-xl text-xs font-black ${
                  isConnecting ? 'bg-amber-200 cursor-not-allowed' : 'bg-amber-400 hover:bg-amber-300'
                }`}
              >
                {isConnecting ? 'CONNECTING...' : '⚔️ JOIN MATCH'}
              </button>
            </div>

            <div className="text-center pt-1">
              <span className="text-[10px] font-mono text-slate-400">
                Direct Port 443 relay • Supports 2, 3, or 4 players
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
