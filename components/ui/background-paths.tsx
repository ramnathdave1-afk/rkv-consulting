"use client";

import { motion } from "framer-motion";
import { ShadcnButton as Button } from "@/components/ui/shadcn-button";
import { useMemo } from "react";

function SpectralLines() {
    const lines = useMemo(() => {
        return Array.from({ length: 40 }, (_, i) => {
            const y = 80 + i * 4;
            const amplitude = 3 + Math.sin(i * 0.4) * 8;
            const frequency = 0.008 + (i % 5) * 0.002;
            const phase = i * 0.7;

            // Generate a smooth spectral wave path flowing left to right
            let d = `M-50 ${y}`;
            for (let x = -50; x <= 750; x += 4) {
                const wave1 = Math.sin(x * frequency + phase) * amplitude;
                const wave2 = Math.sin(x * frequency * 1.7 + phase * 0.6) * (amplitude * 0.4);
                const wave3 = Math.sin(x * frequency * 0.3 + phase * 1.2) * (amplitude * 0.6);
                const py = y + wave1 + wave2 + wave3;
                d += ` L${x} ${py.toFixed(1)}`;
            }

            // Spectral color — subtle cyan/blue/purple hues
            const hue = 190 + (i * 4.5) % 60; // cycles through 190-250 (cyan to purple)
            const lightness = 60 + (i % 3) * 10;
            const opacity = 0.04 + Math.sin(i * 0.3) * 0.03;

            return {
                id: i,
                d,
                color: `hsla(${hue}, 70%, ${lightness}%, ${opacity})`,
                width: 0.3 + Math.sin(i * 0.5) * 0.2,
                duration: 12 + (i % 7) * 3,
                delay: i * 0.15,
            };
        });
    }, []);

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <svg
                className="w-full h-full"
                viewBox="0 0 696 316"
                fill="none"
                preserveAspectRatio="xMidYMid slice"
            >
                <title>Spectral Background</title>
                {lines.map((line) => (
                    <motion.path
                        key={line.id}
                        d={line.d}
                        stroke={line.color}
                        strokeWidth={line.width}
                        fill="none"
                        initial={{ pathOffset: 0, opacity: 0 }}
                        animate={{
                            pathOffset: [0, 1],
                            opacity: [0, 1, 1, 0],
                        }}
                        transition={{
                            pathOffset: {
                                duration: line.duration,
                                repeat: Infinity,
                                ease: "linear",
                            },
                            opacity: {
                                duration: line.duration,
                                repeat: Infinity,
                                ease: "linear",
                                times: [0, 0.1, 0.9, 1],
                            },
                        }}
                    />
                ))}
                {/* Faint spectral glow overlay lines */}
                {[0, 1, 2].map((g) => {
                    const cy = 140 + g * 30;
                    return (
                        <motion.line
                            key={`glow-${g}`}
                            x1="-50"
                            y1={cy}
                            x2="750"
                            y2={cy}
                            stroke={`hsla(${200 + g * 20}, 80%, 65%, 0.02)`}
                            strokeWidth="20"
                            filter="blur(8px)"
                            initial={{ opacity: 0.3 }}
                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                            transition={{
                                duration: 6 + g * 2,
                                repeat: Infinity,
                                ease: "easeInOut",
                            }}
                        />
                    );
                })}
            </svg>
        </div>
    );
}

export function BackgroundPaths({
    title = "Background Paths",
}: {
    title?: string;
}) {
    const words = title.split(" ");

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-black">
            <div className="absolute inset-0">
                <SpectralLines />
            </div>

            <div className="relative z-10 container mx-auto px-4 md:px-6 text-center -mt-32 md:-mt-40">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 2 }}
                    className="max-w-4xl mx-auto"
                >
                    <h1 className="text-5xl sm:text-7xl md:text-8xl font-bold mb-8 tracking-tighter">
                        {words.map((word, wordIndex) => (
                            <span
                                key={wordIndex}
                                className="inline-block mr-4 last:mr-0"
                            >
                                {word.split("").map((letter, letterIndex) => (
                                    <motion.span
                                        key={`${wordIndex}-${letterIndex}`}
                                        initial={{ y: 100, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{
                                            delay:
                                                wordIndex * 0.1 +
                                                letterIndex * 0.03,
                                            type: "spring",
                                            stiffness: 150,
                                            damping: 25,
                                        }}
                                        className="inline-block text-transparent bg-clip-text
                                        bg-gradient-to-r from-white to-white/80"
                                    >
                                        {letter}
                                    </motion.span>
                                ))}
                            </span>
                        ))}
                    </h1>

                    <div
                        className="inline-block group relative bg-gradient-to-b from-white/10 to-black/10 p-px rounded-2xl backdrop-blur-lg
                        overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
                    >
                        <Button
                            variant="ghost"
                            className="rounded-[1.15rem] px-8 py-6 text-lg font-semibold backdrop-blur-md
                            bg-black/95 hover:bg-black/100
                            text-white transition-all duration-300
                            group-hover:-translate-y-0.5 border border-white/10
                            hover:shadow-md hover:shadow-neutral-800/50"
                        >
                            <span className="opacity-90 group-hover:opacity-100 transition-opacity">
                                Get Started
                            </span>
                            <span
                                className="ml-3 opacity-70 group-hover:opacity-100 group-hover:translate-x-1.5
                                transition-all duration-300"
                            >
                                →
                            </span>
                        </Button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
