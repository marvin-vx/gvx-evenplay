import {
  mockMinimumStake,
  roundMoney,
  type ConnectionFailure,
  type Conditions,
  type Eligibility,
  type Outcome,
  type PracticeShot,
  type PlayerProfile,
  type Result,
  type Service,
  type Shot,
  type Stage,
} from "./prototype.ts"
import { mockConditions, mockConnectionFailure, mockPlayerProfile, mockResult } from "./mockEvenplay.ts"

export type SessionState = {
  stage: Stage
  session: boolean
  online: boolean
  eligibility: Eligibility
  balance: number | null
  conditions: Conditions | null
  displayConditions: Conditions | null
  pendingConditions: ConditionsAction | null
  shot: Shot | null
  practiceShot: PracticeShot | null
  result: Result | null
  previousResult: Result | null
  sensorReady: boolean
  shotNumber: number
  sequence: number
  qrVersion: number
  connectionFailure: ConnectionFailure | null
  player: PlayerProfile | null
  connectionNoticeVersion: number
  participated: boolean
  endRequested: boolean
  ballDistance: number
  resultSubmissions: number
  service: Service
  shopService: Service
  shortGame: boolean
  visited: Stage[]
}
export const createSession = (): SessionState => ({
  stage: "entry",
  session: false,
  online: false,
  eligibility: "pending",
  balance: null,
  conditions: null,
  displayConditions: null,
  pendingConditions: null,
  shot: null,
  practiceShot: null,
  result: null,
  previousResult: null,
  sensorReady: false,
  shotNumber: 1,
  sequence: 0,
  qrVersion: 1,
  connectionFailure: null,
  player: null,
  connectionNoticeVersion: 0,
  participated: false,
  endRequested: false,
  ballDistance: 50,
  resultSubmissions: 0,
  service: "enabled",
  shopService: "enabled",
  shortGame: true,
  visited: ["entry"],
})
export function isLocked(state: SessionState) {
  return (
    ["connecting", "shot", "rolling", "judging", "practice"].includes(state.stage) ||
    state.practiceShot !== null ||
    (state.shot !== null && state.result === null)
  )
}
export function canEnter(state: SessionState) {
  return state.shopService === "enabled" && state.service === "enabled" && state.shortGame
}
export function shouldShowEntryBanner(state: SessionState) {
  return (
    state.stage === "entry" &&
    !state.session &&
    canEnter(state) &&
    !state.sensorReady &&
    !state.participated
  )
}
export function canShoot(state: SessionState) {
  return (
    state.stage === "ready" &&
    state.session &&
    state.online &&
    !state.endRequested &&
    state.eligibility === "eligible" &&
    state.sensorReady &&
    !!state.conditions &&
    state.balance !== null &&
    state.conditions.stake >= state.conditions.minimumStake &&
    state.balance >= state.conditions.stake &&
    !isLocked(state)
  )
}
export function getReadyIndicators(state: SessionState) {
  const betReady = canShoot(state)
  // Synchronize the display, not the physical sensor used by no-bet practice.
  return {
    gvxReady: state.session ? betReady : state.sensorReady,
    betReady,
  }
}
export function canPractice(state: SessionState) {
  return (
    ["entry", "qr", "connectionfailed", "connected", "updating", "insufficient", "reconnecting"].includes(state.stage) &&
    state.sensorReady &&
    !state.endRequested &&
    !isLocked(state)
  )
}
function at(state: SessionState, stage: Stage): SessionState {
  return {
    ...state,
    stage,
    visited: state.visited.includes(stage)
      ? state.visited
      : [...state.visited, stage],
  }
}
function endSession(state: SessionState): SessionState {
  return at(
    {
      ...state,
      session: false,
      online: false,
      conditions: null,
      displayConditions: null,
      pendingConditions: null,
      shot: null,
      practiceShot: null,
      result: null,
      previousResult: null,
      balance: null,
      eligibility: "pending",
      player: null,
      connectionFailure: null,
      endRequested: false,
      resultSubmissions: 0,
      qrVersion: state.qrVersion + 1,
      shotNumber: 1,
    },
    "entry",
  )
}
interface SimpleAction {
  type: "RESET" | "START" | "CLOSE_QR" | "REQUEST_CONNECTION" | "NEXT" | "END" | "REQUEST_END" | "DISCONNECT" | "RECONNECT" | "INSUFFICIENT" | "TOPUP"
}
interface ConnectAction {
  type: "CONNECT"
  qrVersion: number
  eligibility: Eligibility
  player?: PlayerProfile
}
interface ConnectionFailedAction {
  type: "CONNECTION_FAILED"
  qrVersion: number
  failure: ConnectionFailure
}
interface EligibilityAction {
  type: "ELIGIBILITY"
  value: Eligibility
}
interface ConditionsAction {
  type: "CONDITIONS"
  conditions: Conditions
  shotNumber: number
  balance?: number
}
interface BalanceAction {
  type: "BALANCE"
  balance: number
  minimumStake: number
}
interface SensorAction {
  type: "SENSOR"
  ready: boolean
}
interface ShootAction {
  type: "SHOOT"
  outcome: Outcome
}
interface LandedAction {
  type: "LANDED" | "STOPPED" | "PRACTICE_STOPPED"
  shotId: string
}
interface ResultAction {
  type: "RESULT"
  result: Result
}
interface ServiceAction {
  type: "SERVICE" | "SHOP_SERVICE"
  value: Service
}
interface ModeAction {
  type: "MODE"
  shortGame: boolean
}
interface PreviewAction {
  type: "PREVIEW"
  stage: Stage
  outcome?: Outcome
}
export type Action = SimpleAction | ConnectAction | ConnectionFailedAction | EligibilityAction | ConditionsAction | BalanceAction | SensorAction | ShootAction | LandedAction | ResultAction | ServiceAction | ModeAction | PreviewAction

export function sessionReducer(
  state: SessionState,
  action: Action,
): SessionState {
  // A queued end may only settle/recover the current shot, never start a new bet.
  if (
    state.endRequested &&
    !["END", "NEXT", "LANDED", "STOPPED", "PRACTICE_STOPPED", "RESULT", "DISCONNECT", "RECONNECT"].includes(
      action.type,
    )
  )
    return state
  switch (action.type) {
    case "RESET":
      return isLocked(state)
        ? state
        : { ...createSession(), qrVersion: state.qrVersion + 1 }
    case "START":
      return ["entry", "connectionfailed"].includes(state.stage) && canEnter(state)
        ? at(
            {
              ...state,
              qrVersion: state.qrVersion + 1,
              connectionFailure: null,
            },
            "qr",
          )
        : state
    case "CLOSE_QR":
      return ["qr", "connecting", "connectionfailed"].includes(state.stage)
        ? at(
            {
              ...state,
              qrVersion: state.qrVersion + 1,
              connectionFailure: null,
            },
            "entry",
          )
        : state
    case "REQUEST_CONNECTION":
      return state.stage === "qr" && canEnter(state)
        ? at({ ...state, connectionFailure: null }, "connecting")
        : state
    case "CONNECTION_FAILED":
      return state.stage === "connecting" && action.qrVersion === state.qrVersion
        ? at(
            {
              ...state,
              qrVersion: state.qrVersion + 1,
              connectionFailure: action.failure,
              player: null,
            },
            "connectionfailed",
          )
        : state
    case "CONNECT":
      if (
        state.stage !== "connecting" ||
        action.qrVersion !== state.qrVersion ||
        !canEnter(state)
      )
        return state
      return at(
        {
          ...state,
          session: true,
          online: true,
          eligibility: action.eligibility,
          participated: state.participated || action.eligibility === "eligible",
          balance: null,
          connectionFailure: null,
          player: action.player ?? null,
          connectionNoticeVersion: state.connectionNoticeVersion + 1,
        },
        "connected",
      )
    case "ELIGIBILITY":
      if (isLocked(state) || !state.session) return state
      return at(
        {
          ...state,
          eligibility: action.value,
          participated: state.participated || action.value === "eligible",
          conditions: null,
        },
        "connected",
      )
    case "CONDITIONS": {
      // Conditions received during a non-betting shot take effect only after it stops.
      const receivingStage = state.practiceShot?.resumeStage ?? state.stage
      if (
        !["connected", "updating"].includes(receivingStage) ||
        (isLocked(state) && !state.practiceShot) ||
        !state.online ||
        state.endRequested ||
        state.eligibility !== "eligible" ||
        action.shotNumber !== state.shotNumber
      )
        return state
      if (
        !Number.isFinite(action.conditions.stake) ||
        !Number.isFinite(action.conditions.minimumStake) ||
        action.conditions.minimumStake <= 0 ||
        action.conditions.stake < 0
      )
        return state
      if (state.practiceShot) return { ...state, pendingConditions: action }
      const balance = action.balance ?? state.balance ?? 100
      if (!Number.isFinite(balance) || balance < 0) return state
      if (
        balance < action.conditions.minimumStake ||
        balance < action.conditions.stake ||
        action.conditions.stake < action.conditions.minimumStake
      )
        return at(
          {
            ...state,
            balance,
            conditions: null,
            pendingConditions: null,
          },
          "insufficient",
        )
      return at(
        {
          ...state,
          conditions: action.conditions,
          displayConditions: action.conditions,
          pendingConditions: null,
          ballDistance: action.conditions.target,
          participated: true,
          balance,
        },
        "ready",
      )
    }
    case "BALANCE":
      if (
        !state.session ||
        isLocked(state) ||
        !Number.isFinite(action.balance) ||
        action.balance < 0
      )
        return state
      return at(
        {
          ...state,
          balance: roundMoney(action.balance),
          conditions: null,
          pendingConditions: null,
          shot: null,
          result: null,
          resultSubmissions: 0,
        },
        action.balance < action.minimumStake ? "insufficient" : "updating",
      )
    case "SENSOR":
      return isLocked(state) ? state : { ...state, sensorReady: action.ready }
    case "SHOOT":
      if (canPractice(state))
        return at(
          {
            ...state,
            sequence: state.sequence + 1,
            practiceShot: {
              id: `practice-${state.qrVersion}-${state.sequence + 1}`,
              resumeStage: state.stage,
            },
          },
          "practice",
        )
      if (!canShoot(state) || !state.conditions || state.balance === null)
        return state
      return at(
        {
          ...state,
          result: null,
          previousResult: null,
          balance: roundMoney(state.balance - state.conditions.stake),
          resultSubmissions: 0,
          sequence: state.sequence + 1,
          shot: {
            id: `shot-${state.qrVersion}-${state.sequence + 1}`,
            conditions: state.conditions,
            outcome: action.outcome,
            openingBalance: state.balance,
          },
        },
        "shot",
      )
    case "LANDED":
      return state.stage === "shot" && state.shot?.id === action.shotId
        ? at(state, "rolling")
        : state
    case "STOPPED":
      return state.stage === "rolling" && state.shot?.id === action.shotId
        ? at(
            {
              ...state,
              sensorReady: false,
              resultSubmissions: state.online ? state.resultSubmissions + 1 : state.resultSubmissions,
            },
            "judging",
          )
        : state
    case "PRACTICE_STOPPED": {
      if (state.stage !== "practice" || state.practiceShot?.id !== action.shotId)
        return state
      if (state.endRequested) return endSession({ ...state, sensorReady: false })
      const pending = state.pendingConditions
      const resumed = at(
        { ...state, practiceShot: null, pendingConditions: null, sensorReady: false },
        state.practiceShot.resumeStage,
      )
      return pending ? sessionReducer(resumed, pending) : resumed
    }
    case "RESULT":
      if (
        !action.result ||
        state.stage !== "judging" ||
        !state.online ||
        !state.shot ||
        state.resultSubmissions === 0 ||
        action.result.shotId !== state.shot.id ||
        state.result ||
        ![1, 2, 3, 4, 5, 6, "none"].includes(action.result.band)
      )
        return state
      return at(
        {
          ...state,
          result: action.result,
          balance: action.result.balance,
          sensorReady: false,
        },
        "result",
      )
    case "NEXT":
      if (state.stage !== "result" || !state.result) return state
      if (state.endRequested) return endSession(state)
      return at(
        {
          ...state,
          shotNumber: state.shotNumber + 1,
          previousResult: state.result,
          result: null,
          shot: null,
          conditions: null,
          resultSubmissions: 0,
        },
        "updating",
      )
    case "REQUEST_END":
      return state.session && isLocked(state) && !state.endRequested
        ? { ...state, endRequested: true }
        : state
    case "END":
      return isLocked(state) || !state.session ? state : endSession(state)
    case "DISCONNECT":
      if (!state.session || !state.online) return state
      return at(
        {
          ...state,
          online: false,
          conditions: null,
          pendingConditions: null,
          practiceShot: state.practiceShot
            ? { ...state.practiceShot, resumeStage: "reconnecting" }
            : null,
        },
        isLocked(state) ? state.stage : "reconnecting",
      )
    case "RECONNECT":
      if (!state.session || state.online) return state
      if (state.practiceShot)
        return {
          ...state,
          online: true,
          practiceShot: { ...state.practiceShot, resumeStage: "updating" },
        }
      if (state.shot && !state.result)
        return {
          ...state,
          online: true,
          conditions: state.shot.conditions,
          resultSubmissions: state.stage === "judging"
            ? state.resultSubmissions + 1
            : state.resultSubmissions,
        }
      if (state.result)
        return at(
          {
            ...state,
            online: true,
            conditions: state.shot?.conditions ?? null,
          },
          "result",
        )
      return at(
        {
          ...state,
          online: true,
          shot: null,
          result: null,
          conditions: null,
          previousResult: state.result ?? state.previousResult,
        },
        "updating",
      )
    case "INSUFFICIENT":
      if (!state.session || isLocked(state)) return state
      return at(
        {
          ...state,
          balance: roundMoney((state.conditions?.minimumStake ?? mockMinimumStake) / 2),
          conditions: null,
          result: null,
          shot: null,
          pendingConditions: null,
          resultSubmissions: 0,
        },
        "insufficient",
      )
    case "TOPUP":
      return state.stage === "insufficient"
        ? at({ ...state, balance: 100 }, "updating")
        : state
    case "SERVICE":
    case "SHOP_SERVICE":
      return state.session || state.stage === "qr" || isLocked(state)
        ? state
        : action.type === "SHOP_SERVICE"
          ? { ...state, shopService: action.value }
          : { ...state, service: action.value }
    case "MODE":
      return state.session || state.stage === "qr" || isLocked(state)
        ? state
        : { ...state, shortGame: action.shortGame }
    case "PREVIEW": {
      if (isLocked(state) || state.endRequested) return state
      const base = {
        ...createSession(),
        qrVersion: state.qrVersion + 1,
        participated: state.participated,
      }
      if (action.stage === "entry") return base
      if (action.stage === "qr") return at(base, "qr")
      if (action.stage === "connecting" || action.stage === "connectionfailed") {
        const requested = sessionReducer(at(base, "qr"), { type: "REQUEST_CONNECTION" })
        return action.stage === "connecting"
          ? requested
          : sessionReducer(requested, {
              type: "CONNECTION_FAILED",
              qrVersion: requested.qrVersion,
              failure: mockConnectionFailure("server"),
            })
      }
      const connected = at(
        {
          ...base,
          session: true,
          online: true,
          eligibility: "eligible" as const,
          participated: true,
          player: mockPlayerProfile(),
          connectionNoticeVersion: state.connectionNoticeVersion + 1,
        },
        "connected",
      )
      if (action.stage === "connected") return connected
      if (action.stage === "practice")
        return sessionReducer({ ...connected, sensorReady: true }, {
          type: "SHOOT",
          outcome: action.outcome ?? "x2",
        })
      if (action.stage === "insufficient")
        return sessionReducer(connected, { type: "INSUFFICIENT" })
      if (action.stage === "reconnecting")
        return sessionReducer(connected, { type: "DISCONNECT" })
      if (action.stage === "updating")
        return at({ ...connected, balance: 100, shotNumber: 2 }, "updating")
      const ready = sessionReducer(connected, {
        type: "CONDITIONS",
        conditions: mockConditions(1),
        shotNumber: 1,
      })
      if (action.stage === "ready") return ready
      const shot = sessionReducer({ ...ready, sensorReady: true }, {
        type: "SHOOT",
        outcome: action.outcome ?? "x2",
      })
      if (action.stage === "shot") return shot
      if (!shot.shot) return ready
      const judging = sessionReducer(shot, {
        type: "LANDED",
        shotId: shot.shot.id,
      })
      if (action.stage === "rolling") return judging
      const stopped = sessionReducer(judging, {
        type: "STOPPED",
        shotId: shot.shot.id,
      })
      if (action.stage === "judging") return stopped
      return sessionReducer(stopped, {
        type: "RESULT",
        result: mockResult(shot.shot),
      })
    }
  }
}
