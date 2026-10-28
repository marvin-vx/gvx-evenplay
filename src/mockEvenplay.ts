import {
  mockMinimumStake,
  roundMoney,
  type Conditions,
  type ConnectionFailure,
  type ConnectionFailureReason,
  type Outcome,
  type PlayerProfile,
  type Result,
  type RewardBand,
  type Shot,
} from "./prototype.ts"

// This producer simulates Evenplay responses. GVX rendering/reducer code must
// consume its fields, never derive payout, multipliers or animation tier itself.
export function mockConditions(
  shotNumber: number,
  balance = 100,
  minimumStake = mockMinimumStake,
): Conditions {
  const variant = (shotNumber - 1) % 3
  const requestedStake = [3, 4, 2.5][variant]
  const stake = roundMoney(Math.min(requestedStake, Math.max(0, balance)))
  const distances = [
    [1.7, 3.3, 5, 6.7, 10],
    [1.5, 3, 4.5, 6, 9],
    [2, 3.8, 5.5, 7.2, 11],
  ][variant]
  const multipliers = [
    [3, 2, 1.5, 1, .5],
    [3.5, 2.25, 1.75, 1.2, .6],
    [4, 2.4, 1.6, 1.1, .4],
  ][variant]
  const ids: Outcome[] = ["x3", "x2", "x1.5", "x1", "x0.5"]
  return {
    id: `conditions-${shotNumber}`,
    stake,
    target: [50, 55, 45][variant],
    minimumStake,
    // Preserve the wording printed in the new source; actual copy is data-supplied.
    missionName: "Closet to the Pin",
    missionDescription: "The closer to the pin, the bigger the prize.",
    rewards: [
      { id: "hole", band: 1, label: "Hole-in-one", distance: null, multiplier: null, payout: variant === 1 ? 120 : 100 },
      ...ids.map((id, index) => ({
        id,
        band: (index + 2) as RewardBand,
        label: `보상 ${index + 2}단계`,
        distance: distances[index],
        multiplier: multipliers[index],
        payout: roundMoney(stake * multipliers[index]),
      })),
    ],
  }
}

export function mockResult(shot: Shot): Result {
  if (shot.outcome === "none")
    return { shotId: shot.id, band: "none", distance: 12.4, payout: 0, balance: roundMoney(shot.openingBalance - shot.conditions.stake) }
  const reward = shot.conditions.rewards.find((item) => item.id === shot.outcome)
  if (!reward) throw new Error("Mock 최종 보상 구간 응답이 없습니다.")
  return {
    shotId: shot.id,
    band: reward.band,
    distance: reward.distance ?? 0,
    payout: reward.payout,
    balance: roundMoney(shot.openingBalance - shot.conditions.stake + reward.payout),
  }
}

export function mockPlayerProfile(complete = false): PlayerProfile {
  return complete
    ? { nickname: "Test A", avatarUrl: "/assets/mock-player-profile.webp", index: 72.4 }
    : { nickname: "Marvin", avatarUrl: null, index: null }
}

export function mockConnectionFailure(reason: ConnectionFailureReason): ConnectionFailure {
  const messages: Record<ConnectionFailureReason, string> = {
    server: "서버에 연결할 수 없습니다.\n잠시 후 다시 시도해 주세요.",
    "no-response": "EVENPLAY로부터 응답이 없습니다.\n잠시 후 다시 시도해 주세요.",
    rejected: "EVENPLAY에서 연결 요청을 거절했습니다.\n모바일 안내를 확인한 후 다시 시도해 주세요.",
  }
  return { reason, message: messages[reason] }
}
