"use client";

import React, { useEffect, useRef } from "react";

const colors = {
  50: "#f8f7f5",
  100: "#e6e1d7",
  200: "#c8b4a0",
  300: "#a89080",
  500: "#6b5545",
  900: "#1a1d18",
};

export function HeroSection() {
  const gradientRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const words = document.querySelectorAll<HTMLElement>(".word");
    words.forEach((word) => {
      const delay = parseInt(word.getAttribute("data-delay") || "0", 10);
      setTimeout(() => {
        word.style.animation = "word-appear 0.8s ease-out forwards";
      }, delay);
    });

    const gradient = gradientRef.current;
    function onMouseMove(e: MouseEvent) {
      if (gradient) {
        gradient.style.left = e.clientX - 192 + "px";
        gradient.style.top = e.clientY - 192 + "px";
        gradient.style.opacity = "1";
      }
    }
    function onMouseLeave() {
      if (gradient) gradient.style.opacity = "0";
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseleave", onMouseLeave);

    words.forEach((word) => {
      word.addEventListener("mouseenter", () => {
        word.style.textShadow = "0 0 20px rgba(200, 180, 160, 0.5)";
      });
      word.addEventListener("mouseleave", () => {
        word.style.textShadow = "none";
      });
    });

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1d18] via-black to-[#2a2e26] text-[#e6e1d7] overflow-hidden relative w-full">
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(200,180,160,0.08)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        <line x1="0" y1="20%" x2="100%" y2="20%" className="grid-line" style={{ animationDelay: "0.5s" }} />
        <line x1="0" y1="80%" x2="100%" y2="80%" className="grid-line" style={{ animationDelay: "1s" }} />
        <line x1="20%" y1="0" x2="20%" y2="100%" className="grid-line" style={{ animationDelay: "1.5s" }} />
        <line x1="80%" y1="0" x2="80%" y2="100%" className="grid-line" style={{ animationDelay: "2s" }} />
        <circle cx="20%" cy="20%" r="2" className="detail-dot" style={{ animationDelay: "3s" }} />
        <circle cx="80%" cy="20%" r="2" className="detail-dot" style={{ animationDelay: "3.2s" }} />
        <circle cx="20%" cy="80%" r="2" className="detail-dot" style={{ animationDelay: "3.4s" }} />
        <circle cx="80%" cy="80%" r="2" className="detail-dot" style={{ animationDelay: "3.6s" }} />
      </svg>

      {/* Corner accents */}
      <div className="absolute top-8 left-8"><div className="w-2 h-2 opacity-30" style={{ background: colors[200] }}></div></div>
      <div className="absolute top-8 right-8"><div className="w-2 h-2 opacity-30" style={{ background: colors[200] }}></div></div>
      <div className="absolute bottom-8 left-8"><div className="w-2 h-2 opacity-30" style={{ background: colors[200] }}></div></div>
      <div className="absolute bottom-8 right-8"><div className="w-2 h-2 opacity-30" style={{ background: colors[200] }}></div></div>

      <div className="relative z-10 min-h-screen flex flex-col justify-between items-center px-8 py-12 md:px-16 md:py-20">
        {/* Top tagline */}
        <div className="text-center">
          <h2 className="text-xs md:text-sm font-mono font-light uppercase tracking-[0.2em] opacity-80" style={{ color: colors[200] }}>
            <span className="word" data-delay="0">Welcome</span>{" "}
            <span className="word" data-delay="200">to</span>{" "}
            <span className="word" data-delay="400"><b>MeridianNode</b></span>{" "}
            <span className="word" data-delay="600">—</span>{" "}
            <span className="word" data-delay="800">The</span>{" "}
            <span className="word" data-delay="1000">smartest</span>{" "}
            <span className="word" data-delay="1200">operator</span>{" "}
            <span className="word" data-delay="1400">in your portfolio.</span>
          </h2>
          <div className="mt-4 w-16 h-px mx-auto opacity-30" style={{ background: `linear-gradient(to right, transparent, ${colors[200]}, transparent)` }}></div>
        </div>

        {/* Main headline */}
        <div className="text-center max-w-5xl mx-auto">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-extralight leading-tight tracking-tight" style={{ color: colors[50] }}>
            <div className="mb-4 md:mb-6">
              <span className="word" data-delay="1600">Automate</span>{" "}
              <span className="word" data-delay="1750">your</span>{" "}
              <span className="word" data-delay="1900">portfolio</span>{" "}
              <span className="word" data-delay="2050">with</span>{" "}
              <span className="word" data-delay="2200">AI-driven</span>{" "}
              <span className="word" data-delay="2350">intelligence.</span>
            </div>
            <div className="text-2xl md:text-3xl lg:text-4xl font-thin leading-relaxed" style={{ color: colors[200] }}>
              <span className="word" data-delay="2600">Communicate,</span>{" "}
              <span className="word" data-delay="2750">collect,</span>{" "}
              <span className="word" data-delay="2900">maintain,</span>{" "}
              <span className="word" data-delay="3050">and</span>{" "}
              <span className="word" data-delay="3200">report</span>{" "}
              <span className="word" data-delay="3350">— all</span>{" "}
              <span className="word" data-delay="3500">from</span>{" "}
              <span className="word" data-delay="3650">one</span>{" "}
              <span className="word" data-delay="3800">intelligent</span>{" "}
              <span className="word" data-delay="3950">platform.</span>
            </div>
          </h1>
        </div>

        {/* Bottom tagline */}
        <div className="text-center">
          <div className="mb-4 w-16 h-px mx-auto opacity-30" style={{ background: `linear-gradient(to right, transparent, ${colors[200]}, transparent)` }}></div>
          <h2 className="text-xs md:text-sm font-mono font-light uppercase tracking-[0.2em] opacity-80" style={{ color: colors[200] }}>
            <span className="word" data-delay="4400">AI leasing,</span>{" "}
            <span className="word" data-delay="4550">maintenance triage,</span>{" "}
            <span className="word" data-delay="4700">owner reports,</span>{" "}
            <span className="word" data-delay="4850">fair housing compliance.</span>
          </h2>
          <div className="mt-6 flex justify-center space-x-4 opacity-0" style={{ animation: "word-appear 1s ease-out forwards", animationDelay: "4.5s" }}>
            <div className="w-1 h-1 rounded-full opacity-40" style={{ background: colors[200] }}></div>
            <div className="w-1 h-1 rounded-full opacity-60" style={{ background: colors[200] }}></div>
            <div className="w-1 h-1 rounded-full opacity-40" style={{ background: colors[200] }}></div>
          </div>
        </div>
      </div>

      <div id="mouse-gradient" ref={gradientRef} className="fixed pointer-events-none w-96 h-96 rounded-full blur-3xl transition-all duration-500 ease-out opacity-0" style={{ background: `radial-gradient(circle, ${colors[500]}0D 0%, transparent 100%)` }}></div>

      <style jsx>{`
        .word { display: inline-block; opacity: 0; margin-right: 0.25em; cursor: default; transition: text-shadow 0.3s ease; }
        .grid-line { stroke: rgba(200,180,160,0.15); stroke-width: 0.5; stroke-dasharray: 1000; stroke-dashoffset: 1000; animation: grid-draw 3s ease-out forwards; }
        .detail-dot { fill: rgba(200,180,160,0.4); opacity: 0; animation: word-appear 1s ease-out forwards; }
        @keyframes word-appear { 0% { opacity: 0; transform: translateY(30px) scale(0.8); filter: blur(10px); } 50% { opacity: 0.8; transform: translateY(10px) scale(0.95); filter: blur(2px); } 100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); } }
        @keyframes grid-draw { 0% { stroke-dashoffset: 1000; opacity: 0; } 50% { opacity: 0.3; } 100% { stroke-dashoffset: 0; opacity: 0.15; } }
      `}</style>
    </div>
  );
}
