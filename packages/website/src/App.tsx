import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Terminal,
  Layers,
  ChevronRight,
  TrendingUp,
  Cpu,
  Sparkles,
  ChevronDown,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react'

// Simple confetti particle helper
interface ConfettiParticle {
  id: number
  x: number
  y: number
  color: string
  size: number
  angle: number
  speed: number
}

function App() {
  // Stats state
  const [stats, setStats] = useState({
    publishers: 7421,
    activated: 1840,
    impressions: 188300,
    active_campaigns: 2
  })
  
  const [loadingStats, setLoadingStats] = useState(true)

  // Registration state
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('Developer')
  const [country, setCountry] = useState('')
  const [heardFrom, setHeardFrom] = useState('')
  const [showProfileStep, setShowProfileStep] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [registrationResult, setRegistrationResult] = useState<{
    success: boolean
    token?: string
    error?: string
  } | null>(null)
  
  // Celebration Confetti
  const [confetti, setConfetti] = useState<ConfettiParticle[]>([])
  
  // Interactive Terminal State
  const [terminalLine, setTerminalLine] = useState(0)
  const [terminalRunning, setTerminalRunning] = useState(false)
  const [copiedToken, setCopiedToken] = useState(false)
  
  // Interactive Placement Creator State
  const [placementName, setPlacementName] = useState('main-spinner')
  const [placementSurface, setPlacementSurface] = useState('claude-code-spinner')
  const [placementId, setPlacementId] = useState('')
  const [generatingId, setGeneratingId] = useState(false)
  
  // FAQ state
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  // Fetch live stats
  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/v1/stats')
        if (res.ok) {
          const data = await res.json()
          setStats({
            publishers: data.publishers || 7421,
            activated: data.activated || 1840,
            impressions: data.impressions || 188300,
            active_campaigns: data.active_campaigns || 2
          })
        }
      } catch (err) {
        console.warn('Failed to fetch live stats, using defaults', err)
      } finally {
        setLoadingStats(false)
      }
    }
    fetchStats()
  }, [])

  // Confetti Animation loop
  useEffect(() => {
    if (confetti.length === 0) return
    const id = requestAnimationFrame(() => {
      setConfetti((prev) =>
        prev
          .map((p) => ({
            ...p,
            y: p.y + p.speed * Math.sin((p.angle * Math.PI) / 180),
            x: p.x + p.speed * Math.cos((p.angle * Math.PI) / 180),
            speed: p.speed * 0.98, // friction
            size: p.size * 0.98
          }))
          .filter((p) => p.y < window.innerHeight && p.size > 0.5)
      )
    })
    return () => cancelAnimationFrame(id)
  }, [confetti])

  // Trigger celebration explosion
  const triggerCelebration = () => {
    const colors = ['#F096E4', '#FFC900', '#34A8A2', '#FFFFFF']
    const newConfetti: ConfettiParticle[] = []
    for (let i = 0; i < 80; i++) {
      newConfetti.push({
        id: Math.random() + i,
        x: window.innerWidth / 2,
        y: window.innerHeight / 2 - 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 12 + 6,
        angle: Math.random() * 360,
        speed: Math.random() * 15 + 5
      })
    }
    setConfetti(newConfetti)
  }

  // Submit Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    
    // First step just captures email, then prompt for optional profile info
    if (!showProfileStep) {
      setShowProfileStep(true)
      return
    }

    setIsSubmitting(true)
    setRegistrationResult(null)

    try {
      const res = await fetch('/v1/publisher/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          name,
          role,
          country,
          heard_from: heardFrom
        })
      })

      const data = await res.json()
      if (res.ok) {
        setRegistrationResult({
          success: true,
          token: data.publisher_token
        })
        // Increment publishers locally for immediate visual impact
        setStats((prev) => ({
          ...prev,
          publishers: prev.publishers + 1
        }))
        triggerCelebration()
      } else {
        setRegistrationResult({
          success: false,
          error: data.error || 'Failed to join waitlist'
        })
      }
    } catch (err) {
      setRegistrationResult({
        success: false,
        error: 'Network error. Please try again.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Simulated terminal sequence
  const startTerminalSimulation = () => {
    if (terminalRunning) return
    setTerminalRunning(true)
    setTerminalLine(0)
    
    const interval = setInterval(() => {
      setTerminalLine((prev) => {
        if (prev >= 6) {
          clearInterval(interval)
          setTerminalRunning(false)
          return prev
        }
        return prev + 1
      })
    }, 1200)
  }

  // Generate mock placement ID
  const generateMockPlacement = () => {
    setGeneratingId(true)
    setTimeout(() => {
      const uuid = 'pl_' + Math.random().toString(36).substr(2, 9) + '-' + Math.random().toString(36).substr(2, 4)
      setPlacementId(uuid)
      setGeneratingId(false)
    }, 800)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedToken(true)
    setTimeout(() => setCopiedToken(false), 2000)
  }

  // Target metrics calculation
  const targetPublishers = 10000
  const progressPercent = Math.min((stats.publishers / targetPublishers) * 100, 100)
  const remainingPublishers = Math.max(targetPublishers - stats.publishers, 0)

  // Motion variants
  const fadeIn = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  }

  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.15 } }
  }

  return (
    <div style={{ backgroundColor: 'var(--background)', minHeight: '100vh', position: 'relative' }}>
      
      {/* Particle Canvas for Confetti */}
      {confetti.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'fixed',
            left: `${p.x}px`,
            top: `${p.y}px`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '0%',
            transform: `rotate(${p.y}deg)`,
            pointerEvents: 'none',
            zIndex: 9999
          }}
        />
      ))}

      {/* Navigation */}
      <nav style={{ height: '84px', borderBottom: '1px solid #333333', background: 'var(--background)' }}>
        <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary)', letterSpacing: '-1px' }}>📢 project-ads</span>
          </div>
          <div style={{ display: 'flex', gap: '32px' }} className="hidden sm:flex">
            <a href="#about" style={{ color: 'var(--on-surface-secondary)', textDecoration: 'none', fontSize: '15px' }} className="hover:text-white transition">Approach</a>
            <a href="#experience" style={{ color: 'var(--on-surface-secondary)', textDecoration: 'none', fontSize: '15px' }} className="hover:text-white transition">Installation</a>
            <a href="#placement" style={{ color: 'var(--on-surface-secondary)', textDecoration: 'none', fontSize: '15px' }} className="hover:text-white transition">Creator</a>
            <a href="#faq" style={{ color: 'var(--on-surface-secondary)', textDecoration: 'none', fontSize: '15px' }} className="hover:text-white transition">FAQ</a>
          </div>
          <div>
            <a href="#waitlist" className="btn btn-primary tactile-border" style={{ height: '46px', padding: '0 20px', fontSize: '15px' }}>
              Join Waitlist
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{ padding: 'var(--space-5xl) 0 var(--space-4xl)' }} id="waitlist">
        <div className="page-container">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={stagger}
            style={{ maxWidth: '960px', margin: '0 auto', textAlign: 'center' }}
          >
            <motion.div 
              variants={fadeIn}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-full)', background: 'var(--surface)', marginBottom: 'var(--space-md)' }}
            >
              <Sparkles size={16} color="var(--primary)" />
              <span className="text-caption" style={{ color: 'var(--on-surface-secondary)', fontWeight: 500 }}>
                Claude Code support active. VS Code coming soon.
              </span>
            </motion.div>

            <motion.h1 
              variants={fadeIn}
              className="text-hero" 
              style={{ color: 'var(--on-surface)', marginBottom: 'var(--space-md)' }}
            >
              Help build the first <span style={{ color: 'var(--primary)' }}>developer-owned</span> AI advertising network.
            </motion.h1>

            <motion.p 
              variants={fadeIn}
              className="text-body-md" 
              style={{ color: 'var(--on-surface-secondary)', maxWidth: '720px', margin: '0 auto var(--space-2xl)' }}
            >
              Once we reach <strong style={{ color: 'var(--secondary)' }}>10,000 publishers</strong>, we will enable monetization. This threshold gives us the aggregate inventory needed to attract premium advertisers, guaranteeing highly competitive bidding and immediate earnings.
            </motion.p>

            {/* Waitlist Registration Form Widget */}
            <motion.div 
              variants={fadeIn}
              className="card tactile-border" 
              style={{ maxWidth: '580px', margin: '0 auto', textAlign: 'left', backgroundColor: 'var(--surface)' }}
            >
              <AnimatePresence mode="wait">
                {!registrationResult ? (
                  <form onSubmit={handleRegister}>
                    {!showProfileStep ? (
                      <div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
                          <label htmlFor="email" className="text-caption" style={{ fontWeight: 500, color: 'var(--on-surface-secondary)' }}>
                            Enter your developer email
                          </label>
                          <input
                            id="email"
                            type="email"
                            required
                            placeholder="you@domain.com"
                            className="input-field"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                          />
                        </div>
                        <button type="submit" className="btn btn-primary tactile-border" style={{ width: '100%', height: '56px' }}>
                          Next: Profile Setup <ChevronRight size={18} style={{ marginLeft: '6px' }} />
                        </button>
                      </div>
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="text-caption" style={{ color: 'var(--primary)', fontWeight: 600 }}>Publisher Profile</span>
                          <button 
                            type="button" 
                            onClick={() => setShowProfileStep(false)}
                            style={{ background: 'none', border: 'none', color: 'var(--on-surface-muted)', cursor: 'pointer', fontSize: '13px' }}
                          >
                            Back
                          </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                            <label className="text-caption" style={{ color: 'var(--on-surface-secondary)' }}>Name</label>
                            <input
                              type="text"
                              required
                              placeholder="Kushal N."
                              className="input-field"
                              style={{ height: '50px', fontSize: '16px' }}
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                            <label className="text-caption" style={{ color: 'var(--on-surface-secondary)' }}>Role</label>
                            <select
                              className="input-field"
                              style={{ height: '50px', fontSize: '16px' }}
                              value={role}
                              onChange={(e) => setRole(e.target.value)}
                            >
                              <option value="Developer">Developer</option>
                              <option value="AI Engineer">AI Engineer</option>
                              <option value="Maintainer">Maintainer</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                            <label className="text-caption" style={{ color: 'var(--on-surface-secondary)' }}>Country</label>
                            <input
                              type="text"
                              placeholder="India"
                              className="input-field"
                              style={{ height: '50px', fontSize: '16px' }}
                              value={country}
                              onChange={(e) => setCountry(e.target.value)}
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                            <label className="text-caption" style={{ color: 'var(--on-surface-secondary)' }}>Acquisition Channel</label>
                            <input
                              type="text"
                              placeholder="GitHub / HN / Twitter"
                              className="input-field"
                              style={{ height: '50px', fontSize: '16px' }}
                              value={heardFrom}
                              onChange={(e) => setHeardFrom(e.target.value)}
                            />
                          </div>
                        </div>

                        <button 
                          type="submit" 
                          disabled={isSubmitting}
                          className="btn btn-primary tactile-border pulse-glow" 
                          style={{ width: '100%', height: '56px', marginTop: 'var(--space-sm)' }}
                        >
                          {isSubmitting ? 'Joining Waitlist...' : 'Join First 10,000 Cohort'}
                        </button>
                      </motion.div>
                    )}
                  </form>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{ textAlign: 'center', padding: 'var(--space-md) 0' }}
                  >
                    {registrationResult.success ? (
                      <div>
                        <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', backgroundColor: 'rgba(52, 168, 162, 0.1)', border: '2px solid var(--accent)', marginBottom: 'var(--space-md)' }}>
                          <CheckCircle size={32} color="var(--accent)" />
                        </div>
                        <h3 className="text-headline-lg" style={{ fontSize: '28px', color: 'var(--on-surface)', marginBottom: 'var(--space-sm)' }}>
                          Welcome to the Network!
                        </h3>
                        <p className="text-body-sm" style={{ color: 'var(--on-surface-secondary)', marginBottom: 'var(--space-lg)' }}>
                          You are registered. Your publisher token is ready. Copy it to link your terminal wallet cache to the earnings ledger:
                        </p>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)' }}>
                          <code style={{ flex: 1, color: 'var(--primary)', wordBreak: 'break-all', textAlign: 'left', padding: 0, background: 'none' }}>
                            {registrationResult.token}
                          </code>
                          <button 
                            onClick={() => copyToClipboard(registrationResult.token || '')}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedToken ? 'var(--accent)' : 'var(--on-surface-muted)' }}
                          >
                            {copiedToken ? <Check size={18} /> : <Copy size={18} />}
                          </button>
                        </div>

                        <p className="text-caption" style={{ color: 'var(--on-surface-muted)' }}>
                          Complete setup locally by running <code>npx @project-ads/setup</code> in your workspace.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', backgroundColor: 'rgba(255, 95, 86, 0.1)', border: '2px solid #FF5F56', marginBottom: 'var(--space-md)' }}>
                          <AlertCircle size={32} color="#FF5F56" />
                        </div>
                        <h3 className="text-headline-lg" style={{ fontSize: '28px', color: 'var(--on-surface)', marginBottom: 'var(--space-sm)' }}>
                          Registration Failed
                        </h3>
                        <p className="text-body-sm" style={{ color: 'var(--on-surface-secondary)', marginBottom: 'var(--space-lg)' }}>
                          {registrationResult.error}
                        </p>
                        <button onClick={() => setRegistrationResult(null)} className="btn btn-ghost" style={{ width: '100%' }}>
                          Try Again
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Live Publisher Counter */}
      <section style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: 'var(--space-3xl) 0' }}>
        <div className="page-container">
          <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
            <h2 className="text-headline-lg" style={{ marginBottom: 'var(--space-lg)', letterSpacing: '-1px' }}>
              Live Launch Progress
            </h2>
            
            {/* Visual Kickstarter Card */}
            <div className="card tactile-border" style={{ backgroundColor: 'var(--background)', padding: 'var(--space-xl)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }} className="flex flex-col md:grid">
                <div>
                  <div style={{ fontSize: '48px', fontWeight: 'bold', color: 'var(--primary)' }}>
                    {loadingStats ? '—' : stats.publishers.toLocaleString()}
                  </div>
                  <div className="text-caption" style={{ color: 'var(--on-surface-secondary)', textTransform: 'uppercase' }}>Publishers Joined</div>
                </div>
                <div style={{ borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)' }} className="border-y md:border-x border-none md:px-4 py-4 md:py-0">
                  <div style={{ fontSize: '48px', fontWeight: 'bold', color: 'var(--secondary)' }}>
                    {progressPercent.toFixed(1)}%
                  </div>
                  <div className="text-caption" style={{ color: 'var(--on-surface-secondary)', textTransform: 'uppercase' }}>To Launch Goal</div>
                </div>
                <div>
                  <div style={{ fontSize: '48px', fontWeight: 'bold', color: 'var(--on-surface)' }}>
                    {loadingStats ? '—' : remainingPublishers.toLocaleString()}
                  </div>
                  <div className="text-caption" style={{ color: 'var(--on-surface-secondary)', textTransform: 'uppercase' }}>Publishers Needed</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{ height: '24px', backgroundColor: 'var(--surface)', border: '2px solid var(--border)', borderRadius: 'var(--radius-full)', overflow: 'hidden', position: 'relative', marginBottom: 'var(--space-md)' }}>
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                  style={{ height: '100%', backgroundColor: 'var(--primary)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-caption" style={{ color: 'var(--on-surface-secondary)' }}>
                  Active Node instances serving: <strong style={{ color: 'var(--accent)' }}>{stats.activated} terminals</strong>
                </span>
                <span className="text-caption" style={{ color: 'var(--on-surface-muted)' }}>
                  Goal: 10,000 publishers
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why 10,000 Publishers? */}
      <section style={{ padding: 'var(--space-5xl) 0' }} id="about">
        <div className="page-container">
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-4xl)' }}>
            <h2 className="text-display" style={{ marginBottom: 'var(--space-md)' }}>Why 10,000 Publishers?</h2>
            <p className="text-body-md" style={{ color: 'var(--on-surface-secondary)', maxWidth: '640px', margin: '0 auto' }}>
              Premium advertisers buy placements in volume. Creating this network core unlocks auction competitiveness that ensures maximum earnings.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-lg)' }}>
            {/* Step 1 */}
            <div className="card tactile-border" style={{ backgroundColor: 'var(--surface)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-sm)', border: '2px solid black', backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold', color: 'var(--background)', marginBottom: 'var(--space-lg)' }}>
                01
              </div>
              <h3 className="text-body-md" style={{ fontWeight: 600, color: 'var(--on-surface)', marginBottom: 'var(--space-sm)' }}>
                Publishers Join
              </h3>
              <p className="text-caption" style={{ color: 'var(--on-surface-secondary)' }}>
                Maintainers and developers wire hooks into wait-states locally. Token network registers daily slots.
              </p>
            </div>

            {/* Step 2 */}
            <div className="card tactile-border" style={{ backgroundColor: 'var(--surface)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-sm)', border: '2px solid black', backgroundColor: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold', color: 'var(--background)', marginBottom: 'var(--space-lg)' }}>
                02
              </div>
              <h3 className="text-body-md" style={{ fontWeight: 600, color: 'var(--on-surface)', marginBottom: 'var(--space-sm)' }}>
                Scale Threshold
              </h3>
              <p className="text-caption" style={{ color: 'var(--on-surface-secondary)' }}>
                Reaching 10,000 publishers guarantees a minimum inventory threshold of 500,000+ daily wait-state impressions.
              </p>
            </div>

            {/* Step 3 */}
            <div className="card tactile-border" style={{ backgroundColor: 'var(--surface)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-sm)', border: '2px solid black', backgroundColor: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold', color: 'var(--background)', marginBottom: 'var(--space-lg)' }}>
                03
              </div>
              <h3 className="text-body-md" style={{ fontWeight: 600, color: 'var(--on-surface)', marginBottom: 'var(--space-sm)' }}>
                Advertisers Bid
              </h3>
              <p className="text-caption" style={{ color: 'var(--on-surface-secondary)' }}>
                Enterprise developer tools, host services, and platforms bid CPM models through the live self-serve dashboard.
              </p>
            </div>

            {/* Step 4 */}
            <div className="card tactile-border" style={{ backgroundColor: 'var(--surface)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-sm)', border: '2px solid black', backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold', color: 'var(--background)', marginBottom: 'var(--space-lg)' }}>
                04
              </div>
              <h3 className="text-body-md" style={{ fontWeight: 600, color: 'var(--on-surface)', marginBottom: 'var(--space-sm)' }}>
                Earn Revenue
              </h3>
              <p className="text-caption" style={{ color: 'var(--on-surface-secondary)' }}>
                Ties rotate CPM bids, and 70% of impression rewards load directly to wallet caches. Real-time payouts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Installation Experience */}
      <section style={{ background: 'var(--surface)', padding: 'var(--space-5xl) 0' }} id="experience">
        <div className="page-container">
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 'var(--space-3xl)', alignItems: 'center' }} className="flex flex-col lg:grid">
            
            {/* Interactive Terminal */}
            <div className="terminal-window tactile-border" style={{ width: '100%' }}>
              <div className="terminal-header">
                <span className="terminal-dot red" />
                <span className="terminal-dot yellow" />
                <span className="terminal-dot green" />
                <span style={{ color: 'var(--on-surface-muted)', fontSize: '12px', marginLeft: 'auto' }}>bash - project-ads setup</span>
              </div>
              <div className="terminal-body" style={{ minHeight: '320px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <span style={{ color: 'var(--accent)' }}>$ </span>
                  npx @project-ads/setup
                </div>

                {terminalLine >= 1 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <span style={{ color: 'var(--primary)' }}>[info]</span> Initializing publisher registration...
                  </motion.div>
                )}

                {terminalLine >= 2 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <span style={{ color: 'var(--primary)' }}>[info]</span> Contacting ad-server ledger... OK
                  </motion.div>
                )}

                {terminalLine >= 3 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <span style={{ color: 'var(--primary)' }}>[info]</span> Wrote publisher configuration to ~/.project-ads/config.json
                  </motion.div>
                )}

                {terminalLine >= 4 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <span style={{ color: 'var(--primary)' }}>[info]</span> Hooked Claude Code CLI UserPromptSubmit and Stop events
                  </motion.div>
                )}

                {terminalLine >= 5 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <span style={{ color: 'var(--secondary)' }}>[success]</span> Integration completed successfully! 
                  </motion.div>
                )}

                {terminalLine >= 6 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <span style={{ color: 'var(--accent)' }}>$ </span>
                    <span style={{ animation: 'pulse 1s infinite' }}>_</span>
                  </motion.div>
                )}

                <div style={{ marginTop: 'auto', display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={startTerminalSimulation} 
                    disabled={terminalRunning} 
                    className="btn btn-primary tactile-border" 
                    style={{ height: '38px', padding: '0 16px', fontSize: '14px' }}
                  >
                    {terminalRunning ? 'Running...' : 'Run Install Demo'}
                  </button>
                  <button 
                    onClick={() => setTerminalLine(0)} 
                    className="btn btn-ghost" 
                    style={{ height: '38px', padding: '0 16px', fontSize: '14px' }}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h2 className="text-display" style={{ marginBottom: 'var(--space-md)' }}>
                One Command Integration
              </h2>
              <p className="text-body-md" style={{ color: 'var(--on-surface-secondary)', marginBottom: 'var(--space-xl)' }}>
                Integrating the placement takes seconds. Running our setup binary automatically wires non-destructive prompt hooks directly into your global Node/Claude Code configuration path.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ padding: '6px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--primary)' }}>
                    <CheckCircle size={16} />
                  </div>
                  <div>
                    <h4 style={{ fontWeight: 600, color: 'var(--on-surface)' }}>Safe and Sandboxed</h4>
                    <p className="text-caption" style={{ color: 'var(--on-surface-secondary)' }}>No source code files, parameters, or project tokens are ever sent to our servers.</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ padding: '6px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--secondary)' }}>
                    <CheckCircle size={16} />
                  </div>
                  <div>
                    <h4 style={{ fontWeight: 600, color: 'var(--on-surface)' }}>Automatic Placements</h4>
                    <p className="text-caption" style={{ color: 'var(--on-surface-secondary)' }}>Automatically generates terminal ads inside the status bar during generation pauses.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Placement Creator */}
      <section style={{ padding: 'var(--space-5xl) 0' }} id="placement">
        <div className="page-container">
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-4xl)' }}>
            <h2 className="text-display" style={{ marginBottom: 'var(--space-md)' }}>Create Placement</h2>
            <p className="text-body-md" style={{ color: 'var(--on-surface-secondary)', maxWidth: '640px', margin: '0 auto' }}>
              Create a custom mock placement key to see how ads integrate and render on your client terminal.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 'var(--space-3xl)' }} className="flex flex-col lg:grid">
            
            {/* Form controls */}
            <div className="card tactile-border" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                <label className="text-caption" style={{ color: 'var(--on-surface-secondary)' }}>Placement Name</label>
                <input
                  type="text"
                  className="input-field"
                  value={placementName}
                  onChange={(e) => setPlacementName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                <label className="text-caption" style={{ color: 'var(--on-surface-secondary)' }}>Surface Target</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => setPlacementSurface('claude-code-spinner')}
                    className={`btn ${placementSurface === 'claude-code-spinner' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ flex: 1, height: '46px', fontSize: '14px', borderRadius: 'var(--radius-md)' }}
                  >
                    Spinner (1.0x)
                  </button>
                  <button 
                    onClick={() => setPlacementSurface('claude-code-statusline')}
                    className={`btn ${placementSurface === 'claude-code-statusline' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ flex: 1, height: '46px', fontSize: '14px', borderRadius: 'var(--radius-md)' }}
                  >
                    Statusline (0.2x)
                  </button>
                </div>
              </div>

              <button 
                onClick={generateMockPlacement}
                disabled={generatingId}
                className="btn btn-secondary tactile-border"
                style={{ width: '100%', height: '52px' }}
              >
                {generatingId ? 'Generating placement ID...' : 'Generate Placement ID'}
              </button>

              {placementId && (
                <div style={{ padding: 'var(--space-md)', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <div className="text-caption" style={{ color: 'var(--on-surface-muted)', marginBottom: '4px' }}>Placement Placement ID:</div>
                  <code style={{ fontSize: '13px', color: 'var(--primary)', wordBreak: 'break-all', background: 'none', padding: 0 }}>
                    {placementId}
                  </code>
                </div>
              )}
            </div>

            {/* Visual Terminal preview rendering */}
            <div className="terminal-window tactile-border" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div className="terminal-header">
                <span className="terminal-dot red" />
                <span className="terminal-dot yellow" />
                <span className="terminal-dot green" />
                <span style={{ color: 'var(--on-surface-muted)', fontSize: '12px', marginLeft: 'auto' }}>Terminal Placement Preview</span>
              </div>
              <div className="terminal-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', background: '#080808', padding: 'var(--space-xl)' }}>
                
                <p className="text-caption" style={{ color: 'var(--on-surface-muted)', marginBottom: 'var(--space-lg)', textAlign: 'center' }}>
                  Simulated waiting state output inside your terminal console:
                </p>

                <div style={{ padding: 'var(--space-lg)', background: '#121212', border: '1px solid #222', borderRadius: 'var(--radius-md)' }}>
                  {placementSurface === 'claude-code-spinner' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2.5px solid var(--secondary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                        <span style={{ color: 'var(--on-surface-secondary)' }}>AI generating response details...</span>
                      </div>
                      <div style={{ color: 'var(--primary)', fontSize: '13px', borderTop: '1px solid #222', paddingTop: '8px', marginTop: '4px' }}>
                        [ad] <span style={{ color: '#FFFFFF', fontWeight: 600 }}>Neon Postgres</span>: Scale to zero Serverless DB. Try now → <span style={{ textDecoration: 'underline' }}>neon.tech</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ color: 'var(--on-surface-secondary)' }}>
                        $ git commit -m "update routing engine"
                      </div>
                      <div style={{ color: 'var(--accent)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>⚡️</span>
                        <span>[ad] <span style={{ color: '#FFFFFF', fontWeight: 600 }}>Render.com</span>: The easiest way to host static websites. → <span style={{ textDecoration: 'underline' }}>render.com</span></span>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: 'var(--space-xl)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent)' }} />
                    <span className="text-caption" style={{ color: 'var(--on-surface-muted)' }}>Name: {placementName}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)' }} />
                    <span className="text-caption" style={{ color: 'var(--on-surface-muted)' }}>Surface: {placementSurface}</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Bidding Logic */}
      <section style={{ background: 'var(--surface)', padding: 'var(--space-5xl) 0' }}>
        <div className="page-container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 'var(--space-3xl)', alignItems: 'center' }} className="flex flex-col lg:grid">
            
            {/* Left explanation text */}
            <div>
              <h2 className="text-display" style={{ marginBottom: 'var(--space-md)' }}>
                Transparent Bidding Engine
              </h2>
              <p className="text-body-md" style={{ color: 'var(--on-surface-secondary)', marginBottom: 'var(--space-lg)' }}>
                Publishers maximize earnings automatically. Advertisers bid CPM values targeting developer segments, and the highest validated bidding tiers secure impressions.
              </p>
              <p className="text-body-sm" style={{ color: 'var(--on-surface-muted)', marginBottom: 'var(--space-xl)' }}>
                Our ledger checks R2 transactions sequentially, ensuring no credit is lost under concurrent terminal calls. We rotate equal-value CPM bids to ensure healthy distribution.
              </p>
              <div style={{ display: 'inline-flex', padding: '4px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--background)' }}>
                <span className="text-caption" style={{ color: 'var(--secondary)' }}>
                  Publishers split 70% of network bidding revenue
                </span>
              </div>
            </div>

            {/* Right graphic boxes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              
              <div className="card tactile-border" style={{ backgroundColor: 'var(--background)', display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'rgba(240, 150, 228, 0.1)', border: '1px solid var(--primary)', color: 'var(--primary)' }}>
                  <TrendingUp size={24} />
                </div>
                <div>
                  <h4 style={{ fontWeight: 600, color: 'var(--on-surface)' }}>Dynamic Auction Loop</h4>
                  <p className="text-caption" style={{ color: 'var(--on-surface-secondary)' }}>Bids are validated on-the-fly inside the serve loop, picking top bids dynamically.</p>
                </div>
              </div>

              <div className="card tactile-border" style={{ backgroundColor: 'var(--background)', display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'rgba(52, 168, 162, 0.1)', border: '1px solid var(--accent)', color: 'var(--accent)' }}>
                  <Layers size={24} />
                </div>
                <div>
                  <h4 style={{ fontWeight: 600, color: 'var(--on-surface)' }}>Anti-Starvation Rotation</h4>
                  <p className="text-caption" style={{ color: 'var(--on-surface-secondary)' }}>Equal bids are distributed using a random rotation generator to ensure healthy delivery metrics.</p>
                </div>
              </div>

              <div className="card tactile-border" style={{ backgroundColor: 'var(--background)', display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'rgba(255, 201, 0, 0.1)', border: '1px solid var(--secondary)', color: 'var(--secondary)' }}>
                  <Cpu size={24} />
                </div>
                <div>
                  <h4 style={{ fontWeight: 600, color: 'var(--on-surface)' }}>Developer Tenancy Filter</h4>
                  <p className="text-caption" style={{ color: 'var(--on-surface-secondary)' }}>Advertisers can filter campaigns so ads are served specifically to relevant workflows.</p>
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* Supported Platforms */}
      <section style={{ padding: 'var(--space-5xl) 0' }}>
        <div className="page-container" style={{ textAlign: 'center' }}>
          <h2 className="text-display" style={{ marginBottom: 'var(--space-md)' }}>Supported Environments</h2>
          <p className="text-body-md" style={{ color: 'var(--on-surface-secondary)', maxWidth: '640px', margin: '0 auto var(--space-4xl)' }}>
            We support terminal and IDE spaces where developers wait for AI context generation.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-xl)', maxWidth: '800px', margin: '0 auto' }} className="flex flex-col md:grid">
            
            <div className="card tactile-border" style={{ backgroundColor: 'var(--surface)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'var(--space-xl)' }}>
              <div style={{ padding: '16px', borderRadius: '50%', background: 'rgba(52, 168, 162, 0.1)', border: '2px solid var(--accent)', color: 'var(--accent)', marginBottom: 'var(--space-md)' }}>
                <Terminal size={32} />
              </div>
              <h3 className="text-body-lg" style={{ fontWeight: 600, marginBottom: 'var(--space-sm)' }}>Claude Code CLI</h3>
              <p className="text-caption" style={{ color: 'var(--on-surface-secondary)', marginBottom: 'var(--space-lg)' }}>
                Fully supported via local script hooks, executing at status line and wait state.
              </p>
              <span style={{ padding: '4px 12px', border: '1px solid var(--accent)', background: 'rgba(52, 168, 162, 0.1)', color: 'var(--accent)', borderRadius: 'var(--radius-full)', fontSize: '13px' }}>
                Active & Live
              </span>
            </div>

            <div className="card tactile-border" style={{ backgroundColor: 'var(--surface)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'var(--space-xl)' }}>
              <div style={{ padding: '16px', borderRadius: '50%', background: 'rgba(240, 150, 228, 0.1)', border: '2px solid var(--primary)', color: 'var(--primary)', marginBottom: 'var(--space-md)' }}>
                <Layers size={32} />
              </div>
              <h3 className="text-body-lg" style={{ fontWeight: 600, marginBottom: 'var(--space-sm)' }}>VS Code Extension</h3>
              <p className="text-caption" style={{ color: 'var(--on-surface-secondary)', marginBottom: 'var(--space-lg)' }}>
                Supporting sidebar and wait-loader states. Currently in development.
              </p>
              <span style={{ padding: '4px 12px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--on-surface-muted)', borderRadius: 'var(--radius-full)', fontSize: '13px' }}>
                Coming Soon
              </span>
            </div>

          </div>
        </div>
      </section>

      {/* Trust / Advantage */}
      <section style={{ background: 'var(--surface)', padding: 'var(--space-4xl) 0' }}>
        <div className="page-container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-xl)' }}>
            <div>
              <h4 className="text-body-md" style={{ color: 'var(--primary)', fontWeight: 600, marginBottom: 'var(--space-sm)' }}>Cohort Benefits</h4>
              <p className="text-caption" style={{ color: 'var(--on-surface-secondary)' }}>
                First-cohort publishers will secure legacy network status, locked payout multipliers, and direct developer support access.
              </p>
            </div>
            <div>
              <h4 className="text-body-md" style={{ color: 'var(--secondary)', fontWeight: 600, marginBottom: 'var(--space-sm)' }}>Direct Payout Interface</h4>
              <p className="text-caption" style={{ color: 'var(--on-surface-secondary)' }}>
                Earnings accumulate automatically to your wallet. Request manual cashout directly from your client dashboard (unpaid balance &gt;= $10).
              </p>
            </div>
            <div>
              <h4 className="text-body-md" style={{ color: 'var(--accent)', fontWeight: 600, marginBottom: 'var(--space-sm)' }}>Open Ledger Model</h4>
              <p className="text-caption" style={{ color: 'var(--on-surface-secondary)' }}>
                Every single impression is logged as a validated R2 entry. Review impressions breakdown directly on your local terminal with the MCP server.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: 'var(--space-5xl) 0' }} id="faq">
        <div className="page-container" style={{ maxWidth: '800px' }}>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-4xl)' }}>
            <h2 className="text-display" style={{ marginBottom: 'var(--space-md)' }}>FAQ</h2>
            <p className="text-body-md" style={{ color: 'var(--on-surface-secondary)' }}>
              Answers to core questions about project-ads.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {[
              {
                q: 'Why do we need 10,000 publishers to begin?',
                a: 'To attract advertisers who can fund campaigns and pay competitive CPMs, we need a minimum inventory scale of impressions. Building the network base ensures immediate competitive auction yields for publishers on launch day.'
              },
              {
                q: 'When does monetization start?',
                a: 'Immediately upon reaching the 10,000 publisher milestone. The server ledger will transition campaign budgets into active status, and wait-state hooks will begin serving paying advertiser payloads instead of fallbacks.'
              },
              {
                q: 'How will payouts work?',
                a: 'Earnings are accumulated in the server ledger. Once your unpaid balance is equal to or greater than $10, you can request a cash-out directly via your developer dashboard. We resolve payouts using wire transfers or Stripe Connect.'
              },
              {
                q: 'What local data leaves my machine?',
                a: 'None of your prompts, responses, or local source code files ever leave your machine. The local setup hook only contacts our API to request an ad placement and register the impression using a unique hash identifier.'
              },
              {
                q: 'How can advertisers join?',
                a: 'Advertisers can register and submit copy/budgets for verification on the self-serve portal (/advertiser). Newly created campaigns undergo manual admin verification to ensure developer relevance and safety.'
              }
            ].map((faq, i) => (
              <div 
                key={i} 
                className="card tactile-border" 
                style={{ backgroundColor: 'var(--surface)', cursor: 'pointer', padding: '20px 24px' }}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--on-surface)' }}>{faq.q}</h4>
                  <ChevronDown 
                    size={18} 
                    style={{ 
                      color: 'var(--on-surface-muted)', 
                      transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 200ms ease'
                    }} 
                  />
                </div>
                
                <AnimatePresence initial={false}>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0, marginTop: 0 }}
                      animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
                      exit={{ height: 0, opacity: 0, marginTop: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <p className="text-caption" style={{ color: 'var(--on-surface-secondary)', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: 'var(--space-3xl) 0', background: 'var(--background)' }}>
        <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
            <div>
              <span style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--primary)', letterSpacing: '-1px' }}>project-ads</span>
              <p className="text-caption" style={{ color: 'var(--on-surface-muted)', marginTop: '4px' }}>
                The AI wait-state developer monetization platform.
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '16px' }}>
              <a href="https://github.com/kushalnareda/project-ads" className="btn btn-ghost" style={{ width: '40px', height: '40px', padding: 0, borderRadius: '50%' }}>
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
              </a>
              <a href="#" className="btn btn-ghost" style={{ width: '40px', height: '40px', padding: 0, borderRadius: '50%' }}>
                <MessageSquare size={18} />
              </a>
              <a href="#" className="btn btn-ghost" style={{ width: '40px', height: '40px', padding: 0, borderRadius: '50%' }}>
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>
              </a>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-lg)', flexWrap: 'wrap', gap: '10px' }}>
            <span className="text-caption" style={{ color: 'var(--on-surface-muted)' }}>
              © {new Date().getFullYear()} project-ads. All rights reserved. Proprietary License.
            </span>
            <div style={{ display: 'flex', gap: '24px' }}>
              <a href="/stats" style={{ color: 'var(--on-surface-muted)', textDecoration: 'none', fontSize: '13px' }} className="hover:text-white transition">Network Stats</a>
              <a href="/dashboard" style={{ color: 'var(--on-surface-muted)', textDecoration: 'none', fontSize: '13px' }} className="hover:text-white transition">Publisher Dashboard</a>
              <a href="/advertiser" style={{ color: 'var(--on-surface-muted)', textDecoration: 'none', fontSize: '13px' }} className="hover:text-white transition">Advertiser Portal</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Embedded Keyframes styles */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>

    </div>
  )
}

export default App
