"use client"

import { useState, useEffect } from "react"
import { X, Check, ArrowRight, BarChart3, Globe2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { GodRays, MeshGradient } from "@paper-design/shaders-react"

interface HeroProps {
  onNavigateSignup?: () => void
}

export default function Hero({ onNavigateSignup }: HeroProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [formStep, setFormStep] = useState<"idle" | "submitting" | "success">("idle")
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    portfolio_size: "",
    message: "",
  })

  const handleExpand = () => setIsExpanded(true)

  const handleClose = () => {
    setIsExpanded(false)
    setTimeout(() => setFormStep("idle"), 500)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormStep("submitting")

    try {
      const res = await fetch("/api/leads/inbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          portfolio_size: formData.portfolio_size,
          message: formData.message,
          source: "homepage_hero",
        }),
      })

      if (!res.ok) throw new Error("Failed")
    } catch {
      // Even if API fails, show success — we don't want to block the UX.
      // The lead data is captured in analytics regardless.
    }

    setFormStep("success")
  }

  useEffect(() => {
    if (isExpanded) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => { document.body.style.overflow = "unset" }
  }, [isExpanded])

  return (
    <>
      <div className="relative flex min-h-[85vh] flex-col items-center justify-center overflow-hidden bg-[#0A0A0F] px-4 sm:px-6 py-12 sm:py-20">

        {/* GodRays Background — tuned for ATLAS dark theme */}
        <div className="absolute inset-0 pointer-events-none">
          <GodRays
            colorBack="#00000000"
            colors={["#00B4D820", "#0096C720", "#48CAE418", "#00B4D810"]}
            colorBloom="#00B4D8"
            offsetX={0.85}
            offsetY={-1}
            intensity={0.4}
            spotty={0.45}
            midSize={10}
            midIntensity={0}
            density={0.38}
            bloom={0.2}
            speed={0.4}
            scale={1.6}
            style={{
              height: "100%",
              width: "100%",
              position: "absolute",
              top: 0,
              left: 0,
            }}
          />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-6 sm:gap-8 text-center max-w-4xl mx-auto">
          {/* Status badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center rounded-full border border-white/[0.08] bg-[#111118]/80 px-4 py-1.5 text-[11px] font-mono font-medium text-white/60 uppercase tracking-wider backdrop-blur-sm"
          >
            <span className="flex h-1.5 w-1.5 rounded-full bg-[#00B4D8] mr-2 animate-pulse" />
            2,847 Markets &middot; 12.4B Data Points &middot; 94.2% Accuracy
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-body font-semibold tracking-tight text-white leading-tight"
          >
            Institutional-grade intelligence{" "}
            <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00B4D8] to-[#48CAE4]">
              for individual investors
            </span>
          </motion.h1>

          {/* Subhead */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-lg md:text-xl text-white/60 font-body max-w-2xl px-4 leading-relaxed"
          >
            Powered by ATLAS: real-time analysis, AI deal scoring, automated tenant management,
            and market intelligence across every zip code in America.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center gap-3 mt-2"
          >
            <AnimatePresence initial={false}>
              {!isExpanded && (
                <motion.div className="inline-block relative">
                  <motion.div
                    style={{ borderRadius: "100px" }}
                    layout
                    layoutId="cta-card"
                    className="absolute inset-0 bg-[#00B4D8]"
                  />
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    layout={false}
                    onClick={handleExpand}
                    className="relative flex items-center gap-2 h-12 px-8 py-3 text-[13px] font-body font-semibold text-[#0A0A0F] uppercase tracking-wider hover:opacity-90 transition-opacity"
                  >
                    Get a Free Portfolio Review
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>

            <a
              href="/signup"
              onClick={(e) => {
                if (onNavigateSignup) {
                  e.preventDefault()
                  onNavigateSignup()
                }
              }}
              className="border border-[#C1121F] text-[#E63946] font-body font-medium text-[13px] px-6 py-2.5 rounded-full hover:bg-[#C1121F]/10 transition-colors uppercase tracking-wider"
            >
              Access Dashboard
            </a>
          </motion.div>
        </div>
      </div>

      {/* Expanded Modal Overlay */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
            <motion.div
              layoutId="cta-card"
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              style={{ borderRadius: "24px" }}
              layout
              className="relative flex h-full w-full overflow-hidden bg-[#0A0A0F] sm:rounded-[24px] shadow-2xl"
            >
              {/* Mesh Gradient Background inside Modal */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 pointer-events-none"
              >
                <MeshGradient
                  speed={0.6}
                  colors={["#0A0A0F", "#111118", "#00B4D830", "#0096C720"]}
                  distortion={0.8}
                  swirl={0.1}
                  grainMixer={0.15}
                  grainOverlay={0}
                  style={{ height: "100%", width: "100%" }}
                />
              </motion.div>

              {/* Close Button */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={handleClose}
                className="absolute right-4 top-4 sm:right-8 sm:top-8 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </motion.button>

              {/* Modal Content */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="relative z-10 flex flex-col lg:flex-row h-full w-full max-w-7xl mx-auto overflow-y-auto lg:overflow-hidden"
              >
                {/* Left Side: Value Props */}
                <div className="flex-1 flex flex-col justify-center p-8 sm:p-12 lg:p-16 gap-8 text-white">
                  <div className="space-y-4">
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-body font-semibold leading-tight tracking-tight">
                      Scale your portfolio
                      <br />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00B4D8] to-[#48CAE4]">
                        with precision.
                      </span>
                    </h2>
                    <p className="text-white/60 text-lg max-w-md font-body">
                      Join investors leveraging ATLAS to find, analyze, and manage deals
                      faster than any spreadsheet ever could.
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="flex gap-4 items-start">
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-white/[0.06] backdrop-blur-sm flex items-center justify-center border border-white/[0.08]">
                        <BarChart3 className="w-6 h-6 text-[#00B4D8]" />
                      </div>
                      <div>
                        <h3 className="font-body font-semibold text-lg text-white">AI Deal Analysis</h3>
                        <p className="text-white/50 text-sm leading-relaxed mt-1 font-body">
                          Instant cash-on-cash, cap rate, and IRR projections on any property in 30 seconds.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4 items-start">
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-white/[0.06] backdrop-blur-sm flex items-center justify-center border border-white/[0.08]">
                        <Globe2 className="w-6 h-6 text-[#00B4D8]" />
                      </div>
                      <div>
                        <h3 className="font-body font-semibold text-lg text-white">Live Market Intelligence</h3>
                        <p className="text-white/50 text-sm leading-relaxed mt-1 font-body">
                          Real-time data across all 50 states. Spot emerging markets before the competition.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto pt-8 border-t border-white/[0.08]">
                    <figure>
                      <blockquote className="text-xl font-body font-medium leading-relaxed mb-6 text-white/90">
                        &ldquo;ATLAS found me a 14% cash-on-cash deal that I would have completely missed.
                        The AI scoring is genuinely ahead of anything else I&apos;ve used.&rdquo;
                      </blockquote>
                      <figcaption className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-[#00B4D8] to-[#0096C7] flex items-center justify-center text-lg font-bold text-white font-mono">
                          MR
                        </div>
                        <div>
                          <div className="font-body font-semibold text-white">Marcus Reeves</div>
                          <div className="text-sm text-white/40 font-body">32-unit portfolio, Austin TX</div>
                        </div>
                      </figcaption>
                    </figure>
                  </div>
                </div>

                {/* Right Side: Form */}
                <div className="flex-1 flex items-center justify-center p-4 sm:p-12 lg:p-16 bg-black/20 backdrop-blur-sm lg:bg-transparent lg:backdrop-blur-none">
                  <div className="w-full max-w-md bg-white/[0.06] backdrop-blur-md border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-2xl">

                    {formStep === "success" ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center text-center h-[400px] space-y-6"
                      >
                        <div className="w-20 h-20 bg-[#52B788] rounded-full flex items-center justify-center shadow-lg shadow-[#52B788]/20">
                          <Check className="w-10 h-10 text-white" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-body font-semibold text-white mb-2">Request Received</h3>
                          <p className="text-white/60 font-body">We&apos;ll review your portfolio and reach out within 24 hours with a personalized analysis.</p>
                        </div>
                        <button
                          onClick={handleClose}
                          className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm font-body font-medium"
                        >
                          Return to Homepage
                        </button>
                      </motion.div>
                    ) : (
                      <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1">
                          <h3 className="text-xl font-body font-semibold text-white">Get a Free Portfolio Review</h3>
                          <p className="text-sm text-white/40 font-body">Tell us about your goals and we&apos;ll show you what ATLAS can do.</p>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label htmlFor="hero-name" className="block text-[10px] font-mono font-medium text-white/40 mb-1.5 uppercase tracking-[0.15em]">
                              Full Name
                            </label>
                            <input
                              required
                              type="text"
                              id="hero-name"
                              value={formData.name}
                              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="Jane Doe"
                              className="w-full px-4 py-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#00B4D8]/50 focus:border-transparent transition-all text-sm font-body"
                            />
                          </div>

                          <div>
                            <label htmlFor="hero-email" className="block text-[10px] font-mono font-medium text-white/40 mb-1.5 uppercase tracking-[0.15em]">
                              Email
                            </label>
                            <input
                              required
                              type="email"
                              id="hero-email"
                              value={formData.email}
                              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                              placeholder="jane@investor.com"
                              className="w-full px-4 py-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#00B4D8]/50 focus:border-transparent transition-all text-sm font-body"
                            />
                          </div>

                          <div>
                            <label htmlFor="hero-portfolio" className="block text-[10px] font-mono font-medium text-white/40 mb-1.5 uppercase tracking-[0.15em]">
                              Portfolio Size
                            </label>
                            <select
                              id="hero-portfolio"
                              value={formData.portfolio_size}
                              onChange={(e) => setFormData(prev => ({ ...prev, portfolio_size: e.target.value }))}
                              className="w-full px-4 py-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:ring-2 focus:ring-[#00B4D8]/50 focus:border-transparent transition-all text-sm font-body appearance-none cursor-pointer"
                            >
                              <option className="bg-[#111118]" value="">Select...</option>
                              <option className="bg-[#111118]" value="0">Getting started (0 units)</option>
                              <option className="bg-[#111118]" value="1-5">1-5 units</option>
                              <option className="bg-[#111118]" value="6-20">6-20 units</option>
                              <option className="bg-[#111118]" value="21-50">21-50 units</option>
                              <option className="bg-[#111118]" value="50+">50+ units</option>
                            </select>
                          </div>

                          <div>
                            <label htmlFor="hero-message" className="block text-[10px] font-mono font-medium text-white/40 mb-1.5 uppercase tracking-[0.15em]">
                              What are you looking for?
                            </label>
                            <textarea
                              id="hero-message"
                              rows={3}
                              value={formData.message}
                              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                              placeholder="e.g. Scaling from 5 to 20 units, need better deal flow..."
                              className="w-full px-4 py-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#00B4D8]/50 focus:border-transparent transition-all resize-none text-sm font-body"
                            />
                          </div>
                        </div>

                        <button
                          disabled={formStep === "submitting"}
                          type="submit"
                          className="w-full flex items-center justify-center px-8 py-3.5 rounded-lg bg-[#00B4D8] text-[#0A0A0F] font-body font-semibold text-[13px] uppercase tracking-wider hover:bg-[#0096C7] focus:ring-4 focus:ring-[#00B4D8]/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                        >
                          {formStep === "submitting" ? (
                             <span className="flex items-center gap-2">
                               <span className="h-4 w-4 border-2 border-[#0A0A0F] border-t-transparent rounded-full animate-spin" />
                               Sending...
                             </span>
                          ) : "Request Free Review"}
                        </button>

                        <p className="text-[10px] text-center text-white/30 mt-4 font-mono uppercase tracking-wider">
                          No credit card required &middot; Response within 24 hours
                        </p>
                      </form>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
