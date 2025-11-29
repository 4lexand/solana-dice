'use client';
import { useState, useEffect, useRef } from 'react';
import { useAnchorWallet, useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, setProvider, web3 } from '@coral-xyz/anchor'; 
import idl from '@/idl.json';
import dynamic from 'next/dynamic';
import Confetti from 'react-confetti';
import SidebarChat from './components/SidebarChat';

// Cargamos el botón de forma dinámica para evitar errores de hidratación
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

  const rollingRef = useRef<HTMLAudioElement | null>(null);
  const winRef = useRef<HTMLAudioElement | null>(null);
  const loseRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { 
    setMounted(true); 
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    rollingRef.current = new Audio('/sounds/rolling.mp3');
    winRef.current = new Audio('/sounds/win.wav');
    loseRef.current = new Audio('/sounds/lose.wav');
    
    // Configuración segura de audio
    const setupAudio = (audio: HTMLAudioElement, vol: number, loop: boolean = false) => {
        audio.volume = vol;
        audio.loop = loop;
    };
    if(rollingRef.current) setupAudio(rollingRef.current, 0.5, true);
    if(winRef.current) setupAudio(winRef.current, 0.6);
    if(loseRef.current) setupAudio(loseRef.current, 0.5);
  }, []);

  const playSound = (audioRef: React.MutableRefObject<HTMLAudioElement | null>) => {
    if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {}); // Ignoramos errores de autoplay
    }
  };

  const stopSound = (audioRef: React.MutableRefObject<HTMLAudioElement | null>) => {
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
    }
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
    
    setLoading(true);
    setGirando(true);
    setTxLink(null);
    setResultado(`Rolling...`);
    setGanador(false);
    playSound(rollingRef);

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
          setResultado(`🎉 YOU WON! (+${apuesta * 2} SOL)`);
          setGanador(true);
          playSound(winRef);
          caraFinal = obtenerCaraAleatoria(lado === 0 ? 'par' : 'impar');
        } else {
          setResultado("💀 YOU LOST...");
          playSound(loseRef);
          caraFinal = obtenerCaraAleatoria(lado === 0 ? 'impar' : 'par');
        }
        detenerDado(caraFinal);
      } else {
        setResultado("Confirmed");
        setGirando(false);
      }
    } catch (error: any) {
      console.error(error);
      stopSound(rollingRef);
      setResultado("Error");
      setGirando(false);
    } finally {
      setLoading(false);
    }
  };

  const detenerDado = (n: number) => {
    setGirando(false);
    const rots: {[key: number]: string} = {
        1: "rotateX(0deg) rotateY(0deg)",
        2: "rotateX(0deg) rotateY(180deg)",
        3: "rotateX(0deg) rotateY(-90deg)",
        4: "rotateX(0deg) rotateY(90deg)",
        5: "rotateX(-90deg) rotateY(0deg)",
        6: "rotateX(90deg) rotateY(0deg)"
    };
    setDadoRotation(rots[n] || "rotateX(0deg) rotateY(0deg)");
  };

  const renderWalletButton = () => {
    if (mounted && connected && publicKey) {
      return (
        <button onClick={disconnect} className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm border border-gray-600">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
        </button>
      );
    }
    return <WalletMultiButton style={{ backgroundColor: '#9333ea', height: '40px' }} />;
  };

  if (!mounted) return null;
  const apuestas = [0.01, 0.05, 0.1, 0.5, 1.0, 1.5];

  // --- ESTRUCTURA DE PANTALLA DIVIDIDA CORREGIDA ---
  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-black text-white overflow-hidden">
        
        {ganador && (
            <div className="fixed inset-0 z-50 pointer-events-none">
                <Confetti width={windowSize.width} height={windowSize.height} recycle={false} />
            </div>
        )}

        {/* --- IZQUIERDA: JUEGO (Ocupa todo el espacio posible) --- */}
        <div className="flex-1 relative flex flex-col items-center justify-center p-4 bg-[radial-gradient(circle_at_center,_#1a1a1a_0%,_#000000_100%)]">
            
            <div className="absolute top-4 left-4 z-40">
                {renderWalletButton()}
            </div>

            <h1 className="text-5xl font-black mb-8 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 drop-shadow-lg">
                SOL DICE 🎲
            </h1>

            {/* Apuestas */}
            <div className="flex gap-2 mb-10 z-10">
                {apuestas.map((m) => (
                    <button key={m} onClick={() => setApuesta(m)}
                        className={`px-3 py-1 text-sm font-bold rounded border ${apuesta === m ? 'bg-purple-600 border-purple-400 text-white' : 'bg-transparent border-gray-700 text-gray-500 hover:border-gray-500'}`}>
                        {m}
                    </button>
                ))}
            </div>

            {/* Dado */}
            <div className="mb-10 z-10 perspective-container">
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

            {/* Panel Botones */}
            <div className="w-full max-w-sm bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-sm z-10 text-center">
                <p className="text-gray-400 text-xs font-bold mb-4 tracking-widest">PLAYING FOR <span className="text-white">{apuesta} SOL</span></p>
                <div className="flex gap-4 mb-4">
                    <button onClick={() => jugar(0)} disabled={loading} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold shadow-lg disabled:opacity-50">EVEN</button>
                    <button onClick={() => jugar(1)} disabled={loading} className="flex-1 py-3 bg-pink-600 hover:bg-pink-500 rounded-lg font-bold shadow-lg disabled:opacity-50">ODD</button>
                </div>
                {resultado && <div className={`text-sm font-bold ${ganador ? 'text-green-400' : 'text-red-400'}`}>{resultado}</div>}
            </div>
        </div>

        {/* --- DERECHA: CHAT (Ancho fijo en PC, Oculto/Abajo en móvil si quieres) --- */}
        {/* En móvil se pone debajo, en PC (md) se pone a la derecha con ancho fijo */}
        <div className="w-full md:w-80 h-[300px] md:h-full flex-shrink-0 border-t md:border-t-0 md:border-l border-gray-800 bg-black z-20">
            <SidebarChat />
        </div>

    </div>
  );
}