import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Play, Settings, Users, Copy, Check, Shield, Wifi, Smartphone, Edit3, Edit2, RotateCcw, Trash2, UserX, Zap, Shuffle } from 'lucide-react';
import { playCardClick, playErrorBuzz } from '../utils/audio';

export function Lobby({
  gameState,
  networkInfo,
  playerName,
  setPlayerName,
  selfPlayerId,
  isHost,
  wakeLockActive,
  onJoinRoom,
  onUpdateSettings,
  onSetCustomIp,
  onDisbandRoom,
  onKickPlayer,
  onStartGame
}) {
  const [copied, setCopied] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(playerName || '');
  const [isEditingIp, setIsEditingIp] = useState(false);
  const [manualIpInput, setManualIpInput] = useState('');
  const [showDisbandConfirm, setShowDisbandConfirm] = useState(false);

  const players = gameState ? gameState.players : [];
  const scoreLimit = gameState ? gameState.scoreLimit : 7;
  const handSize = gameState ? gameState.handSize : 10;
  const minPlayersToStart = gameState ? gameState.minPlayersToStart : 3;
  const randomizeHandEachRound = gameState ? !!gameState.randomizeHandEachRound : false;
  const customIp = gameState ? gameState.customIp : null;

  // Determine port
  const port = (typeof window !== 'undefined' && window.location.port)
    ? window.location.port
    : (networkInfo ? networkInfo.clientPort : 3000);

  // Derive active IP: customIp overrides
  let activeIp = customIp;
  if (!activeIp) {
    const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const isLocalhost = currentHostname === 'localhost' || currentHostname === '127.0.0.1';
    if (!isLocalhost) {
      activeIp = currentHostname;
    } else if (networkInfo && networkInfo.ip) {
      activeIp = networkInfo.ip;
    } else {
      activeIp = 'localhost';
    }
  }

  const displayUrl = `http://${activeIp}:${port}`;

  const handleCopy = () => {
    playCardClick();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(displayUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleApplyIp = (ipToApply) => {
    playCardClick();
    if (onSetCustomIp) {
      onSetCustomIp(ipToApply ? ipToApply.trim() : null);
    }
    setIsEditingIp(false);
    setManualIpInput('');
  };

  const handleSaveName = (e) => {
    e.preventDefault();
    if (tempName.trim()) {
      playCardClick();
      setPlayerName(tempName.trim());
      onJoinRoom(tempName.trim(), gameState ? gameState.roomCode : 'LAN');
      setEditingName(false);
    }
  };

  const handleScoreChange = (newScore) => {
    playCardClick();
    onUpdateSettings({ scoreLimit: newScore });
  };

  const handleHandSizeChange = (newSize) => {
    playCardClick();
    onUpdateSettings({ handSize: newSize });
  };

  const handleRandomizeHandChange = (val) => {
    playCardClick();
    onUpdateSettings({ randomizeHandEachRound: val });
  };

  const toggleTestMode = () => {
    playCardClick();
    const newMin = minPlayersToStart === 3 ? 2 : 3;
    onUpdateSettings({ minPlayersToStart: newMin });
  };

  const confirmDisband = () => {
    playCardClick();
    setShowDisbandConfirm(false);
    if (onDisbandRoom) {
      onDisbandRoom();
    }
  };

  const connectedPlayersCount = players.filter(p => p.connected).length;
  const canStart = isHost && connectedPlayersCount >= minPlayersToStart;

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center pb-12 animate-fadeIn">
      {/* Title Header */}
      <div className="text-center my-4">
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase">
          Cartas Contra a Humanidade
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1 font-medium">
          Edição em Português (PT-BR) para LAN & Celular
        </p>

        {/* Wake Lock Active Badge */}
        {wakeLockActive && (
          <div className="inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold">
            <Zap size={11} className="fill-emerald-400" />
            <span>Tela Sempre Ligada (WakeLock Ativo)</span>
          </div>
        )}
      </div>

      {/* LAN QR Code & Access Card */}
      <div className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-5 shadow-xl flex flex-col items-center">
        <div className="flex items-center gap-2 mb-3">
          <Smartphone size={18} className="text-zinc-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
            Conectar Celulares na Mesma Rede
          </h2>
        </div>

        {/* QR Code Container */}
        <div className="bg-white p-3.5 rounded-2xl shadow-md border-2 border-zinc-700 mb-3.5">
          <QRCodeSVG
            value={displayUrl}
            size={160}
            level="M"
            includeMargin={false}
          />
        </div>

        {/* URL and Copy Button */}
        <div className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 flex items-center justify-between gap-2 mb-2">
          <div className="overflow-hidden">
            <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block">Endereço LAN</span>
            <span className="text-xs sm:text-sm font-mono text-zinc-200 truncate block select-all font-semibold">
              {displayUrl}
            </span>
          </div>
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition shrink-0 ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 active:scale-95'
            }`}
          >
            {copied ? (
              <>
                <Check size={14} />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Copiar</span>
              </>
            )}
          </button>
        </div>

        {/* Hotspot Android IP Setting (Termux / Hotspot selector) */}
        {isHost && (
          <div className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl p-3 text-left">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                <Wifi size={12} /> IP do Hotspot Celular (Termux/Android)
              </span>
              {!isEditingIp && (
                <button
                  onClick={() => { playCardClick(); setIsEditingIp(true); setManualIpInput(activeIp); }}
                  className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1"
                >
                  <Edit2 size={11} /> Ajustar
                </button>
              )}
            </div>

            {isEditingIp ? (
              <div className="space-y-2 pt-1">
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={manualIpInput}
                    onChange={(e) => setManualIpInput(e.target.value)}
                    placeholder="Ex: 192.168.43.1"
                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                  />
                  <button
                    onClick={() => handleApplyIp(manualIpInput)}
                    className="px-3 py-1 bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs rounded-lg transition"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => setIsEditingIp(false)}
                    className="p-1 text-zinc-400 hover:text-white rounded"
                  >
                    ✕
                  </button>
                </div>

                {/* Android Hotspot Presets */}
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] text-zinc-500 self-center">Atalhos:</span>
                  <button
                    onClick={() => handleApplyIp('192.168.43.1')}
                    className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px] font-mono"
                  >
                    192.168.43.1 (Padrão)
                  </button>
                  <button
                    onClick={() => handleApplyIp('192.168.234.1')}
                    className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px] font-mono"
                  >
                    192.168.234.1
                  </button>
                  {customIp && (
                    <button
                      onClick={() => handleApplyIp(null)}
                      className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-amber-400 rounded text-[10px] flex items-center gap-0.5"
                    >
                      <RotateCcw size={9} /> Resetar Auto
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
                <span>IP Atual: <strong className="text-zinc-200">{activeIp}</strong></span>
                {customIp && (
                  <span className="text-[10px] bg-amber-400/20 text-amber-300 px-1.5 py-0.2 rounded font-sans font-bold">
                    Manual
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Player Profile & Name Editor */}
      <div className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-5 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            Seu Nome de Jogador
          </span>
          {!editingName && (
            <button
              onClick={() => { playCardClick(); setEditingName(true); setTempName(playerName); }}
              className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-semibold"
            >
              <Edit3 size={12} /> Editar
            </button>
          )}
        </div>

        {editingName ? (
          <form onSubmit={handleSaveName} className="flex gap-2">
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="Digite seu nome..."
              maxLength={20}
              className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              autoFocus
            />
            <button
              type="submit"
              className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs rounded-xl transition"
            >
              Salvar
            </button>
          </form>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-base font-black text-white">
              {playerName || 'Sem nome definido'}
            </span>
            <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Reconexão Ativa
            </span>
          </div>
        )}
      </div>

      {/* Players in Lobby */}
      <div className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-zinc-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              Jogadores Conectados ({connectedPlayersCount})
            </h3>
          </div>
          <span className="text-xs font-semibold text-zinc-500">
            Mínimo: {minPlayersToStart}
          </span>
        </div>

        <div className="space-y-2">
          {players.map((player) => {
            const isSelf = player.id === selfPlayerId;

            return (
              <div
                key={player.id}
                className={`flex items-center justify-between p-3 rounded-xl border ${
                  isSelf
                    ? 'bg-zinc-800/80 border-sky-500/50 text-sky-200'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      player.connected ? 'bg-emerald-500' : 'bg-red-500'
                    }`}
                  />
                  <span className="text-sm font-bold truncate">
                    {player.name} {isSelf && '(Você)'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {player.isHost && (
                    <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded text-[10px] font-black uppercase">
                      Host
                    </span>
                  )}
                  {isHost && !isSelf && (
                    <button
                      onClick={() => { playCardClick(); onKickPlayer && onKickPlayer(player.id); }}
                      className="p-1 text-zinc-500 hover:text-red-400 rounded transition"
                      title="Remover jogador"
                    >
                      <UserX size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Host Settings Controls */}
      {isHost ? (
        <div className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-5 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <Settings size={16} className="text-zinc-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              Configurações da Partida (Host)
            </h3>
          </div>

          <div className="space-y-4">
            {/* Score Limit */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-zinc-300 mb-1.5">
                <span>Pontos para Vencer</span>
                <span className="font-mono text-amber-400 font-bold">{scoreLimit} pontos</span>
              </div>
              <div className="flex gap-2">
                {[5, 7, 10, 15].map((val) => (
                  <button
                    key={val}
                    onClick={() => handleScoreChange(val)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                      scoreLimit === val
                        ? 'bg-amber-400 text-black'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Hand Size */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-zinc-300 mb-1.5">
                <span>Cartas na Mão</span>
                <span className="font-mono text-sky-400 font-bold">{handSize} cartas</span>
              </div>
              <div className="flex gap-2">
                {[7, 10, 12].map((val) => (
                  <button
                    key={val}
                    onClick={() => handleHandSizeChange(val)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                      handSize === val
                        ? 'bg-sky-500 text-white'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Hand Randomization Setting */}
            <div>
              <div className="flex justify-between items-center text-xs font-semibold text-zinc-300 mb-1.5">
                <span>Cartas Brancas da Mão</span>
                <span className={`font-mono text-xs font-bold ${randomizeHandEachRound ? 'text-purple-400' : 'text-zinc-400'}`}>
                  {randomizeHandEachRound ? 'Aleatórias a cada rodada' : 'Manter cartas'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleRandomizeHandChange(false)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    !randomizeHandEachRound
                      ? 'bg-zinc-200 text-zinc-950 shadow-md font-black'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'
                  }`}
                >
                  <span>🃏 Manter Cartas</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRandomizeHandChange(true)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    randomizeHandEachRound
                      ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 font-black'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'
                  }`}
                >
                  <Shuffle size={13} />
                  <span>🎲 Aleatórias toda rodada</span>
                </button>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1.5 leading-relaxed">
                {randomizeHandEachRound
                  ? '🎲 Toda rodada a mão inteira dos jogadores é descartada e substituída por cartas novas aleatórias.'
                  : '🃏 As cartas não jogadas permanecem na mão do jogador rodada após rodada (padrão).'}
              </p>
            </div>

            {/* Quick Test Mode Switch (allow 2 players) */}
            <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
              <span className="text-xs text-zinc-400">
                Permitir teste com 2 jogadores
              </span>
              <button
                onClick={toggleTestMode}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  minPlayersToStart === 2
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {minPlayersToStart === 2 ? 'Ativado (2 min)' : 'Padrão (3 min)'}
              </button>
            </div>

            {/* Host Disband Room Button */}
            <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-red-400 block">Desfazer / Resetar Sala</span>
                <span className="text-[10px] text-zinc-500 block">Zera placar e baralhos sem parar o servidor</span>
              </div>
              <button
                onClick={() => { playCardClick(); setShowDisbandConfirm(true); }}
                className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900 border border-red-800/60 text-red-300 rounded-xl text-xs font-bold transition active:scale-95 flex items-center gap-1.5"
              >
                <Trash2 size={13} />
                <span>Desfazer</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-4 mb-5 text-center text-xs text-zinc-400 space-y-1">
          <div>Aguardando o Host iniciar a partida.</div>
          <div className="text-[11px] text-zinc-400 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <span>Pontos para vitória: <strong className="text-amber-400">{scoreLimit}</strong></span>
            <span>•</span>
            <span>Mão: <strong className="text-sky-400">{handSize}</strong> cartas</span>
            <span>•</span>
            <span>Mão por rodada: <strong className={randomizeHandEachRound ? 'text-purple-400 font-bold' : 'text-zinc-300'}>{randomizeHandEachRound ? 'Aleatórias 🎲' : 'Mantidas 🃏'}</strong></span>
          </div>
        </div>
      )}

      {/* Start Game Button (Host Only) */}
      {isHost && (
        <button
          onClick={() => {
            if (canStart) {
              playCardClick();
              onStartGame();
            } else {
              playErrorBuzz();
            }
          }}
          disabled={!canStart}
          className={`w-full py-4 px-6 rounded-2xl font-black text-sm tracking-wide uppercase transition-all flex items-center justify-center gap-2 shadow-xl ${
            canStart
              ? 'bg-white hover:bg-zinc-200 text-black shadow-white/10 active:scale-95 animate-pulse-subtle cursor-pointer'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-60'
          }`}
        >
          <Play size={18} />
          {canStart ? (
            <span>Iniciar Partida Agora!</span>
          ) : (
            <span>Aguardando {minPlayersToStart - connectedPlayersCount} jogador(es)</span>
          )}
        </button>
      )}

      {/* Disband Room Confirmation Modal */}
      {showDisbandConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl text-center">
            <div className="w-12 h-12 bg-red-950/60 border border-red-800/60 text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-black text-white mb-1">Desfazer esta Sala?</h3>
            <p className="text-xs text-zinc-400 mb-5">
              Todos os jogadores conectados retornarão ao Lobby e as pontuações serão zeradas. O servidor Node.js continuará rodando normalmente.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDisbandConfirm(false)}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDisband}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl transition shadow-lg"
              >
                Sim, Desfazer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
