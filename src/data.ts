export interface Team {
  id: string
  name: string
  ticker: string
  starting_capital: number
  created_at: string
  members: number
  netWorth: number
  change: number
  history: number[]
}

export interface Participant {
  id: string
  full_name: string
  email: string
  team_id: string
  created_at: string
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

const now = new Date()
const atMinutesAgo = (minutes: number) =>
  new Date(now.getTime() - minutes * 60_000).toISOString()

export const mockTeams: Team[] = [
  {
    id: "1",
    name: "Apex Capital",
    ticker: "APEX",
    starting_capital: 100000,
    created_at: atMinutesAgo(180),
    members: 4,
    netWorth: 124850,
    change: 12.4,
    history: [100, 104, 103, 109, 112, 117, 124],
  },
  {
    id: "2",
    name: "Bull & Bear Co.",
    ticker: "BBCO",
    starting_capital: 100000,
    created_at: atMinutesAgo(175),
    members: 5,
    netWorth: 121200,
    change: 9.8,
    history: [100, 102, 108, 107, 111, 118, 121],
  },
  {
    id: "3",
    name: "Golden Wolves",
    ticker: "GWLF",
    starting_capital: 100000,
    created_at: atMinutesAgo(165),
    members: 4,
    netWorth: 118600,
    change: 8.1,
    history: [100, 98, 104, 109, 108, 114, 118],
  },
  {
    id: "4",
    name: "Blue Chip Syndicate",
    ticker: "BLUE",
    starting_capital: 100000,
    created_at: atMinutesAgo(150),
    members: 3,
    netWorth: 114300,
    change: 5.6,
    history: [100, 102, 101, 106, 110, 112, 114],
  },
  {
    id: "5",
    name: "Venture Vultures",
    ticker: "VVCO",
    starting_capital: 100000,
    created_at: atMinutesAgo(140),
    members: 5,
    netWorth: 109850,
    change: -1.2,
    history: [100, 105, 108, 112, 111, 110, 109],
  },
  {
    id: "6",
    name: "Margin Callers",
    ticker: "MRGN",
    starting_capital: 100000,
    created_at: atMinutesAgo(130),
    members: 4,
    netWorth: 106400,
    change: 2.3,
    history: [100, 99, 101, 104, 103, 105, 106],
  },
  {
    id: "7",
    name: "The Rainmakers",
    ticker: "RAIN",
    starting_capital: 100000,
    created_at: atMinutesAgo(120),
    members: 4,
    netWorth: 103250,
    change: -0.8,
    history: [100, 102, 104, 103, 105, 104, 103],
  },
  {
    id: "8",
    name: "Cash Flow Kings",
    ticker: "CFKG",
    starting_capital: 100000,
    created_at: atMinutesAgo(110),
    members: 3,
    netWorth: 99800,
    change: -2.1,
    history: [100, 103, 101, 102, 100, 101, 99],
  },
]

export const mockParticipants: Participant[] = mockTeams.flatMap(
  (team, teamIndex) =>
    ["Maya Chen", "Liam Carter", "Sofia Mendes", "Noah Williams"]
      .slice(0, team.members)
      .map((name, index) => ({
        id: `${team.id}-${index}`,
        full_name: teamIndex
          ? `${name.split(" ")[0]} ${String.fromCharCode(65 + teamIndex)}.`
          : name,
        email: `member${teamIndex}${index}@example.com`,
        team_id: team.id,
        created_at: atMinutesAgo(100),
      })),
)

export const mockGames: Game[] = [
  {
    id: "g1",
    name: "Market Mayhem",
    weight: 1,
    status: "done",
    created_at: atMinutesAgo(200),
  },
  {
    id: "g2",
    name: "The Big Pitch",
    weight: 1.5,
    status: "live",
    created_at: atMinutesAgo(200),
  },
  {
    id: "g3",
    name: "Capital Rush",
    weight: 2,
    status: "upcoming",
    created_at: atMinutesAgo(200),
  },
  {
    id: "g4",
    name: "Closing Bell",
    weight: 2.5,
    status: "upcoming",
    created_at: atMinutesAgo(200),
  },
]

export const mockEvents: ScoreEvent[] = [
  {
    id: "e1",
    team_id: "1",
    game_id: "g2",
    type: "bonus",
    amount: 2500,
    created_at: atMinutesAgo(2),
  },
  {
    id: "e2",
    team_id: "3",
    game_id: "g2",
    type: "bonus",
    amount: 1800,
    created_at: atMinutesAgo(5),
  },
  {
    id: "e3",
    team_id: "5",
    game_id: "g1",
    type: "penalty",
    amount: 750,
    created_at: atMinutesAgo(8),
  },
  {
    id: "e4",
    team_id: "2",
    game_id: "g2",
    type: "bonus",
    amount: 1200,
    created_at: atMinutesAgo(11),
  },
  {
    id: "e5",
    team_id: "1",
    game_id: "g1",
    type: "bonus",
    amount: 1450,
    created_at: atMinutesAgo(18),
  },
  {
    id: "e6",
    team_id: "4",
    game_id: null,
    type: "bonus",
    amount: 500,
    created_at: atMinutesAgo(22),
  },
]

export const calculateNetWorth = (team: Team, events: ScoreEvent[]) =>
  team.netWorth +
  events
    .filter((event) => event.team_id === team.id)
    .reduce(
      (sum, event) =>
        sum + (event.type === "penalty" ? -event.amount : event.amount),
      0,
    )

export const formatMoney = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount)

export interface ScoreService {
  listTeams(): Promise<Team[]>
  listEvents(): Promise<ScoreEvent[]>
  addEvent(event: Omit<ScoreEvent, "id" | "created_at">): Promise<ScoreEvent>
  subscribe(callback: (event: ScoreEvent) => void): () => void
}

// Swap this preview service for a Supabase-backed implementation without changing the UI.
export const mockScoreService: ScoreService = {
  async listTeams() {
    return mockTeams
  },
  async listEvents() {
    return mockEvents
  },
  async addEvent(event) {
    return {
      ...event,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    }
  },
  subscribe() {
    return () => undefined
  },
}
