export type GameStatus = "setup" | "live" | "ended"

export interface Team {
  id: string
  name: string
  ticker: string
  starting_capital: number
  created_at: string
  members?: number
  netWorth?: number
  change?: number
  history?: number[]
  initialRank?: number
  lastAction?: string
}

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

export interface ScoreEvent {
  id: string
  team_id: string
  game_id: string | null
  type: "bonus" | "penalty"
  amount: number
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

export const calculateNetWorth = (team: Team, events: ScoreEvent[] = []) => {
  const starting = Number(team.starting_capital) || 100000
  const deltas = events
    .filter((event) => event.team_id === team.id)
    .reduce(
      (sum, event) =>
        sum + (event.type === "penalty" ? -Number(event.amount) : Number(event.amount)),
      0,
    )
  return starting + deltas
}

export const formatMoney = (amount: number = 0) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount)

export function getLastAction(
  teamId: string,
  events: ScoreEvent[] = [],
  defaultAction?: string,
): { text: string; type: "bonus" | "penalty" | "neutral" } {
  const teamEvents = events.filter((event) => event.team_id === teamId)
  if (teamEvents.length === 0) {
    return {
      text: defaultAction || "Registered",
      type: "neutral",
    }
  }
  const latest = teamEvents[0]
  if (latest.type === "bonus") {
    return {
      text: `Got bonus (+${formatMoney(latest.amount)})`,
      type: "bonus",
    }
  } else {
    return {
      text: `Got penalized (-${formatMoney(latest.amount)})`,
      type: "penalty",
    }
  }
}

export function getRankChange(
  initialRank: number,
  currentRank: number,
): { text: string; diff: number } {
  const diff = initialRank - currentRank
  if (diff > 0) {
    return {
      text: `Climbed by ${diff} rank${diff > 1 ? "s" : ""}`,
      diff,
    }
  } else if (diff < 0) {
    const abs = Math.abs(diff)
    return {
      text: `Went down by ${abs} rank${abs > 1 ? "s" : ""}`,
      diff,
    }
  } else {
    return { text: "No change", diff: 0 }
  }
}
