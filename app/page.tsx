'use client';
import { useState, useEffect, useRef } from 'react';
import { useAnchorWallet, useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, setProvider, web3 } from '@coral-xyz/anchor'; 
import idl from '@/idl.json';
import dynamic from 'next/dynamic';
import Confetti from 'react-confetti';
import SidebarChat from './components/SidebarChat';

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

  const playSound = (audio: React.MutableRefObject<HTMLAudioElement | null>) => {
    if (audio.current) { audio.current.currentTime = 0; audio.current.play().catch(() => {}); }
  };
  const stopSound = (audio: React.MutableRefObject<HTMLAudioElement | null>) => {
    if (audio.current) { audio.current.pause(); audio.current.currentTime = 0; }
  };
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
    setLoading(true); setGirando(true); setTxLink(null); setResultado(`Rolling...`); setGanador(false); playSound(rollingRef);

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
      
      stopSound(rollingRef);

      if (txDetails?.meta?.logMessages) {
        const logs = txDetails.meta.logMessages.join(" ");
        let caraFinal = 1;
        if (logs.includes("GANASTE")) {
          setResultado(`🎉 YOU WON! (+${apuesta * 2} SOL)`); setGanador(true); playEffect('win');
          caraFinal = obtenerCaraAleatoria(lado === 0 ? 'par' : 'impar');
        } else {
          setResultado("💀 YOU LOST..."); playEffect('lose');
          caraFinal = obtenerCaraAleatoria(lado === 0 ? 'impar' : 'par');
        }
        detenerDado(caraFinal);
      } else { setResultado("Confirmed"); setGirando(false); }
    } catch (error: any) { console.error(error); stopSound(rollingRef); setResultado("Error"); setGirando(false); } finally { setLoading(false); }
  };

  const detenerDado = (n: number) => {
    setGirando(false);
    const rots: {[key: number]: string} = { 1: "rotateX(0deg) rotateY(0deg)", 2: "rotateX(0deg) rotateY(180deg)", 3: "rotateX(0deg) rotateY(-90deg)", 4: "rotateX(0deg) rotateY(90deg)", 5: "rotateX(-90deg) rotateY(0deg)", 6: "rotateX(90deg) rotateY(0deg)" };
    setDadoRotation(rots[n] || "rotateX(0deg) rotateY(0deg)");
  };

  const renderWalletButton = () => {
    if (mounted && connected && publicKey) {
      return (
        <button onClick={disconnect} className="flex items-center gap-2 bg-gray-800/90 hover:bg-gray-700 border border-purple-500/50 text-white px-3 py-2 rounded-xl font-bold transition-all shadow-lg shadow-purple-500/20 backdrop-blur-sm text-sm">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0"></div>
          <span className="hidden md:inline">{publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}</span>
          <span className="md:hidden">Wallet</span>
          <span className="text-[10px] text-gray-400 ml-1">(Exit)</span> 
        </button>
      );
    }
    // Ajuste para móvil: Botón más pequeño
    return <div className="scale-90 origin-top-left"><WalletMultiButton style={{ backgroundColor: '#9333ea' }} /></div>;
  };

  if (!mounted) return null;
  const apuestas = [0.01, 0.05, 0.1, 0.5, 1.0, 1.5];

  return (
    // CAMBIO IMPORTANTE: 'h-screen' fijo solo en escritorio (md:h-screen). En móvil es 'min-h-screen'
    <div className="flex flex-col md:flex-row min-h-screen w-full bg-black text-white font-mono overflow-x-hidden">
        
        {ganador && (
            <div className="fixed inset-0 z-[100] pointer-events-none">
                <Confetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={500} gravity={0.2} colors={apuesta >= 1.0 ? ['#FF0000', '#FF7700'] : (apuesta >= 0.1 ? ['#00FFFF', '#0000FF'] : ['#00FF00', '#AAFF00'])} />
            </div>
        )}

        {/* --- IZQUIERDA: JUEGO --- */}
        {/* En móvil: Permitimos scroll (overflow-y-auto) y padding extra abajo para que no se corte */}
        <div className="flex-1 relative flex flex-col items-center justify-start pt-6 p-4 md:justify-center overflow-y-auto md:overflow-hidden pb-20 bg-[radial-gradient(circle_at_center,_#1a1a1a_0%,_#000000_100%)]">
            
            {/* Botón Wallet (Esquina superior izquierda, fijo) */}
            <div className="absolute top-4 left-4 z-40">
                {renderWalletButton()}
            </div>

            {/* BOTÓN FLOTANTE CHAT (Solo móvil, fijo arriba derecha) */}
            <button 
                onClick={() => setMobileChatOpen(!mobileChatOpen)}
                className="md:hidden fixed top-4 right-4 z-50 bg-gray-800/90 p-2.5 rounded-full border border-gray-600 shadow-xl active:scale-95"
            >
                {mobileChatOpen ? '❌' : '💬'}
            </button>

            <h1 className="text-4xl md:text-7xl font-black mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] z-20 text-center mt-12 md:mt-0">
                SOL DICE 🎲
            </h1>

            {/* Selector de Apuestas - Wrap para que baje de línea si no cabe */}
            <div className="mb-8 flex flex-wrap justify-center gap-2 max-w-[90%] z-20">
                {apuestas.map((m) => (
                    <button key={m} onClick={() => setApuesta(m)}
                        className={`px-3 py-2 font-bold rounded-lg border transition-all backdrop-blur-sm text-xs md:text-sm
                            ${apuesta === m ? 'bg-purple-600/80 border-purple-400 text-white scale-105 shadow-lg' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                        {m}
                    </button>
                ))}
            </div>

            {/* DADO (Escalado en móvil para que no ocupe tanto) */}
            <div className="mb-8 z-10 perspective-container transform scale-75 md:scale-100 origin-center">
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

            {/* Panel de Juego (Ancho completo en móvil con margen) */}
            <div className="w-full max-w-sm bg-white/5 border border-white/10 p-5 rounded-3xl backdrop-blur-xl z-20 relative text-center shadow-2xl">
                <p className="text-gray-300 mb-4 font-bold uppercase tracking-wider text-xs md:text-sm">
                    PLAYING FOR <span className="text-white text-base md:text-xl ml-2 text-purple-300 font-black">{apuesta} SOL</span>
                </p>

                <div className="flex gap-4 mb-4">
                    <button onClick={() => jugar(0)} disabled={loading} className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold shadow-lg disabled:opacity-50 text-lg md:text-xl">EVEN</button>
                    <button onClick={() => jugar(1)} disabled={loading} className="flex-1 py-4 bg-pink-600 hover:bg-pink-500 rounded-xl font-bold shadow-lg disabled:opacity-50 text-lg md:text-xl">ODD</button>
                </div>

                {resultado && (
                  <div className={`p-3 font-bold rounded-xl border animate-bounce ${ganador ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-red-500/20 border-red-500 text-red-400'}`}>
                      {resultado}
                  </div>
                )}
                
                {txLink && <div className="mt-2"><a href={txLink} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-white underline">View Tx</a></div>}
            </div>
        </div>

        {/* --- CHAT (Oculto en móvil, visible al clic) --- */}
        <div className={`
            fixed inset-0 z-[100] bg-black/95 transition-transform duration-300 transform 
            md:relative md:translate-y-0 md:w-80 md:block md:bg-black md:border-l md:border-gray-800
            ${mobileChatOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}
        `}>
            {/* Cabecera Móvil del Chat */}
            <div className="md:hidden flex justify-between items-center p-4 border-b border-gray-800 bg-black">
                <h2 className="text-white font-bold">💬 Chat</h2>
                <button onClick={() => setMobileChatOpen(false)} className="text-gray-400 p-2">✕ Cerrar</button>
            </div>
            
            <div className="h-full w-full pb-20 md:pb-0">
                <SidebarChat />
            </div>
        </div>

    </div>
  );
}