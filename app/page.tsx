'use client';
import { useState, useEffect, useRef } from 'react';
import { useAnchorWallet, useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, setProvider, web3 } from '@coral-xyz/anchor'; 
import idl from '@/idl.json';
import dynamic from 'next/dynamic';
import Confetti from 'react-confetti';

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

  // --- AUDIO ---
  const rollingRef = useRef<HTMLAudioElement | null>(null);
  const winRef = useRef<HTMLAudioElement | null>(null);
  const loseRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { 
    setMounted(true); 
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    
    rollingRef.current = new Audio('/sounds/rolling.mp3');
    winRef.current = new Audio('/sounds/win.wav');
    loseRef.current = new Audio('/sounds/lose.wav');
    
    if(rollingRef.current) { rollingRef.current.loop = true; rollingRef.current.volume = 0.5; }
    if(winRef.current) winRef.current.volume = 0.6;
    if(loseRef.current) loseRef.current.volume = 0.5;
  }, []);

  const startRollingSound = () => {
    if (rollingRef.current) {
        rollingRef.current.currentTime = 0;
        rollingRef.current.play().catch(e => console.log("Audio error:", e));
    }
  };

  const stopRollingSound = () => {
    if (rollingRef.current) {
        rollingRef.current.pause();
        rollingRef.current.currentTime = 0;
    }
  };

  const playEffect = (type: 'win' | 'lose') => {
    const sound = type === 'win' ? winRef.current : loseRef.current;
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(e => console.log("Audio error:", e));
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
    if (!wallet) return alert("Connect your wallet first!"); // TEXTO EN INGLÉS
    
    setLoading(true);
    setGirando(true);
    setTxLink(null);
    setResultado(`🎲 Rolling for ${apuesta} SOL...`); // TEXTO EN INGLÉS
    setGanador(false);
    startRollingSound();

    try {
      const anchorWeb3 = web3;
      const userPublicKey = new anchorWeb3.PublicKey(wallet.publicKey.toBase58());
      const programId = new anchorWeb3.PublicKey(PROGRAM_ID_STRING);
      const systemProgramId = new anchorWeb3.PublicKey("11111111111111111111111111111111");

      const cleanWallet = {
        signTransaction: wallet.signTransaction,
        signAllTransactions: wallet.signAllTransactions,
        publicKey: userPublicKey, 
      };

      const provider = new AnchorProvider(connection, cleanWallet, { preflightCommitment: "confirmed" });
      setProvider(provider);

      const idl_string = JSON.stringify(idl);
      const idl_object = JSON.parse(idl_string);
      const programIdl = idl_object.default ? idl_object.default : idl_object;

      // @ts-ignore
      const program = new Program(programIdl, programId, provider);

      console.log(`🚀 Enviando apuesta de ${apuesta} SOL...`);
      
      const tx = await program.methods
        .jugar(lado) 
        .accounts({
          user: userPublicKey,
          systemProgram: systemProgramId,
        })
        .rpc();

      console.log("✅ Hash:", tx);
      setTxLink(`https://explorer.solana.com/tx/${tx}?cluster=devnet`);
      
      const latestBlockHash = await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: tx,
      });

      const txDetails = await connection.getParsedTransaction(tx, { commitment: "confirmed" });
      
      stopRollingSound();

      if (txDetails && txDetails.meta && txDetails.meta.logMessages) {
        const logs = txDetails.meta.logMessages.join(" ");
        let caraFinal = 1;

        if (logs.includes("GANASTE")) { // El contrato sigue devolviendo "GANASTE" en español (interno)
          setResultado(`🎉 YOU WON! (+${apuesta * 2} SOL)`); // MENSAJE EN INGLÉS
          setGanador(true);
          playEffect('win');
          caraFinal = obtenerCaraAleatoria(lado === 0 ? 'par' : 'impar');
        } else {
          setResultado("💀 YOU LOST..."); // MENSAJE EN INGLÉS
          setGanador(false);
          playEffect('lose');
          caraFinal = obtenerCaraAleatoria(lado === 0 ? 'impar' : 'par');
        }
        
        detenerDado(caraFinal);

      } else {
        setResultado("Transaction confirmed"); // EN INGLÉS
        setGirando(false);
      }
      
    } catch (error: any) {
      console.error("❌ ERROR:", error);
      stopRollingSound();
      setResultado("Transaction Error"); // EN INGLÉS
      setGirando(false);
    } finally {
      setLoading(false);
    }
  };

  const detenerDado = (numero: number) => {
    setGirando(false);
    switch (numero) {
      case 1: setDadoRotation("rotateX(0deg) rotateY(0deg)"); break;
      case 2: setDadoRotation("rotateX(0deg) rotateY(180deg)"); break;
      case 3: setDadoRotation("rotateX(0deg) rotateY(-90deg)"); break;
      case 4: setDadoRotation("rotateX(0deg) rotateY(90deg)"); break;
      case 5: setDadoRotation("rotateX(-90deg) rotateY(0deg)"); break;
      case 6: setDadoRotation("rotateX(90deg) rotateY(0deg)"); break;
      default: setDadoRotation("rotateX(0deg) rotateY(0deg)");
    }
  };

  const renderWalletButton = () => {
    if (mounted && connected && publicKey) {
      return (
        <button 
          onClick={disconnect}
          className="flex items-center gap-2 bg-gray-800/80 hover:bg-gray-700 border border-purple-500/50 text-white px-4 py-3 rounded-lg font-bold transition-all hover:scale-105 shadow-lg shadow-purple-500/20 backdrop-blur-sm"
        >
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
          {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
          <span className="text-xs text-gray-400 ml-2">(Disconnect)</span> 
        </button>
      );
    }
    return <WalletMultiButton style={{ backgroundColor: '#9333ea', opacity: 0.9 }} />;
  };

  if (!mounted) return null;

  const apuestasDisponibles = [0.01, 0.05, 0.1, 0.5, 1.0, 1.5];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 font-mono relative overflow-hidden relative z-0">
      
      {ganador && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={500}
          gravity={0.2}
          colors={apuesta >= 1.0 ? ['#FF0000', '#FF7700', '#FFFF00'] : (apuesta >= 0.1 ? ['#00FFFF', '#0000FF'] : ['#00FF00', '#AAFF00'])}
        />
      )}

      <div className="absolute top-5 right-5 z-50">
        {renderWalletButton()}
      </div>

      <h1 className="text-5xl md:text-7xl font-black mb-8 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] z-20">
        SOL DICE 🎲
      </h1>

      <div className="mb-8 flex flex-wrap justify-center gap-3 max-w-lg z-20 relative">
        {apuestasDisponibles.map((monto) => (
            <button
                key={monto}
                onClick={() => setApuesta(monto)}
                className={`px-4 py-2 rounded-lg font-bold transition-all border-2 backdrop-blur-md
                    ${apuesta === monto 
                        ? 'bg-purple-600/80 border-purple-400 text-white scale-110 shadow-lg shadow-purple-500/50' 
                        : 'bg-black/40 border-gray-700 text-gray-300 hover:border-gray-400 hover:text-white hover:bg-black/60'
                    }`}
            >
                {monto}
            </button>
        ))}
      </div>

      <div className="relative z-20 mb-4 drop-shadow-[0_30px_30px_rgba(0,0,0,0.5)]">
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

      <div className="bg-black/50 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-gray-800 w-full max-w-md text-center z-20 mt-8 relative overflow-hidden">
        
        <div className="absolute inset-0 rounded-3xl border-2 border-purple-500/20 pointer-events-none"></div>
        
        <p className="text-gray-300 mb-6 font-bold uppercase tracking-wider text-sm">
            PLAYING FOR <span className="text-white text-xl ml-2 text-purple-300 font-black">{apuesta} SOL</span>
        </p>

        <div className="flex gap-4 mb-8 relative z-10">
          <button
            onClick={() => jugar(0)} 
            disabled={loading}
            className="flex-1 py-4 bg-gradient-to-br from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white font-bold rounded-xl text-xl transition-all shadow-lg shadow-blue-500/20 transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed border border-blue-400/30"
          >
            {loading ? "..." : "EVEN"}
          </button>

          <button
            onClick={() => jugar(1)} 
            disabled={loading}
            className="flex-1 py-4 bg-gradient-to-br from-pink-600 to-purple-800 hover:from-pink-500 hover:to-purple-700 text-white font-bold rounded-xl text-xl transition-all shadow-lg shadow-pink-500/20 transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed border border-pink-400/30"
          >
            {loading ? "..." : "ODD"}
          </button>
        </div>

        {resultado && (
           <div className={`mb-6 p-4 font-bold text-xl rounded-xl animate-bounce border-2 backdrop-blur-md ${ganador ? 'bg-green-500/80 text-white border-green-400 shadow-green-500/50 shadow-lg' : 'bg-red-900/80 text-white border-red-500 shadow-red-900/50 shadow-lg'}`}>
              {resultado}
           </div>
        )}

        {txLink && (
            <a href={txLink} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-purple-400 transition-colors underline">
              View Transaction ↗
            </a>
        )}
      </div>
    </main>
  );
}