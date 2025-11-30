'use client';
import { useState, useEffect } from 'react';

interface CoinData {
  id: string;
  symbol: string;
  price: number;
  change: number;
}

// Configuración de las monedas que queremos rastrear
const COINS_CONFIG = [
  { id: 'solana', symbol: 'SOL' },
  { id: 'bitcoin', symbol: 'BTC' },
  { id: 'ethereum', symbol: 'ETH' },
  { id: 'bonk', symbol: 'BONK' },
  { id: 'jupiter-exchange-solana', symbol: 'JUP' },
  { id: 'chainlink', symbol: 'LINK' },
];

export default function CryptoTicker() {
  const [data, setData] = useState<CoinData[]>([]);
  const [loading, setLoading] = useState(true);

  // Función para buscar precios en CoinGecko (API Gratuita)
  const fetchPrices = async () => {
    try {
      const ids = COINS_CONFIG.map(c => c.id).join(',');
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
      );
      const json = await response.json();

      const formattedData = COINS_CONFIG.map(coin => ({
        id: coin.id,
        symbol: coin.symbol,
        price: json[coin.id]?.usd || 0,
        change: json[coin.id]?.usd_24h_change || 0
      }));

      setData(formattedData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching crypto prices:", error);
    }
  };

  useEffect(() => {
    fetchPrices();
    // Actualizar cada 60 segundos para no saturar la API gratis
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return null; // No mostramos nada hasta que cargue

  // Renderizamos el contenido dos veces para crear el efecto de loop infinito sin cortes
  const renderItems = () => (
    <>
      {data.map((coin) => (
        <div key={coin.id} className="ticker-item">
          <span className="text-blue-300 mr-2">{coin.symbol}</span>
          <span className="text-white mr-2">${coin.price.toLocaleString()}</span>
          <span className={coin.change >= 0 ? "text-green-400" : "text-red-500"}>
            {coin.change >= 0 ? "▲" : "▼"} {Math.abs(coin.change).toFixed(2)}%
          </span>
        </div>
      ))}
    </>
  );

  return (
    <div className="ticker-wrap border-b border-purple-500/30">
      <div className="ticker-move">
        {/* Duplicamos el contenido para el scroll infinito perfecto */}
        <span className="inline-flex items-center">{renderItems()}</span>
        <span className="inline-flex items-center">{renderItems()}</span>
        <span className="inline-flex items-center">{renderItems()}</span>
        <span className="inline-flex items-center">{renderItems()}</span>
      </div>
    </div>
  );
}