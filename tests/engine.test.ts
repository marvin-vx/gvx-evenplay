import test from "node:test"
import assert from "node:assert/strict"
import {
  canEnter,
  canPractice,
  canShoot,
  createSession,
  getReadyIndicators,
  isLocked,
  shouldShowEntryBanner,
  sessionReducer as reduce,
  type SessionState,
} from "../src/engine.ts"
import {
  documentInfo,
  documentPages,
  followUps,
  policies,
  mockMinimumStake,
  mockQrValue,
  formatMultiplier,
  money,
  resultLevel,
  type Eligibility,
  type Outcome,
  type Result,
} from "../src/prototype.ts"
import { mockConditions, mockConnectionFailure, mockPlayerProfile, mockResult } from "../src/mockEvenplay.ts"

function connected(eligibility: Eligibility = "eligible") {
  const qr = reduce(createSession(), { type: "START" })
  const requested = reduce(qr, { type: "REQUEST_CONNECTION" })
  return reduce(requested, {
    type: "CONNECT", qrVersion: qr.qrVersion, eligibility, player: mockPlayerProfile(),
  })
}
function conditions(
  state: SessionState,
  shotNumber = state.shotNumber,
  balance = state.balance ?? 100,
  minimumStake = mockMinimumStake,
) {
  return reduce(state, {
    type: "CONDITIONS",
    shotNumber,
    balance,
    conditions: mockConditions(shotNumber, balance, minimumStake),
  })
}
function ready(balance = 100, minimumStake = mockMinimumStake) {
  return conditions(connected(), 1, balance, minimumStake)
}
function flying(outcome: Outcome = "x2", state = ready()) {
  return reduce(reduce(state, { type: "SENSOR", ready: true }), {
    type: "SHOOT",
    outcome,
  })
}
function rolling(outcome: Outcome = "x2") {
  const state = flying(outcome)
  assert.ok(state.shot)
  return reduce(state, { type: "LANDED", shotId: state.shot.id })
}
function pending(outcome: Outcome = "x2") {
  const state = rolling(outcome)
  assert.ok(state.shot)
  return reduce(state, { type: "STOPPED", shotId: state.shot.id })
}
function settled(outcome: Outcome = "x2") {
  const state = pending(outcome)
  assert.ok(state.shot)
  return reduce(state, { type: "RESULT", result: mockResult(state.shot) })
}
function practice(state: SessionState) {
  return reduce(reduce(state, { type: "SENSOR", ready: true }), {
    type: "SHOOT",
    outcome: "hole",
  })
}

test("document metadata follows the V0.3 upload and its actual eighteen-page order", () => {
  assert.equal(documentInfo.version, "V0.3")
  assert.equal(documentInfo.date, "2026.10.28")
  assert.equal(documentPages.length, documentInfo.pageCount)
  assert.equal(documentPages.length, 18)
  assert.match(documentPages[5], /연결 중·실패/)
  assert.match(documentPages[17], /후속 확인/)
  assert.match(documentInfo.sourceNote, /V0.1.*V0.2/)
  assert.ok(followUps.some((item) => item.id === "E05·E11"))
  assert.ok(followUps.some((item) => item.owner === "△ 실서버 검증"))
  assert.equal(policies.find((item) => item.id === "READY-SYNC")?.status, "사용자 확정")
  assert.equal(followUps.some((item) => item.id === "READY-SYNC"), false)
})

test("QR is a non-expiring link with session_id, not a countdown fixture", () => {
  const qr = reduce(createSession(), { type: "START" })
  const url = new URL(mockQrValue("https://preview.invalid/app?old=1#old", qr.qrVersion))
  assert.equal(url.searchParams.get("session_id"), `mock-gvx-${qr.qrVersion}`)
  assert.equal(url.searchParams.has("old"), false)
  assert.equal(url.hash, "")
  assert.equal("qrExpired" in qr, false)
  assert.equal("clockRemaining" in qr, false)
  assert.equal("clock" in mockConditions(1), false)
})

test("closing QR invalidates the old response; reopening creates a new session link", () => {
  const qr = reduce(createSession(), { type: "START" })
  const closed = reduce(qr, { type: "CLOSE_QR" })
  const stale = { type: "CONNECT", qrVersion: qr.qrVersion, eligibility: "eligible" } as const
  assert.strictEqual(reduce(closed, stale), closed)
  const reopened = reduce(closed, { type: "START" })
  assert.notEqual(reopened.qrVersion, qr.qrVersion)
  assert.strictEqual(reduce(reopened, stale), reopened)
  const requested = reduce(reopened, { type: "REQUEST_CONNECTION" })
  assert.equal(reduce(requested, {
    type: "CONNECT",
    qrVersion: reopened.qrVersion,
    eligibility: "eligible",
  }).stage, "connected")
})

test("service settings fail closed without disabling native practice", () => {
  for (const value of ["disabled", "unknown"] as const) {
    const state = reduce(createSession(), { type: "SERVICE", value })
    assert.equal(canEnter(state), false)
    assert.strictEqual(reduce(state, { type: "START" }), state)
    assert.equal(practice(state).stage, "practice")
  }
  const unsupported = reduce(createSession(), { type: "MODE", shortGame: false })
  assert.equal(canEnter(unsupported), false)
  assert.equal(practice(unsupported).stage, "practice")
})

test("connection failure shows its reason, cancels the attempt and remains retryable", () => {
  const qr = reduce(createSession(), { type: "START" })
  const requested = reduce(qr, { type: "REQUEST_CONNECTION" })
  const failed = reduce(requested, {
    type: "CONNECTION_FAILED", qrVersion: qr.qrVersion, failure: mockConnectionFailure("server"),
  })
  assert.equal(failed.stage, "connectionfailed")
  assert.match(failed.connectionFailure?.message ?? "", /서버에 연결할 수 없습니다/)
  assert.equal(failed.session, false)
  assert.strictEqual(reduce(failed, {
    type: "CONNECT", qrVersion: qr.qrVersion, eligibility: "eligible",
  }), failed)
  const retry = reduce(reduce(failed, { type: "START" }), { type: "REQUEST_CONNECTION" })
  assert.equal(reduce(retry, {
    type: "CONNECT", qrVersion: retry.qrVersion, eligibility: "eligible",
  }).stage, "connected")
})

test("connection alone never changes unknown money into zero", () => {
  const state = connected()
  assert.equal(state.balance, null)
  assert.equal(state.conditions, null)
  assert.equal(state.displayConditions, null)
  assert.equal(money(state.balance), "—")
})

test("only the Evenplay eligibility response authorizes betting, not GVX account state", () => {
  for (const eligibility of ["pending", "restricted"] as const) {
    const state = connected(eligibility)
    assert.strictEqual(conditions(state), state)
    assert.equal(practice(state).stage, "practice")
    assert.equal(state.participated, false)
  }
  assert.equal(ready().stage, "ready")
})

test("conditions prepare the bet without per-shot acceptance; physical sensor input stays separate", () => {
  const state = ready()
  assert.equal(state.conditions?.stake, 3)
  assert.equal(state.sensorReady, false)
  assert.equal(canShoot(state), false)
  assert.strictEqual(reduce(state, { type: "SHOOT", outcome: "x2" }), state)
  const sensorReady = reduce(state, { type: "SENSOR", ready: true })
  assert.equal(canShoot(sensorReady), true)
  assert.equal(canPractice(sensorReady), false)
})

test("participating readiness indicators require both sensor and bet readiness", () => {
  for (const before of [connected(), ready()]) {
    for (const sensorReady of [false, true]) {
      const state = reduce(before, { type: "SENSOR", ready: sensorReady })
      const bothReady = before.stage === "ready" && sensorReady
      assert.deepEqual(getReadyIndicators(state), {
        gvxReady: bothReady,
        betReady: bothReady,
      })
      assert.equal(state.sensorReady, sensorReady)
      assert.strictEqual(state.conditions, before.conditions)
      assert.equal(state.balance, before.balance)
    }
  }
})

test("releasing either READY indicator displays WAIT on both and permits readiness to recover", () => {
  const before = reduce(ready(), { type: "SENSOR", ready: true })
  assert.deepEqual(getReadyIndicators(before), { gvxReady: true, betReady: true })
  const sensorReleased = reduce(before, { type: "SENSOR", ready: false })
  assert.deepEqual(getReadyIndicators(sensorReleased), { gvxReady: false, betReady: false })
  assert.strictEqual(sensorReleased.conditions, before.conditions)
  assert.equal(canShoot(sensorReleased), false)
  const sensorRestored = reduce(sensorReleased, { type: "SENSOR", ready: true })
  assert.deepEqual(getReadyIndicators(sensorRestored), { gvxReady: true, betReady: true })
  const betReleased = reduce(sensorRestored, { type: "ELIGIBILITY", value: "pending" })
  assert.equal(betReleased.sensorReady, true)
  assert.deepEqual(getReadyIndicators(betReleased), { gvxReady: false, betReady: false })
  const betRestored = conditions(reduce(betReleased, { type: "ELIGIBILITY", value: "eligible" }))
  assert.deepEqual(getReadyIndicators(betRestored), { gvxReady: true, betReady: true })
  assert.equal(betRestored.balance, before.balance)
})

test("synchronized WAIT does not disable the physical sensor or charge ordinary practice", () => {
  for (const before of [
    connected(),
    connected("restricted"),
    reduce(settled(), { type: "NEXT" }),
    reduce(ready(), { type: "INSUFFICIENT" }),
    reduce(ready(), { type: "DISCONNECT" }),
    reduce(ready(), { type: "BALANCE", balance: 2, minimumStake: 1 }),
  ]) {
    const state = reduce(before, { type: "SENSOR", ready: true })
    assert.deepEqual(getReadyIndicators(state), { gvxReady: false, betReady: false })
    assert.equal(canPractice(state), true)
    assert.equal(canShoot(state), false)
    const active = reduce(state, { type: "SHOOT", outcome: "hole" })
    assert.equal(active.stage, "practice")
    assert.equal(active.balance, before.balance)
    assert.equal(active.shot, null)
    assert.equal(active.resultSubmissions, 0)
  }
})

test("native READY remains independent before participation and after ending Evenplay", () => {
  for (const before of [
    createSession(),
    reduce(createSession(), { type: "START" }),
    reduce(reduce(ready(), { type: "SENSOR", ready: true }), { type: "END" }),
  ]) {
    const state = reduce(before, { type: "SENSOR", ready: true })
    assert.equal(state.session, false)
    assert.deepEqual(getReadyIndicators(state), { gvxReady: true, betReady: false })
    assert.equal(canPractice(state), true)
  }
})

test("processing, result display and queued termination never advertise a new READY shot", () => {
  for (const state of [
    flying(),
    rolling(),
    pending(),
    practice(connected()),
    reduce(settled(), { type: "SENSOR", ready: true }),
    reduce(flying(), { type: "REQUEST_END" }),
  ]) {
    assert.deepEqual(getReadyIndicators(state), { gvxReady: false, betReady: false })
    assert.equal(canShoot(state), false)
  }
})

test("BET WAIT, minimum-balance pause, disconnection and pre-entry all allow uncharged practice", () => {
  const states = [
    createSession(),
    reduce(createSession(), { type: "START" }),
    connected(),
    connected("restricted"),
    reduce(settled(), { type: "NEXT" }),
    reduce(ready(), { type: "INSUFFICIENT" }),
    reduce(ready(), { type: "DISCONNECT" }),
  ]
  for (const before of states) {
    const shot = practice(before)
    assert.equal(shot.stage, "practice")
    assert.ok(shot.practiceShot)
    assert.equal(shot.shot, null)
    assert.equal(shot.balance, before.balance)
    assert.equal(shot.shotNumber, before.shotNumber)
    assert.equal(shot.resultSubmissions, 0)
    assert.equal(isLocked(shot), true)
    assert.strictEqual(reduce(shot, {
      type: "RESULT",
      result: { shotId: shot.practiceShot.id, band: 1, distance: 0, payout: 100, balance: 200 },
    }), shot)
    const stopped = reduce(shot, { type: "PRACTICE_STOPPED", shotId: shot.practiceShot.id })
    assert.equal(stopped.stage, before.stage)
    assert.equal(stopped.balance, before.balance)
    assert.equal(stopped.shotNumber, before.shotNumber)
    assert.equal(stopped.practiceShot, null)
    assert.equal(stopped.result, null)
    assert.equal(stopped.sensorReady, false)
  }
})

test("a valid betting shot deducts the stake once at shot start, before settlement", () => {
  const state = flying()
  assert.equal(state.stage, "shot")
  assert.equal(state.balance, 97)
  assert.equal(state.shot?.openingBalance, 100)
  assert.equal(state.shot?.conditions.stake, 3)
  assert.equal(state.resultSubmissions, 0)
  assert.strictEqual(reduce(state, { type: "SHOOT", outcome: "x2" }), state)
})

test("landing is not ball stop: no final response is accepted or submitted before STOPPED", () => {
  const shot = flying()
  assert.ok(shot.shot)
  const result = mockResult(shot.shot)
  assert.strictEqual(reduce(shot, { type: "RESULT", result }), shot)
  const landed = reduce(shot, { type: "LANDED", shotId: shot.shot.id })
  assert.equal(landed.stage, "rolling")
  assert.equal(landed.resultSubmissions, 0)
  assert.equal(landed.balance, 97)
  assert.strictEqual(reduce(landed, { type: "RESULT", result }), landed)
  assert.strictEqual(reduce(landed, { type: "STOPPED", shotId: "obsolete" }), landed)
  const stopped = reduce(landed, { type: "STOPPED", shotId: shot.shot.id })
  assert.equal(stopped.stage, "judging")
  assert.equal(stopped.resultSubmissions, 1)
  assert.equal(stopped.balance, 97)
  assert.strictEqual(reduce(stopped, { type: "STOPPED", shotId: shot.shot.id }), stopped)
})

test("processing and practice lock unrelated controls at the reducer boundary", () => {
  for (const state of [flying(), rolling(), pending(), practice(connected())]) {
    assert.equal(isLocked(state), true)
    for (const action of [
      { type: "END" },
      { type: "RESET" },
      { type: "SHOOT", outcome: "hole" },
      { type: "PREVIEW", stage: "entry" },
      { type: "SENSOR", ready: false },
      { type: "ELIGIBILITY", value: "restricted" },
      { type: "BALANCE", balance: 1000, minimumStake: 1 },
    ] as const)
      assert.strictEqual(reduce(state, action), state)
  }
})

test("processing stages fail closed even without a shot snapshot", () => {
  for (const stage of ["shot", "rolling", "judging", "practice"] as const) {
    const state = { ...connected(), stage }
    assert.equal(isLocked(state), true)
    assert.strictEqual(reduce(state, { type: "END" }), state)
    assert.strictEqual(reduce(state, { type: "SENSOR", ready: true }), state)
  }
})

test("late conditions cannot mutate the frozen in-flight stake, target or balance", () => {
  for (const state of [flying(), rolling(), pending()]) {
    assert.equal(state.balance, 97)
    assert.equal(state.shot?.conditions.target, 50)
    assert.strictEqual(reduce(state, {
      type: "CONDITIONS",
      conditions: mockConditions(2, 1000),
      shotNumber: 2,
      balance: 1000,
    }), state)
  }
})

test("only the matching final response settles; duplicates cannot credit or charge again", () => {
  const state = pending()
  assert.ok(state.shot)
  const result = mockResult(state.shot)
  assert.strictEqual(reduce(state, {
    type: "RESULT", result: { ...result, shotId: "old-shot" },
  }), state)
  const final = reduce(state, { type: "RESULT", result })
  assert.equal(final.balance, 103)
  assert.equal(final.result?.payout, 6)
  assert.strictEqual(reduce(final, { type: "RESULT", result }), final)
  assert.equal(reduce(final, { type: "SENSOR", ready: true }).sensorReady, true)
})

for (const [band, level, payout, balance] of [
  ["hole", "jackpot", 100, 197],
  ["x3", "highlight", 9, 106],
  ["x2", "highlight", 6, 103],
  ["x1.5", "basic", 4.5, 101.5],
  ["x1", "basic", 3, 100],
  ["x0.5", "basic", 1.5, 98.5],
  ["none", "none", 0, 97],
] as const) {
  test(`${band}: principal-inclusive ${payout} payout produces ${level} and ${balance} final balance`, () => {
    const state = settled(band)
    assert.ok(state.result)
    assert.equal(resultLevel(state.result), level)
    assert.equal(state.result.payout, payout)
    assert.equal(state.balance, balance)
  })
}

test("next conditions wait explicitly while known rings/table remain a labeled display snapshot", () => {
  const final = settled()
  const next = reduce(final, { type: "NEXT" })
  assert.equal(next.stage, "updating")
  assert.equal(next.shotNumber, 2)
  assert.equal(next.conditions, null)
  assert.equal(next.shot, null)
  assert.equal(next.result, null)
  assert.strictEqual(next.displayConditions, final.displayConditions)
  assert.equal(next.ballDistance, 50)
  assert.equal(next.balance, 103)
  assert.strictEqual(conditions(next, 1), next)
  const updated = conditions(next)
  assert.equal(updated.stage, "ready")
  assert.equal(updated.ballDistance, 55)
  assert.equal(updated.conditions?.target, 55)
  assert.equal(updated.conditions?.stake, 4)
  assert.equal(updated.conditions?.rewards[2].payout, 9)
  assert.strictEqual(updated.displayConditions, updated.conditions)
})

test("conditions arriving during practice are deferred until the non-betting ball stops", () => {
  const waiting = reduce(settled(), { type: "NEXT" })
  const active = practice(waiting)
  assert.ok(active.practiceShot)
  const incoming = {
    type: "CONDITIONS",
    conditions: mockConditions(2, 103),
    shotNumber: 2,
    balance: 103,
  } as const
  const deferred = reduce(active, incoming)
  assert.equal(deferred.stage, "practice")
  assert.equal(deferred.conditions, null)
  assert.equal(deferred.ballDistance, 50)
  assert.strictEqual(deferred.displayConditions, waiting.displayConditions)
  assert.strictEqual(deferred.pendingConditions, incoming)
  assert.equal(deferred.balance, 103)
  const finished = reduce(deferred, {
    type: "PRACTICE_STOPPED", shotId: active.practiceShot.id,
  })
  assert.equal(finished.stage, "ready")
  assert.equal(finished.ballDistance, 55)
  assert.equal(finished.conditions?.stake, 4)
  assert.equal(finished.balance, 103)
  assert.equal(finished.resultSubmissions, 0)
})

test("balance-adjusted stake and rewards come from the Mock response, not another acceptance step", () => {
  const state = ready(2)
  assert.equal(state.conditions?.stake, 2)
  assert.equal(state.conditions?.rewards[2].payout, 4)
  const shot = flying("x2", state)
  assert.equal(shot.balance, 0)
  assert.ok(shot.shot)
  const stopped = reduce(reduce(shot, {
    type: "LANDED", shotId: shot.shot.id,
  }), { type: "STOPPED", shotId: shot.shot.id })
  const final = reduce(stopped, { type: "RESULT", result: mockResult(shot.shot) })
  assert.equal(final.balance, 4)
})

test("minimum-balance pause blocks new betting but preserves ordinary practice and known HUD", () => {
  const before = ready()
  const low = reduce(before, { type: "INSUFFICIENT" })
  assert.equal(low.stage, "insufficient")
  assert.equal(low.balance, .5)
  assert.equal(low.conditions, null)
  assert.strictEqual(low.displayConditions, before.displayConditions)
  assert.equal(canShoot(low), false)
  const shot = practice(low)
  assert.equal(shot.stage, "practice")
  assert.equal(shot.balance, .5)
  assert.equal(shot.shot, null)
})

test("a below-minimum initial response never prepares a stake or assumes funds", () => {
  const low = ready(.5)
  assert.equal(low.stage, "insufficient")
  assert.equal(low.balance, .5)
  assert.equal(low.conditions, null)
  assert.equal(low.displayConditions, null)
  assert.equal(low.result, null)
})

test("exact minimum is allowed; loss below minimum pauses only the subsequent bet", () => {
  const state = ready(1)
  assert.equal(state.conditions?.stake, 1)
  const shot = flying("none", state)
  assert.ok(shot.shot)
  assert.equal(shot.balance, 0)
  const stopped = reduce(reduce(shot, {
    type: "LANDED", shotId: shot.shot.id,
  }), { type: "STOPPED", shotId: shot.shot.id })
  const final = reduce(stopped, { type: "RESULT", result: mockResult(shot.shot) })
  const next = conditions(reduce(final, { type: "NEXT" }))
  assert.equal(next.stage, "insufficient")
  assert.equal(next.balance, 0)
  assert.equal(practice(next).balance, 0)
})

test("top-up response still waits for explicit adjusted conditions before resuming betting", () => {
  const low = reduce(ready(), { type: "INSUFFICIENT" })
  const funded = reduce(low, { type: "TOPUP" })
  assert.equal(funded.stage, "updating")
  assert.equal(funded.conditions, null)
  assert.equal(canShoot(funded), false)
  assert.equal(conditions(funded).stage, "ready")
})

test("balance responses validate money and never mutate an unsettled shot", () => {
  const state = ready()
  for (const balance of [-1, Number.NaN, Number.POSITIVE_INFINITY])
    assert.strictEqual(reduce(state, { type: "BALANCE", balance, minimumStake: 1 }), state)
  const low = reduce(state, { type: "BALANCE", balance: .5, minimumStake: 1 })
  assert.equal(low.stage, "insufficient")
  const adjusted = reduce(state, { type: "BALANCE", balance: 2, minimumStake: 1 })
  assert.equal(adjusted.stage, "updating")
  assert.equal(conditions(adjusted).conditions?.stake, 2)
  const shot = flying()
  assert.strictEqual(reduce(shot, { type: "BALANCE", balance: 1000, minimumStake: 1 }), shot)
})

test("disconnection invalidates betting and both READY indicators, not physical practice input", () => {
  const before = reduce(ready(), { type: "SENSOR", ready: true })
  const offline = reduce(before, { type: "DISCONNECT" })
  assert.equal(offline.stage, "reconnecting")
  assert.equal(offline.conditions, null)
  assert.equal(offline.sensorReady, true)
  assert.deepEqual(getReadyIndicators(offline), { gvxReady: false, betReady: false })
  assert.strictEqual(offline.displayConditions, before.displayConditions)
  assert.equal(canShoot(offline), false)
  assert.equal(canPractice(offline), true)
  const restored = reduce(offline, { type: "RECONNECT" })
  assert.equal(restored.stage, "updating")
  assert.equal(restored.qrVersion, before.qrVersion)
})

test("in-flight disconnection preserves physical flight/roll, session and one-time deduction", () => {
  const shot = flying()
  assert.ok(shot.shot)
  const offline = reduce(shot, { type: "DISCONNECT" })
  assert.equal(offline.stage, "shot")
  assert.equal(offline.balance, 97)
  assert.equal(offline.online, false)
  const landed = reduce(offline, { type: "LANDED", shotId: shot.shot.id })
  assert.equal(landed.stage, "rolling")
  const restored = reduce(landed, { type: "RECONNECT" })
  assert.equal(restored.stage, "rolling")
  assert.equal(restored.resultSubmissions, 0)
  assert.equal(restored.balance, 97)
  assert.equal(restored.qrVersion, shot.qrVersion)
  assert.strictEqual(restored.shot, shot.shot)
  const stopped = reduce(restored, { type: "STOPPED", shotId: shot.shot.id })
  assert.equal(stopped.resultSubmissions, 1)
})

test("offline ball stop waits for same-session reconnect before first result submission", () => {
  const active = rolling()
  assert.ok(active.shot)
  const offline = reduce(active, { type: "DISCONNECT" })
  const stopped = reduce(offline, { type: "STOPPED", shotId: active.shot.id })
  assert.equal(stopped.stage, "judging")
  assert.equal(stopped.resultSubmissions, 0)
  const result = mockResult(active.shot)
  assert.strictEqual(reduce(stopped, { type: "RESULT", result }), stopped)
  const restored = reduce(stopped, { type: "RECONNECT" })
  assert.equal(restored.resultSubmissions, 1)
  assert.equal(restored.balance, 97)
  assert.equal(reduce(restored, { type: "RESULT", result }).balance, 103)
})

test("reconnecting a submitted shot re-sends its identity without charging or crediting twice", () => {
  const before = pending()
  assert.ok(before.shot)
  const offline = reduce(before, { type: "DISCONNECT" })
  assert.equal(offline.stage, "judging")
  const restored = reduce(offline, { type: "RECONNECT" })
  assert.equal(restored.resultSubmissions, 2)
  assert.equal(restored.balance, 97)
  assert.strictEqual(restored.shot, before.shot)
  assert.strictEqual(reduce(restored, { type: "RECONNECT" }), restored)
  const result = mockResult(before.shot)
  const final = reduce(restored, { type: "RESULT", result })
  assert.equal(final.balance, 103)
  assert.strictEqual(reduce(final, { type: "RESULT", result }), final)
})

test("reconnection during practice keeps it non-betting and defers readiness until it stops", () => {
  const active = practice(connected())
  assert.ok(active.practiceShot)
  const offline = reduce(active, { type: "DISCONNECT" })
  assert.equal(offline.stage, "practice")
  const restored = reduce(offline, { type: "RECONNECT" })
  assert.equal(restored.stage, "practice")
  assert.equal(restored.practiceShot?.resumeStage, "updating")
  assert.equal(restored.resultSubmissions, 0)
  const stopped = reduce(restored, { type: "PRACTICE_STOPPED", shotId: active.practiceShot.id })
  assert.equal(stopped.stage, "updating")
  assert.equal(stopped.balance, null)
})

test("a settled result survives reconnection without a phantom locked shot or second credit", () => {
  const final = settled()
  const restored = reduce(reduce(final, { type: "DISCONNECT" }), { type: "RECONNECT" })
  assert.equal(restored.stage, "result")
  assert.equal(restored.balance, 103)
  assert.strictEqual(restored.result, final.result)
  assert.equal(isLocked(restored), false)
  assert.equal(reduce(restored, { type: "NEXT" }).stage, "updating")
})

test("end reservations are idempotent and never terminate an unsettled betting shot", () => {
  for (const before of [flying(), rolling(), pending(), reduce(pending(), { type: "DISCONNECT" })]) {
    const queued = reduce(before, { type: "REQUEST_END" })
    assert.equal(queued.endRequested, true)
    assert.equal(queued.stage, before.stage)
    assert.equal(queued.balance, 97)
    assert.strictEqual(queued.shot, before.shot)
    for (const action of [
      { type: "REQUEST_END" }, { type: "END" }, { type: "NEXT" },
      { type: "RESET" }, { type: "SENSOR", ready: true },
      { type: "PREVIEW", stage: "entry" },
    ] as const)
      assert.strictEqual(reduce(queued, action), queued)
  }
})

test("reserved end waits for the matching final result, then skips all new betting", () => {
  const queued = reduce(flying(), { type: "REQUEST_END" })
  assert.ok(queued.shot)
  const landed = reduce(queued, { type: "LANDED", shotId: queued.shot.id })
  const stopped = reduce(landed, { type: "STOPPED", shotId: queued.shot.id })
  const final = reduce(stopped, { type: "RESULT", result: mockResult(queued.shot) })
  assert.equal(final.stage, "result")
  assert.equal(final.balance, 103)
  assert.equal(final.session, true)
  for (const action of [
    { type: "RESET" }, { type: "INSUFFICIENT" },
    { type: "ELIGIBILITY", value: "restricted" },
    { type: "SENSOR", ready: true }, { type: "PREVIEW", stage: "ready" },
  ] as const)
    assert.strictEqual(reduce(final, action), final)
  const ended = reduce(final, { type: "NEXT" })
  assert.equal(ended.stage, "entry")
  assert.equal(ended.visited.includes("updating"), false)
  assert.equal(ended.session, false)
  assert.equal(ended.endRequested, false)
  assert.equal(ended.balance, null)
  assert.equal(ended.displayConditions, null)
  assert.equal(ended.participated, true)
  assert.equal(shouldShowEntryBanner(ended), false)
})

test("reserved end survives payment delay and repeated session recovery without an assumed refund", () => {
  const queued = reduce(pending("hole"), { type: "REQUEST_END" })
  assert.ok(queued.shot)
  const result = mockResult(queued.shot)
  const offline = reduce(queued, { type: "DISCONNECT" })
  assert.equal(offline.balance, 97)
  assert.strictEqual(reduce(offline, { type: "RESULT", result }), offline)
  const restored = reduce(offline, { type: "RECONNECT" })
  assert.equal(restored.endRequested, true)
  assert.equal(restored.resultSubmissions, 2)
  const final = reduce(restored, { type: "RESULT", result })
  assert.equal(final.balance, 197)
  assert.equal(reduce(final, { type: "NEXT" }).session, false)
})

test("end requested during non-betting practice waits only for that practice shot, not a fake payout", () => {
  const active = practice(connected())
  assert.ok(active.practiceShot)
  const queued = reduce(active, { type: "REQUEST_END" })
  assert.equal(queued.endRequested, true)
  assert.equal(queued.balance, null)
  const ended = reduce(queued, { type: "PRACTICE_STOPPED", shotId: active.practiceShot.id })
  assert.equal(ended.stage, "entry")
  assert.equal(ended.session, false)
  assert.equal(ended.result, null)
  assert.equal(ended.resultSubmissions, 0)
})

test("idle end removes Evenplay UI data but preserves native training and last ball placement", () => {
  const second = conditions(reduce(settled(), { type: "NEXT" }))
  const ended = reduce(second, { type: "END" })
  assert.equal(ended.stage, "entry")
  assert.equal(ended.balance, null)
  assert.equal(ended.conditions, null)
  assert.equal(ended.displayConditions, null)
  assert.equal(ended.result, null)
  assert.equal(ended.shortGame, true)
  assert.equal(ended.ballDistance, 55)
  assert.equal(ended.participated, true)
})

test("end reservation does not replace idle end or create a session", () => {
  for (const state of [createSession(), connected(), ready(), settled()])
    assert.strictEqual(reduce(state, { type: "REQUEST_END" }), state)
})

test("never-participated WAIT banner hides in READY and practice and returns after practice stops", () => {
  const initial = createSession()
  assert.equal(shouldShowEntryBanner(initial), true)
  const readySensor = reduce(initial, { type: "SENSOR", ready: true })
  assert.equal(shouldShowEntryBanner(readySensor), false)
  const active = practice(initial)
  assert.ok(active.practiceShot)
  assert.equal(shouldShowEntryBanner(active), false)
  const stopped = reduce(active, { type: "PRACTICE_STOPPED", shotId: active.practiceShot.id })
  assert.equal(shouldShowEntryBanner(stopped), true)
  for (const stage of ["qr", "ready", "shot", "rolling", "judging", "result", "updating"] as const)
    assert.equal(shouldShowEntryBanner({ ...initial, stage }), false)
})

test("participation suppresses the banner through end, mode changes and entry presets until reset", () => {
  const ended = reduce(connected(), { type: "END" })
  const modeChanged = reduce(reduce(ended, { type: "MODE", shortGame: false }), {
    type: "MODE", shortGame: true,
  })
  const preview = reduce(modeChanged, { type: "PREVIEW", stage: "entry" })
  for (const state of [ended, modeChanged, preview])
    assert.equal(shouldShowEntryBanner(state), false)
  assert.equal(shouldShowEntryBanner(reduce(preview, { type: "RESET" })), true)
})

test("pending or restricted connection attempts do not count as participation", () => {
  for (const eligibility of ["pending", "restricted"] as const) {
    const state = connected(eligibility)
    assert.equal(state.participated, false)
    assert.equal(shouldShowEntryBanner(reduce(state, { type: "END" })), true)
    const accepted = reduce(state, { type: "ELIGIBILITY", value: "eligible" })
    assert.equal(accepted.participated, true)
    assert.equal(shouldShowEntryBanner(reduce(accepted, { type: "END" })), false)
  }
})

test("phase previews respect practice, rolling and pending instead of accidentally settling", () => {
  for (const stage of ["practice", "rolling", "judging", "insufficient", "reconnecting"] as const) {
    const state = reduce(createSession(), { type: "PREVIEW", stage })
    assert.equal(state.stage, stage)
    assert.equal(state.result, null)
  }
})

test("a mobile request is an explicit pending phase and does not imply connection or funds", () => {
  const qr = reduce(createSession(), { type: "START" })
  assert.strictEqual(reduce(qr, {
    type: "CONNECT", qrVersion: qr.qrVersion, eligibility: "eligible",
  }), qr)
  const requested = reduce(qr, { type: "REQUEST_CONNECTION" })
  assert.equal(requested.stage, "connecting")
  assert.equal(requested.session, false)
  assert.equal(requested.online, false)
  assert.equal(requested.balance, null)
  assert.equal(requested.player, null)
  assert.equal(requested.participated, false)
  assert.equal(isLocked(requested), true)
  assert.strictEqual(reduce(requested, { type: "RESET" }), requested)
  assert.strictEqual(reduce(requested, { type: "SHOOT", outcome: "hole" }), requested)
})

test("failure reasons cancel only their matching attempt; old success/failure callbacks cannot attach to a retry", () => {
  for (const reason of ["server", "no-response", "rejected"] as const) {
    const qr = reduce(createSession(), { type: "START" })
    const requested = reduce(qr, { type: "REQUEST_CONNECTION" })
    const failure = mockConnectionFailure(reason)
    const failed = reduce(requested, {
      type: "CONNECTION_FAILED", qrVersion: requested.qrVersion, failure,
    })
    assert.equal(failed.stage, "connectionfailed")
    assert.strictEqual(failed.connectionFailure, failure)
    assert.equal(failed.balance, null)
    assert.equal(failed.session, false)
    assert.equal(failed.participated, false)
    const retry = reduce(reduce(failed, { type: "START" }), { type: "REQUEST_CONNECTION" })
    assert.strictEqual(reduce(retry, {
      type: "CONNECT", qrVersion: requested.qrVersion, eligibility: "eligible",
    }), retry)
    assert.strictEqual(reduce(retry, {
      type: "CONNECTION_FAILED", qrVersion: requested.qrVersion, failure,
    }), retry)
    assert.equal(reduce(retry, {
      type: "CONNECT", qrVersion: retry.qrVersion, eligibility: "eligible",
    }).stage, "connected")
  }
})

test("canceling pending connection restores entry and invalidates delayed callbacks", () => {
  const qr = reduce(createSession(), { type: "START" })
  const requested = reduce(qr, { type: "REQUEST_CONNECTION" })
  const canceled = reduce(requested, { type: "CLOSE_QR" })
  assert.equal(canceled.stage, "entry")
  assert.equal(canceled.connectionFailure, null)
  assert.equal(shouldShowEntryBanner(canceled), true)
  assert.strictEqual(reduce(canceled, {
    type: "CONNECT", qrVersion: requested.qrVersion, eligibility: "eligible",
  }), canceled)
  assert.strictEqual(reduce(canceled, {
    type: "CONNECTION_FAILED", qrVersion: requested.qrVersion, failure: mockConnectionFailure("no-response"),
  }), canceled)
})

test("shop availability and client bay config must both be known enabled", () => {
  for (const type of ["SERVICE", "SHOP_SERVICE"] as const) {
    for (const value of ["disabled", "unknown"] as const) {
      const state = reduce(createSession(), { type, value })
      assert.equal(canEnter(state), false)
      assert.equal(shouldShowEntryBanner(state), false)
      assert.strictEqual(reduce(state, { type: "START" }), state)
      assert.equal(practice(state).stage, "practice")
    }
  }
  const requested = reduce(reduce(createSession(), { type: "START" }), {
    type: "REQUEST_CONNECTION",
  })
  for (const type of ["SERVICE", "SHOP_SERVICE"] as const)
    assert.strictEqual(reduce(requested, { type, value: "disabled" }), requested)
})

test("connection stores supplied profile/INDEX without deriving it and clears personal data on end", () => {
  const requested = reduce(reduce(createSession(), { type: "START" }), { type: "REQUEST_CONNECTION" })
  const player = { ...mockPlayerProfile(true), nickname: "Full provider nickname", index: 0 }
  const state = reduce(requested, {
    type: "CONNECT", qrVersion: requested.qrVersion, eligibility: "eligible", player,
  })
  assert.strictEqual(state.player, player)
  assert.equal(state.player?.index, 0)
  assert.equal(state.connectionNoticeVersion, 1)
  assert.equal(state.balance, null)
  const restored = reduce(reduce(state, { type: "DISCONNECT" }), { type: "RECONNECT" })
  assert.strictEqual(restored.player, player)
  assert.equal(restored.connectionNoticeVersion, 1)
  const ended = reduce(restored, { type: "END" })
  assert.equal(ended.player, null)
  assert.equal(ended.connectionFailure, null)
})

test("mission, distance, multiplier and payout are separate authoritative response fields", () => {
  const received = mockConditions(1)
  received.missionName = "Provider mission A"
  received.missionDescription = "Description supplied by Evenplay"
  received.rewards = received.rewards.map((reward) =>
    reward.band === 2 ? { ...reward, distance: 1.25, multiplier: 7.4, payout: 19.25 } : reward,
  )
  const state = reduce(connected(), {
    type: "CONDITIONS", conditions: received, shotNumber: 1, balance: 100,
  })
  assert.strictEqual(state.conditions, received)
  assert.equal(state.conditions?.missionName, "Provider mission A")
  assert.equal(state.conditions?.rewards[1].distance, 1.25)
  assert.equal(state.conditions?.rewards[1].multiplier, 7.4)
  assert.equal(state.conditions?.rewards[1].payout, 19.25)
  const shot = flying("x3", state)
  assert.ok(shot.shot)
  const response = mockResult(shot.shot)
  assert.equal(response.band, 2)
  assert.equal(response.payout, 19.25)
  assert.equal(response.balance, 116.25)
  assert.equal(resultLevel(response), "highlight")
})

test("next Mock responses vary multipliers and values; legacy selector names are not HUD constants", () => {
  const first = mockConditions(1)
  const second = mockConditions(2)
  assert.equal(first.rewards[1].id, second.rewards[1].id)
  assert.equal(first.rewards[1].band, 2)
  assert.equal(second.rewards[1].band, 2)
  assert.equal(first.rewards[1].multiplier, 3)
  assert.equal(second.rewards[1].multiplier, 3.5)
  assert.equal(second.rewards[2].multiplier, 2.25)
  assert.equal(second.rewards[2].payout, 9)
  assert.equal(formatMultiplier(null), "—")
  assert.equal(formatMultiplier(3), "×3.0")
  assert.equal(formatMultiplier(4.25), "×4.25")
})

test("animation mapping uses confirmed bands 1/2-3/4-6, never amount or distance", () => {
  for (const [band, level] of [
    [1, "jackpot"], [2, "highlight"], [3, "highlight"],
    [4, "basic"], [5, "basic"], [6, "basic"],
  ] as const) {
    assert.equal(resultLevel({
      shotId: "received", band, distance: 999, payout: 1.23, balance: 1.23,
    }), level)
  }
  assert.equal(resultLevel({
    shotId: "received", band: "none", distance: 0, payout: 0, balance: 97,
  }), "none")
})

test("unmapped or missing result data stays pending instead of becoming a guessed celebration or zero payout", () => {
  const state = pending()
  assert.ok(state.shot)
  const unknown = { ...mockResult(state.shot), band: 99 } as unknown as Result
  assert.strictEqual(reduce(state, { type: "RESULT", result: unknown }), state)
  assert.strictEqual(reduce(state, { type: "RESULT", result: null as unknown as Result }), state)
  const incomplete = {
    ...state.shot,
    conditions: {
      ...state.shot.conditions,
      rewards: state.shot.conditions.rewards.filter((reward) => reward.id !== "x2"),
    },
  }
  assert.throws(() => mockResult(incomplete), /보상 구간 응답/)
  assert.equal(state.balance, 97)
  assert.equal(state.result, null)
})
