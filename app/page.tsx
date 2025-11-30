'use client';
import CryptoTicker from './components/CryptoTicker';
import { useState, useEffect, useRef } from 'react';
import { useAnchorWallet, useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, setProvider, web3 } from '@coral-xyz/anchor'; 
import idl from '@/idl.json';
import dynamic from 'next/dynamic';
import Confetti from 'react-confetti';
import SidebarChat from './components/SidebarChat';
import StarryBackground from './components/StarryBackground';

const WalletMultiButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

const PROGRAM_ID_STRING = "DNxd1v6wefzpF7a8tffFnL6nqKEPP3vRXmQkrSSD7vEP"; 

export default function Home() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const { connected, publicKey, disconnect } = useWallet();
  
  const [loading, setLoading] = useState(false);
  const [txLink, setTxLink] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null); 
  const [ganador, setGanador] = useState<boolean>(false); 
  const [mounted, setMounted] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [dadoRotation, setDadoRotation] = useState("rotateX(-25deg) rotateY(-25deg)");
  const [girando, setGirando] = useState(false);
  const [apuesta, setApuesta] = useState(0.05);
  
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  const rollingRef = useRef<HTMLAudioElement | null>(null);
  const winRef = useRef<HTMLAudioElement | null>(null);
  const loseRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { 
    setMounted(true); 
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    rollingRef.current = new Audio('/sounds/rolling.mp3');
    winRef.current = new Audio('/sounds/win.wav');
    loseRef.current = new Audio('/sounds/lose.wav');
    
    const setupAudio = (audio: HTMLAudioElement, vol: number, loop: boolean = false) => {
        audio.volume = vol;
        audio.loop = loop;
    };
    if(rollingRef.current) setupAudio(rollingRef.current, 0.5, true);
    if(winRef.current) setupAudio(winRef.current, 0.6);
    if(loseRef.current) setupAudio(loseRef.current, 0.5);
  }, []);

  const startRollingSound = () => { if (rollingRef.current) { rollingRef.current.currentTime = 0; rollingRef.current.play().catch(() => {}); } };
  const stopRollingSound = () => { if (rollingRef.current) { rollingRef.current.pause(); rollingRef.current.currentTime = 0; } };
  
  const playEffect = (type: 'win' | 'lose') => {
    const sound = type === 'win' ? winRef.current : loseRef.current;
    if (sound) { sound.currentTime = 0; sound.play().catch(() => {}); }
  };

  const getDiceTierClass = () => {
    if (apuesta < 0.1) return "tier-low";
    if (apuesta < 1.0) return "tier-mid";
    return "tier-high";
  };

  const obtenerCaraAleatoria = (tipo: 'par' | 'impar') => {
    const pares = [2, 4, 6];
    const impares = [1, 3, 5];
    const arraySeleccionado = tipo === 'par' ? pares : impares;
    return arraySeleccionado[Math.floor(Math.random() * arraySeleccionado.length)];
  };

  const jugar = async (lado: number) => {
    if (!wallet) return alert("Connect wallet first!");
    setLoading(true); setGirando(true); setTxLink(null); setResultado(`ROLLING...`); setGanador(false); startRollingSound();

    try {
      const anchorWeb3 = web3;
      const userPublicKey = new anchorWeb3.PublicKey(wallet.publicKey.toBase58());
      const programId = new anchorWeb3.PublicKey(PROGRAM_ID_STRING);
      const systemProgramId = new anchorWeb3.PublicKey("11111111111111111111111111111111");
      const provider = new AnchorProvider(connection, { ...wallet, publicKey: userPublicKey } as any, { preflightCommitment: "confirmed" });
      setProvider(provider);
      const idl_string = JSON.stringify(idl);
      const idl_object = JSON.parse(idl_string);
      const programIdl = idl_object.default || idl_object;
      // @ts-ignore
      const program = new Program(programIdl, programId, provider);
      
      const tx = await program.methods.jugar(lado).accounts({ user: userPublicKey, systemProgram: systemProgramId }).rpc();
      setTxLink(`https://explorer.solana.com/tx/${tx}?cluster=devnet`);
      
      const latestBlockHash = await connection.getLatestBlockhash();
      await connection.confirmTransaction({ blockhash: latestBlockHash.blockhash, lastValidBlockHeight: latestBlockHash.lastValidBlockHeight, signature: tx });
      const txDetails = await connection.getParsedTransaction(tx, { commitment: "confirmed" });
      
      stopRollingSound();

      if (txDetails?.meta?.logMessages) {
        const logs = txDetails.meta.logMessages.join(" ");
        let caraFinal = 1;
        if (logs.includes("GANASTE")) {
          setResultado(`⚡ YOU WON! (+${apuesta * 2} SOL)`); setGanador(true); playEffect('win');
          caraFinal = obtenerCaraAleatoria(lado === 0 ? 'par' : 'impar');
        } else {
          // CAMBIO AQUÍ: Texto actualizado
          setResultado("💀 YOU LOST..."); playEffect('lose');
          caraFinal = obtenerCaraAleatoria(lado === 0 ? 'impar' : 'par');
        }
        detenerDado(caraFinal);
      } else { setResultado("Confirmed"); setGirando(false); }
    } catch (error: any) { 
        console.error(error); 
        stopRollingSound();
        setResultado("Error"); 
        setGirando(false); 
    } finally { setLoading(false); }
  };

  const detenerDado = (n: number) => {
    setGirando(false);
    const rots: {[key: number]: string} = { 1: "rotateX(0deg) rotateY(0deg)", 2: "rotateX(0deg) rotateY(180deg)", 3: "rotateX(0deg) rotateY(-90deg)", 4: "rotateX(0deg) rotateY(90deg)", 5: "rotateX(-90deg) rotateY(0deg)", 6: "rotateX(90deg) rotateY(0deg)" };
    setDadoRotation(rots[n] || "rotateX(0deg) rotateY(0deg)");
  };

  const renderWalletButton = () => {
    if (mounted && connected && publicKey) {
      return (
        <button onClick={disconnect} className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 border border-cyan-500/50 text-white px-3 py-2 rounded-xl font-bold transition-all shadow-lg shadow-cyan-500/20 backdrop-blur-sm text-sm font-racing">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse flex-shrink-0"></div>
          <span className="hidden md:inline">{publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}</span>
          <span className="md:hidden">Wallet</span>
        </button>
      );
    }
    return <WalletMultiButton style={{ backgroundColor: '#7c3aed', height: '40px' }} />;
  };

  if (!mounted) return null;
  const apuestas = [0.01, 0.05, 0.1, 0.5, 1.0, 1.5];

 // ... (resto del código igual) ...

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-black text-white overflow-hidden relative">
        
        {/* 1. TICKER DE PRECIOS (Fijo arriba) */}
        <CryptoTicker />

        <div className="absolute inset-0 z-0"><StarryBackground /></div>
        
        {ganador && <div className="fixed inset-0 z-[100] pointer-events-none"><Confetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={500} gravity={0.2} colors={apuesta >= 1.0 ? ['#FF0000', '#FF7700', '#FFFF00'] : (apuesta >= 0.1 ? ['#00FFFF', '#0000FF'] : ['#00FF00', '#AAFF00'])} /></div>}

        {/* --- COLUMNA IZQUIERDA: JUEGO --- */}
        {/* AGREGAMOS 'pt-12' o 'pt-16' EXTRA AQUÍ PARA QUE EL TICKER NO TAPE NADA */}
        <div className="flex-1 relative flex flex-col items-center justify-center p-2 md:p-4 z-10 h-full overflow-y-auto md:overflow-hidden pt-16">
            
            {/* Botón Wallet (Lo bajamos un poco más con top-12 o top-14) */}
            <div className="absolute top-14 left-4 z-40">{renderWalletButton()}</div>
            
            <button onClick={() => setMobileChatOpen(!mobileChatOpen)} className="md:hidden fixed top-14 right-4 z-50 bg-gray-900 p-2.5 rounded-full border border-purple-500/50 text-cyan-400 shadow-xl active:scale-95">{mobileChatOpen ? '✕' : '💬'}</button>

            <img
                src="/images/rollrush-logo.png"
                alt="RollRush Casino Logo"
                className="w-64 md:w-[450px] lg:w-[600px] h-auto mb-0 z-20 mt-8 md:mt-0 mx-auto drop-shadow-[0_0_35px_rgba(189,0,255,0.5)] hover:scale-105 transition-transform duration-300"
            />

            {/* ... (El resto de tu código del juego: apuestas, dado, panel... sigue igual) ... */}
            
            <div className="-mt-12 mb-2 flex flex-wrap justify-center gap-2 max-w-[95%] z-30 relative">
                {apuestas.map((m) => (
                    <button key={m} onClick={() => setApuesta(m)}
                        className={`px-3 py-1.5 font-bold rounded-md border transition-all backdrop-blur-sm text-xs md:text-sm skew-x-[-10deg] shadow-lg
                            ${apuesta === m ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(0,255,255,0.4)]' : 'bg-black/60 border-white/10 text-gray-400 hover:text-white hover:border-white/30'}`}>
                        <span className="skew-x-[10deg] inline-block">{m}</span>
                    </button>
                ))}
            </div>

            <div className="mb-2 z-10 perspective-container transform scale-75 md:scale-100 origin-center">
                <div className={`scene ${getDiceTierClass()}`}>
                    <div className={`cube ${girando ? 'rolling' : ''}`} style={{ transform: girando ? '' : dadoRotation }}>
                        <div className="cube__face cube__face--1 face-1"><span className="dot"></span></div>
                        <div className="cube__face cube__face--2 face-2"><span className="dot"></span><span className="dot"></span></div>
                        <div className="cube__face cube__face--3 face-3"><span className="dot"></span><span className="dot"></span><span className="dot"></span></div>
                        <div className="cube__face cube__face--4 face-4"><span className="dot"></span><span className="dot"></span><span className="dot"></span><span className="dot"></span></div>
                        <div className="cube__face cube__face--5 face-5"><span className="dot"></span><span className="dot"></span><span className="dot"></span><span className="dot"></span><span className="dot"></span></div>
                        <div className="cube__face cube__face--6 face-6"><span className="dot"></span><span className="dot"></span><span className="dot"></span><span className="dot"></span><span className="dot"></span><span className="dot"></span></div>
                    </div>
                </div>
            </div>

            <div className="w-full max-w-sm bg-black/40 border border-purple-500/20 p-3 md:p-5 rounded-3xl backdrop-blur-xl z-20 relative text-center shadow-[0_0_30px_rgba(189,0,255,0.15)]">
                <p className="text-cyan-400 mb-2 font-bold tracking-widest text-xs md:text-sm font-racing">
                    PLAYING FOR <span className="text-white text-lg ml-1">{apuesta} SOL</span>
                </p>

                <div className="flex gap-3 mb-2">
                    <button onClick={() => jugar(0)} disabled={loading} className="flex-1 py-3 md:py-4 bg-gradient-to-r from-cyan-600 to-cyan-400 hover:from-cyan-500 hover:to-cyan-300 text-black font-black rounded-lg shadow-[0_0_20px_rgba(0,255,255,0.4)] disabled:opacity-50 text-lg md:text-xl font-racing italic transform transition-transform active:scale-95">EVEN</button>
                    <button onClick={() => jugar(1)} disabled={loading} className="flex-1 py-3 md:py-4 bg-gradient-to-r from-purple-700 to-purple-500 hover:from-purple-600 hover:to-purple-400 text-white font-black rounded-lg shadow-[0_0_20px_rgba(189,0,255,0.4)] disabled:opacity-50 text-lg md:text-xl font-racing italic transform transition-transform active:scale-95">ODD</button>
                </div>

                {resultado && <div className={`mt-1 p-2 font-bold rounded-lg border font-racing italic ${ganador ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-red-500/20 border-red-500 text-red-400'}`}>{resultado}</div>}
                {txLink && <div className="mt-1"><a href={txLink} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-white underline">Tx Hash</a></div>}
            </div>
        </div>

        {/* --- CHAT --- */}
        <div className={`fixed inset-0 z-[100] bg-black/95 transition-transform duration-300 transform md:relative md:translate-y-0 md:w-80 md:block md:bg-black/80 md:backdrop-blur-md md:border-l md:border-white/5 ${mobileChatOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}`}>
            <div className="md:hidden flex justify-between items-center p-4 border-b border-gray-800"><h2 className="text-white font-bold font-racing">CHAT</h2><button onClick={() => setMobileChatOpen(false)} className="text-gray-400 p-2">✕</button></div>
            <div className="h-full w-full pb-20 md:pb-0 pt-12 md:pt-0"><SidebarChat /></div>
        </div>
    </div>
  );
}