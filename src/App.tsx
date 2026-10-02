import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  CircleDollarSign,
  Download,
  Gamepad2,
  LockKeyhole,
  LogOut,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Users,
  X,
} from "lucide-react"
import logo from "./imports/ebecLogo.jpg"
import { supabase } from "./utils/supabase"
import {
  Game,
  GameStatus,
  Participant,
  ScoreEvent,
  Team,
  calculateNetWorth,
  formatMoney,
  getLastAction,
  getRankChange,
} from "./data"

type Page = "home" | "register" | "leaderboard" | "team" | "admin"
type AdminTab = "overview" | "teams" | "members" | "scoring" | "games" | "activity"

const pageFromPath = (): Page => {
  const path = window.location.pathname
  if (path.startsWith("/register")) return "register"
  if (path.startsWith("/leaderboard")) return "leaderboard"
  if (path.startsWith("/team")) return "team"
  if (path.startsWith("/admin")) return "admin"
  return "home"
}

const paths: Record<Page, string> = {
  home: "/",
  register: "/register",
  leaderboard: "/leaderboard",
  team: "/team",
  admin: "/admin",
}

function Button({
  children,
  onClick,
  variant = "primary",
  type = "button",
  className = "",
  disabled = false,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: "primary" | "secondary" | "ghost" | "danger"
  type?: "button" | "submit"
  className?: string
  disabled?: boolean
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
    >
      {children}
    </button>
  )
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`${compact ? "size-9" : "size-11"} logo-shell`}>
        <img src={logo} alt="EBEC logo" className="size-full object-cover" />
      </div>
      <div className="leading-none">
        <span className="font-display text-lg font-semibold tracking-wide text-white">
          Wall Street
        </span>
        <span className="ml-1 font-display text-lg text-gold">Night</span>
      </div>
    </div>
  )
}

function Navbar({
  navigate,
  isLeaderboardAccessible = true,
}: {
  navigate: (page: Page) => void
  isLeaderboardAccessible?: boolean
}) {
  const [open, setOpen] = useState(false)
  const nav = (page: Page) => {
    navigate(page)
    setOpen(false)
  }
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/8 bg-ink/80 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
        <button aria-label="Go home" onClick={() => nav("home")}>
          <Logo compact />
        </button>
        <nav
          className="hidden items-center gap-8 md:flex"
          aria-label="Main navigation"
        >
          <button onClick={() => nav("home")} className="nav-link">
            The event
          </button>
          <button
            onClick={() => nav("leaderboard")}
            className="nav-link flex items-center gap-1.5"
          >
            Live board
            {!isLeaderboardAccessible && (
              <LockKeyhole size={13} className="text-gold" />
            )}
          </button>
          <button onClick={() => nav("team")} className="nav-link">
            Portfolio
          </button>
          <Button onClick={() => nav("register")}>
            Register <ArrowRight size={16} />
          </Button>
        </nav>
        <button
          aria-label="Toggle navigation"
          className="text-white md:hidden"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/8 bg-ink px-5 md:hidden"
          >
            <div className="flex flex-col gap-2 py-5">
              {(["home", "leaderboard", "team", "register"] as Page[]).map(
                (item) => (
                  <button
                    key={item}
                    onClick={() => nav(item)}
                    className="mobile-nav"
                  >
                    {item === "home"
                      ? "The event"
                      : item === "team"
                        ? "Portfolio"
                        : item}
                    <ChevronRight size={16} />
                  </button>
                ),
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}

function Ticker({
  events,
  teams,
}: {
  events: ScoreEvent[]
  teams: Team[]
}) {
  if (!events.length) {
    return (
      <div className="ticker" aria-label="Latest scoring activity">
        <div className="ticker-track">
          <span className="ticker-item">
            <span className="text-gold">WSN MARKET</span>
            <span className="text-white/45">Waiting for opening bell...</span>
          </span>
        </div>
      </div>
    )
  }

  const displayList = events.length < 4 ? [...events, ...events, ...events] : [...events, ...events]
  const labels = displayList.map((event, index) => {
    const team = teams.find((item) => item.id === event.team_id)
    return (
      <span className="ticker-item" key={`${event.id}-${index}`}>
        <span className="text-white/55">{team?.ticker || "FIRM"}</span>
        <span className={event.type === "penalty" ? "text-loss" : "text-gain"}>
          {event.type === "penalty" ? "−" : "+"}
          {formatMoney(event.amount)}
        </span>
        <span className="text-white/35">
          {event.type === "penalty" ? "Penalty applied" : "Win bonus"}
        </span>
      </span>
    )
  })
  return (
    <div className="ticker" aria-label="Latest scoring activity">
      <div className="ticker-track">{labels}</div>
    </div>
  )
}

function Podium({
  teams,
  onTeam,
}: {
  teams: Team[]
  onTeam: (team: Team) => void
}) {
  if (!teams || teams.length === 0) {
    return null
  }
  const top3 = [teams[1], teams[0], teams[2]].filter(Boolean)
  return (
    <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
      {top3.map((team, index) => {
        const rank = index === 0 && teams[1] ? 2 : index === 1 || !teams[1] ? 1 : 3
        return (
          <motion.button
            whileHover={{ y: -5 }}
            onClick={() => onTeam(team)}
            className={`podium-card podium-${rank}`}
            key={team.id}
          >
            <div className="relative mx-auto mb-3 flex size-12 items-center justify-center rounded-full border border-gold/30 bg-gold/10 font-display text-xl text-gold sm:size-16">
              {team.name.charAt(0)}
              <span className="rank-badge">{rank}</span>
            </div>
            <p className="truncate text-sm font-semibold text-white sm:text-base">
              {team.name}
            </p>
            <p className="mt-1 font-mono text-xs text-gold sm:text-sm">
              {formatMoney(team.netWorth)}
            </p>
          </motion.button>
        )
      })}
    </div>
  )
}

const SectionTitle = ({
  eyebrow,
  title,
  copy,
}: {
  eyebrow: string
  title: string
  copy?: string
}) => (
  <div className="mx-auto mb-10 max-w-2xl text-center">
    <p className="eyebrow">{eyebrow}</p>
    <h2 className="section-title">{title}</h2>
    {copy && (
      <p className="mt-4 text-base leading-relaxed text-white/55">{copy}</p>
    )}
  </div>
)

function Landing({
  navigate,
  teams,
  events,
}: {
  navigate: (page: Page) => void
  teams: Team[]
  events: ScoreEvent[]
  openTeam: (team: Team) => void
}) {
  return (
    <main>
      <section className="hero-grid relative overflow-hidden pb-20 pt-36 lg:pb-28 lg:pt-44">
        <div className="orb orb-one" />
        <div className="orb orb-two" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 lg:grid-cols-[1.1fr_.9fr] lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/8 px-4 py-2 text-xs uppercase tracking-[0.2em] text-gold">
              <span className="live-dot" /> Markets open · 07 october 2026
            </div>
            <h1 className="hero-title">
              Make your first <span>million.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/60">
              Strategy, nerve, and a little market magic. Build your empire at
              EBEC's most ambitious entrepreneurship night.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button
                onClick={() => navigate("register")}
                className="px-6 py-3.5"
              >
                Register as participant <ArrowRight size={17} />
              </Button>
              <Button
                onClick={() => navigate("leaderboard")}
                variant="secondary"
                className="px-6 py-3.5"
              >
                View live market <Activity size={17} />
              </Button>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="relative"
          >
            <div className="hero-logo-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="hero-partner-logo">
                    <img
                      src={logo}
                      alt="EBEC"
                      className="size-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                      Presented by
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-white">
                      EBEC
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-gain/20 bg-gain/8 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gain">
                  <span className="live-dot bg-gain" /> Market live
                </div>
              </div>

              <div className="mt-9 flex items-end justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-white/35">
                    WSN Composite
                  </p>
                  <p className="mt-2 text-4xl font-semibold tracking-tight text-white">
                    $124,850
                  </p>
                  <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-gain">
                    <TrendingUp size={16} /> +24.85% tonight
                  </p>
                </div>
              </div>

              <div className="hero-chart">
                <div className="hero-chart-grid" />
                <svg
                  viewBox="0 0 520 190"
                  preserveAspectRatio="none"
                  className="relative z-10 h-full w-full overflow-visible"
                  aria-label="Animated rising stock market chart"
                >
                  <defs>
                    <linearGradient
                      id="heroChartFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#F5C542" stopOpacity=".3" />
                      <stop offset="100%" stopColor="#F5C542" stopOpacity="0" />
                    </linearGradient>
                    <filter id="heroChartGlow">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <motion.path
                    d="M0 175 C32 168 45 151 78 157 C108 162 125 124 158 133 C192 142 209 104 245 110 C278 116 300 73 335 84 C371 95 389 53 420 61 C456 70 478 30 520 18 L520 190 L0 190 Z"
                    fill="url(#heroChartFill)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1.2, delay: 0.55 }}
                  />
                  <motion.path
                    d="M0 175 C32 168 45 151 78 157 C108 162 125 124 158 133 C192 142 209 104 245 110 C278 116 300 73 335 84 C371 95 389 53 420 61 C456 70 478 30 520 18"
                    fill="none"
                    stroke="#F5C542"
                    strokeWidth="3"
                    strokeLinecap="round"
                    filter="url(#heroChartGlow)"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{
                      duration: 2.2,
                      ease: "easeInOut",
                      delay: 0.25,
                    }}
                  />
                  <motion.circle
                    cx="520"
                    cy="18"
                    r="5"
                    fill="#F5C542"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: [0, 1, 0.65, 1], scale: 1 }}
                    transition={{
                      opacity: { duration: 1.8, repeat: Infinity },
                      scale: { delay: 2.3 },
                    }}
                  />
                </svg>
                <div className="hero-chart-tag">
                  <ArrowUpRight size={13} /> New high
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-white/7 pt-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/25">
                    Wall Street Night
                  </p>
                  <p className="mt-1 text-xs text-white/55">
                    Entrepreneurship exchange
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="border-y border-white/6 bg-white/[0.015]">
        <div className="section-wrap">
          <SectionTitle eyebrow="The playbook" title="Your road to the top" />
          <div className="grid gap-4 md:grid-cols-3">
            {[
              [
                BriefcaseBusiness,
                "01",
                "Build your firm",
                "Register individually, get drafted into balanced trading syndicates, and claim starting capital.",
              ],
              [
                Gamepad2,
                "02",
                "Play the market",
                "Compete through high-stakes business games, pitches, and bonus rounds.",
              ],
              [
                Trophy,
                "03",
                "Ring the bell",
                "Grow your net worth. The richest portfolio takes the floor—and the glory.",
              ],
            ].map(([Icon, number, title, copy]) => {
              const CardIcon = Icon as typeof Trophy
              return (
                <motion.div
                  whileHover={{ y: -6 }}
                  className="glass-card p-7"
                  key={String(number)}
                >
                  <div className="mb-8 flex items-start justify-between">
                    <div className="icon-box">
                      <CardIcon size={21} />
                    </div>
                    <span className="font-display text-4xl text-gold/15">
                      {String(number)}
                    </span>
                  </div>
                  <h3 className="font-display text-2xl text-white">
                    {String(title)}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-white/50">
                    {String(copy)}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="section-wrap">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="eyebrow">Four markets. One winner.</p>
            <h2 className="section-title text-left">
              Think fast.
              <br />
              <span className="text-gold">Trade smarter.</span>
            </h2>
            <p className="mt-5 max-w-lg leading-relaxed text-white/55">
              From hostile takeovers to the pitch floor, every round tests a
              different business instinct. There are no spectators on Wall
              Street.
            </p>
            <Button
              variant="secondary"
              onClick={() => navigate("register")}
              className="mt-7"
            >
              Claim your seat <ArrowRight size={16} />
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              [BarChart3, "Market Mayhem", "Trade against the clock"],
              [Target, "The Big Pitch", "Sell the impossible"],
              [CircleDollarSign, "Capital Rush", "Invest with conviction"],
              [Sparkles, "Bonus Bell", "Expect the unexpected"],
            ].map(([Icon, name, copy], index) => {
              const GameIcon = Icon as typeof Trophy
              return (
                <div
                  className={`game-card ${index % 2 ? "sm:translate-y-6" : ""}`}
                  key={String(name)}
                >
                  <GameIcon size={22} className="text-gold" />
                  <h3 className="mt-5 font-display text-xl text-white">
                    {String(name)}
                  </h3>
                  <p className="mt-1 text-sm text-white/40">{String(copy)}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>
      <Ticker events={events} teams={teams} />
    </main>
  )
}

function Registration({
  navigate,
  onRegistered,
}: {
  navigate: (page: Page) => void
  onRegistered?: () => void
}) {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrors({})
    const data = new FormData(event.currentTarget)
    const fullName = String(data.get("fullName") || "").trim()
    const email = String(data.get("email") || "").trim().toLowerCase()

    const nextErrors: Record<string, string> = {}
    if (!fullName) nextErrors.fullName = "Tell us who you are."
    if (!email || !email.includes("@"))
      nextErrors.email = "Enter a valid email address."

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.from("participants").insert({
        full_name: fullName,
        email: email,
      })

      if (error) {
        if (
          error.code === "23505" ||
          error.message?.toLowerCase().includes("unique") ||
          error.message?.toLowerCase().includes("duplicate")
        ) {
          setErrors({ email: "This email is already registered." })
        } else {
          setErrors({
            general: error.message || "Registration failed. Please try again.",
          })
        }
      } else {
        setSubmitted(true)
        if (onRegistered) onRegistered()
      }
    } catch {
      setErrors({ general: "Network error. Please try again." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page-shell">
      <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
        <div className="grid overflow-hidden rounded-3xl border border-gold/15 bg-panel shadow-2xl lg:grid-cols-[.8fr_1.2fr]">
          <div className="register-art relative overflow-hidden p-8 lg:p-12">
            <div className="relative z-10">
              <p className="eyebrow">Secure your position</p>
              <h1 className="mt-4 font-display text-4xl leading-tight text-white lg:text-5xl">
                Your seat at the table{" "}
                <span className="text-gold">awaits.</span>
              </h1>
              <p className="mt-5 text-white/55">
                Individual registration. Equal syndicate distribution by the
                trading desk.
              </p>
            </div>
            <div className="relative z-10 mt-16 hidden lg:block">
              {[
                "Free entry",
                "Balanced trading syndicates",
                "Starting capital included ($100k)",
              ].map((item) => (
                <div
                  className="mb-3 flex items-center gap-3 text-sm text-white/65"
                  key={item}
                >
                  <span className="flex size-6 items-center justify-center rounded-full bg-gold/15 text-gold">
                    <Check size={13} />
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="p-6 sm:p-10 lg:p-12">
            <AnimatePresence mode="wait">
              {!submitted ? (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, y: -15 }}
                  onSubmit={submit}
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                    Registration desk
                  </p>
                  <h2 className="mt-2 font-display text-3xl text-white">
                    Open your account
                  </h2>

                  {errors.general && (
                    <div className="mt-4 rounded-xl border border-loss/25 bg-loss/10 p-3.5 text-sm text-loss">
                      {errors.general}
                    </div>
                  )}

                  <div className="mt-8 space-y-5">
                    <Field
                      label="Full name"
                      name="fullName"
                      placeholder="Jordan Belfort"
                      error={errors.fullName}
                      disabled={loading}
                    />
                    <Field
                      label="Email address"
                      name="email"
                      type="email"
                      placeholder="jordan@stratton.com"
                      error={errors.email}
                      disabled={loading}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="mt-8 w-full justify-center py-3.5"
                  >
                    {loading ? "Registering..." : "Enter the market"}{" "}
                    <ArrowRight size={17} />
                  </Button>
                  <p className="mt-4 text-center text-xs text-white/30">
                    By registering, you agree to play boldly and trade fairly.
                    Teams are assigned by the trading desk.
                  </p>
                </motion.form>
              ) : (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex min-h-96 flex-col items-center justify-center text-center"
                >
                  <Confetti />
                  <div className="flex size-20 items-center justify-center rounded-full border border-gold/25 bg-gold/10 text-gold">
                    <Check size={34} />
                  </div>
                  <h2 className="mt-6 font-display text-4xl text-white">
                    You're on the floor.
                  </h2>
                  <p className="mt-3 max-w-sm text-white/50">
                    Registration confirmed. Watch your inbox for the market
                    briefing and syndicate assignment.
                  </p>
                  <Button
                    onClick={() => navigate("leaderboard")}
                    className="mt-7"
                  >
                    Visit the market <ArrowRight size={16} />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </main>
  )
}

function Field({
  label,
  name,
  placeholder,
  type = "text",
  error,
  disabled = false,
}: {
  label: string
  name: string
  placeholder: string
  type?: string
  error?: string
  disabled?: boolean
}) {
  return (
    <label className="field-label">
      {label}
      <input
        className="field-control"
        name={name}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={Boolean(error)}
      />
      {error && <span className="field-error">{error}</span>}
    </label>
  )
}

function Confetti() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {Array.from({ length: 18 }).map((_, index) => (
        <motion.span
          key={index}
          className="absolute size-1.5 bg-gold"
          initial={{ x: `${30 + Math.random() * 40}%`, y: "45%", opacity: 1 }}
          animate={{
            x: `${Math.random() * 100}%`,
            y: "100%",
            rotate: 360,
            opacity: 0,
          }}
          transition={{ duration: 1.8 + Math.random(), delay: index * 0.04 }}
        />
      ))}
    </div>
  )
}

function Leaderboard({
  teams,
  events,
  openTeam,
  isAccessible,
  gameStatus = "setup",
  navigate,
}: {
  teams: Team[]
  events: ScoreEvent[]
  openTeam: (team: Team) => void
  isAccessible: boolean
  gameStatus?: GameStatus
  navigate: (page: Page) => void
}) {
  const [query, setQuery] = useState("")

  if (!isAccessible) {
    return (
      <main className="page-shell flex items-center justify-center px-5 py-20">
        <div className="mx-auto max-w-lg text-center">
          <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-2xl border border-gold/25 bg-gold/10 text-gold shadow-2xl">
            <LockKeyhole size={36} />
          </div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/8 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            <span className="live-dot bg-gold" /> Leaderboard Locked
          </div>
          <h1 className="font-display text-3xl font-semibold text-white sm:text-4xl">
            Leaderboard Currently Inaccessible
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/55">
            The ranking board is hidden until team registrations and syndicate
            assignments are completed.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button onClick={() => navigate("home")} variant="secondary">
              Return to Event
            </Button>
            <Button onClick={() => navigate("admin")}>
              Admin Control Desk <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      </main>
    )
  }

  const filtered = teams.filter((team) =>
    team.name.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <main className="page-shell">
      <section className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gain">
              {gameStatus === "ended" ? (
                <>
                  <span className="live-dot bg-gold" />
                  <span className="text-gold">Market Closed</span>
                  <span className="rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[10px] font-semibold text-gold">
                    Final results
                  </span>
                </>
              ) : (
                <>
                  <span className="live-dot bg-gain" /> Live market
                </>
              )}
            </div>
            <h1 className="font-display text-4xl text-white sm:text-5xl">
              {gameStatus === "ended" ? "Final Standings" : "The leaderboard"}
            </h1>
            <p className="mt-3 text-white/45">
              {gameStatus === "ended"
                ? "The market has closed. Final portfolio valuations are locked."
                : "Every point counts. Every position is live."}
            </p>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/3 px-4 py-3 text-right">
            <p className="text-[10px] uppercase tracking-widest text-white/30">
              Market status
            </p>
            {gameStatus === "ended" ? (
              <p className="mt-1 flex items-center gap-2 text-sm text-gold">
                <LockKeyhole size={14} className="text-gold" /> Final results locked
              </p>
            ) : (
              <p className="mt-1 flex items-center gap-2 text-sm text-white">
                <Activity size={14} className="text-gain" /> Realtime connected
              </p>
            )}
          </div>
        </div>
        <div className="mb-12 mx-auto max-w-4xl">
          <Podium teams={teams.slice(0, 3)} onTeam={openTeam} />
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/8 bg-panel">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/8 p-5">
            <div>
              <h2 className="font-display text-xl text-white">
                Market positions
              </h2>
              <p className="text-xs text-white/35">
                {gameStatus === "ended"
                  ? "Official final standings"
                  : "Updated in realtime"}
              </p>
            </div>
            <label className="search-box">
              <Search size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find a team"
                aria-label="Search teams"
              />
            </label>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div className="table-head hidden md:grid">
                <span>Rank</span>
                <span>Firm</span>
                <span>Last Action</span>
                <span className="text-right">Net worth</span>
                <span className="text-right">Changes</span>
              </div>
              <motion.div layout>
                {filtered.map((team, idx) => {
                  const currentRank = idx + 1
                  const initialRank = team.initialRank ?? currentRank
                  const lastAction = getLastAction(
                    team.id,
                    events,
                    team.lastAction,
                  )
                  const rankChange = getRankChange(initialRank, currentRank)

                  return (
                    <motion.button
                      layout
                      key={team.id}
                      onClick={() => openTeam(team)}
                      className="leader-row"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`rank-number ${
                            currentRank <= 3 ? "text-gold" : ""
                          }`}
                        >
                          {String(currentRank).padStart(2, "0")}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="team-avatar">{team.name.charAt(0)}</div>
                        <div className="text-left truncate">
                          <p className="font-medium text-white truncate">
                            {team.name}
                          </p>
                          <p className="text-xs text-white/30 truncate">
                            {team.ticker} · {team.members ?? 0} partners
                          </p>
                        </div>
                      </div>
                      <div className="text-left">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                            lastAction.type === "bonus"
                              ? "border border-gain/25 bg-gain/10 text-gain"
                              : lastAction.type === "penalty"
                                ? "border border-loss/25 bg-loss/10 text-loss"
                                : "border border-white/10 bg-white/5 text-white/60"
                          }`}
                        >
                          {lastAction.text}
                        </span>
                      </div>
                      <span className="text-right font-mono text-base font-semibold text-white">
                        {formatMoney(team.netWorth)}
                      </span>
                      <div className="text-right">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                            rankChange.diff > 0
                              ? "border border-gain/25 bg-gain/10 text-gain"
                              : rankChange.diff < 0
                                ? "border border-loss/25 bg-loss/10 text-loss"
                                : "border border-white/10 bg-white/5 text-white/40"
                          }`}
                        >
                          {rankChange.diff > 0 && <ArrowUpRight size={13} />}
                          {rankChange.diff < 0 && <ArrowDownRight size={13} />}
                          {rankChange.text}
                        </span>
                      </div>
                    </motion.button>
                  )
                })}
              </motion.div>
            </div>
          </div>
        </div>
      </section>
      <Ticker events={events} teams={teams} />
    </main>
  )
}

function TeamPage({
  team,
  participants,
  events,
}: {
  team: Team | null
  participants: Participant[]
  events: ScoreEvent[]
}) {
  if (!team) {
    return (
      <main className="page-shell flex items-center justify-center px-5 py-20">
        <p className="text-white/50">Select a team from the leaderboard.</p>
      </main>
    )
  }

  const teamEvents = events.filter((event) => event.team_id === team.id)
  const history = team.history && team.history.length > 1 ? team.history : [100, 100]
  const max = Math.max(...history, 101)
  const min = Math.min(...history, 99)
  const chartPath = history
    .map((value, index) => {
      const x = (index / Math.max(1, history.length - 1)) * 720
      const range = max - min || 1
      const y = 190 - ((value - min) / range) * 140
      return `${index === 0 ? "M" : "L"} ${x} ${y}`
    })
    .join(" ")

  const bonuses = teamEvents
    .filter((e) => e.type === "bonus")
    .reduce((sum, e) => sum + Number(e.amount), 0)
  const penalties = teamEvents
    .filter((e) => e.type === "penalty")
    .reduce((sum, e) => sum + Number(e.amount), 0)

  return (
    <main className="page-shell">
      <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div className="flex items-center gap-5">
            <div className="flex size-16 items-center justify-center rounded-2xl border border-gold/25 bg-gold/10 font-display text-3xl text-gold">
              {team.name.charAt(0)}
            </div>
            <div>
              <p className="eyebrow">Portfolio · {team.ticker}</p>
              <h1 className="font-display text-4xl text-white">{team.name}</h1>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs uppercase tracking-widest text-white/35">
              Current net worth
            </p>
            <p className="mt-1 font-mono text-3xl font-semibold text-gold">
              {formatMoney(team.netWorth)}
            </p>
          </div>
        </div>
        <div className="grid gap-5 lg:grid-cols-[1.5fr_.8fr]">
          <div className="glass-card p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-white/40">Portfolio performance</p>
                <p
                  className={`mt-1 text-sm ${
                    (team.change ?? 0) >= 0 ? "text-gain" : "text-loss"
                  }`}
                >
                  {(team.change ?? 0) >= 0 ? "▲" : "▼"}{" "}
                  {Math.abs(team.change ?? 0)}% tonight
                </p>
              </div>
              <span className="rounded-full bg-gain/10 px-3 py-1 text-xs text-gain">
                Market open
              </span>
            </div>
            <svg
              viewBox="0 0 720 220"
              className="mt-7 w-full overflow-visible"
              aria-label="Score history"
            >
              <defs>
                <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F5C542" stopOpacity=".26" />
                  <stop offset="100%" stopColor="#F5C542" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[50, 100, 150, 200].map((y) => (
                <line
                  key={y}
                  x1="0"
                  x2="720"
                  y1={y}
                  y2={y}
                  stroke="rgba(255,255,255,.06)"
                />
              ))}
              <path
                d={`${chartPath} L 720 220 L 0 220 Z`}
                fill="url(#chartFill)"
              />
              <path
                d={chartPath}
                fill="none"
                stroke="#F5C542"
                strokeWidth="3"
              />
            </svg>
            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-white/8 pt-5">
              <Metric
                label="Starting capital"
                value={formatMoney(team.starting_capital)}
              />
              <Metric label="Bonuses" value={`+${formatMoney(bonuses)}`} green />
              <Metric label="Penalties" value={`−${formatMoney(penalties)}`} />
            </div>
          </div>
          <div className="glass-card p-6">
            <h2 className="font-display text-xl text-white">
              Managing partners
            </h2>
            <div className="mt-5 space-y-4">
              {participants
                .filter((member) => member.team_id === team.id)
                .map((member, index) => (
                  <div className="flex items-center gap-3" key={member.id}>
                    <div className="member-avatar">
                      {member.full_name
                        .split(" ")
                        .map((part) => part[0])
                        .join("")}
                    </div>
                    <div>
                      <p className="text-sm text-white">{member.full_name}</p>
                      <p className="text-xs text-white/35">
                        {index === 0 ? "Managing partner" : "Partner"}
                      </p>
                    </div>
                  </div>
                ))}
              {participants.filter((m) => m.team_id === team.id).length === 0 && (
                <p className="text-xs text-white/40">
                  No partners assigned yet.
                </p>
              )}
            </div>
          </div>
          <div className="glass-card p-6 lg:col-span-2">
            <h2 className="font-display text-xl text-white">
              Recent transactions
            </h2>
            <div className="mt-4 divide-y divide-white/6">
              {teamEvents.map((event) => (
                <div
                  className="flex items-center justify-between gap-4 py-4"
                  key={event.id}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex size-9 items-center justify-center rounded-lg ${
                        event.type === "penalty"
                          ? "bg-loss/10 text-loss"
                          : "bg-gain/10 text-gain"
                      }`}
                    >
                      {event.type === "penalty" ? (
                        <ArrowDownRight size={17} />
                      ) : (
                        <ArrowUpRight size={17} />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-white">
                        {event.type === "penalty"
                          ? "Penalty applied"
                          : "Win bonus awarded"}
                      </p>
                      <p className="text-xs text-white/30">
                        {new Date(event.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`font-mono text-sm ${
                      event.type === "penalty" ? "text-loss" : "text-gain"
                    }`}
                  >
                    {event.type === "penalty" ? "−" : "+"}
                    {formatMoney(event.amount)}
                  </span>
                </div>
              ))}
              {teamEvents.length === 0 && (
                <p className="py-4 text-xs text-white/40">
                  No transactions recorded for this team.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

function Metric({
  label,
  value,
  green = false,
}: {
  label: string
  value: string
  green?: boolean
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-white/30">
        {label}
      </p>
      <p
        className={`mt-1 font-mono text-sm ${
          green ? "text-gain" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function Admin({
  teams,
  events,
  games,
  participants,
  isLeaderboardAccessible,
  gameStatus,
  refetchData,
}: {
  teams: Team[]
  events: ScoreEvent[]
  games: Game[]
  participants: Participant[]
  isLeaderboardAccessible: boolean
  gameStatus: GameStatus
  refetchData: () => Promise<void>
}) {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [tab, setTab] = useState<AdminTab>("overview")
  const [freeze, setFreeze] = useState(false)
  const [notice, setNotice] = useState("")
  const [loadingAction, setLoadingAction] = useState(false)

  // Verify auth session and admin status
  useEffect(() => {
    async function checkAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.user) {
        setAuthed(false)
        return
      }
      const { data, error } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", session.user.id)
        .maybeSingle()

      if (!error && data) {
        setAuthed(true)
      } else {
        setAuthed(false)
      }
    }
    checkAuth()
  }, [])

  if (authed === null) {
    return (
      <main className="page-shell flex items-center justify-center px-5 py-20">
        <p className="text-white/40">Verifying executive clearance...</p>
      </main>
    )
  }

  if (!authed) {
    return <AdminLogin onLogin={() => setAuthed(true)} />
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setAuthed(false)
  }

  const createEqualTeams = async () => {
    if (gameStatus !== "setup") {
      setNotice("⚠️ Game has already started. Teams cannot be created again.")
      return
    }
    setLoadingAction(true)
    try {
      const { error } = await supabase.rpc("create_equal_teams")
      if (error) {
        if (
          error.message?.toLowerCase().includes("already started") ||
          error.message?.toLowerCase().includes("cannot")
        ) {
          await refetchData()
          setNotice("⚠️ Game already started. Switching to active phase.")
        } else {
          setNotice(`⚠️ Error creating equal teams: ${error.message}`)
        }
      } else {
        await refetchData()
        setNotice(
          "🎲 Equal teams distributed randomly across alphabetical teams! Game is now live.",
        )
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.toLowerCase().includes("already started")) {
        await refetchData()
        setNotice("⚠️ Game already started.")
      } else {
        setNotice(`⚠️ Action failed: ${msg}`)
      }
    } finally {
      setLoadingAction(false)
    }
  }

  const endGame = async () => {
    if (gameStatus !== "live") {
      setNotice("⚠️ Cannot end game: Game is not currently live.")
      return
    }
    const confirmed = window.confirm(
      "End the game? Scoring will be locked and final results will be published.",
    )
    if (!confirmed) return

    setLoadingAction(true)
    try {
      const { error } = await supabase.rpc("end_game")
      if (error) {
        setNotice(`⚠️ Error ending game: ${error.message}`)
      } else {
        await refetchData()
        setNotice(
          "🏁 The game has ended. Scoring is locked and final standings are published.",
        )
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setNotice(`⚠️ Action failed: ${msg}`)
    } finally {
      setLoadingAction(false)
    }
  }

  const toggleLeaderboardAccess = async () => {
    if (gameStatus === "ended" && isLeaderboardAccessible) {
      setNotice("⚠️ Board Access cannot be locked once the game has ended.")
      return
    }
    const next = !isLeaderboardAccessible
    const { error } = await supabase
      .from("settings")
      .update({
        is_leaderboard_accessible: next,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1)

    if (error) {
      setNotice(`⚠️ Failed to update board access: ${error.message}`)
    } else {
      await refetchData()
      setNotice(
        next
          ? "🔓 Live leaderboard is now accessible to all participants."
          : "🔒 Live leaderboard is now locked.",
      )
    }
  }

  const addScore = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (gameStatus !== "live") {
      setNotice(
        gameStatus === "setup"
          ? "⚠️ Scoring opens when the game starts."
          : "⚠️ Scoring is locked because the game has ended.",
      )
      return
    }

    const form = new FormData(event.currentTarget)
    const teamId = String(form.get("team"))
    const gameId = String(form.get("game")) || null
    const amount = Number(form.get("amount"))
    const type = String(form.get("type")) as ScoreEvent["type"]

    const { error } = await supabase.from("score_events").insert({
      team_id: teamId,
      game_id: gameId,
      type,
      amount,
    })

    if (error) {
      setNotice(`⚠️ Failed to post score: ${error.message}`)
    } else {
      setNotice("Score posted to the live market.")
      event.currentTarget.reset()
      await refetchData()
    }
  }

  const undoLastScore = async () => {
    if (gameStatus !== "live") {
      setNotice("⚠️ Cannot undo transactions when game is not live.")
      return
    }
    if (!events.length) return
    const latest = events[0]
    const { error } = await supabase
      .from("score_events")
      .delete()
      .eq("id", latest.id)

    if (error) {
      setNotice(`⚠️ Failed to undo transaction: ${error.message}`)
    } else {
      setNotice("Latest transaction undone.")
      await refetchData()
    }
  }

  return (
    <main className="min-h-screen bg-admin pt-20">
      <div className="flex min-h-[calc(100vh-5rem)]">
        <aside className="hidden w-64 shrink-0 border-r border-white/7 bg-ink/70 p-5 lg:block">
          <p className="mb-5 px-3 text-[10px] uppercase tracking-[0.2em] text-white/25">
            Control room
          </p>
          <AdminNav tab={tab} setTab={setTab} />
          <div className="mt-8 border-t border-white/7 pt-6 space-y-4">
            <div className="rounded-xl border border-gold/15 bg-gold/5 p-4">
              <p className="flex items-center gap-2 text-xs text-gold">
                <ShieldCheck size={14} /> Admin session
              </p>
              <p className="mt-2 text-xs text-white/35">
                Phase: <span className="font-semibold uppercase text-gold">{gameStatus}</span>
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs text-white/60 hover:bg-white/5 hover:text-white transition"
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </aside>
        <div className="min-w-0 flex-1 p-5 sm:p-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="eyebrow">Executive desk</p>
                <h1 className="font-display text-3xl text-white capitalize">
                  {tab}
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-panel px-3 py-1.5 text-xs text-white/70">
                  <span>Board Access:</span>
                  <button
                    type="button"
                    onClick={toggleLeaderboardAccess}
                    disabled={gameStatus === "ended"}
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      isLeaderboardAccessible
                        ? "border border-gain/30 bg-gain/15 text-gain"
                        : "border border-gold/30 bg-gold/15 text-gold"
                    } ${gameStatus === "ended" ? "cursor-not-allowed opacity-80" : ""}`}
                  >
                    {isLeaderboardAccessible ? (
                      <>
                        <span className="live-dot bg-gain" /> Accessible
                      </>
                    ) : (
                      <>
                        <LockKeyhole size={12} /> Locked
                      </>
                    )}
                  </button>
                </div>

                {gameStatus === "setup" && (
                  <Button onClick={createEqualTeams} disabled={loadingAction}>
                    <Sparkles size={14} />
                    {loadingAction ? "Distributing..." : "Create Equal Teams"}
                  </Button>
                )}
                {gameStatus === "live" && (
                  <Button
                    variant="danger"
                    onClick={endGame}
                    disabled={loadingAction}
                  >
                    <LockKeyhole size={14} />
                    {loadingAction ? "Ending Game..." : "End Game"}
                  </Button>
                )}
                {gameStatus === "ended" && (
                  <button
                    disabled
                    className="btn btn-secondary opacity-60 cursor-not-allowed"
                  >
                    <Check size={14} /> Game Ended
                  </button>
                )}

                <button
                  aria-label="Freeze leaderboard"
                  aria-pressed={freeze}
                  onClick={() => setFreeze(!freeze)}
                  className={`toggle ${freeze ? "toggle-on" : ""}`}
                >
                  <span />
                </button>
                <button
                  onClick={handleSignOut}
                  className="lg:hidden inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs text-white/60 hover:text-white"
                >
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            </div>
            <div className="mb-6 overflow-x-auto lg:hidden">
              <div className="flex min-w-max gap-2">
                <AdminNav tab={tab} setTab={setTab} horizontal />
              </div>
            </div>
            {notice && (
              <div className="mb-5 flex items-center justify-between rounded-xl border border-gain/20 bg-gain/8 p-4 text-sm text-gain">
                <span className="flex items-center gap-2">
                  <Check size={16} />
                  {notice}
                </span>
                <button onClick={() => setNotice("")}>
                  <X size={15} />
                </button>
              </div>
            )}
            {tab === "overview" && (
              <AdminOverview
                teams={teams}
                events={events}
                games={games}
                participants={participants}
              />
            )}
            {tab === "teams" && (
              <TeamsPanel
                teams={teams}
                gameStatus={gameStatus}
                createEqualTeams={createEqualTeams}
                endGame={endGame}
                loadingAction={loadingAction}
                refetchData={refetchData}
              />
            )}
            {tab === "members" && (
              <MembersPanel
                teams={teams}
                participants={participants}
                refetchData={refetchData}
              />
            )}
            {tab === "scoring" && (
              <ScoringPanel
                teams={teams}
                games={games}
                events={events}
                gameStatus={gameStatus}
                onSubmit={addScore}
                undo={undoLastScore}
              />
            )}
            {tab === "games" && (
              <GamesPanel games={games} refetchData={refetchData} />
            )}
            {tab === "activity" && (
              <ActivityPanel events={events} teams={teams} />
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setLoading(true)
    const form = new FormData(event.currentTarget)
    const email = String(form.get("email") || "").trim()
    const password = String(form.get("password") || "")

    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        })

      if (authError) {
        setError(authError.message || "Invalid credentials.")
        setLoading(false)
        return
      }

      if (!authData.user) {
        setError("Sign in failed. No user returned.")
        setLoading(false)
        return
      }

      // Verify user is in admins table
      const { data: adminData, error: adminError } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", authData.user.id)
        .maybeSingle()

      if (adminError || !adminData) {
        await supabase.auth.signOut()
        setError("Access denied: You do not have administrator privileges.")
        setLoading(false)
        return
      }

      onLogin()
    } catch {
      setError("An unexpected error occurred during sign in.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page-shell flex items-center justify-center px-5 py-16">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-gold/15 bg-panel p-8 shadow-2xl"
      >
        <div className="icon-box mx-auto">
          <LockKeyhole size={20} />
        </div>
        <h1 className="mt-5 text-center font-display text-3xl text-white">
          Executive access
        </h1>
        <p className="mt-2 text-center text-sm text-white/40">
          Sign in with Supabase admin credentials.
        </p>

        {error && (
          <div className="mt-4 rounded-xl border border-loss/25 bg-loss/10 p-3 text-sm text-loss text-center">
            {error}
          </div>
        )}

        <div className="mt-7 space-y-4">
          <Field
            label="Admin email"
            name="email"
            type="email"
            placeholder="admin@ebec.org"
            disabled={loading}
          />
          <Field
            label="Password"
            name="password"
            type="password"
            placeholder="••••••••"
            disabled={loading}
          />
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="mt-7 w-full justify-center py-3.5"
        >
          {loading ? "Authenticating..." : "Enter control room"}{" "}
          <ArrowRight size={16} />
        </Button>
      </form>
    </main>
  )
}

const adminItems: [AdminTab, typeof BarChart3][] = [
  ["overview", BarChart3],
  ["teams", BriefcaseBusiness],
  ["members", Users],
  ["scoring", CircleDollarSign],
  ["games", Gamepad2],
  ["activity", Activity],
]

function AdminNav({
  tab,
  setTab,
  horizontal = false,
}: {
  tab: AdminTab
  setTab: (tab: AdminTab) => void
  horizontal?: boolean
}) {
  return (
    <>
      {adminItems.map(([item, Icon]) => (
        <button
          key={item}
          onClick={() => setTab(item)}
          className={`${horizontal ? "admin-tab-small" : "admin-tab"} ${
            tab === item ? "admin-tab-active" : ""
          }`}
        >
          <Icon size={16} />
          <span className="capitalize">{item}</span>
        </button>
      ))}
    </>
  )
}

function AdminOverview({
  teams,
  events,
  games,
  participants,
}: {
  teams: Team[]
  events: ScoreEvent[]
  games: Game[]
  participants: Participant[]
}) {
  const gamesPlayed = games.filter((g) => g.status === "done").length
  const totalBonuses = events
    .filter((item) => item.type === "bonus")
    .reduce((sum, item) => sum + Number(item.amount), 0)

  const kpis = [
    [BriefcaseBusiness, "Teams", teams.length, "Active syndicates"],
    [Users, "Participants", participants.length, "Registered"],
    [Gamepad2, "Games played", gamesPlayed, `of ${games.length} total`],
    [
      CircleDollarSign,
      "Bonuses awarded",
      formatMoney(totalBonuses),
      "Across all games",
    ],
  ]
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(([Icon, label, value, note]) => {
          const KpiIcon = Icon as typeof Trophy
          return (
            <div className="admin-card" key={String(label)}>
              <div className="flex items-center justify-between">
                <p className="text-xs text-white/40">{String(label)}</p>
                <KpiIcon size={17} className="text-gold" />
              </div>
              <p className="mt-4 font-display text-3xl text-white">
                {String(value)}
              </p>
              <p className="mt-1 text-xs text-gain">{String(note)}</p>
            </div>
          )
        })}
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <div className="admin-card">
          <h2 className="font-display text-xl text-white">Top firms</h2>
          <div className="mt-4 divide-y divide-white/6">
            {teams.slice(0, 5).map((team, index) => (
              <div
                className="flex items-center justify-between py-3"
                key={team.id}
              >
                <div className="flex items-center gap-3">
                  <span className="w-5 font-mono text-xs text-gold">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm text-white">{team.name}</p>
                    <p className="text-xs text-white/30">{team.ticker}</p>
                  </div>
                </div>
                <span className="font-mono text-sm text-white">
                  {formatMoney(team.netWorth)}
                </span>
              </div>
            ))}
            {teams.length === 0 && (
              <p className="py-4 text-xs text-white/30">No teams found.</p>
            )}
          </div>
        </div>
        <div className="admin-card">
          <h2 className="font-display text-xl text-white">Recent activity</h2>
          <div className="mt-4 space-y-4">
            {events.slice(0, 5).map((event) => (
              <div className="flex gap-3" key={event.id}>
                <span
                  className={`mt-1 size-2 shrink-0 rounded-full ${
                    event.type === "penalty" ? "bg-loss" : "bg-gain"
                  }`}
                />
                <div>
                  <p className="text-sm text-white/75">
                    {event.type === "penalty"
                      ? "Penalty applied"
                      : "Win bonus awarded"}
                  </p>
                  <p className="mt-0.5 text-xs text-white/25">
                    {new Date(event.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
            {events.length === 0 && (
              <p className="text-xs text-white/30">No activity yet.</p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function TeamsPanel({
  teams,
  gameStatus,
  createEqualTeams,
  endGame,
  loadingAction,
  refetchData,
}: {
  teams: Team[]
  gameStatus: GameStatus
  createEqualTeams: () => Promise<void>
  endGame: () => Promise<void>
  loadingAction: boolean
  refetchData: () => Promise<void>
}) {
  const [query, setQuery] = useState("")
  const [isAdding, setIsAdding] = useState(false)

  const handleAddTeam = async () => {
    if (gameStatus !== "setup") return
    const name = prompt("Enter new team name:")
    if (!name?.trim()) return
    const ticker =
      prompt("Enter team ticker (3-4 chars):")?.toUpperCase().trim() ||
      name.slice(0, 4).toUpperCase()

    setIsAdding(true)
    const { error } = await supabase.from("teams").insert({
      name: name.trim(),
      ticker: ticker,
      starting_capital: 100000,
    })
    setIsAdding(false)
    if (error) {
      alert(`Error creating team: ${error.message}`)
    } else {
      await refetchData()
    }
  }

  const handleRemoveTeam = async (id: string, name: string) => {
    if (gameStatus !== "setup") return
    if (!confirm(`Are you sure you want to delete team "${name}"?`)) return
    const { error } = await supabase.from("teams").delete().eq("id", id)
    if (error) {
      alert(`Error removing team: ${error.message}`)
    } else {
      await refetchData()
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gold/25 bg-gold/5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 font-display text-xl text-gold">
              {gameStatus === "setup" && (
                <>
                  <Sparkles size={20} /> Random Syndicate Equalization
                </>
              )}
              {gameStatus === "live" && (
                <>
                  <Activity size={20} /> Active Syndicate Session
                </>
              )}
              {gameStatus === "ended" && (
                <>
                  <Trophy size={20} /> Final Syndicate Standings
                </>
              )}
            </h3>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-white/60">
              {gameStatus === "setup" &&
                "Shuffles all registered participants randomly and assigns them into equal-sized teams. Teams are stacked in alphabetical order, score events are reset, and the leaderboard is unlocked."}
              {gameStatus === "live" && "Game in progress. Teams are locked."}
              {gameStatus === "ended" && "Final results. Scoring is locked."}
            </p>
          </div>
          {gameStatus === "setup" && (
            <Button onClick={createEqualTeams} disabled={loadingAction}>
              <Sparkles size={15} />{" "}
              {loadingAction ? "Distributing..." : "Create Equal Teams & Open Board"}
            </Button>
          )}
          {gameStatus === "live" && (
            <Button
              variant="danger"
              onClick={endGame}
              disabled={loadingAction}
            >
              <LockKeyhole size={15} />{" "}
              {loadingAction ? "Ending Game..." : "End Game"}
            </Button>
          )}
          {gameStatus === "ended" && (
            <button
              disabled
              className="btn btn-secondary opacity-60 cursor-not-allowed"
            >
              <Check size={15} /> Game Ended
            </button>
          )}
        </div>
      </div>
      <div className="admin-card">
        <div className="mb-5 flex flex-wrap justify-between gap-3">
          <label className="search-box">
            <Search size={15} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search firms"
            />
          </label>
          <Button
            onClick={handleAddTeam}
            disabled={isAdding || gameStatus !== "setup"}
            className={gameStatus !== "setup" ? "opacity-50 cursor-not-allowed" : ""}
          >
            <Plus size={15} /> New team
          </Button>
        </div>
        <div className="divide-y divide-white/6">
          {teams
            .filter((t) => t.name.toLowerCase().includes(query.toLowerCase()))
            .map((team) => (
              <div
                className="grid items-center gap-3 py-4 sm:grid-cols-[1fr_1fr_auto]"
                key={team.id}
              >
                <div>
                  <p className="text-sm text-white">{team.name}</p>
                  <p className="text-xs text-white/30">{team.ticker}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/25">
                    Starting capital
                  </p>
                  <p className="font-mono text-sm text-white/70">
                    {formatMoney(team.starting_capital)}
                  </p>
                </div>
                <Button
                  variant="danger"
                  disabled={gameStatus !== "setup"}
                  onClick={() => handleRemoveTeam(team.id, team.name)}
                >
                  Remove
                </Button>
              </div>
            ))}
          {teams.length === 0 && (
            <p className="py-6 text-center text-sm text-white/30">
              No teams available.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function MembersPanel({
  teams,
  participants,
  refetchData,
}: {
  teams: Team[]
  participants: Participant[]
  refetchData: () => Promise<void>
}) {
  const handleRemoveMember = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} from this syndicate?`)) return
    const { error } = await supabase
      .from("participants")
      .update({ team_id: null })
      .eq("id", id)

    if (error) {
      alert(`Error updating participant: ${error.message}`)
    } else {
      await refetchData()
    }
  }

  const handleAddParticipant = async (teamId: string) => {
    const name = prompt("Enter participant full name:")
    if (!name?.trim()) return
    const email = prompt("Enter participant email:")
    if (!email?.trim()) return

    const { error } = await supabase.from("participants").insert({
      full_name: name.trim(),
      email: email.trim().toLowerCase(),
      team_id: teamId,
    })

    if (error) {
      alert(`Error adding participant: ${error.message}`)
    } else {
      await refetchData()
    }
  }

  const unassigned = participants.filter((p) => !p.team_id)

  return (
    <div className="space-y-6">
      {unassigned.length > 0 && (
        <div className="admin-card border border-gold/20">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gold flex items-center gap-2">
              <Users size={16} /> Unassigned Participants ({unassigned.length})
            </h2>
            <span className="text-xs text-white/40">
              Will be allocated when Equal Teams is run
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {unassigned.map((member) => (
              <span
                key={member.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80"
              >
                {member.full_name}
                {member.email && (
                  <span className="text-white/30 text-[10px]">
                    ({member.email})
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {teams.map((team) => (
          <div className="admin-card" key={team.id}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium text-white">{team.name}</h2>
                <p className="text-xs text-white/30">{team.ticker}</p>
              </div>
              <button
                className="icon-button"
                aria-label="Add member"
                onClick={() => handleAddParticipant(team.id)}
              >
                <Plus size={15} />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {participants
                .filter((p) => p.team_id === team.id)
                .map((member) => (
                  <div
                    className="flex items-center justify-between"
                    key={member.id}
                  >
                    <div className="flex items-center gap-2">
                      <div className="member-avatar size-8 text-[10px]">
                        {member.full_name.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-white/65">
                          {member.full_name}
                        </span>
                        {member.email && (
                          <span className="text-[10px] text-white/30">
                            {member.email}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      className="text-white/25 hover:text-loss transition"
                      aria-label={`Remove ${member.full_name}`}
                      onClick={() =>
                        handleRemoveMember(member.id, member.full_name)
                      }
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              {participants.filter((p) => p.team_id === team.id).length === 0 && (
                <p className="text-xs text-white/30">No members in this syndicate.</p>
              )}
              <button
                onClick={() => handleAddParticipant(team.id)}
                className="flex items-center gap-2 text-xs text-gold hover:underline"
              >
                <Plus size={13} /> Add participant
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ScoringPanel({
  teams,
  games,
  events,
  gameStatus,
  onSubmit,
  undo,
}: {
  teams: Team[]
  games: Game[]
  events: ScoreEvent[]
  gameStatus: GameStatus
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  undo: () => void
}) {
  const isLive = gameStatus === "live"

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_.65fr]">
      <form onSubmit={onSubmit} className="admin-card">
        <h2 className="font-display text-xl text-white">Post a transaction</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="field-label">
            Team
            <select className="field-control" name="team" required disabled={!isLive}>
              {teams.map((t) => (
                <option value={t.id} key={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            Game
            <select className="field-control" name="game" disabled={!isLive}>
              {games.map((g) => (
                <option value={g.id} key={g.id}>
                  {g.name}
                </option>
              ))}
              <option value="">Bonus round / Other</option>
            </select>
          </label>
          <label className="field-label">
            Amount ($)
            <input
              className="field-control"
              name="amount"
              type="number"
              min="1"
              required
              placeholder="500"
              disabled={!isLive}
            />
          </label>
          <label className="field-label">
            Type
            <select className="field-control" name="type" required disabled={!isLive}>
              <option value="bonus">Bonus</option>
              <option value="penalty">Penalty</option>
            </select>
          </label>
        </div>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button type="submit" disabled={!isLive}>
            <Check size={16} /> Confirm score
          </Button>
          {!isLive && (
            <span className="text-xs text-gold/90 font-medium">
              {gameStatus === "setup"
                ? "Scoring opens when the game starts"
                : "Scoring is locked"}
            </span>
          )}
        </div>
      </form>
      <div className="admin-card">
        <h2 className="font-display text-xl text-white">Last action</h2>
        {events[0] ? (
          <div className="mt-5 rounded-xl border border-white/7 bg-white/2 p-4">
            <p className="text-sm text-white">
              {events[0].type === "penalty"
                ? "Penalty applied"
                : "Win bonus awarded"}
            </p>
            <p
              className={`mt-2 font-mono text-xl ${
                events[0].type === "penalty" ? "text-loss" : "text-gain"
              }`}
            >
              {events[0].type === "penalty" ? "−" : "+"}
              {formatMoney(events[0].amount)}
            </p>
            <p className="mt-1 text-xs text-white/25">
              {new Date(events[0].created_at).toLocaleTimeString()}
            </p>
          </div>
        ) : (
          <p className="mt-5 text-xs text-white/30">No transactions yet.</p>
        )}
        <Button
          variant="secondary"
          onClick={undo}
          disabled={!isLive || !events.length}
          className="mt-4 w-full justify-center"
        >
          Undo last action
        </Button>
        {!isLive && (
          <p className="mt-2 text-center text-xs text-white/40">
            {gameStatus === "setup"
              ? "Scoring opens when the game starts"
              : "Scoring is locked"}
          </p>
        )}
      </div>
    </div>
  )
}

function GamesPanel({
  games,
  refetchData,
}: {
  games: Game[]
  refetchData: () => Promise<void>
}) {
  const updateStatus = async (gameId: string, status: Game["status"]) => {
    const { error } = await supabase
      .from("games")
      .update({ status })
      .eq("id", gameId)

    if (error) {
      alert(`Error updating game: ${error.message}`)
    } else {
      await refetchData()
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {games.map((game) => (
        <div className="admin-card" key={game.id}>
          <div className="flex items-start justify-between">
            <div className="icon-box">
              <Gamepad2 size={18} />
            </div>
            <select
              value={game.status}
              onChange={(e) =>
                updateStatus(game.id, e.target.value as Game["status"])
              }
              className="status-select"
            >
              <option value="upcoming">Upcoming</option>
              <option value="live">Live</option>
              <option value="done">Done</option>
            </select>
          </div>
          <h2 className="mt-5 font-display text-xl text-white">{game.name}</h2>
          <p className="mt-1 text-sm text-white/35">
            {game.weight}× score multiplier
          </p>
        </div>
      ))}
    </div>
  )
}

function ActivityPanel({
  events,
  teams,
}: {
  events: ScoreEvent[]
  teams: Team[]
}) {
  const exportCsv = () => {
    const csv = [
      "team,type,amount,time",
      ...events.map(
        (e) =>
          `"${teams.find((t) => t.id === e.team_id)?.name || "Unknown"}",${e.type},${e.amount},${e.created_at}`,
      ),
    ].join("\n")
    const link = document.createElement("a")
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
    link.download = "wall-street-night-activity.csv"
    link.click()
  }

  return (
    <div className="admin-card">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl text-white">Audit trail</h2>
          <p className="text-xs text-white/30">All score events</p>
        </div>
        <Button
          variant="secondary"
          onClick={exportCsv}
          disabled={!events.length}
        >
          <Download size={15} /> Export CSV
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="border-b border-white/8 text-[10px] uppercase tracking-widest text-white/30">
            <tr>
              <th className="py-3">Time</th>
              <th>Team</th>
              <th>Type</th>
              <th className="text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/6">
            {events.map((event) => (
              <tr key={event.id}>
                <td className="py-4 text-white/35">
                  {new Date(event.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="text-white">
                  {teams.find((t) => t.id === event.team_id)?.name || "Unknown Firm"}
                </td>
                <td>
                  <span className="rounded-full bg-white/5 px-2 py-1 text-xs capitalize text-white/50">
                    {event.type}
                  </span>
                </td>
                <td
                  className={`text-right font-mono ${
                    event.type === "penalty" ? "text-loss" : "text-gain"
                  }`}
                >
                  {event.type === "penalty" ? "−" : "+"}
                  {formatMoney(event.amount)}
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-xs text-white/30">
                  No score events recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Footer({ navigate }: { navigate: (page: Page) => void }) {
  return (
    <footer className="border-t border-white/7 bg-[#071426]">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr] lg:px-8">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/35">
            A night for founders, dealmakers, and dreamers who know fortune
            favors the bold.
          </p>
        </div>
        <div>
          <p className="footer-title">The exchange</p>
          <div className="mt-4 space-y-2">
            {(["home", "leaderboard", "register", "admin"] as Page[]).map(
              (page) => (
                <button
                  className="footer-link block capitalize"
                  onClick={() => navigate(page)}
                  key={page}
                >
                  {page === "home" ? "The event" : page}
                </button>
              ),
            )}
          </div>
        </div>
      </div>
      <div className="border-t border-white/5 py-5 text-center text-xs text-white/20">
        © 2026 EBEC · Wall Street Night. Play smart.
      </div>
    </footer>
  )
}

export default function App() {
  const [page, setPage] = useState<Page>(pageFromPath)
  const [rawTeams, setRawTeams] = useState<Team[]>([])
  const [events, setEvents] = useState<ScoreEvent[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [isLeaderboardAccessible, setIsLeaderboardAccessible] =
    useState<boolean>(false)
  const [gameStatus, setGameStatus] = useState<GameStatus>("setup")
  const [, setLoadingInitial] = useState(true)

  // Navigation sync with browser history
  useEffect(() => {
    const onPop = () => setPage(pageFromPath())
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [])

  // Fetch all Supabase data
  const fetchData = async () => {
    try {
      const [
        teamsRes,
        eventsRes,
        gamesRes,
        participantsRes,
        settingsRes,
      ] = await Promise.all([
        supabase.from("teams").select("*").order("name"),
        supabase
          .from("score_events")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("games").select("*").order("created_at"),
        supabase.from("participants").select("*"),
        supabase
          .from("settings")
          .select("is_leaderboard_accessible, game_status")
          .eq("id", 1)
          .maybeSingle(),
      ])

      if (teamsRes.data) setRawTeams(teamsRes.data)
      if (eventsRes.data) setEvents(eventsRes.data)
      if (gamesRes.data) setGames(gamesRes.data)

      if (participantsRes.data) {
        setParticipants(participantsRes.data)
      } else if (participantsRes.error) {
        // If RLS restricted emails for anon, fallback to public view
        const { data: pubPart } = await supabase
          .from("public_participants")
          .select("*")
        if (pubPart) setParticipants(pubPart)
      }

      if (settingsRes.data) {
        setIsLeaderboardAccessible(
          Boolean(settingsRes.data.is_leaderboard_accessible),
        )
        if (settingsRes.data.game_status) {
          setGameStatus(settingsRes.data.game_status as GameStatus)
        }
      }
    } catch (err) {
      console.error("Error loading Supabase data:", err)
    } finally {
      setLoadingInitial(false)
    }
  }

  // Initial load
  useEffect(() => {
    fetchData()
  }, [])

  // Realtime subscription on score_events, teams, participants, games, settings
  useEffect(() => {
    const channel = supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "score_events" },
        () => {
          fetchData()
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teams" },
        () => {
          fetchData()
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "participants" },
        () => {
          fetchData()
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "games" },
        () => {
          fetchData()
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "settings" },
        (payload) => {
          if (payload.new) {
            if ("is_leaderboard_accessible" in payload.new) {
              setIsLeaderboardAccessible(
                Boolean(payload.new.is_leaderboard_accessible),
              )
            }
            if ("game_status" in payload.new && payload.new.game_status) {
              setGameStatus(payload.new.game_status as GameStatus)
            }
          }
          fetchData()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const navigate = (next: Page) => {
    window.history.pushState({}, "", paths[next])
    setPage(next)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const openTeam = (team: Team) => {
    setSelectedTeam(team)
    navigate("team")
  }

  // Build full enriched teams with netWorth, member count, history, and change
  const enrichedTeams = useMemo(() => {
    const alphabetical = [...rawTeams].sort((a, b) =>
      a.name.localeCompare(b.name),
    )

    return rawTeams.map((team) => {
      const netWorth = calculateNetWorth(team, events)
      const memberCount = participants.filter(
        (p) => p.team_id === team.id,
      ).length

      const starting = Number(team.starting_capital) || 100000
      const change =
        starting > 0
          ? Number((((netWorth - starting) / starting) * 100).toFixed(2))
          : 0

      // Reconstruct progressive history for chart
      const teamEventsAsc = events
        .filter((e) => e.team_id === team.id)
        .slice()
        .reverse()

      let running = starting
      const history = [100]
      for (const ev of teamEventsAsc) {
        running += ev.type === "penalty" ? -Number(ev.amount) : Number(ev.amount)
        history.push(Math.round((running / starting) * 100))
      }
      if (history.length === 1) history.push(100)

      const initialRank =
        alphabetical.findIndex((t) => t.id === team.id) + 1 || 1

      return {
        ...team,
        members: memberCount,
        netWorth,
        change,
        history,
        initialRank,
        lastAction: getLastAction(team.id, events).text,
      }
    })
  }, [rawTeams, events, participants])

  // Ranked teams by Net Worth descending
  const rankedTeams = useMemo(() => {
    return [...enrichedTeams].sort((a, b) => {
      if (b.netWorth !== a.netWorth) {
        return (b.netWorth ?? 0) - (a.netWorth ?? 0)
      }
      return a.name.localeCompare(b.name)
    })
  }, [enrichedTeams])

  // Sync selectedTeam with latest enriched data
  const currentSelectedTeam = useMemo(() => {
    if (selectedTeam) {
      return (
        enrichedTeams.find((t) => t.id === selectedTeam.id) || selectedTeam
      )
    }
    return enrichedTeams[0] || null
  }, [selectedTeam, enrichedTeams])

  return (
    <div className="min-h-screen bg-ink text-white">
      <Navbar
        navigate={navigate}
        isLeaderboardAccessible={isLeaderboardAccessible}
      />
      {page === "home" && (
        <Landing
          navigate={navigate}
          teams={rankedTeams}
          events={events}
          openTeam={openTeam}
        />
      )}
      {page === "register" && (
        <Registration navigate={navigate} onRegistered={fetchData} />
      )}
      {page === "leaderboard" && (
        <Leaderboard
          teams={rankedTeams}
          events={events}
          openTeam={openTeam}
          isAccessible={isLeaderboardAccessible}
          gameStatus={gameStatus}
          navigate={navigate}
        />
      )}
      {page === "team" && (
        <TeamPage
          team={currentSelectedTeam}
          participants={participants}
          events={events}
        />
      )}
      {page === "admin" && (
        <Admin
          teams={rankedTeams}
          events={events}
          games={games}
          participants={participants}
          isLeaderboardAccessible={isLeaderboardAccessible}
          gameStatus={gameStatus}
          refetchData={fetchData}
        />
      )}
      {page !== "admin" && <Footer navigate={navigate} />}
    </div>
  )
}
