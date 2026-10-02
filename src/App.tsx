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
  Clock3,
  Download,
  Gamepad2,
  LockKeyhole,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Users,
  WalletCards,
  X,
} from "lucide-react"
import logo from "./imports/ebecLogo.jpg"
import {
  Game,
  Participant,
  ScoreEvent,
  Team,
  calculateNetWorth,
  formatMoney,
  getLastAction,
  getRankChange,
  mockEvents,
  mockGames,
  mockParticipants,
  mockTeams,
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
  team: "/team/1",
  admin: "/admin",
}

function Button({
  children,
  onClick,
  variant = "primary",
  type = "button",
  className = "",
}: {
  children: ReactNode
  onClick?: () => void
  variant?: "primary" | "secondary" | "ghost" | "danger"
  type?: "button" | "submit"
  className?: string
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`btn btn-${variant} ${className}`}
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
        <span className="ml-1 font-display text-lg text-gold">
          Night
        </span>
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

function Ticker({ events }: { events: ScoreEvent[] }) {
  const labels = [...events, ...events].map((event, index) => {
    const team = mockTeams.find((item) => item.id === event.team_id)
    return (
      <span className="ticker-item" key={`${event.id}-${index}`}>
        <span className="text-white/55">{team?.ticker}</span>
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
  const order = [teams[1], teams[0], teams[2]]
  return (
    <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
      {order.map((team, index) => {
        const rank = index === 0 ? 2 : index === 1 ? 1 : 3
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
  openTeam,
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
                Register your team <ArrowRight size={17} />
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
                    <linearGradient id="heroChartFill" x1="0" y1="0" x2="0" y2="1">
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
                    transition={{ duration: 2.2, ease: "easeInOut", delay: 0.25 }}
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
                "Register your team, pick a sharp name, and claim your starting capital.",
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
      <Ticker events={events} />
    </main>
  )
}

function Registration({
  teams,
  navigate,
}: {
  teams: Team[]
  navigate: (page: Page) => void
}) {
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const nextErrors: Record<string, string> = {}
    if (!data.get("fullName")) nextErrors.fullName = "Tell us who you are."
    if (!String(data.get("email")).includes("@"))
      nextErrors.email = "Enter a valid email."
    if (!data.get("team")) nextErrors.team = "Choose or create a team."
    setErrors(nextErrors)
    if (!Object.keys(nextErrors).length) setSubmitted(true)
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
                One form. One team. One shot at the top.
              </p>
            </div>
            <div className="relative z-10 mt-16 hidden lg:block">
              {["Free entry", "Teams of 3–5", "Starting capital included"].map(
                (item) => (
                  <div
                    className="mb-3 flex items-center gap-3 text-sm text-white/65"
                    key={item}
                  >
                    <span className="flex size-6 items-center justify-center rounded-full bg-gold/15 text-gold">
                      <Check size={13} />
                    </span>
                    {item}
                  </div>
                ),
              )}
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
                  <div className="mt-8 space-y-5">
                    <Field
                      label="Full name"
                      name="fullName"
                      placeholder="Jordan Belfort"
                      error={errors.fullName}
                    />
                    <Field
                      label="Email address"
                      name="email"
                      type="email"
                      placeholder="jordan@stratton.com"
                      error={errors.email}
                    />
                    <label className="field-label">
                      Team name
                      <select
                        name="team"
                        className="field-control"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Join an existing team
                        </option>
                        {teams.map((team) => (
                          <option value={team.id} key={team.id}>
                            {team.name}
                          </option>
                        ))}
                        <option value="new">+ Create a new team</option>
                      </select>
                      {errors.team && (
                        <span className="field-error">{errors.team}</span>
                      )}
                    </label>
                  </div>
                  <Button
                    type="submit"
                    className="mt-8 w-full justify-center py-3.5"
                  >
                    Enter the market <ArrowRight size={17} />
                  </Button>
                  <p className="mt-4 text-center text-xs text-white/30">
                    By registering, you agree to play boldly and trade fairly.
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
                    briefing.
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
}: {
  label: string
  name: string
  placeholder: string
  type?: string
  error?: string
}) {
  return (
    <label className="field-label">
      {label}
      <input
        className="field-control"
        name={name}
        type={type}
        placeholder={placeholder}
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
  navigate,
}: {
  teams: Team[]
  events: ScoreEvent[]
  openTeam: (team: Team) => void
  isAccessible: boolean
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
            The ranking board is hidden until team registration are completed.
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
              <span className="live-dot bg-gain" /> Live market
            </div>
            <h1 className="font-display text-4xl text-white sm:text-5xl">
              The leaderboard
            </h1>
            <p className="mt-3 text-white/45">
              Every point counts. Every position is live.
            </p>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/3 px-4 py-3 text-right">
            <p className="text-[10px] uppercase tracking-widest text-white/30">
              Market status
            </p>
            <p className="mt-1 flex items-center gap-2 text-sm text-white">
              <Activity size={14} className="text-gain" /> Realtime connected
            </p>
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
              <p className="text-xs text-white/35">Updated just now</p>
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
                {filtered.map((team) => {
                  const currentRankIndex = teams.findIndex(
                    (t) => t.id === team.id,
                  )
                  const currentRank =
                    currentRankIndex !== -1 ? currentRankIndex + 1 : 1
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
                            {team.ticker} · {team.members} partners
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
      <Ticker events={events} />
    </main>
  )
}

function TeamPage({
  team,
  participants,
  events,
}: {
  team: Team
  participants: Participant[]
  events: ScoreEvent[]
}) {
  const teamEvents = events.filter((event) => event.team_id === team.id)
  const max = Math.max(...team.history)
  const min = Math.min(...team.history)
  const chartPath = team.history
    .map((value, index) => {
      const x = (index / (team.history.length - 1)) * 720
      const y = 190 - ((value - min) / (max - min)) * 140
      return `${index === 0 ? "M" : "L"} ${x} ${y}`
    })
    .join(" ")
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
                <p className="mt-1 text-sm text-gain">
                  ▲ {team.change}% tonight
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
              <Metric label="Bonuses" value="+$24,850" green />
              <Metric label="Penalties" value="−$1,100" />
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
  setIsLeaderboardAccessible,
  setTeams,
  setEvents,
  setGames,
  setParticipants,
}: {
  teams: Team[]
  events: ScoreEvent[]
  games: Game[]
  participants: Participant[]
  isLeaderboardAccessible: boolean
  setIsLeaderboardAccessible: (acc: boolean) => void
  setTeams: React.Dispatch<React.SetStateAction<Team[]>>
  setEvents: React.Dispatch<React.SetStateAction<ScoreEvent[]>>
  setGames: React.Dispatch<React.SetStateAction<Game[]>>
  setParticipants: React.Dispatch<React.SetStateAction<Participant[]>>
}) {
  const [authed, setAuthed] = useState(false)
  const [tab, setTab] = useState<AdminTab>("overview")
  const [freeze, setFreeze] = useState(false)
  const [notice, setNotice] = useState("")
  if (!authed) return <AdminLogin onLogin={() => setAuthed(true)} />

  const createRandomTeams = () => {
    const presetTeams = [
      { name: "Apex Capital", ticker: "APEX" },
      { name: "Blue Chip Syndicate", ticker: "BLUE" },
      { name: "Bull & Bear Co.", ticker: "BBCO" },
      { name: "Cash Flow Kings", ticker: "CFKG" },
      { name: "Golden Wolves", ticker: "GWLF" },
      { name: "Margin Callers", ticker: "MRGN" },
      { name: "The Rainmakers", ticker: "RAIN" },
      { name: "Venture Vultures", ticker: "VVCO" },
    ]

    // Sort team presets strictly alphabetically
    const sortedPresets = [...presetTeams].sort((a, b) =>
      a.name.localeCompare(b.name),
    )

    // Fisher-Yates shuffle participants randomly
    const shuffled = [...participants]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    const numTeams = sortedPresets.length
    const newParticipants: Participant[] = []
    const newTeams: Team[] = []

    const perTeam = Math.floor(shuffled.length / numTeams)
    const remainder = shuffled.length % numTeams

    let pIdx = 0
    sortedPresets.forEach((preset, index) => {
      const teamId = String(index + 1)
      const count = perTeam + (index < remainder ? 1 : 0)

      for (let c = 0; c < count; c++) {
        if (pIdx < shuffled.length) {
          newParticipants.push({
            ...shuffled[pIdx],
            team_id: teamId,
          })
          pIdx++
        }
      }

      newTeams.push({
        id: teamId,
        name: preset.name,
        ticker: preset.ticker,
        starting_capital: 100000,
        created_at: new Date().toISOString(),
        members: count,
        netWorth: 100000,
        change: 0,
        history: [100, 100],
        initialRank: index + 1, // Stacked 1..N in alphabetical order
        lastAction: "Registered",
      })
    })

    setTeams(newTeams)
    setParticipants(newParticipants)
    setEvents([])
    setIsLeaderboardAccessible(true)
    setNotice(
      "🎲 Created equal teams randomly & initialized in alphabetical order! Leaderboard is now accessible.",
    )
  }

  const addScore = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const teamId = String(form.get("team"))
    const amount = Number(form.get("amount"))
    const type = String(form.get("type")) as ScoreEvent["type"]
    const score: ScoreEvent = {
      id: crypto.randomUUID(),
      team_id: teamId,
      game_id: String(form.get("game")) || null,
      type,
      amount,
      created_at: new Date().toISOString(),
    }
    setEvents((current) => [score, ...current])
    setNotice("Score posted to the live market.")
    event.currentTarget.reset()
  }

  return (
    <main className="min-h-screen bg-admin pt-20">
      <div className="flex min-h-[calc(100vh-5rem)]">
        <aside className="hidden w-64 shrink-0 border-r border-white/7 bg-ink/70 p-5 lg:block">
          <p className="mb-5 px-3 text-[10px] uppercase tracking-[0.2em] text-white/25">
            Control room
          </p>
          <AdminNav tab={tab} setTab={setTab} />
          <div className="mt-8 border-t border-white/7 pt-6">
            <div className="rounded-xl border border-gold/15 bg-gold/5 p-4">
              <p className="flex items-center gap-2 text-xs text-gold">
                <ShieldCheck size={14} /> Admin session
              </p>
              <p className="mt-2 text-xs text-white/35">
                Realtime controls are active.
              </p>
            </div>
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
                    onClick={() =>
                      setIsLeaderboardAccessible(!isLeaderboardAccessible)
                    }
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      isLeaderboardAccessible
                        ? "border border-gain/30 bg-gain/15 text-gain"
                        : "border border-gold/30 bg-gold/15 text-gold"
                    }`}
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
                <Button onClick={createRandomTeams}>
                  <Sparkles size={14} /> Create Equal Teams
                </Button>
                <button
                  aria-label="Freeze leaderboard"
                  aria-pressed={freeze}
                  onClick={() => setFreeze(!freeze)}
                  className={`toggle ${freeze ? "toggle-on" : ""}`}
                >
                  <span />
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
                participants={participants}
              />
            )}
            {tab === "teams" && (
              <TeamsPanel
                teams={teams}
                setTeams={setTeams}
                createRandomTeams={createRandomTeams}
              />
            )}
            {tab === "members" && (
              <MembersPanel teams={teams} participants={participants} />
            )}
            {tab === "scoring" && (
              <ScoringPanel
                teams={teams}
                games={games}
                events={events}
                onSubmit={addScore}
                undo={() => setEvents((current) => current.slice(1))}
              />
            )}
            {tab === "games" && (
              <GamesPanel games={games} setGames={setGames} />
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
  return (
    <main className="page-shell flex items-center justify-center px-5 py-16">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          onLogin()
        }}
        className="w-full max-w-md rounded-2xl border border-gold/15 bg-panel p-8 shadow-2xl"
      >
        <div className="icon-box mx-auto">
          <LockKeyhole size={20} />
        </div>
        <h1 className="mt-5 text-center font-display text-3xl text-white">
          Executive access
        </h1>
        <p className="mt-2 text-center text-sm text-white/40">
          Sign in to manage tonight's market.
        </p>
        <div className="mt-7 space-y-4">
          <Field
            label="Admin email"
            name="email"
            type="email"
            placeholder="admin@ebec.org"
          />
          <Field
            label="Password"
            name="password"
            type="password"
            placeholder="••••••••"
          />
        </div>
        <Button type="submit" className="mt-7 w-full justify-center py-3.5">
          Enter control room <ArrowRight size={16} />
        </Button>
        <p className="mt-4 text-center text-[11px] text-white/25">
          Preview mode · any credentials accepted
        </p>
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
  participants,
}: {
  teams: Team[]
  events: ScoreEvent[]
  participants: Participant[]
}) {
  const kpis = [
    [BriefcaseBusiness, "Teams", teams.length, "+2 tonight"],
    [Users, "Participants", participants.length, "Registered"],
    [Gamepad2, "Games played", 3, `of ${mockGames.length} total`],
    [
      CircleDollarSign,
      "Bonuses awarded",
      formatMoney(
        events
          .filter((item) => item.type === "bonus")
          .reduce((sum, item) => sum + item.amount, 0),
      ),
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
          </div>
        </div>
      </div>
    </>
  )
}

function TeamsPanel({
  teams,
  setTeams,
  createRandomTeams,
}: {
  teams: Team[]
  setTeams: React.Dispatch<React.SetStateAction<Team[]>>
  createRandomTeams: () => void
}) {
  const [query, setQuery] = useState("")
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gold/25 bg-gold/5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 font-display text-xl text-gold">
              <Sparkles size={20} /> Random Team Equalization & Initialization
            </h3>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-white/60">
              Shuffles all registered participants randomly and assigns them into equal-sized teams. Teams are stacked in <strong>alphabetical order</strong> with initial rank, starting capital ($100,000), "Registered" action, and zero rank changes.
            </p>
          </div>
          <Button onClick={createRandomTeams}>
            <Sparkles size={15} /> Create Equal Teams Randomly & Open Board
          </Button>
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
            onClick={() =>
              setTeams((current) => [
                ...current,
                {
                  id: crypto.randomUUID(),
                  name: "New Venture",
                  ticker: "NVCO",
                  starting_capital: 100000,
                  created_at: new Date().toISOString(),
                  members: 0,
                  netWorth: 100000,
                  change: 0,
                  history: [100, 100],
                  initialRank: current.length + 1,
                  lastAction: "Registered",
                },
              ])
            }
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
                  onClick={() =>
                    setTeams((current) =>
                      current.filter((item) => item.id !== team.id),
                    )
                  }
                >
                  Remove
                </Button>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

function MembersPanel({
  teams,
  participants,
}: {
  teams: Team[]
  participants: Participant[]
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {teams.slice(0, 6).map((team) => (
        <div className="admin-card" key={team.id}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-white">{team.name}</h2>
              <p className="text-xs text-white/30">{team.ticker}</p>
            </div>
            <button className="icon-button" aria-label="Add member">
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
                    <span className="text-sm text-white/65">
                      {member.full_name}
                    </span>
                  </div>
                  <button
                    className="text-white/25 hover:text-loss"
                    aria-label={`Remove ${member.full_name}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            <button className="flex items-center gap-2 text-xs text-gold">
              <Plus size={13} /> Add participant
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function ScoringPanel({
  teams,
  games,
  events,
  onSubmit,
  undo,
}: {
  teams: Team[]
  games: Game[]
  events: ScoreEvent[]
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  undo: () => void
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_.65fr]">
      <form onSubmit={onSubmit} className="admin-card">
        <h2 className="font-display text-xl text-white">Post a transaction</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="field-label">
            Team
            <select className="field-control" name="team">
              {teams.map((t) => (
                <option value={t.id} key={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            Game
            <select className="field-control" name="game">
              {games.map((g) => (
                <option value={g.id} key={g.id}>
                  {g.name}
                </option>
              ))}
              <option value="">Bonus round</option>
            </select>
          </label>
          <label className="field-label">
            Amount
            <input
              className="field-control"
              name="amount"
              type="number"
              min="1"
              required
              placeholder="500"
            />
          </label>
          <label className="field-label">
            Type
            <select className="field-control" name="type">
              <option value="bonus">Bonus</option>
              <option value="penalty">Penalty</option>
            </select>
          </label>
        </div>
        <Button type="submit" className="mt-6">
          <Check size={16} /> Confirm score
        </Button>
      </form>
      <div className="admin-card">
        <h2 className="font-display text-xl text-white">Last action</h2>
        {events[0] && (
          <div className="mt-5 rounded-xl border border-white/7 bg-white/2 p-4">
            <p className="text-sm text-white">
              {events[0].type === "penalty"
                ? "Penalty applied"
                : "Win bonus awarded"}
            </p>
            <p className="mt-2 font-mono text-xl text-gain">
              +{formatMoney(events[0].amount)}
            </p>
            <p className="mt-1 text-xs text-white/25">
              {new Date(events[0].created_at).toLocaleTimeString()}
            </p>
          </div>
        )}
        <Button
          variant="secondary"
          onClick={undo}
          className="mt-4 w-full justify-center"
        >
          Undo last action
        </Button>
      </div>
    </div>
  )
}

function GamesPanel({
  games,
  setGames,
}: {
  games: Game[]
  setGames: React.Dispatch<React.SetStateAction<Game[]>>
}) {
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
                setGames((current) =>
                  current.map((item) =>
                    item.id === game.id
                      ? { ...item, status: e.target.value as Game["status"] }
                      : item,
                  ),
                )
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
          `${teams.find((t) => t.id === e.team_id)?.name},${e.type},${e.amount},${e.created_at}`,
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
        <Button variant="secondary" onClick={exportCsv}>
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
                  {teams.find((t) => t.id === event.team_id)?.name}
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
  const [teams, setTeams] = useState<Team[]>(mockTeams)
  const [events, setEvents] = useState<ScoreEvent[]>(mockEvents)
  const [games, setGames] = useState<Game[]>(mockGames)
  const [participants, setParticipants] =
    useState<Participant[]>(mockParticipants)
  const [selectedTeam, setSelectedTeam] = useState<Team>(mockTeams[0])
  const [isLeaderboardAccessible, setIsLeaderboardAccessible] =
    useState<boolean>(false)

  useEffect(() => {
    const onPop = () => setPage(pageFromPath())
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [])

  useEffect(() => {
    if (page !== "leaderboard" || !isLeaderboardAccessible) return
    const timer = window.setInterval(() => {
      setTeams((current) =>
        current.map((team, index) =>
          index === 2
            ? {
                ...team,
                netWorth: team.netWorth + 100,
                history: [...team.history.slice(-6), team.netWorth + 100],
              }
            : team,
        ),
      )
    }, 5000)
    return () => window.clearInterval(timer)
  }, [page, isLeaderboardAccessible])

  const navigate = (next: Page) => {
    window.history.pushState({}, "", paths[next])
    setPage(next)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const openTeam = (team: Team) => {
    setSelectedTeam(team)
    navigate("team")
  }

  const rankedTeams = useMemo(
    () =>
      [...teams]
        .map((team) => ({
          ...team,
          netWorth: calculateNetWorth(team, events),
        }))
        .sort((a, b) => {
          if (b.netWorth !== a.netWorth) {
            return b.netWorth - a.netWorth
          }
          return a.name.localeCompare(b.name)
        }),
    [teams, events],
  )

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
        <Registration teams={teams} navigate={navigate} />
      )}
      {page === "leaderboard" && (
        <Leaderboard
          teams={rankedTeams}
          events={events}
          openTeam={openTeam}
          isAccessible={isLeaderboardAccessible}
          navigate={navigate}
        />
      )}
      {page === "team" && (
        <TeamPage
          team={selectedTeam}
          participants={participants}
          events={events}
        />
      )}
      {page === "admin" && (
        <Admin
          teams={teams}
          events={events}
          games={games}
          participants={participants}
          isLeaderboardAccessible={isLeaderboardAccessible}
          setIsLeaderboardAccessible={setIsLeaderboardAccessible}
          setTeams={setTeams}
          setEvents={setEvents}
          setGames={setGames}
          setParticipants={setParticipants}
        />
      )}
      {page !== "admin" && <Footer navigate={navigate} />}
    </div>
  )
}
