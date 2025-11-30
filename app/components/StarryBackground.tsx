'use client';
import { useMemo } from 'react';

const StarryBackground = () => {
    // Generamos las estrellas solo una vez para no afectar el rendimiento
    const stars = useMemo(() => {
        const count = 70; // Cantidad de destellos (suficientes para dar vida, no tantos para saturar)
        const generatedStars = [];

        for (let i = 0; i < count; i++) {
            // Posición aleatoria
            const top = Math.random() * 100;
            const left = Math.random() * 100;
            // Tamaño diminuto aleatorio (entre 1px y 3px)
            const size = Math.random() * 2 + 1;
            // Retraso aleatorio para que no parpadeen todos a la vez (entre 0s y 10s)
            const delay = Math.random() * 10;
            // Duración del ciclo de encendido/apagado (entre 4s y 8s, lento y elegante)
            const duration = Math.random() * 4 + 4;

            generatedStars.push({ top, left, size, delay, duration });
        }
        return generatedStars;
    }, []);

    return (
        <div className="fixed inset-0 z-0 pointer-events-none deep-space-bg overflow-hidden">
            {stars.map((star, index) => (
                <div
                    key={index}
                    className="star-sparkle"
                    style={{
                        top: `${star.top}%`,
                        left: `${star.left}%`,
                        width: `${star.size}px`,
                        height: `${star.size}px`,
                        animationDelay: `${star.delay}s`,
                        animationDuration: `${star.duration}s`,
                    }}
                />
            ))}
            {/* Una capa sutil de ruido para dar textura si se desea, opcional */}
            <div className="absolute inset-0 bg-black/20 mix-blend-overlay"></div>
        </div>
    );
};

export default StarryBackground;