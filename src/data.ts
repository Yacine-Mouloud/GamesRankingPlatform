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
}

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
