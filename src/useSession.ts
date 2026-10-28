import { useCallback, useEffect, useReducer, useRef, useState } from "react"
import {
  canPractice,
  createSession,
  isLocked,
  sessionReducer,
  type Action,
} from "./engine"
import {
  initialLogs,
  makeLog,
  mockMinimumStake,
  mockTimingDefaults,
  money,
  resultLevel,
  stageInfo,
  type Eligibility,
  type ConnectionFailureReason,
  type LogEntry,
  type Outcome,
} from "./prototype"
import { mockConditions, mockConnectionFailure, mockPlayerProfile, mockResult } from "./mockEvenplay"

export function useSession() {
  const [state, dispatch] = useReducer(sessionReducer, undefined, createSession)
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs)
  const [outcome, setOutcome] = useState<Outcome>("x2")
  const [eligibility, setEligibility] = useState<Eligibility>("eligible")
  const [demo, setDemo] = useState(false)
  const [autoResponses, setAutoResponses] = useState(true)
  const [holdResult, setHoldResult] = useState(false)
  const [resultSeconds, setResultSeconds] = useState<number>(
    mockTimingDefaults.resultSeconds,
  )
  const [openingBalance, setOpeningBalance] = useState(100)
  const [minimumStake, setMinimumStake] = useState(mockMinimumStake)
  const [autoReconnect, setAutoReconnect] = useState(true)
  const [disconnectOnShot, setDisconnectOnShot] = useState(false)
  const [delayResult, setDelayResult] = useState(false)
  const [sound, setSound] = useState(false)
  const [profileComplete, setProfileComplete] = useState(false)
  const [failureReason, setFailureReason] = useState<ConnectionFailureReason>("server")
  const [connectionNoticeSeconds, setConnectionNoticeSeconds] = useState<number | null>(
    mockTimingDefaults.connectionNoticeSeconds,
  )
  const demoWasRunning = useRef(false)
  const previousStage = useRef(state.stage)
  const previousSession = useRef(state.session)
  const addLog = useCallback(
    (event: string, detail: string, kind: LogEntry["kind"] = "info") => {
      setLogs((items) => [...items.slice(-59), makeLog(event, detail, kind)])
    },
    [],
  )
  const send = useCallback((action: Action) => dispatch(action), [])

  useEffect(() => {
    if (previousStage.current === state.stage) return
    previousStage.current = state.stage
    addLog(
      `session.${state.stage}`,
      stageInfo[state.stage].description,
      ["ready", "result"].includes(state.stage)
        ? "success"
        : ["connectionfailed", "insufficient", "reconnecting"].includes(state.stage)
          ? "warning"
          : "info",
    )
  }, [state.stage, addLog])

  useEffect(() => {
    const ended = previousSession.current && !state.session
    previousSession.current = state.session
    if (ended && state.stage === "entry" && state.visited.includes("connected"))
      addLog(
        "session.ended",
        state.participated
          ? "전용 UI 제거 · 숏게임 유지 · 참여 배너 재노출 안 함"
          : "전용 UI 제거 · 숏게임 유지 · 최초 참여 전 WAIT 배너 유지",
      )
  }, [state.session, state.stage, state.participated, state.visited, addLog])

  useEffect(() => {
    if (
      state.stage !== "connected" ||
      state.eligibility !== "eligible" ||
      !state.online ||
      (!autoResponses && !demo)
    )
      return
    const timer = window.setTimeout(
      () =>
        send({
          type: "CONDITIONS",
          conditions: mockConditions(state.shotNumber, state.balance ?? openingBalance, minimumStake),
          shotNumber: state.shotNumber,
          balance: state.balance ?? openingBalance,
        }),
      1400,
    )
    return () => window.clearTimeout(timer)
  }, [
    state.stage,
    state.shotNumber,
    state.eligibility,
    state.online,
    autoResponses,
    demo,
    state.balance,
    openingBalance,
    minimumStake,
    send,
  ])

  useEffect(() => {
    if (state.stage !== "shot" || !state.shot) return
    const id = state.shot.id
    const timer = window.setTimeout(
      () => send({ type: "LANDED", shotId: id }),
      2200,
    )
    return () => window.clearTimeout(timer)
  }, [state.stage, state.shot, send])

  useEffect(() => {
    if (state.stage !== "rolling" || !state.shot) return
    const shotId = state.shot.id
    const timer = window.setTimeout(() => send({ type: "STOPPED", shotId }), 1000)
    return () => window.clearTimeout(timer)
  }, [state.stage, state.shot, send])

  useEffect(() => {
    if (state.stage !== "practice" || !state.practiceShot) return
    const shotId = state.practiceShot.id
    const timer = window.setTimeout(
      () => send({ type: "PRACTICE_STOPPED", shotId }),
      3200,
    )
    return () => window.clearTimeout(timer)
  }, [state.stage, state.practiceShot?.id, send])

  useEffect(() => {
    if (!state.session || state.online || !autoReconnect) return
    const timer = window.setTimeout(() => send({ type: "RECONNECT" }), 1500)
    return () => window.clearTimeout(timer)
  }, [state.session, state.online, autoReconnect, send])

  useEffect(() => {
    if (state.stage !== "rolling" || !disconnectOnShot) return
    const timer = window.setTimeout(() => {
      setDisconnectOnShot(false)
      send({ type: "DISCONNECT" })
    }, 200)
    return () => window.clearTimeout(timer)
  }, [state.stage, disconnectOnShot, send])

  const lastSubmission = useRef("")
  useEffect(() => {
    if (!state.shot || state.resultSubmissions === 0) return
    const key = `${state.shot.id}:${state.resultSubmissions}`
    if (lastSubmission.current === key) return
    lastSubmission.current = key
    addLog(
      state.resultSubmissions === 1 ? "result.submitted" : "result.resent",
      `Mock · 볼 정지 후 ${state.shot.id} 결과 전송 · ${state.resultSubmissions}회 · 동일 세션`,
    )
  }, [state.shot, state.resultSubmissions, addLog])

  useEffect(() => {
    if (state.stage !== "result" || !state.result) return
    if (state.endRequested) {
      demoWasRunning.current = false
    } else if (demoWasRunning.current) {
      demoWasRunning.current = false
      setDemo(false)
      setHoldResult(true)
      return
    }
    if (holdResult && !state.endRequested) return
    const timer = window.setTimeout(
      () => send({ type: "NEXT" }),
      resultSeconds * 1000,
    )
    return () => window.clearTimeout(timer)
  }, [
    state.stage,
    state.result,
    state.endRequested,
    holdResult,
    resultSeconds,
    send,
  ])

  useEffect(() => {
    if (!demo || !["entry", "qr", "ready"].includes(state.stage)) return
    const timer = window.setTimeout(
      () => {
        if (state.stage === "entry") send({ type: "START" })
        if (state.stage === "qr")
          send({ type: "REQUEST_CONNECTION" })
        if (state.stage === "ready") {
          if (!state.sensorReady) send({ type: "SENSOR", ready: true })
          else send({ type: "SHOOT", outcome })
        }
      },
      state.stage === "entry" ? 700 : 1600,
    )
    return () => window.clearTimeout(timer)
  }, [demo, state.stage, state.sensorReady, state.qrVersion, outcome, send])

  const playedResult = useRef<string | null>(null)
  useEffect(() => {
    if (!state.result || playedResult.current === state.result.shotId) return
    playedResult.current = state.result.shotId
    addLog(
      "result.received",
      `${money(state.result.payout)} 지급 · 잔액 ${money(state.result.balance)}`,
      "success",
    )
    if (!sound || state.result.band === "none") return
    const context = new AudioContext()
    const notes =
      resultLevel(state.result) === "jackpot"
        ? [523, 659, 784, 1046, 1318]
        : resultLevel(state.result) === "highlight"
          ? [523, 659, 784]
          : [659, 784]
    void context
      .resume()
      .then(() => {
        notes.forEach((frequency, i) => {
          const oscillator = context.createOscillator(),
            gain = context.createGain()
          oscillator.connect(gain)
          gain.connect(context.destination)
          oscillator.frequency.value = frequency
          const start = context.currentTime + i * 0.12
          gain.gain.setValueAtTime(0, start)
          gain.gain.linearRampToValueAtTime(0.035, start + 0.015)
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28)
          oscillator.start(start)
          oscillator.stop(start + 0.3)
        })
      })
      .catch(() => {})
    const timer = window.setTimeout(
      () => void context.close().catch(() => {}),
      1600,
    )
    return () => {
      window.clearTimeout(timer)
      void context.close().catch(() => {})
    }
  }, [state.result, sound, addLog])

  function reset() {
    if (isLocked(state) || state.endRequested) return
    setDemo(false)
    demoWasRunning.current = false
    setDelayResult(false)
    setDisconnectOnShot(false)
    setLogs(initialLogs())
    send({ type: "RESET" })
    playedResult.current = null
  }
  function startDemo() {
    if (isLocked(state) || state.endRequested) return
    reset()
    setDemo(true)
    demoWasRunning.current = true
    setHoldResult(true)
    setDelayResult(false)
  }
  function receiveConditions() {
    send({
      type: "CONDITIONS",
      conditions: mockConditions(state.shotNumber, state.balance ?? openingBalance, minimumStake),
      shotNumber: state.shotNumber,
      balance: state.balance ?? openingBalance,
    })
  }
  function receiveFinalResult() {
    if (state.stage !== "judging" || !state.shot || !state.online || state.resultSubmissions === 0) return
    try {
      const result = mockResult(state.shot)
      setDelayResult(false)
      send({ type: "RESULT", result })
    } catch {
      addLog("result.awaiting_response", "보상 구간 미수신 · 미지급으로 가정하지 않고 대기", "warning")
    }
  }
  function completeConnection() {
    if (state.stage !== "connecting") return
    send({
      type: "CONNECT",
      qrVersion: state.qrVersion,
      eligibility,
      player: mockPlayerProfile(profileComplete),
    })
  }
  function failConnection() {
    if (state.stage !== "connecting") return
    setDemo(false)
    demoWasRunning.current = false
    const failure = mockConnectionFailure(failureReason)
    send({ type: "CONNECTION_FAILED", qrVersion: state.qrVersion, failure })
    addLog("connection.failed", `Mock · ${failure.message}`, "warning")
  }
  function cancelConnection() {
    if (!["qr", "connecting", "connectionfailed"].includes(state.stage)) return
    setDemo(false)
    demoWasRunning.current = false
    send({ type: "CLOSE_QR" })
  }
  function practice() {
    if (isLocked(state) || state.endRequested) return
    if (!state.sensorReady) send({ type: "SENSOR", ready: true })
    else if (canPractice(state)) send({ type: "SHOOT", outcome })
  }
  function advance() {
    switch (state.stage) {
      case "entry":
      case "connectionfailed":
        send({ type: "START" })
        break
      case "qr":
        send({ type: "REQUEST_CONNECTION" })
        break
      case "connecting":
        completeConnection()
        break
      case "connected":
      case "updating":
        receiveConditions()
        break
      case "ready":
        send(
          state.sensorReady
            ? { type: "SHOOT", outcome }
            : { type: "SENSOR", ready: true },
        )
        break
      case "judging":
        receiveFinalResult()
        break
      case "result":
        send({ type: "NEXT" })
        break
      case "insufficient":
        send({ type: "TOPUP" })
        break
      case "reconnecting":
        send({ type: "RECONNECT" })
        break
    }
  }
  return {
    state,
    send,
    logs,
    setLogs,
    addLog,
    outcome,
    setOutcome,
    eligibility,
    setEligibility,
    demo,
    setDemo,
    autoResponses,
    setAutoResponses,
    holdResult,
    setHoldResult,
    resultSeconds,
    setResultSeconds,
    openingBalance,
    setOpeningBalance,
    minimumStake,
    setMinimumStake,
    autoReconnect,
    setAutoReconnect,
    disconnectOnShot,
    setDisconnectOnShot,
    delayResult,
    setDelayResult,
    sound,
    setSound,
    profileComplete,
    setProfileComplete,
    failureReason,
    setFailureReason,
    connectionNoticeSeconds,
    setConnectionNoticeSeconds,
    reset,
    startDemo,
    advance,
    receiveConditions,
    receiveFinalResult,
    completeConnection,
    failConnection,
    cancelConnection,
    practice,
  }
}
