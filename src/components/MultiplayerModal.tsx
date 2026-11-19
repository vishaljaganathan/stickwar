import React, { useState, useEffect } from 'react';
import { P2PNetworkManager, networkManager } from '../utils/network';
import { firebaseSync } from '../utils/firebaseSync';

interface MultiplayerModalProps {
  isOpen: boolean;
  initialTab?: 'modes' | 'host' | 'join';
  initialRoomCode?: string;
  onClose: () => void;
  onSelectLocal: () => void;
  onSelectAI: () => void;
  onStartOnlineHost: (mode: 'online_p2p' | 'online_firebase', roomCode: string, playerName?: string) => void;
  onStartOnlineJoin: (mode: 'online_p2p' | 'online_firebase', roomCode: string, playerName?: string) => void;
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
  onOpenFirebaseConfig
}) => {
  const [activeTab, setActiveTab] = useState<'modes' | 'host' | 'join'>(initialTab);
  const [onlineType, setOnlineType] = useState<'p2p' | 'firebase'>('p2p');
  const [roomCode, setRoomCode] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>(initialRoomCode);
  const [copyCodeSuccess, setCopyCodeSuccess] = useState<boolean>(false);
  const [copyLinkSuccess, setCopyLinkSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [networkStatus, setNetworkStatus] = useState<string>('');

  // Player Name State (Saved in localStorage so player enters it once)
  const [playerName, setPlayerName] = useState<string>(() => {
    try {
      return localStorage.getItem('stickman_commander_name') || '';
    } catch {
      return '';
    }
  });

  // Host Live Status: opponent joining / connected feedback
  const [joiningGuestName, setJoiningGuestName] = useState<string | null>(null);
  const [connectedGuestName, setConnectedGuestName] = useState<string | null>(null);

  const savePlayerName = (name: string) => {
    setPlayerName(name);
    try {
      localStorage.setItem('stickman_commander_name', name);
    } catch {}
  };

  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      setNetworkStatus('');
      setIsConnecting(false);
      setJoiningGuestName(null);
      setConnectedGuestName(null);

      if (initialRoomCode) {
        setInputCode(initialRoomCode);
      }

      if (initialTab === 'host') {
        const code = P2PNetworkManager.generateRoomCode();
        setRoomCode(code);
        setActiveTab('host');
        const defaultName = playerName.trim() || 'Player 1';
        onStartOnlineHost('online_p2p', code, defaultName);
      } else {
        setActiveTab(initialTab);
      }
    }
  }, [isOpen, initialTab, initialRoomCode]);

  // Hook into live network manager status and opponent joining events
  useEffect(() => {
    networkManager.onOpponentJoining = (guestName: string) => {
      console.log('[MultiplayerModal] Opponent joining:', guestName);
      setJoiningGuestName(guestName);
      setNetworkStatus(`⚡ ${guestName} is connecting...`);
    };

    networkManager.onOpponentConnected = (name: string) => {
      console.log('[MultiplayerModal] Opponent connected:', name);
      setConnectedGuestName(name);
      setJoiningGuestName(null);
      setIsConnecting(false);
      setNetworkStatus(`🎉 ${name} connected! Starting match...`);
    };

    networkManager.onStatusChange = (status: string) => {
      setNetworkStatus(status);
      if (status.toLowerCase().includes('connected')) {
        setIsConnecting(false);
      }
      if (status.toLowerCase().includes('error') || status.toLowerCase().includes('failed')) {
        setIsConnecting(false);
        setErrorMessage(status);
      }
    };
  }, []);

  if (!isOpen) return null;

  const handleStartHosting = (type: 'p2p' | 'firebase') => {
    if (type === 'firebase' && !firebaseSync.isConfigured()) {
      onOpenFirebaseConfig();
      return;
    }

    const code = P2PNetworkManager.generateRoomCode();
    setRoomCode(code);
    setOnlineType(type);
    setActiveTab('host');
    setErrorMessage('');
    setJoiningGuestName(null);
    setConnectedGuestName(null);
    setNetworkStatus('Creating room & registering with cloud relay...');
    const defaultName = playerName.trim() || 'Player 1';
    onStartOnlineHost(type === 'firebase' ? 'online_firebase' : 'online_p2p', code, defaultName);
  };

  const handleStartJoining = (type: 'p2p' | 'firebase') => {
    if (type === 'firebase' && !firebaseSync.isConfigured()) {
      onOpenFirebaseConfig();
      return;
    }
    setOnlineType(type);
    setActiveTab('join');
    setErrorMessage('');
    setNetworkStatus('');
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
    setNetworkStatus(`Connecting to room ${normalized.displayCode} as ${defaultGuestName}...`);
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
    } catch {
      // Clipboard access denied, user can type manually
    }
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
                ? 'ONLINE MATCH HOST'
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

        {/* Commander Name Setup Bar (Always visible so players can set their identity) */}
        <div className="mb-3 p-2 sm:p-2.5 bg-amber-50 border-2 border-[#0f172a] rounded-xl sm:rounded-2xl flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-amber-400 border border-[#0f172a] flex items-center justify-center text-sm sm:text-base shrink-0 shadow-xs">
              🤠
            </div>
            <div className="flex-1 min-w-0">
              <span className="block text-[8px] sm:text-[9px] font-mono font-black text-amber-900 uppercase tracking-wider">
                YOUR COMMANDER NAME:
              </span>
              <input
                type="text"
                value={playerName}
                onChange={(e) => savePlayerName(e.target.value)}
                placeholder="Enter your name (e.g. Vishal, Priya)"
                maxLength={14}
                className="w-full text-xs sm:text-sm font-retro font-black text-blue-900 bg-transparent border-b border-dashed border-amber-600 focus:outline-none focus:border-blue-700 px-0.5"
              />
            </div>
          </div>
          <span className="text-[9px] font-mono font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-full border border-amber-400 shrink-0">
            {playerName.trim() ? '✓ READY' : 'TYPE NAME'}
          </span>
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
            {/* Realtime Cloud Relay Section */}
            <div className="p-3.5 bg-amber-100/70 border-2 sm:border-3 border-[#0f172a] rounded-2xl shadow-[3px_3px_0px_#0f172a]">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xl">🌐</span>
                  <span className="font-black text-sm sm:text-base text-[#0f172a]">ONLINE ROOM MATCH</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-400 border border-[#0f172a] text-[9px] font-mono font-black text-[#0f172a]">
                  GLOBAL CLOUD RELAY
                </span>
              </div>
              <p className="text-xs font-hand font-bold text-slate-600 mb-1">
                Play across any device & city (Pondicherry ⇄ Bengaluru) on phone 4G/5G or Wi-Fi with instant room codes!
              </p>
              <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-800 mb-2.5">
                <span>✓ High-speed WSS relay with live player name sync</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleStartHosting('p2p')}
                  className="btn-retro py-2 px-3 bg-amber-400 hover:bg-amber-300 rounded-xl font-retro font-black text-xs text-[#0f172a]"
                >
                  ⚔️ CREATE MATCH
                </button>
                <button
                  onClick={() => handleStartJoining('p2p')}
                  className="btn-retro py-2 px-3 bg-white hover:bg-slate-100 rounded-xl font-retro font-black text-xs text-[#0f172a]"
                >
                  🔑 JOIN MATCH
                </button>
              </div>
            </div>

            {/* Local Pass & Play */}
            <button
              onClick={() => {
                onSelectLocal();
                onClose();
              }}
              className="btn-retro w-full flex items-center justify-between p-2.5 bg-white hover:bg-blue-50 rounded-2xl text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-200 border-2 border-[#0f172a] flex items-center justify-center text-xl shrink-0 shadow-xs">
                  👥
                </div>
                <div>
                  <div className="font-black text-sm text-[#0f172a]">PASS & PLAY (2 PLAYERS)</div>
                  <div className="text-[11px] font-hand font-bold text-slate-500">Play side-by-side on this same screen</div>
                </div>
              </div>
              <span className="text-xs font-black text-blue-700">PLAY →</span>
            </button>

            {/* Solo vs AI */}
            <button
              onClick={() => {
                onSelectAI();
                onClose();
              }}
              className="btn-retro w-full flex items-center justify-between p-2.5 bg-white hover:bg-purple-50 rounded-2xl text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-200 border-2 border-[#0f172a] flex items-center justify-center text-xl shrink-0 shadow-xs">
                  🤖
                </div>
                <div>
                  <div className="font-black text-sm text-[#0f172a]">SOLO VS STICKBOT (AI)</div>
                  <div className="text-[11px] font-hand font-bold text-slate-500">Battle against the automated notebook bot</div>
                </div>
              </div>
              <span className="text-xs font-black text-purple-700">FIGHT →</span>
            </button>

            {/* Firebase option */}
            <div className="pt-1.5 flex items-center justify-between border-t border-slate-200 text-xs">
              <span className="text-slate-500 text-[10px] font-mono">Firebase RTDB Backup:</span>
              <div className="flex gap-2">
                <button onClick={onOpenFirebaseConfig} className="text-blue-700 font-bold underline hover:text-blue-900 text-xs">
                  Config
                </button>
                <button onClick={() => handleStartHosting('firebase')} className="text-amber-800 font-black hover:underline text-xs">
                  Host via Firebase
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: HOST ROOM */}
        {activeTab === 'host' && (
          <div className="text-center py-2 space-y-3 font-retro">
            <span className="px-3 py-0.5 bg-amber-300 border-2 border-[#0f172a] rounded-full text-[10px] font-black uppercase tracking-wider text-[#0f172a] shadow-xs inline-block">
              YOUR MATCH ROOM CODE
            </span>

            <div className="space-y-1">
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

            {/* LIVE OPPONENT JOINING STATUS RADAR */}
            {connectedGuestName ? (
              <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-100 to-emerald-200 border-2 sm:border-3 border-emerald-600 shadow-md flex items-center justify-center gap-3 animate-fade-in">
                <span className="text-3xl">🎉</span>
                <div className="text-left">
                  <div className="text-xs sm:text-sm font-retro font-black text-emerald-950 uppercase">
                    {connectedGuestName} JOINED!
                  </div>
                  <div className="text-[10px] font-mono text-emerald-800">
                    Entering battlefield now...
                  </div>
                </div>
              </div>
            ) : joiningGuestName ? (
              <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-200 to-amber-300 border-2 sm:border-3 border-amber-600 shadow-md flex items-center justify-center gap-3 animate-bounce">
                <span className="text-3xl">⚡</span>
                <div className="text-left">
                  <div className="text-xs sm:text-sm font-retro font-black text-amber-950 uppercase">
                    {joiningGuestName} IS JOINING!
                  </div>
                  <div className="text-[10px] font-mono text-amber-900">
                    Handshaking connection...
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-blue-50 border-2 border-dashed border-blue-400 flex flex-col items-center justify-center space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping inline-block" />
                  <span className="text-xs font-retro font-black text-blue-900 tracking-wide uppercase">
                    WAITING FOR OPPONENT TO JOIN...
                  </span>
                </div>
                <p className="text-[10px] font-mono text-slate-500">
                  Hosting as <strong className="text-blue-900">{playerName.trim() || 'Player 1'}</strong>. Send code or link to your friend!
                </p>
              </div>
            )}

            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-hand">
              <p className="text-[10px] text-slate-500 font-mono">
                Works across different cities (Pondicherry ⇄ Bengaluru) on phone 4G/5G & Wi-Fi.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <button onClick={() => setActiveTab('modes')} className="text-xs text-slate-600 font-bold hover:underline">
                ← Back to Modes
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: JOIN ROOM */}
        {activeTab === 'join' && (
          <div className="py-2 space-y-3 font-retro">
            <div className="text-center">
              <h3 className="text-lg font-black text-[#0f172a] uppercase">ENTER MATCH CODE</h3>
              <p className="text-xs font-hand font-bold text-slate-500">
                Joining as <strong className="text-blue-900 font-mono">{playerName.trim() || 'Player 2'}</strong>
              </p>
            </div>

            <div className="max-w-xs mx-auto space-y-2">
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
                Direct peer-to-peer cloud relay with instant name sync
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
