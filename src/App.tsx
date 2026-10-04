import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
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
  CalendarClock,
  CircleDollarSign,
  Download,
  Gamepad2,
  LockKeyhole,
  LogOut,
  Menu,
  Plus,
  Printer,
  QrCode,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Users,
  X,
} from "lucide-react"
import QRCode from "qrcode"
import logo from "./imports/ebecLogo.jpg"
import { supabase } from "./utils/supabase"
import {
  DEFAULT_CHECKIN_OPENS_AT,
  DEFAULT_REGISTRATION_OPENS_AT,
  DEFAULT_STARTING_CAPITAL,
  Game,
  GameStatus,
  GroupAssignment,
  GroupRound,
  Participant,
  ParticipantCategory,
  Player, // instead of team approach
  PlayerBalance,
  Transaction,
  formatMoney,
  formatSigned,
  getLastAction,
  groupLabel,
  makeGroups,
  normalizeCode,
  playerSubtitle,
  rankPlayers,
  splitGroups,
} from "./data"

type Page = "home" | "register" | "leaderboard" | "portfolio" | "admin"
type AdminTab =
  | "overview"
  | "players"
  | "groups"
  | "scoring"
  | "games"
  | "activity"
  | "poster"

const pageFromPath = (): Page => {
  const path = window.location.pathname
  if (path.startsWith("/register")) return "register"
  if (path.startsWith("/leaderboard")) return "leaderboard"
  if (path.startsWith("/portfolio")) return "portfolio"
  if (path.startsWith("/admin")) return "admin"
  return "home"
}

const paths: Record<Page, string> = {
  home: "/",
  register: "/register",
  leaderboard: "/leaderboard",
  portfolio: "/portfolio",
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
          <button onClick={() => nav("portfolio")} className="nav-link">
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
              {(["home", "leaderboard", "portfolio", "register"] as Page[]).map(
                (item) => (
                  <button
                    key={item}
                    onClick={() => nav(item)}
                    className="mobile-nav"
                  >
                    {item === "home"
                      ? "The event"
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
  transactions,
  players,
}: {
  transactions: Transaction[]
  players: Player[]
}) {
  if (!transactions.length) {
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

  const recent = transactions.slice(0, 20)
  const displayList =
    recent.length < 4 ? [...recent, ...recent, ...recent] : [...recent, ...recent]
  const labels = displayList.map((item, index) => {
    const player = players.find((p) => p.id === item.participant_id)
    const amount = Number(item.amount)
    return (
      <span className="ticker-item" key={`${item.id}-${index}`}>
        <span className="text-white/55">{player?.code || "TRADER"}</span>
        <span className={amount < 0 ? "text-loss" : "text-gain"}>
          {formatSigned(amount)}
        </span>
        <span className="text-white/35">
          {item.note || (amount < 0 ? "Loss" : "Win")}
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
  players,
  onPlayer,
}: {
  players: Player[]
  onPlayer: (player: Player) => void
}) {
  if (!players || players.length === 0) {
    return null
  }
  const top3 = [players[1], players[0], players[2]].filter(Boolean)
  return (
    <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
      {top3.map((player) => (
        <motion.button
          whileHover={{ y: -5 }}
          onClick={() => onPlayer(player)}
          className={`podium-card podium-${player.rank}`}
          key={player.id}
        >
          <div className="relative mx-auto mb-3 flex size-12 items-center justify-center rounded-full border border-gold/30 bg-gold/10 font-display text-xl text-gold sm:size-16">
            {player.full_name.charAt(0)}
            <span className="rank-badge">{player.rank}</span>
          </div>
          <p className="truncate text-sm font-semibold text-white sm:text-base">
            {player.full_name}
          </p>
          <p className="mt-1 font-mono text-xs text-gold sm:text-sm">
            {formatMoney(player.balance)}
          </p>
        </motion.button>
      ))}
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
  players,
  transactions,
}: {
  navigate: (page: Page) => void
  players: Player[]
  transactions: Transaction[]
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
              Every student starts as an intern with $10,000. Pitch, trade, and
              take risks all day. The richest player wins the VIP Golden Card.
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
                "Start as an intern",
                "Register, then walk in with $10,000 in club dollars. Everyone starts equal.",
              ],
              [
                Gamepad2,
                "02",
                "Play the market",
                "Pitch, negotiate, and take on every department's challenge. Earn big, risk it, or lose it.",
              ],
              [
                Trophy,
                "03",
                "Close the big deal",
                "The 6 richest players reach the final. The winner takes the VIP Golden Card and picks their department.",
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
            <p className="eyebrow">Four phases. One winner.</p>
            <h2 className="section-title text-left">
              Think fast.
              <br />
              <span className="text-gold">Trade smarter.</span>
            </h2>
            <p className="mt-5 max-w-lg leading-relaxed text-white/55">
              From selling a broken umbrella to closing a deal with a tough
              client, every phase tests a different business instinct. There
              are no spectators on Wall Street.
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
              [Target, "Warm-up", "Pitch the absurd, survive the crash"],
              [BriefcaseBusiness, "Department Stations", "One challenge per department"],
              [BarChart3, "The Market Crash", "Breaking news shakes the board"],
              [Trophy, "The Big Deal", "Six finalists, one Golden Card"],
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
      <Ticker transactions={transactions} players={players} />
    </main>
  )
}

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}

function RegistrationLocked({
  phase,
  opensAt,
  now,
  navigate,
}: {
  phase: "upcoming" | "closed"
  opensAt: Date
  now: number
  navigate: (page: Page) => void
}) {
  const remaining = Math.max(0, opensAt.getTime() - now)
  const units = [
    ["Days", Math.floor(remaining / 86_400_000)],
    ["Hours", Math.floor(remaining / 3_600_000) % 24],
    ["Min", Math.floor(remaining / 60_000) % 60],
    ["Sec", Math.floor(remaining / 1000) % 60],
  ] as const

  return (
    <motion.div
      key={phase}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex min-h-96 flex-col items-center justify-center text-center"
    >
      <div className="flex size-16 items-center justify-center rounded-2xl border border-gold/25 bg-gold/10 text-gold">
        {phase === "upcoming" ? (
          <CalendarClock size={30} />
        ) : (
          <LockKeyhole size={30} />
        )}
      </div>
      {phase === "upcoming" ? (
        <>
          <p className="mt-6 text-xs uppercase tracking-[0.2em] text-white/35">
            Registration desk
          </p>
          <h2 className="mt-2 font-display text-3xl text-white sm:text-4xl">
            Registration opens{" "}
            <span className="text-gold">
              {opensAt.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </span>
          </h2>
          <p className="mt-3 max-w-sm text-sm text-white/50">
            The market opens at{" "}
            {opensAt.getHours() === 0 && opensAt.getMinutes() === 0
              ? "midnight"
              : opensAt.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
            . Come back then to secure your seat on the floor.
          </p>
          <div className="mt-8 grid w-full max-w-sm grid-cols-4 gap-2 sm:gap-3">
            {units.map(([label, value]) => (
              <div
                className="rounded-xl border border-gold/15 bg-ink/60 py-3"
                key={label}
              >
                <p className="font-mono text-2xl text-white sm:text-3xl">
                  {String(value).padStart(2, "0")}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-white/35">
                  {label}
                </p>
              </div>
            ))}
          </div>
          <Button
            variant="secondary"
            onClick={() => navigate("home")}
            className="mt-8"
          >
            Back to home
          </Button>
        </>
      ) : (
        <>
          <h2 className="mt-6 font-display text-3xl text-white sm:text-4xl">
            Registration is <span className="text-gold">closed.</span>
          </h2>
          <p className="mt-3 max-w-sm text-sm text-white/50">
            The trading floor is live and teams are locked in. Follow the
            market from the leaderboard.
          </p>
          <Button onClick={() => navigate("leaderboard")} className="mt-8">
            Visit the market <ArrowRight size={16} />
          </Button>
        </>
      )}
    </motion.div>
  )
}

type SavedRegistration = { id: string; code: string; name: string }
const REGISTRATION_KEY = "wsn.registration"

// The phone remembers who registered on it; storage can be unavailable
function loadRegistration(): SavedRegistration | null {
  try {
    const raw = window.localStorage.getItem(REGISTRATION_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return parsed?.id && parsed?.code ? parsed : null
  } catch {
    return null
  }
}

function saveRegistration(registration: SavedRegistration) {
  try {
    window.localStorage.setItem(REGISTRATION_KEY, JSON.stringify(registration))
  } catch {
    // The code is still shown on screen
  }
}

function clearRegistration() {
  try {
    window.localStorage.removeItem(REGISTRATION_KEY)
  } catch {
    // Nothing to clear
  }
}

// The student's own group (or team, once groups were split) in the current round
function MyGroupCard({
  round,
  players,
  myId,
  className = "",
}: {
  round: GroupRound | null
  players: Player[]
  myId: string | null
  className?: string
}) {
  const mine = round?.group_members.find((m) => m.participant_id === myId)
  if (!round || !mine) return null
  const mates = round.group_members
    .filter((m) => m.group_number === mine.group_number && m.half === mine.half)
    .map((m) => players.find((p) => p.id === m.participant_id))
    .filter((player): player is Player => Boolean(player))

  return (
    <div
      className={`rounded-2xl border border-gold/25 bg-gold/5 p-5 text-left ${className}`}
    >
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/35">
        {round.name}
      </p>
      <p className="mt-1 font-display text-2xl text-white">
        You're in {mine.half ? "Team" : "Group"}{" "}
        <span className="text-gold">{groupLabel(mine)}</span>
      </p>
      <ul className="mt-3 space-y-1 text-sm text-white/65">
        {mates.map((player) => (
          <li key={player.id}>
            {player.full_name}
            {player.id === myId && <span className="text-gold"> (you)</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}

// Check-in from a phone that did not do the registration: find the player by
// trader code or email, mark them present and remember them on this phone
function CheckInLookup({
  onFound,
}: {
  onFound: (registration: SavedRegistration) => void
}) {
  const [identifier, setIdentifier] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!identifier.trim()) return
    setLoading(true)
    setError("")
    const { data, error: rpcError } = await supabase.rpc("check_in", {
      p_identifier: identifier.trim(),
    })
    setLoading(false)
    if (rpcError || !data?.id) {
      setError(rpcError?.message || "Check-in failed. Please try again.")
      return
    }
    onFound({ id: data.id, code: data.code, name: data.name })
  }

  return (
    <form
      onSubmit={submit}
      className="mt-8 rounded-2xl border border-white/10 bg-ink/40 p-5"
    >
      <p className="text-sm font-medium text-white">Already registered?</p>
      <p className="mt-1 text-xs text-white/40">
        Enter your trader code or the email you registered with to check in.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          className="field-control mt-0! min-w-0 flex-1"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="WS-4821 or your email"
          aria-label="Trader code or email"
          disabled={loading}
        />
        <Button type="submit" variant="secondary" disabled={loading}>
          {loading ? "Checking..." : "I'm here"}
        </Button>
      </div>
      {error && <span className="field-error">{error}</span>}
    </form>
  )
}

function Registration({
  navigate,
  onRegistered,
  opensAt,
  checkinOpensAt,
  gameStatus,
  registration,
  setRegistration,
  players,
  currentRound,
}: {
  navigate: (page: Page) => void
  onRegistered?: () => void
  opensAt: Date
  checkinOpensAt: Date
  gameStatus: GameStatus
  registration: SavedRegistration | null
  setRegistration: (registration: SavedRegistration | null) => void
  players: Player[]
  currentRound: GroupRound | null
}) {
  const [justRegistered, setJustRegistered] = useState(false)
  const [checkingIn, setCheckingIn] = useState(false)
  const [checkinError, setCheckinError] = useState("")
  const [category, setCategory] = useState<ParticipantCategory>("ensia")
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const submitted = registration !== null
  const now = useNow()
  const phase =
    gameStatus !== "setup"
      ? "closed"
      : now < opensAt.getTime()
        ? "upcoming"
        : "open"

  // From the start of the event, students confirm they are in the room
  const checkinOpen =
    gameStatus !== "ended" && now >= checkinOpensAt.getTime()
  const me = players.find((player) => player.id === registration?.id)

  const checkIn = async () => {
    if (!registration) return
    setCheckingIn(true)
    setCheckinError("")
    const { error } = await supabase.rpc("check_in", {
      p_participant_id: registration.id,
    })
    setCheckingIn(false)
    if (error) {
      setCheckinError(error.message)
    } else if (onRegistered) {
      onRegistered()
    }
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrors({})
    const data = new FormData(event.currentTarget)
    const fullName = String(data.get("fullName") || "").trim()
    const email = String(data.get("email") || "").trim().toLowerCase()
    const phone = String(data.get("phone") || "").trim()
    const studyYear = Number(data.get("studyYear")) || null
    const school = String(data.get("school") || "").trim()
    const studentNumber = String(data.get("studentNumber") || "").trim()

    const nextErrors: Record<string, string> = {}
    if (!fullName) nextErrors.fullName = "Tell us who you are."
    if (!email || !email.includes("@"))
      nextErrors.email = "Enter a valid email address."
    if (!/^\+?[\d\s]{9,15}$/.test(phone))
      nextErrors.phone = "Enter a valid phone number."
    if (category === "ensia" && !studyYear)
      nextErrors.studyYear = "Select your year."
    if (category === "other_school" && !school)
      nextErrors.school = "Tell us which school you are from."
    // Students identify themselves with a school email or a student number
    if (!studentNumber && !nextErrors.email) {
      if (category === "ensia" && !email.endsWith("@ensia.edu.dz"))
        nextErrors.studentNumber =
          "Use your ENSIA email above, or enter your student number."
      if (category === "other_school" && !email.endsWith(".edu.dz"))
        nextErrors.studentNumber =
          "Use your school email above, or enter your student number."
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setLoading(true)
    try {
      const { data: result, error } = await supabase.rpc(
        "register_participant",
        {
          p_full_name: fullName,
          p_email: email,
          p_phone: phone,
          p_category: category,
          p_study_year: category === "guest" ? null : studyYear,
          p_school: category === "other_school" ? school : null,
          p_student_number: category === "guest" ? null : studentNumber,
        },
      )

      if (error || !result?.code) {
        if (error?.message?.toLowerCase().includes("already registered")) {
          setErrors({ email: "This email is already registered." })
        } else {
          setErrors({
            general:
              error?.message || "Registration failed. Please try again.",
          })
        }
      } else {
        const saved = { id: result.id, code: result.code, name: fullName }
        saveRegistration(saved)
        setRegistration(saved)
        setJustRegistered(true)
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
                Individual registration. Play solo, team up when the game
                calls for it.
              </p>
            </div>
            <div className="relative z-10 mt-16 hidden lg:block">
              {[
                "Free entry",
                "$10,000 starting capital",
                "VIP Golden Card for the winner",
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
              {!submitted && phase !== "open" ? (
                <RegistrationLocked
                  phase={phase}
                  opensAt={opensAt}
                  now={now}
                  navigate={navigate}
                />
              ) : !submitted ? (
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
                    <Field
                      label="Phone number"
                      name="phone"
                      type="tel"
                      placeholder="0550 12 34 56"
                      error={errors.phone}
                      disabled={loading}
                    />
                    <div className="field-label">
                      I am
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {(
                          [
                            ["ensia", "ENSIA student"],
                            ["other_school", "Other school"],
                            ["guest", "Guest"],
                          ] as const
                        ).map(([value, label]) => (
                          <button
                            type="button"
                            key={value}
                            aria-pressed={category === value}
                            disabled={loading}
                            onClick={() => {
                              setCategory(value)
                              setErrors({})
                            }}
                            className={`rounded-xl border px-2 py-2.5 text-xs font-semibold transition ${
                              category === value
                                ? "border-gold/60 bg-gold/15 text-gold"
                                : "border-white/10 text-white/50 hover:border-gold/30 hover:text-white"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {category === "other_school" && (
                      <Field
                        label="School"
                        name="school"
                        placeholder="Your school's name"
                        error={errors.school}
                        disabled={loading}
                      />
                    )}
                    {category !== "guest" && (
                      <>
                        <label className="field-label">
                          {category === "ensia"
                            ? "Year of study"
                            : "Year of study (optional)"}
                          <select
                            className="field-control"
                            name="studyYear"
                            defaultValue=""
                            disabled={loading}
                            aria-invalid={Boolean(errors.studyYear)}
                          >
                            <option value="">Select your year</option>
                            {["1st", "2nd", "3rd", "4th", "5th"].map(
                              (label, index) => (
                                <option key={label} value={index + 1}>
                                  {label} year
                                </option>
                              ),
                            )}
                          </select>
                          {errors.studyYear && (
                            <span className="field-error">
                              {errors.studyYear}
                            </span>
                          )}
                        </label>
                        <Field
                          label="Student number (only if you didn't use your school email)"
                          name="studentNumber"
                          placeholder="Student card number"
                          error={errors.studentNumber}
                          disabled={loading}
                        />
                      </>
                    )}
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
                  </p>
                </motion.form>
              ) : (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex min-h-96 flex-col items-center justify-center text-center"
                >
                  {justRegistered && <Confetti />}
                  <div className="flex size-20 items-center justify-center rounded-full border border-gold/25 bg-gold/10 text-gold">
                    <Check size={34} />
                  </div>
                  <h2 className="mt-6 font-display text-4xl text-white">
                    You're on the floor.
                  </h2>
                  <p className="mt-3 max-w-sm text-white/50">
                    {registration?.name
                      ? `${registration.name}, your`
                      : "Your"}{" "}
                    $10,000 is waiting for you on October 7.
                  </p>
                  <div className="mt-6 w-full max-w-xs rounded-2xl border border-gold/25 bg-ink/60 px-6 py-5">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/35">
                      Your trader code
                    </p>
                    <p className="mt-2 font-mono text-4xl font-semibold tracking-wider text-gold">
                      {registration?.code}
                    </p>
                    <p className="mt-3 text-xs leading-relaxed text-white/45">
                      Show this code at every game so your winnings go to your
                      account. Take a screenshot.
                    </p>
                  </div>
                  {!checkinOpen ? (
                    <p className="mt-5 max-w-xs text-xs leading-relaxed text-white/45">
                      On{" "}
                      {checkinOpensAt.toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                      })}
                      , scan the QR code at the entrance and tap "I'm here" to
                      join the games.
                    </p>
                  ) : me?.checked_in_at ? (
                    <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-gain/30 bg-gain/10 px-4 py-2 text-sm font-semibold text-gain">
                      <Check size={15} /> You're checked in
                    </p>
                  ) : me ? (
                    <>
                      <Button
                        onClick={checkIn}
                        disabled={checkingIn}
                        className="mt-5 w-full max-w-xs justify-center py-3.5 text-base"
                      >
                        {checkingIn ? "Checking in..." : "I'm here"}
                      </Button>
                      {checkinError && (
                        <p className="mt-2 text-xs text-loss">{checkinError}</p>
                      )}
                    </>
                  ) : null}
                  <MyGroupCard
                    round={currentRound}
                    players={players}
                    myId={registration?.id ?? null}
                    className="mt-5 w-full max-w-xs"
                  />
                  <Button
                    onClick={() => navigate("leaderboard")}
                    className="mt-7"
                  >
                    Visit the market <ArrowRight size={16} />
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      clearRegistration()
                      setRegistration(null)
                      setJustRegistered(false)
                    }}
                    className="mt-4 text-xs text-white/30 underline-offset-4 hover:text-white/60 hover:underline"
                  >
                    Not you? Register someone else
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            {!submitted && checkinOpen && (
              <CheckInLookup
                onFound={(found) => {
                  saveRegistration(found)
                  setRegistration(found)
                  if (onRegistered) onRegistered()
                }}
              />
            )}
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
  players,
  transactions,
  openPlayer,
  isAccessible,
  gameStatus = "setup",
  navigate,
  myId,
  currentRound,
}: {
  players: Player[]
  transactions: Transaction[]
  openPlayer: (player: Player) => void
  isAccessible: boolean
  gameStatus?: GameStatus
  navigate: (page: Page) => void
  myId: string | null
  currentRound: GroupRound | null
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
            The ranking board unlocks when the opening bell rings on October 7.
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

  const search = query.trim().toLowerCase()
  const filtered = players.filter(
    (player) =>
      player.full_name.toLowerCase().includes(search) ||
      player.code.toLowerCase().includes(search),
  )
  const me = myId ? players.find((player) => player.id === myId) : undefined
  const myGroup = currentRound?.group_members.find(
    (m) => m.participant_id === myId,
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
                : "Every dollar counts. Every position is live."}
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
        {me && (
          <button
            onClick={() => openPlayer(me)}
            className="mb-10 flex w-full items-center justify-between gap-4 rounded-2xl border border-gold/30 bg-gold/8 px-5 py-4 text-left transition hover:border-gold/60"
          >
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gold">
                Your position
              </p>
              <p className="mt-1 truncate font-display text-xl text-white">
                #{me.rank}{" "}
                <span className="text-sm text-white/40">
                  of {players.length}
                </span>{" "}
                · {me.full_name}
              </p>
              {myGroup && (
                <p className="mt-1 text-xs text-white/45">
                  {currentRound?.name}: {myGroup.half ? "Team" : "Group"}{" "}
                  <span className="font-semibold text-gold">
                    {groupLabel(myGroup)}
                  </span>
                </p>
              )}
            </div>
            <p className="font-mono text-xl font-semibold text-gold">
              {formatMoney(me.balance)}
            </p>
          </button>
        )}
        <div className="mb-12 mx-auto max-w-4xl">
          <Podium players={players.slice(0, 3)} onPlayer={openPlayer} />
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
                placeholder="Find a player or code"
                aria-label="Search players"
              />
            </label>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div className="table-head hidden md:grid">
                <span>Rank</span>
                <span>Player</span>
                <span>Last trade</span>
                <span className="text-right">Net worth</span>
                <span className="text-right">Change</span>
              </div>
              <motion.div layout>
                {filtered.map((player) => {
                  const lastAction = getLastAction(player.id, transactions)

                  return (
                    <motion.button
                      layout
                      key={player.id}
                      onClick={() => openPlayer(player)}
                      className={`leader-row ${
                        player.id === myId ? "bg-gold/5" : ""
                      }`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`rank-number ${
                            player.rank <= 3 ? "text-gold" : ""
                          }`}
                        >
                          {String(player.rank).padStart(2, "0")}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="team-avatar">
                          {player.full_name.charAt(0)}
                        </div>
                        <div className="text-left truncate">
                          <p className="font-medium text-white truncate">
                            {player.full_name}
                            {player.id === myId && (
                              <span className="ml-2 text-xs text-gold">You</span>
                            )}
                          </p>
                          <p className="text-xs text-white/30 truncate">
                            {playerSubtitle(player)}
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
                        {formatMoney(player.balance)}
                      </span>
                      <div className="text-right">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                            player.change > 0
                              ? "border border-gain/25 bg-gain/10 text-gain"
                              : player.change < 0
                                ? "border border-loss/25 bg-loss/10 text-loss"
                                : "border border-white/10 bg-white/5 text-white/40"
                          }`}
                        >
                          {player.change > 0 && <ArrowUpRight size={13} />}
                          {player.change < 0 && <ArrowDownRight size={13} />}
                          {player.change === 0
                            ? "No change"
                            : `${Math.abs(player.change)}%`}
                        </span>
                      </div>
                    </motion.button>
                  )
                })}
                {filtered.length === 0 && (
                  <p className="py-8 text-center text-sm text-white/30">
                    {players.length === 0
                      ? "No players registered yet."
                      : "No player matches your search."}
                  </p>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </section>
      <Ticker transactions={transactions} players={players} />
    </main>
  )
}

function PlayerPage({
  player,
  totalPlayers,
  startingCapital,
  games,
  isMe,
  navigate,
  groupCard,
}: {
  player: Player | null
  totalPlayers: number
  startingCapital: number
  games: Game[]
  isMe: boolean
  navigate: (page: Page) => void
  groupCard?: ReactNode
}) {
  const [history, setHistory] = useState<Transaction[]>([])
  const playerId = player?.id
  const balance = player?.balance

  // Full history of this player, newest first; reloads when the balance moves
  useEffect(() => {
    if (!playerId) return
    let cancelled = false
    supabase
      .from("transactions")
      .select("*")
      .eq("participant_id", playerId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!cancelled && data) setHistory(data)
      })
    return () => {
      cancelled = true
    }
  }, [playerId, balance])

  if (!player) {
    return (
      <main className="page-shell flex items-center justify-center px-5 py-20">
        <div className="mx-auto max-w-md text-center">
          <p className="text-white/50">
            Register to get your own portfolio, or pick a player from the
            leaderboard.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button onClick={() => navigate("register")}>
              Register <ArrowRight size={16} />
            </Button>
            <Button variant="secondary" onClick={() => navigate("leaderboard")}>
              View leaderboard
            </Button>
          </div>
        </div>
      </main>
    )
  }

  const ownHistory = history.filter((item) => item.participant_id === player.id)
  let running = startingCapital
  const points = [100]
  for (const item of [...ownHistory].reverse()) {
    running += Number(item.amount)
    points.push(Math.round((running / (startingCapital || 1)) * 100))
  }
  if (points.length === 1) points.push(100)
  const max = Math.max(...points, 101)
  const min = Math.min(...points, 99)
  const chartPath = points
    .map((value, index) => {
      const x = (index / Math.max(1, points.length - 1)) * 720
      const range = max - min || 1
      const y = 190 - ((value - min) / range) * 140
      return `${index === 0 ? "M" : "L"} ${x} ${y}`
    })
    .join(" ")

  const earned = ownHistory
    .filter((item) => Number(item.amount) > 0)
    .reduce((sum, item) => sum + Number(item.amount), 0)
  const lost = ownHistory
    .filter((item) => Number(item.amount) < 0)
    .reduce((sum, item) => sum - Number(item.amount), 0)

  return (
    <main className="page-shell">
      <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div className="flex items-center gap-5">
            <div className="flex size-16 items-center justify-center rounded-2xl border border-gold/25 bg-gold/10 font-display text-3xl text-gold">
              {player.full_name.charAt(0)}
            </div>
            <div>
              <p className="eyebrow">
                {isMe ? "Your portfolio" : "Portfolio"} ·{" "}
                {playerSubtitle(player)}
              </p>
              <h1 className="font-display text-4xl text-white">
                {player.full_name}
              </h1>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs uppercase tracking-widest text-white/35">
              Current net worth · Rank #{player.rank} of {totalPlayers}
            </p>
            <p className="mt-1 font-mono text-3xl font-semibold text-gold">
              {formatMoney(player.balance)}
            </p>
          </div>
        </div>
        <div className="grid gap-5">
          {groupCard}
          <div className="glass-card p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-white/40">Portfolio performance</p>
                <p
                  className={`mt-1 text-sm ${
                    player.change >= 0 ? "text-gain" : "text-loss"
                  }`}
                >
                  {player.change >= 0 ? "▲" : "▼"} {Math.abs(player.change)}%
                  today
                </p>
              </div>
              <span className="rounded-full bg-gain/10 px-3 py-1 text-xs text-gain">
                Market open
              </span>
            </div>
            <svg
              viewBox="0 0 720 220"
              className="mt-7 w-full overflow-visible"
              aria-label="Balance history"
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
                value={formatMoney(startingCapital)}
              />
              <Metric label="Earned" value={`+${formatMoney(earned)}`} green />
              <Metric label="Lost" value={`−${formatMoney(lost)}`} />
            </div>
          </div>
          <div className="glass-card p-6">
            <h2 className="font-display text-xl text-white">
              Recent transactions
            </h2>
            <div className="mt-4 divide-y divide-white/6">
              {ownHistory.map((item) => {
                const amount = Number(item.amount)
                const game = games.find((g) => g.id === item.game_id)
                return (
                  <div
                    className="flex items-center justify-between gap-4 py-4"
                    key={item.id}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex size-9 items-center justify-center rounded-lg ${
                          amount < 0
                            ? "bg-loss/10 text-loss"
                            : "bg-gain/10 text-gain"
                        }`}
                      >
                        {amount < 0 ? (
                          <ArrowDownRight size={17} />
                        ) : (
                          <ArrowUpRight size={17} />
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-white">
                          {game?.name || (amount < 0 ? "Loss" : "Win")}
                          {item.note && (
                            <span className="text-white/45"> · {item.note}</span>
                          )}
                        </p>
                        <p className="text-xs text-white/30">
                          {new Date(item.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-mono text-sm ${
                        amount < 0 ? "text-loss" : "text-gain"
                      }`}
                    >
                      {formatSigned(amount)}
                    </span>
                  </div>
                )
              })}
              {ownHistory.length === 0 && (
                <p className="py-4 text-xs text-white/40">
                  No transactions yet. The starting capital is waiting to be
                  put to work.
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
  players,
  transactions,
  games,
  participants,
  currentRound,
  isLeaderboardAccessible,
  gameStatus,
  refetchData,
}: {
  players: Player[]
  transactions: Transaction[]
  games: Game[]
  participants: Participant[]
  currentRound: GroupRound | null
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

  // Player emails and phones are only loaded once an admin is signed in
  useEffect(() => {
    if (authed) refetchData()
  }, [authed])

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

  const startGame = async () => {
    if (gameStatus !== "setup") {
      setNotice("⚠️ Game has already started.")
      return
    }
    const confirmed = window.confirm(
      "Start the game? Registration closes and the leaderboard opens for everyone.",
    )
    if (!confirmed) return

    setLoadingAction(true)
    try {
      const { error } = await supabase.rpc("start_game")
      if (error) {
        setNotice(`⚠️ Error starting game: ${error.message}`)
      } else {
        await refetchData()
        setNotice(
          "🔔 The opening bell has rung. The game is live and scoring is open.",
        )
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setNotice(`⚠️ Action failed: ${msg}`)
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
                  <Button onClick={startGame} disabled={loadingAction}>
                    <Sparkles size={14} />
                    {loadingAction ? "Starting..." : "Start Game"}
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
                players={players}
                transactions={transactions}
                games={games}
              />
            )}
            {tab === "players" && (
              <PlayersPanel
                players={players}
                participants={participants}
                refetchData={refetchData}
                setNotice={setNotice}
              />
            )}
            {tab === "scoring" && (
              <BankerPanel
                players={players}
                games={games}
                transactions={transactions}
                gameStatus={gameStatus}
                currentRound={currentRound}
                refetchData={refetchData}
                setNotice={setNotice}
              />
            )}
            {tab === "groups" && (
              <GroupsPanel
                players={players}
                games={games}
                currentRound={currentRound}
                refetchData={refetchData}
                setNotice={setNotice}
              />
            )}
            {tab === "games" && (
              <GamesPanel games={games} refetchData={refetchData} />
            )}
            {tab === "poster" && <PosterPanel />}
            {tab === "activity" && (
              <ActivityPanel
                transactions={transactions}
                players={players}
                games={games}
              />
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
  ["players", Users],
  ["groups", BriefcaseBusiness],
  ["scoring", CircleDollarSign],
  ["games", Gamepad2],
  ["activity", Activity],
  ["poster", QrCode],
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
  players,
  transactions,
  games,
}: {
  players: Player[]
  transactions: Transaction[]
  games: Game[]
}) {
  const gamesPlayed = games.filter((g) => g.status === "done").length
  const moneyInPlay = players.reduce((sum, player) => sum + player.balance, 0)

  const kpis = [
    [
      Users,
      "Players",
      players.length,
      `${players.filter((p) => p.checked_in_at).length} checked in`,
    ],
    [
      CircleDollarSign,
      "Money in play",
      formatMoney(moneyInPlay),
      "Across all wallets",
    ],
    [Gamepad2, "Games played", gamesPlayed, `of ${games.length} total`],
    [
      Trophy,
      "Top balance",
      formatMoney(players[0]?.balance ?? 0),
      players[0]?.full_name ?? "No players yet",
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
          <h2 className="font-display text-xl text-white">Top players</h2>
          <div className="mt-4 divide-y divide-white/6">
            {players.slice(0, 6).map((player) => (
              <div
                className="flex items-center justify-between py-3"
                key={player.id}
              >
                <div className="flex items-center gap-3">
                  <span className="w-5 font-mono text-xs text-gold">
                    {player.rank}
                  </span>
                  <div>
                    <p className="text-sm text-white">{player.full_name}</p>
                    <p className="text-xs text-white/30">
                      {playerSubtitle(player)}
                    </p>
                  </div>
                </div>
                <span className="font-mono text-sm text-white">
                  {formatMoney(player.balance)}
                </span>
              </div>
            ))}
            {players.length === 0 && (
              <p className="py-4 text-xs text-white/30">No players yet.</p>
            )}
          </div>
        </div>
        <div className="admin-card">
          <h2 className="font-display text-xl text-white">Recent activity</h2>
          <div className="mt-4 space-y-4">
            {transactions.slice(0, 5).map((item) => {
              const amount = Number(item.amount)
              return (
                <div className="flex gap-3" key={item.id}>
                  <span
                    className={`mt-1 size-2 shrink-0 rounded-full ${
                      amount < 0 ? "bg-loss" : "bg-gain"
                    }`}
                  />
                  <div>
                    <p className="text-sm text-white/75">
                      {players.find((p) => p.id === item.participant_id)
                        ?.full_name || "Unknown player"}{" "}
                      <span className={amount < 0 ? "text-loss" : "text-gain"}>
                        {formatSigned(amount)}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-white/25">
                      {new Date(item.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              )
            })}
            {transactions.length === 0 && (
              <p className="text-xs text-white/30">No activity yet.</p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function PlayersPanel({
  players,
  participants,
  refetchData,
  setNotice,
}: {
  players: Player[]
  participants: Participant[]
  refetchData: () => Promise<void>
  setNotice: (notice: string) => void
}) {
  const [query, setQuery] = useState("")
  const [adding, setAdding] = useState(false)
  const [category, setCategory] = useState<ParticipantCategory>("ensia")
  const [saving, setSaving] = useState(false)

  const search = query.trim().toLowerCase()
  const filtered = players.filter(
    (player) =>
      player.full_name.toLowerCase().includes(search) ||
      player.code.toLowerCase().includes(search),
  )

  // Admins may register someone at any time, even after the game has started
  const addPlayer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    setSaving(true)
    const { data: result, error } = await supabase.rpc("register_participant", {
      p_full_name: String(data.get("fullName") || ""),
      p_email: String(data.get("email") || ""),
      p_phone: String(data.get("phone") || ""),
      p_category: category,
      p_study_year:
        category === "guest" ? null : Number(data.get("studyYear")) || null,
      p_school: category === "other_school" ? String(data.get("school") || "") : null,
      p_student_number:
        category === "guest" ? null : String(data.get("studentNumber") || ""),
    })
    setSaving(false)
    if (error || !result?.code) {
      setNotice(`⚠️ Could not add player: ${error?.message || "unknown error"}`)
      return
    }
    form.reset()
    setAdding(false)
    setNotice(`Player added. Trader code: ${result.code}`)
    await refetchData()
  }

  // For students who cannot check in from a phone
  const togglePresent = async (player: Player) => {
    const { error } = await supabase
      .from("participants")
      .update({
        checked_in_at: player.checked_in_at ? null : new Date().toISOString(),
      })
      .eq("id", player.id)
    if (error) {
      setNotice(`⚠️ Could not update presence: ${error.message}`)
    } else {
      await refetchData()
    }
  }

  const removePlayer = async (player: Player) => {
    if (
      !confirm(
        `Delete ${player.full_name} (${player.code})? Their transactions are deleted too.`,
      )
    )
      return
    const { error } = await supabase
      .from("participants")
      .delete()
      .eq("id", player.id)
    if (error) {
      setNotice(`⚠️ Could not delete player: ${error.message}`)
    } else {
      await refetchData()
    }
  }

  return (
    <div className="space-y-5">
      <div className="admin-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="search-box">
            <Search size={15} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or code"
            />
          </label>
          <Button onClick={() => setAdding(!adding)}>
            {adding ? <X size={15} /> : <Plus size={15} />}
            {adding ? "Cancel" : "Add player"}
          </Button>
        </div>
        {adding && (
          <form
            onSubmit={addPlayer}
            className="mt-5 grid gap-4 border-t border-white/8 pt-5 sm:grid-cols-2"
          >
            <Field label="Full name" name="fullName" placeholder="Full name" />
            <Field
              label="Email"
              name="email"
              type="email"
              placeholder="name@ensia.edu.dz"
            />
            <Field
              label="Phone (optional)"
              name="phone"
              type="tel"
              placeholder="0550 12 34 56"
            />
            <label className="field-label">
              Category
              <select
                className="field-control"
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as ParticipantCategory)
                }
              >
                <option value="ensia">ENSIA student</option>
                <option value="other_school">Other school</option>
                <option value="guest">Guest</option>
              </select>
            </label>
            {category === "other_school" && (
              <Field label="School" name="school" placeholder="School name" />
            )}
            {category !== "guest" && (
              <>
                <label className="field-label">
                  Year of study
                  <select
                    className="field-control"
                    name="studyYear"
                    defaultValue=""
                  >
                    <option value="">
                      {category === "ensia" ? "Select a year" : "Not specified"}
                    </option>
                    {[1, 2, 3, 4, 5].map((year) => (
                      <option key={year} value={year}>
                        Year {year}
                      </option>
                    ))}
                  </select>
                </label>
                <Field
                  label="Student number (if no school email)"
                  name="studentNumber"
                  placeholder="Student card number"
                />
              </>
            )}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving}>
                <Check size={15} /> {saving ? "Adding..." : "Register player"}
              </Button>
            </div>
          </form>
        )}
      </div>
      <div className="admin-card">
        <p className="mb-3 text-xs text-white/35">
          {filtered.length} of {players.length} players
        </p>
        <div className="divide-y divide-white/6">
          {filtered.map((player) => {
            const details = participants.find((p) => p.id === player.id)
            return (
              <div
                className="grid items-center gap-3 py-3 sm:grid-cols-[1.2fr_1.2fr_auto_auto_auto]"
                key={player.id}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-white">
                    {player.full_name}
                  </p>
                  <p className="text-xs text-white/30">
                    {playerSubtitle(player)}
                  </p>
                </div>
                <div className="min-w-0 text-xs text-white/40">
                  <p className="truncate">{details?.email}</p>
                  <p className="truncate">
                    {[details?.phone, details?.student_number]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <span className="font-mono text-sm text-white/80">
                  {formatMoney(player.balance)}
                </span>
                <button
                  type="button"
                  aria-pressed={Boolean(player.checked_in_at)}
                  onClick={() => togglePresent(player)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    player.checked_in_at
                      ? "border-gain/30 bg-gain/10 text-gain"
                      : "border-white/10 text-white/35 hover:text-white"
                  }`}
                >
                  {player.checked_in_at ? "Present" : "Absent"}
                </button>
                <Button variant="danger" onClick={() => removePlayer(player)}>
                  Remove
                </Button>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <p className="py-6 text-center text-sm text-white/30">
              No players found.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

const QUICK_AMOUNTS = [300, 500, 1000, 1500, 2000]

function BankerPanel({
  players,
  games,
  transactions,
  gameStatus,
  currentRound,
  refetchData,
  setNotice,
}: {
  players: Player[]
  games: Game[]
  transactions: Transaction[]
  gameStatus: GameStatus
  currentRound: GroupRound | null
  refetchData: () => Promise<void>
  setNotice: (notice: string) => void
}) {
  const isLive = gameStatus === "live"
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [entry, setEntry] = useState("")
  const [entryError, setEntryError] = useState("")
  // null until the banker picks one; "" means "Other"
  const [gameId, setGameId] = useState<string | null>(null)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)

  const activeGameId =
    gameId ?? (games.find((g) => g.status === "live") ?? games[0])?.id ?? ""
  const selected = selectedIds
    .map((id) => players.find((player) => player.id === id))
    .filter((player): player is Player => Boolean(player))

  const tokensOf = (raw: string) => raw.split(/[\s,;]+/).filter(Boolean)
  const looksLikeCodes = (raw: string) =>
    tokensOf(raw).length > 0 &&
    tokensOf(raw).every((token) => /^(ws-?)?\d+$/i.test(token))

  const nameQuery = entry.trim().toLowerCase()
  const suggestions =
    nameQuery.length >= 2 && !looksLikeCodes(entry)
      ? players
          .filter(
            (player) =>
              !selectedIds.includes(player.id) &&
              player.full_name.toLowerCase().includes(nameQuery),
          )
          .slice(0, 6)
      : []

  const addPlayer = (player: Player) => {
    setSelectedIds((current) =>
      current.includes(player.id) ? current : [...current, player.id],
    )
    setEntry("")
    setEntryError("")
  }

  // Accepts one or several codes ("4821", "WS-4821 ws1234, 0077")
  const addCodes = (raw: string) => {
    const found: string[] = []
    const missing: string[] = []
    for (const token of tokensOf(raw)) {
      const code = normalizeCode(token)
      const player = code && players.find((p) => p.code === code)
      if (player) found.push(player.id)
      else missing.push(token)
    }
    setSelectedIds((current) => [...new Set([...current, ...found])])
    setEntry(missing.join(" "))
    setEntryError(
      missing.length ? `No player with code ${missing.join(", ")}` : "",
    )
  }

  const onEntryChange = (value: string) => {
    setEntry(value)
    setEntryError("")
    // A complete code is added as soon as it is typed or pasted
    if (looksLikeCodes(value) && tokensOf(value).every(normalizeCode)) {
      const allKnown = tokensOf(value).every((token) =>
        players.some((p) => p.code === normalizeCode(token)),
      )
      if (allKnown || /[\s,;]$/.test(value)) addCodes(value)
    }
  }

  // Groups (or teams) of the current round, for awarding everyone at once
  const groupMembers = currentRound?.group_members ?? []
  const groupLabels = [...new Set(groupMembers.map(groupLabel))].sort(
    (a, b) => parseInt(a) - parseInt(b) || a.localeCompare(b),
  )
  const addGroup = (label: string) => {
    const ids = groupMembers
      .filter((m) => groupLabel(m) === label)
      .map((m) => m.participant_id)
    setSelectedIds((current) => [...new Set([...current, ...ids])])
    setEntryError("")
  }

  const onEntryEnter = () => {
    if (looksLikeCodes(entry)) addCodes(entry)
    else if (suggestions.length === 1) addPlayer(suggestions[0])
  }

  const submit = async () => {
    const value = Math.round(Number(amount))
    if (!selected.length) {
      setEntryError("Add at least one player.")
      return
    }
    if (!value || value <= 0) {
      setNotice("⚠️ Enter an amount greater than zero.")
      return
    }
    setSaving(true)
    const batchId = crypto.randomUUID()
    const { error } = await supabase.from("transactions").insert(
      selected.map((player) => ({
        participant_id: player.id,
        game_id: activeGameId || null,
        amount: direction * value,
        note: note.trim() || null,
        batch_id: batchId,
      })),
    )
    setSaving(false)
    if (error) {
      setNotice(`⚠️ Failed to post: ${error.message}`)
      return
    }
    setNotice(
      `${formatSigned(direction * value)} posted to ${selected.length} player${
        selected.length > 1 ? "s" : ""
      }.`,
    )
    setSelectedIds([])
    setEntry("")
    setNote("")
    await refetchData()
  }

  // Latest entries, one line per batch (a batch = one confirm click)
  const batches = useMemo(() => {
    const grouped = new Map<string, Transaction[]>()
    for (const item of transactions) {
      const key = item.batch_id ?? item.id
      grouped.set(key, [...(grouped.get(key) ?? []), item])
    }
    return [...grouped.values()].slice(0, 8)
  }, [transactions])

  const undoBatch = async (batch: Transaction[]) => {
    if (
      !confirm(
        `Undo ${formatSigned(Number(batch[0].amount))} for ${batch.length} player${
          batch.length > 1 ? "s" : ""
        }?`,
      )
    )
      return
    const request = supabase.from("transactions").delete()
    const { error } = batch[0].batch_id
      ? await request.eq("batch_id", batch[0].batch_id)
      : await request.eq("id", batch[0].id)
    if (error) {
      setNotice(`⚠️ Failed to undo: ${error.message}`)
    } else {
      setNotice("Entry undone.")
      await refetchData()
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_.75fr]">
      <div className="admin-card">
        <h2 className="font-display text-xl text-white">Post a transaction</h2>
        {!isLive && (
          <p className="mt-2 text-xs font-medium text-gold/90">
            {gameStatus === "setup"
              ? "Scoring opens when the game starts."
              : "Scoring is locked because the game has ended."}
          </p>
        )}
        <div className="mt-5 space-y-4">
          <label className="field-label">
            Game
            <select
              className="field-control"
              value={activeGameId}
              onChange={(e) => setGameId(e.target.value)}
              disabled={!isLive}
            >
              {games.map((g) => (
                <option value={g.id} key={g.id}>
                  {g.name}
                </option>
              ))}
              <option value="">Other</option>
            </select>
          </label>

          <div className="field-label">
            Players
            {selected.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {selected.map((player) => (
                  <span
                    key={player.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 py-1 pl-3 pr-1.5 text-xs text-white"
                  >
                    <span className="font-mono text-gold">{player.code}</span>
                    {player.full_name}
                    <button
                      type="button"
                      aria-label={`Remove ${player.full_name}`}
                      onClick={() =>
                        setSelectedIds((current) =>
                          current.filter((id) => id !== player.id),
                        )
                      }
                      className="rounded-full p-0.5 text-white/40 hover:text-loss"
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <input
              className="field-control"
              value={entry}
              onChange={(e) => onEntryChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  onEntryEnter()
                }
              }}
              placeholder="Type a code (4821) or a name"
              aria-label="Add player by code or name"
              disabled={!isLive}
            />
            {entryError && <span className="field-error">{entryError}</span>}
            {groupLabels.length > 0 && (
              <select
                className="field-control"
                value=""
                onChange={(e) => e.target.value && addGroup(e.target.value)}
                aria-label="Add a whole group"
                disabled={!isLive}
              >
                <option value="">
                  Or add a whole group ({currentRound?.name})
                </option>
                {groupLabels.map((label) => (
                  <option value={label} key={label}>
                    {/[AB]$/.test(label) ? "Team" : "Group"} {label}
                  </option>
                ))}
              </select>
            )}
            {suggestions.length > 0 && (
              <div className="mt-2 overflow-hidden rounded-xl border border-white/10">
                {suggestions.map((player) => (
                  <button
                    type="button"
                    key={player.id}
                    onClick={() => addPlayer(player)}
                    className="flex w-full items-center justify-between gap-3 border-b border-white/6 px-3 py-2 text-left text-sm text-white/80 last:border-0 hover:bg-gold/8"
                  >
                    <span className="truncate">{player.full_name}</span>
                    <span className="font-mono text-xs text-gold">
                      {player.code}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="field-label">
            Amount ($)
            <div className="mt-2 grid grid-cols-[auto_1fr] gap-2">
              <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-white/10">
                {(
                  [
                    [1, "+ Earn"],
                    [-1, "− Lose"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    aria-pressed={direction === value}
                    onClick={() => setDirection(value)}
                    disabled={!isLive}
                    className={`px-3 text-xs font-semibold transition ${
                      direction === value
                        ? value === 1
                          ? "bg-gain/15 text-gain"
                          : "bg-loss/15 text-loss"
                        : "text-white/40 hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <input
                className="field-control mt-0!"
                type="number"
                min="1"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="500"
                aria-label="Amount"
                disabled={!isLive}
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((value) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setAmount(String(value))}
                  disabled={!isLive}
                  className="rounded-lg border border-white/10 px-3 py-1.5 font-mono text-xs text-white/60 transition hover:border-gold/40 hover:text-gold"
                >
                  {formatMoney(value)}
                </button>
              ))}
            </div>
          </div>

          <label className="field-label">
            Note (optional)
            <input
              className="field-control"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Top pitcher bonus"
              disabled={!isLive}
            />
          </label>
        </div>
        <Button
          onClick={submit}
          disabled={!isLive || saving}
          className="mt-6 w-full justify-center py-3"
        >
          <Check size={16} />
          {saving
            ? "Posting..."
            : selected.length && Number(amount) > 0
              ? `Confirm ${formatSigned(direction * Math.round(Number(amount)))} × ${selected.length}`
              : "Confirm"}
        </Button>
      </div>
      <div className="admin-card">
        <h2 className="font-display text-xl text-white">Latest entries</h2>
        <div className="mt-4 divide-y divide-white/6">
          {batches.map((batch) => {
            const first = batch[0]
            const batchAmount = Number(first.amount)
            const names = batch.map(
              (item) =>
                players.find((p) => p.id === item.participant_id)?.full_name ||
                "Unknown player",
            )
            return (
              <div
                className="flex items-start justify-between gap-3 py-3"
                key={first.batch_id ?? first.id}
              >
                <div className="min-w-0">
                  <p className="text-sm text-white">
                    <span
                      className={`font-mono ${
                        batchAmount < 0 ? "text-loss" : "text-gain"
                      }`}
                    >
                      {formatSigned(batchAmount)}
                    </span>
                    {batch.length > 1 && (
                      <span className="text-white/45"> × {batch.length}</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-white/45">
                    {names.slice(0, 3).join(", ")}
                    {names.length > 3 && ` +${names.length - 3} more`}
                  </p>
                  <p className="mt-0.5 text-xs text-white/25">
                    {games.find((g) => g.id === first.game_id)?.name || "Other"}
                    {first.note && ` · ${first.note}`} ·{" "}
                    {new Date(first.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <Button
                  variant="danger"
                  onClick={() => undoBatch(batch)}
                  disabled={!isLive}
                >
                  Undo
                </Button>
              </div>
            )
          })}
          {batches.length === 0 && (
            <p className="py-4 text-xs text-white/30">No transactions yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Groups of a round (saved or still a draft), one card per group
function GroupGrid({
  members,
  players,
}: {
  members: GroupAssignment[]
  players: Player[]
}) {
  const numbers = [...new Set(members.map((m) => m.group_number))].sort(
    (a, b) => a - b,
  )
  const nameOf = (member: GroupAssignment) => {
    const player = players.find((p) => p.id === member.participant_id)
    return player
      ? `${player.full_name} · ${playerSubtitle(player).split(" · ")[1]}`
      : "Unknown player"
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {numbers.map((number) => {
        const group = members.filter((m) => m.group_number === number)
        const halves = group.some((m) => m.half)
          ? (["A", "B"] as const)
          : ([null] as const)
        return (
          <div
            className="rounded-xl border border-white/8 bg-white/2 p-4"
            key={number}
          >
            <p className="flex items-center justify-between text-sm font-semibold text-gold">
              Group {number}
              <span className="text-xs font-normal text-white/30">
                {group.length} players
              </span>
            </p>
            {halves.map((half) => (
              <div key={half ?? "all"}>
                {half && (
                  <p className="mt-3 text-[10px] uppercase tracking-widest text-white/35">
                    Team {number}
                    {half}
                  </p>
                )}
                <ul className="mt-2 space-y-1 text-xs text-white/65">
                  {group
                    .filter((m) => m.half === half)
                    .map((member) => (
                      <li key={member.participant_id}>{nameOf(member)}</li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function GroupsPanel({
  players,
  games,
  currentRound,
  refetchData,
  setNotice,
}: {
  players: Player[]
  games: Game[]
  currentRound: GroupRound | null
  refetchData: () => Promise<void>
  setNotice: (notice: string) => void
}) {
  const [name, setName] = useState("")
  const [mode, setMode] = useState<"size" | "count">("size")
  const [value, setValue] = useState("8")
  const [onlyPresent, setOnlyPresent] = useState(true)
  const [draft, setDraft] = useState<GroupAssignment[] | null>(null)
  const [saving, setSaving] = useState(false)

  const present = players.filter((player) => player.checked_in_at)
  const eligible = onlyPresent ? present : players
  const number = Math.max(1, Math.floor(Number(value)) || 1)
  const groupCount =
    mode === "count"
      ? number
      : Math.max(1, Math.round(eligible.length / number))

  const sizesOf = (members: GroupAssignment[]) => {
    const sizes = new Map<number, number>()
    for (const m of members)
      sizes.set(m.group_number, (sizes.get(m.group_number) ?? 0) + 1)
    const values = [...sizes.values()]
    const min = Math.min(...values)
    const max = Math.max(...values)
    return `${members.length} players → ${values.length} group${
      values.length > 1 ? "s" : ""
    } of ${min === max ? min : `${min}–${max}`}`
  }

  const preview = () => {
    if (!eligible.length) {
      setNotice(
        onlyPresent
          ? "⚠️ Nobody has checked in yet."
          : "⚠️ There are no players yet.",
      )
      return
    }
    setDraft(makeGroups(eligible, groupCount))
  }

  // Saves a round and its members; the newest round is the current one
  const publish = async (roundName: string, members: GroupAssignment[]) => {
    setSaving(true)
    const { data: round, error } = await supabase
      .from("group_rounds")
      .insert({ name: roundName })
      .select()
      .single()
    if (error || !round) {
      setSaving(false)
      setNotice(`⚠️ Could not create the round: ${error?.message}`)
      return false
    }
    const { error: membersError } = await supabase
      .from("group_members")
      .insert(members.map((m) => ({ ...m, round_id: round.id })))
    if (membersError) {
      await supabase.from("group_rounds").delete().eq("id", round.id)
      setSaving(false)
      setNotice(`⚠️ Could not save the groups: ${membersError.message}`)
      return false
    }
    await refetchData()
    setSaving(false)
    return true
  }

  const confirmDraft = async () => {
    if (!draft) return
    const roundName = name.trim() || "Groups"
    if (await publish(roundName, draft)) {
      setDraft(null)
      setName("")
      setNotice(`Groups published for "${roundName}". Phones are updated.`)
    }
  }

  const current = currentRound?.group_members ?? []
  const isSplit = current.some((m) => m.half)
  // Checked-in players who arrived after the current round was made
  const latecomers = currentRound
    ? present.filter((p) => !current.some((m) => m.participant_id === p.id))
    : []

  const splitCurrent = async () => {
    if (!currentRound) return
    const roundName = prompt(
      "Name of the new round (each group becomes teams A and B):",
      "Startup Fail Fest",
    )
    if (!roundName?.trim()) return
    if (await publish(roundName.trim(), splitGroups(current, players))) {
      setNotice(`Teams published for "${roundName.trim()}".`)
    }
  }

  // Each latecomer joins the smallest group (and its smallest team)
  const placeLatecomers = async () => {
    if (!currentRound || !latecomers.length) return
    const placed: GroupAssignment[] = [...current]
    const added: GroupAssignment[] = []
    for (const player of latecomers) {
      const numbers = [...new Set(placed.map((m) => m.group_number))]
      const sizeOf = (n: number, half: GroupAssignment["half"]) =>
        placed.filter(
          (m) => m.group_number === n && (half === null || m.half === half),
        ).length
      const groupNumber = numbers.sort(
        (a, b) => sizeOf(a, null) - sizeOf(b, null) || a - b,
      )[0]
      const half = !isSplit
        ? null
        : sizeOf(groupNumber, "A") <= sizeOf(groupNumber, "B")
          ? "A"
          : "B"
      const member = {
        participant_id: player.id,
        group_number: groupNumber,
        half,
      } as GroupAssignment
      placed.push(member)
      added.push(member)
    }
    setSaving(true)
    const { error } = await supabase
      .from("group_members")
      .insert(added.map((m) => ({ ...m, round_id: currentRound.id })))
    setSaving(false)
    if (error) {
      setNotice(`⚠️ Could not place latecomers: ${error.message}`)
    } else {
      setNotice(`${added.length} latecomer${added.length > 1 ? "s" : ""} placed.`)
      await refetchData()
    }
  }

  const deleteCurrent = async () => {
    if (!currentRound) return
    if (
      !confirm(
        `Delete the round "${currentRound.name}"? The previous round, if any, becomes the current one.`,
      )
    )
      return
    const { error } = await supabase
      .from("group_rounds")
      .delete()
      .eq("id", currentRound.id)
    if (error) {
      setNotice(`⚠️ Could not delete the round: ${error.message}`)
    } else {
      await refetchData()
    }
  }

  return (
    <div className="space-y-5">
      <div className="admin-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl text-white">New round</h2>
            <p className="mt-1 text-xs text-white/35">
              {present.length} of {players.length} players checked in. Groups
              are random with years mixed, and never hold money.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="field-label lg:col-span-2">
            Round name
            <input
              className="field-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sell Me This Pen"
              list="round-names"
            />
            <datalist id="round-names">
              {games.map((g) => (
                <option value={g.name} key={g.id} />
              ))}
            </datalist>
          </label>
          <label className="field-label">
            Make groups by
            <select
              className="field-control"
              value={mode}
              onChange={(e) => {
                setMode(e.target.value as "size" | "count")
                setDraft(null)
              }}
            >
              <option value="size">Players per group</option>
              <option value="count">Number of groups</option>
            </select>
          </label>
          <label className="field-label">
            {mode === "size" ? "Players per group" : "Number of groups"}
            <input
              className="field-control"
              type="number"
              min="1"
              value={value}
              onChange={(e) => {
                setValue(e.target.value)
                setDraft(null)
              }}
            />
          </label>
        </div>
        <label className="mt-4 flex items-center gap-2 text-xs text-white/55">
          <input
            type="checkbox"
            checked={onlyPresent}
            onChange={(e) => {
              setOnlyPresent(e.target.checked)
              setDraft(null)
            }}
          />
          Only players who checked in ({present.length})
        </label>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={preview}>
            <Sparkles size={15} /> {draft ? "Reshuffle" : "Preview groups"}
          </Button>
          {draft && (
            <>
              <Button onClick={confirmDraft} disabled={saving}>
                <Check size={15} /> {saving ? "Publishing..." : "Publish groups"}
              </Button>
              <span className="text-xs text-white/45">{sizesOf(draft)}</span>
            </>
          )}
        </div>
        {draft && (
          <div className="mt-5 border-t border-white/8 pt-5">
            <p className="mb-3 text-xs text-gold">
              Preview only. Nothing is saved until you publish.
            </p>
            <GroupGrid members={draft} players={players} />
          </div>
        )}
      </div>

      <div className="admin-card">
        {currentRound ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/30">
                  Current round
                </p>
                <h2 className="font-display text-xl text-white">
                  {currentRound.name}
                </h2>
                <p className="mt-1 text-xs text-white/35">{sizesOf(current)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {latecomers.length > 0 && (
                  <Button onClick={placeLatecomers} disabled={saving}>
                    <Plus size={15} /> Place {latecomers.length} latecomer
                    {latecomers.length > 1 ? "s" : ""}
                  </Button>
                )}
                {!isSplit && (
                  <Button
                    variant="secondary"
                    onClick={splitCurrent}
                    disabled={saving}
                  >
                    Split each group in two
                  </Button>
                )}
                <Button variant="danger" onClick={deleteCurrent}>
                  Delete round
                </Button>
              </div>
            </div>
            <div className="mt-5">
              <GroupGrid members={current} players={players} />
            </div>
          </>
        ) : (
          <p className="text-sm text-white/35">
            No groups yet. Create a round above when a game needs groups.
          </p>
        )}
      </div>
    </div>
  )
}

// Printable QR code that sends students to the register / check-in page
function PosterPanel() {
  const [url, setUrl] = useState(`${window.location.origin}${paths.register}`)

  // Drawn locally as one SVG path: a square per dark module
  const qr = useMemo(() => {
    try {
      const { modules } = QRCode.create(url.trim() || " ", {
        errorCorrectionLevel: "M",
      })
      let path = ""
      for (let row = 0; row < modules.size; row++) {
        for (let col = 0; col < modules.size; col++) {
          if (modules.get(row, col)) path += `M${col} ${row}h1v1h-1z`
        }
      }
      return { size: modules.size, path }
    } catch {
      return null
    }
  }, [url])

  return (
    <div className="space-y-5">
      <div className="admin-card print:hidden">
        <h2 className="font-display text-xl text-white">Entrance QR code</h2>
        <p className="mt-1 text-xs text-white/35">
          Students scan it to register or to tap "I'm here". Check that the
          link is the public site address before printing.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <input
            className="field-control mt-0! min-w-0 flex-1"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            aria-label="Link encoded in the QR code"
          />
          <Button onClick={() => window.print()} disabled={!qr}>
            <Printer size={15} /> Print poster
          </Button>
        </div>
      </div>
      <div className="print-area mx-auto flex max-w-xl flex-col items-center rounded-3xl bg-white p-10 text-center text-ink">
        <img src={logo} alt="EBEC" className="size-16 rounded-xl object-cover" />
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-ink/50">
          EBEC Open Day
        </p>
        <h2 className="mt-2 font-display text-4xl font-semibold">
          Wall Street Night
        </h2>
        <p className="mt-3 text-lg font-medium">Scan to join the market</p>
        {qr ? (
          <svg
            viewBox={`-2 -2 ${qr.size + 4} ${qr.size + 4}`}
            className="mt-6 w-full max-w-sm"
            shapeRendering="crispEdges"
            role="img"
            aria-label={`QR code for ${url}`}
          >
            <path d={qr.path} fill="#071426" />
          </svg>
        ) : (
          <p className="mt-6 text-sm text-loss">
            This link is too long for a QR code.
          </p>
        )}
        <ol className="mt-6 space-y-1 text-left text-sm text-ink/70">
          <li>1. Scan the code with your phone camera</li>
          <li>2. Register, or tap "I'm here" if you already did</li>
          <li>3. Keep your trader code: you need it at every game</li>
        </ol>
        <p className="mt-5 break-all font-mono text-xs text-ink/45">{url}</p>
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
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)

  const addGame = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    if (games.some((g) => g.name.toLowerCase() === trimmed.toLowerCase())) {
      alert("A game with this name already exists.")
      return
    }
    setSaving(true)
    const { error } = await supabase
      .from("games")
      .insert({ name: trimmed, status: "upcoming" })
    setSaving(false)
    if (error) {
      alert(`Error adding game: ${error.message}`)
    } else {
      setName("")
      await refetchData()
    }
  }

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

  const removeGame = async (game: Game) => {
    if (
      !confirm(
        `Delete "${game.name}"? Money already awarded for it is kept and shown as "Other".`,
      )
    )
      return
    const { error } = await supabase.from("games").delete().eq("id", game.id)
    if (error) {
      alert(`Error deleting game: ${error.message}`)
    } else {
      await refetchData()
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={addGame} className="admin-card">
        <h2 className="font-display text-xl text-white">Add a game</h2>
        <p className="mt-1 text-xs text-white/35">
          For example a department station. It appears in the banker's game
          list right away.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <input
            className="field-control mt-0! min-w-0 flex-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Station: Design"
            aria-label="Game name"
          />
          <Button type="submit" disabled={saving || !name.trim()}>
            <Plus size={15} /> {saving ? "Adding..." : "Add game"}
          </Button>
        </div>
      </form>
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
            <div className="mt-5 flex items-end justify-between gap-3">
              <h2 className="font-display text-xl text-white">{game.name}</h2>
              <Button variant="danger" onClick={() => removeGame(game)}>
                Delete
              </Button>
            </div>
          </div>
        ))}
        {games.length === 0 && (
          <p className="text-sm text-white/30">No games yet.</p>
        )}
      </div>
    </div>
  )
}

function ActivityPanel({
  transactions,
  players,
  games,
}: {
  transactions: Transaction[]
  players: Player[]
  games: Game[]
}) {
  const playerOf = (item: Transaction) =>
    players.find((p) => p.id === item.participant_id)
  const gameOf = (item: Transaction) =>
    games.find((g) => g.id === item.game_id)?.name || "Other"

  const exportCsv = () => {
    const quote = (value: string) => `"${value.replace(/"/g, '""')}"`
    const csv = [
      "time,code,player,game,note,amount",
      ...transactions.map((item) =>
        [
          item.created_at,
          playerOf(item)?.code || "",
          quote(playerOf(item)?.full_name || "Unknown"),
          quote(gameOf(item)),
          quote(item.note || ""),
          item.amount,
        ].join(","),
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
          <p className="text-xs text-white/30">
            Latest {transactions.length} transactions
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={exportCsv}
          disabled={!transactions.length}
        >
          <Download size={15} /> Export CSV
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="border-b border-white/8 text-[10px] uppercase tracking-widest text-white/30">
            <tr>
              <th className="py-3">Time</th>
              <th>Player</th>
              <th>Game</th>
              <th className="text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/6">
            {transactions.map((item) => {
              const amount = Number(item.amount)
              const player = playerOf(item)
              return (
                <tr key={item.id}>
                  <td className="py-4 text-white/35">
                    {new Date(item.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="text-white">
                    {player?.full_name || "Unknown player"}
                    <span className="ml-2 font-mono text-xs text-white/30">
                      {player?.code}
                    </span>
                  </td>
                  <td className="text-white/50">
                    {gameOf(item)}
                    {item.note && (
                      <span className="text-white/30"> · {item.note}</span>
                    )}
                  </td>
                  <td
                    className={`text-right font-mono ${
                      amount < 0 ? "text-loss" : "text-gain"
                    }`}
                  >
                    {formatSigned(amount)}
                  </td>
                </tr>
              )
            })}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-xs text-white/30">
                  No transactions recorded yet.
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

// "/portfolio/WS-4821" -> "WS-4821"
const codeFromPath = (): string | null =>
  normalizeCode(window.location.pathname.split("/")[2] ?? "")

export default function App() {
  const [page, setPage] = useState<Page>(pageFromPath)
  const [selectedCode, setSelectedCode] = useState<string | null>(codeFromPath)
  const [balances, setBalances] = useState<PlayerBalance[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [startingCapital, setStartingCapital] = useState(
    DEFAULT_STARTING_CAPITAL,
  )
  const [isLeaderboardAccessible, setIsLeaderboardAccessible] =
    useState<boolean>(false)
  const [gameStatus, setGameStatus] = useState<GameStatus>("setup")
  const [registrationOpensAt, setRegistrationOpensAt] = useState(
    () => new Date(DEFAULT_REGISTRATION_OPENS_AT),
  )
  const [checkinOpensAt, setCheckinOpensAt] = useState(
    () => new Date(DEFAULT_CHECKIN_OPENS_AT),
  )
  const [currentRound, setCurrentRound] = useState<GroupRound | null>(null)
  const [, setLoadingInitial] = useState(true)
  const refetchTimer = useRef<number | null>(null)
  // The player registered on this phone, if any
  const [registration, setRegistration] = useState(loadRegistration)

  // Forget a saved registration whose player no longer exists (deleted by an
  // admin). Only a successful "not found" clears it, never a failed request.
  useEffect(() => {
    const saved = loadRegistration()
    if (!saved) return
    supabase
      .from("player_balances")
      .select("id")
      .eq("id", saved.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error && !data) {
          clearRegistration()
          setRegistration(null)
        }
      })
  }, [])

  // Navigation sync with browser history
  useEffect(() => {
    const onPop = () => {
      setPage(pageFromPath())
      setSelectedCode(codeFromPath())
    }
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [])

  // Fetch all Supabase data
  const fetchData = async () => {
    try {
      const [
        balancesRes,
        transactionsRes,
        gamesRes,
        participantsRes,
        settingsRes,
        roundRes,
      ] = await Promise.all([
          supabase.from("player_balances").select("*"),
          // Latest movements only; balances come from the view above
          supabase
            .from("transactions")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(300),
          supabase.from("games").select("*").order("created_at"),
          // Emails and phones are only readable (and needed) by admins
          pageFromPath() === "admin"
            ? supabase.from("participants").select("*")
            : Promise.resolve({ data: null }),
          // select("*") so this still works before registration_opens_at exists
          supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
          // The current round is the most recent one, with its members
          supabase
            .from("group_rounds")
            .select("*, group_members(*)")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ])

      if (balancesRes.data) setBalances(balancesRes.data)
      if (transactionsRes.data) setTransactions(transactionsRes.data)
      if (gamesRes.data) setGames(gamesRes.data)
      if (participantsRes.data) setParticipants(participantsRes.data)
      if (!roundRes.error) setCurrentRound(roundRes.data)

      if (settingsRes.data) {
        setIsLeaderboardAccessible(
          Boolean(settingsRes.data.is_leaderboard_accessible),
        )
        if (settingsRes.data.game_status) {
          setGameStatus(settingsRes.data.game_status as GameStatus)
        }
        if (settingsRes.data.registration_opens_at) {
          setRegistrationOpensAt(
            new Date(settingsRes.data.registration_opens_at),
          )
        }
        if (settingsRes.data.checkin_opens_at) {
          setCheckinOpensAt(new Date(settingsRes.data.checkin_opens_at))
        }
        if (settingsRes.data.starting_capital) {
          setStartingCapital(Number(settingsRes.data.starting_capital))
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

  // Realtime subscription on transactions, participants, games, settings.
  // A banker entry for a group arrives as several events, so refetch once.
  useEffect(() => {
    const scheduleRefetch = () => {
      if (refetchTimer.current) window.clearTimeout(refetchTimer.current)
      refetchTimer.current = window.setTimeout(fetchData, 400)
    }

    const channel = supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        scheduleRefetch,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "participants" },
        scheduleRefetch,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "games" },
        scheduleRefetch,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_rounds" },
        scheduleRefetch,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_members" },
        scheduleRefetch,
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
            if (
              "registration_opens_at" in payload.new &&
              payload.new.registration_opens_at
            ) {
              setRegistrationOpensAt(
                new Date(payload.new.registration_opens_at),
              )
            }
          }
          scheduleRefetch()
        },
      )
      .subscribe()

    return () => {
      if (refetchTimer.current) window.clearTimeout(refetchTimer.current)
      supabase.removeChannel(channel)
    }
  }, [])

  const navigate = (next: Page) => {
    window.history.pushState({}, "", paths[next])
    setSelectedCode(null)
    setPage(next)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const openPlayer = (player: Player) => {
    window.history.pushState({}, "", `${paths.portfolio}/${player.code}`)
    setSelectedCode(player.code)
    setPage("portfolio")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Ranked players, richest first
  const players = useMemo(
    () => rankPlayers(balances, startingCapital),
    [balances, startingCapital],
  )

  const myId = registration?.id ?? null

  // Portfolio shows the player in the URL, otherwise this phone's player
  const shownPlayer =
    (selectedCode
      ? players.find((player) => player.code === selectedCode)
      : players.find((player) => player.id === myId)) ?? null

  return (
    <div className="min-h-screen bg-ink text-white">
      <Navbar
        navigate={navigate}
        isLeaderboardAccessible={isLeaderboardAccessible}
      />
      {page === "home" && (
        <Landing
          navigate={navigate}
          players={players}
          transactions={transactions}
        />
      )}
      {page === "register" && (
        <Registration
          navigate={navigate}
          onRegistered={fetchData}
          opensAt={registrationOpensAt}
          checkinOpensAt={checkinOpensAt}
          gameStatus={gameStatus}
          registration={registration}
          setRegistration={setRegistration}
          players={players}
          currentRound={currentRound}
        />
      )}
      {/* The Portfolio page shares the leaderboard lock */}
      {(page === "leaderboard" ||
        (page === "portfolio" && !isLeaderboardAccessible)) && (
        <Leaderboard
          players={players}
          transactions={transactions}
          openPlayer={openPlayer}
          isAccessible={isLeaderboardAccessible}
          gameStatus={gameStatus}
          navigate={navigate}
          myId={myId}
          currentRound={currentRound}
        />
      )}
      {page === "portfolio" && isLeaderboardAccessible && (
        <PlayerPage
          player={shownPlayer}
          totalPlayers={players.length}
          startingCapital={startingCapital}
          games={games}
          isMe={shownPlayer !== null && shownPlayer.id === myId}
          navigate={navigate}
          groupCard={
            shownPlayer !== null &&
            shownPlayer.id === myId && (
              <MyGroupCard
                round={currentRound}
                players={players}
                myId={myId}
              />
            )
          }
        />
      )}
      {page === "admin" && (
        <Admin
          players={players}
          transactions={transactions}
          games={games}
          participants={participants}
          currentRound={currentRound}
          isLeaderboardAccessible={isLeaderboardAccessible}
          gameStatus={gameStatus}
          refetchData={fetchData}
        />
      )}
      {page !== "admin" && <Footer navigate={navigate} />}
    </div>
  )
}
