import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Wifi, QrCode, Smartphone, Edit2, RotateCcw } from 'lucide-react';
import { playCardClick } from '../utils/audio';

export function NetworkInfoModal({
  isOpen,
  onClose,
  networkInfo,
  roomCode,
  customIp = null,
  onSetCustomIp = null,
  isHost = false
}) {
  const [copied, setCopied] = useState(false);
  const [isEditingIp, setIsEditingIp] = useState(false);
  const [manualIpInput, setManualIpInput] = useState('');

  if (!isOpen) return null;

  // Determine port
  const port = (typeof window !== 'undefined' && window.location.port)
    ? window.location.port
    : (networkInfo ? networkInfo.clientPort : 3000);

  // Determine active IP: customIp overrides everything
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl text-white flex flex-col items-center">
        {/* Close Button */}
        <button
          onClick={() => { playCardClick(); onClose(); }}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition"
          aria-label="Fechar"
        >
          <X size={20} />
        </button>

        {/* Title */}
        <div className="flex items-center gap-2 mb-1">
          <Smartphone className="text-zinc-400" size={20} />
          <h3 className="text-lg font-black tracking-tight">Entrar pelo Celular</h3>
        </div>
        <p className="text-xs text-zinc-400 text-center mb-4">
          Conecte no mesmo Wi-Fi ou Roteador (Hotspot) deste aparelho e aponte a câmera.
        </p>

        {/* QR Code Frame */}
        <div className="bg-white p-3.5 rounded-2xl shadow-xl border-2 border-zinc-700 flex items-center justify-center mb-4">
          <QRCodeSVG
            value={displayUrl}
            size={180}
            level="M"
            includeMargin={false}
          />
        </div>

        {/* URL Card with Copy */}
        <div className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 mb-3 flex items-center justify-between gap-2">
          <div className="overflow-hidden">
            <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block">Endereço LAN</span>
            <span className="text-xs sm:text-sm font-mono text-zinc-200 truncate block select-all font-bold">
              {displayUrl}
            </span>
          </div>
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 active:scale-95'
            }`}
          >
            {copied ? (
              <>
                <Check size={13} />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>Copiar</span>
              </>
            )}
          </button>
        </div>

        {/* Hotspot Android Manual IP Configuration (Host only) */}
        {isHost && (
          <div className="w-full bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3 mb-2 text-left">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                <Wifi size={12} /> IP do Hotspot Celular (Termux)
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
              <div className="space-y-2">
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
                    <X size={14} />
                  </button>
                </div>

                {/* Preset shortcuts */}
                <div className="flex flex-wrap gap-1.5 pt-1">
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
                  <span className="text-[10px] bg-amber-400/20 text-amber-300 px-1.5 py-0.2 rounded font-sans">
                    Manual
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
