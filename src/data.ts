export type GameStatus = "setup" | "live" | "ended"
// replaced the team approach by a paricipent one.

export type ParticipantCategory = "ensia" | "other_school" | "guest"

export interface Participant {
  id: string
  full_name: string
  email?: string
  team_id: string | null
  created_at: string
  category?: ParticipantCategory
  school?: string | null
  study_year?: number | null
  student_number?: string | null
  phone?: string | null
  code?: string
}

export interface Game {
  id: string
  name: string
  weight: number
  status: "upcoming" | "live" | "done"
  created_at: string
}

// One money movement for one player; amount is signed (+ earned, - lost)
export interface Transaction {
  id: string
  participant_id: string
  game_id: string | null
  amount: number
  note: string | null
  batch_id: string | null
  created_at: string
}

// Row of the player_balances view
export interface PlayerBalance {
  id: string
  code: string
  full_name: string
  study_year: number | null
  balance: number
  transaction_count: number
  last_transaction_at: string | null
  category: ParticipantCategory
  school: string | null
  // Set once the player confirmed they are in the room ("I'm here")
  checked_in_at?: string | null
}

// One player's place in a round; half is A/B when groups were split in two
export interface GroupMember {
  round_id: string
  participant_id: string
  group_number: number
  half: "A" | "B" | null
}

// A round is one grouping of the room; the latest one is the current round
export interface GroupRound {
  id: string
  name: string
  created_at: string
  group_members: GroupMember[]
}

export type GroupAssignment = Omit<GroupMember, "round_id">

// A player as shown on the leaderboard: balance row + rank and change
export interface Player extends PlayerBalance {
  rank: number
  // Percent gained or lost against the starting capital
  change: number
}

export interface Settings {
  id: number
  is_leaderboard_accessible: boolean
  game_status: GameStatus
  registration_opens_at?: string // added for the countdown
  starting_capital?: number
  updated_at?: string
}

// Used until settings.registration_opens_at is available, supposed as monday
export const DEFAULT_REGISTRATION_OPENS_AT = "2026-10-05T00:00:00+01:00"

// Used until settings.checkin_opens_at is loaded: start of the event
export const DEFAULT_CHECKIN_OPENS_AT = "2026-10-07T17:00:00+01:00"

// Used until settings.starting_capital is loaded
export const DEFAULT_STARTING_CAPITAL = 10000

export const formatMoney = (amount: number = 0) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount)

// "+$500" / "−$1,000"
export const formatSigned = (amount: number) =>
  `${amount < 0 ? "−" : "+"}${formatMoney(Math.abs(amount))}`

// Richest first; ties are broken by name so the order is stable
export function rankPlayers(
  balances: PlayerBalance[],
  startingCapital: number,
): Player[] {
  return [...balances]
    .sort(
      (a, b) =>
        Number(b.balance) - Number(a.balance) ||
        a.full_name.localeCompare(b.full_name),
    )
    .map((row, index) => {
      const balance = Number(row.balance)
      return {
        ...row,
        balance,
        rank: index + 1,
        change:
          startingCapital > 0
            ? Number(
                (((balance - startingCapital) / startingCapital) * 100).toFixed(
                  1,
                ),
              )
            : 0,
      }
    })
}

export function playerSubtitle(player: {
  code?: string
  category?: ParticipantCategory
  study_year?: number | null
  school?: string | null
}) {
  const origin =
    player.category === "guest"
      ? "Guest"
      : player.category === "other_school"
        ? player.school || "Other school"
        : player.study_year
          ? `Year ${player.study_year}`
          : "ENSIA"
  return `${player.code ?? ""} · ${origin}`
}

// Trader codes look like WS-4821; bankers may type "4821" or "ws4821"
export function normalizeCode(input: string): string | null {
  const match = input.trim().match(/^(?:ws[-\s]?)?(\d{4})$/i)
  return match ? `WS-${match[1]}` : null
}

// Transactions are listed newest first
export function getLastAction(
  playerId: string,
  transactions: Transaction[] = [],
): { text: string; type: "bonus" | "penalty" | "neutral" } {
  const latest = transactions.find((item) => item.participant_id === playerId)
  if (!latest) return { text: "No trades yet", type: "neutral" }
  return {
    text: formatSigned(Number(latest.amount)),
    type: Number(latest.amount) < 0 ? "penalty" : "bonus",
  }
}

// "3" or "3A"
export const groupLabel = (member: Pick<GroupMember, "group_number" | "half">) =>
  `${member.group_number}${member.half ?? ""}`

function shuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// Players ordered year by year (then other schools, then guests), shuffled
// inside each bucket. Dealing this list out one by one gives every group an
// even share of each year.
function mixOrder(players: PlayerBalance[]): PlayerBalance[] {
  const bucketOf = (player: PlayerBalance) =>
    player.category === "guest"
      ? 7
      : player.category === "other_school"
        ? 6
        : (player.study_year ?? 0)
  const buckets = new Map<number, PlayerBalance[]>()
  for (const player of players) {
    const key = bucketOf(player)
    buckets.set(key, [...(buckets.get(key) ?? []), player])
  }
  return [...buckets.keys()]
    .sort((a, b) => a - b)
    .flatMap((key) => shuffle(buckets.get(key) ?? []))
}

// Random groups whose sizes differ by at most one, with years mixed
export function makeGroups(
  players: PlayerBalance[],
  groupCount: number,
): GroupAssignment[] {
  const count = Math.max(1, Math.min(Math.floor(groupCount), players.length))
  return mixOrder(players).map((player, index) => ({
    participant_id: player.id,
    group_number: (index % count) + 1,
    half: null,
  }))
}

// Splits every group into two teams (A and B), keeping years mixed
export function splitGroups(
  members: GroupAssignment[],
  players: PlayerBalance[],
): GroupAssignment[] {
  const numbers = [...new Set(members.map((m) => m.group_number))]
  return numbers.flatMap((groupNumber) => {
    const ids = members
      .filter((m) => m.group_number === groupNumber)
      .map((m) => m.participant_id)
    return mixOrder(players.filter((p) => ids.includes(p.id))).map(
      (player, index) => ({
        participant_id: player.id,
        group_number: groupNumber,
        half: index % 2 === 0 ? ("A" as const) : ("B" as const),
      }),
    )
  })
}
