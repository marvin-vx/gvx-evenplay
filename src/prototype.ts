export type Stage = "entry" | "qr" | "connecting" | "connectionfailed" | "connected" | "ready" | "shot" | "rolling" | "judging" | "result" | "updating" | "insufficient" | "reconnecting" | "practice"
export type Eligibility = "eligible" | "pending" | "restricted"
export type View = "all" | "controller" | "screen"
// Legacy Mock selector keys only; never interpret these as received multipliers.
export type Outcome = "hole" | "x3" | "x2" | "x1.5" | "x1" | "x0.5" | "none"
export type RewardBand = 1 | 2 | 3 | 4 | 5 | 6
export type PlayerProfile = {
  nickname: string
  avatarUrl: string | null
  index: number | null
}
export type ConnectionFailureReason = "server" | "no-response" | "rejected"
export type ConnectionFailure = {
  reason: ConnectionFailureReason
  message: string
}
export type Service = "enabled" | "disabled" | "unknown"
export type Reward = {
  id: Outcome
  band: RewardBand
  label: string
  distance: number | null
  multiplier: number | null
  payout: number
}
export type Conditions = {
  id: string
  stake: number
  target: number
  rewards: Reward[]
  minimumStake: number
  missionName: string
  missionDescription: string
}
export type Shot = {
  id: string
  conditions: Conditions
  outcome: Outcome
  openingBalance: number
}
export type Result = {
  shotId: string
  band: RewardBand | "none"
  distance: number
  payout: number
  balance: number
}
export type PracticeShot = {
  id: string
  resumeStage: Stage
}
export const documentInfo = {
  version: "V0.3",
  date: "2026.10.28",
  pageCount: 18,
  sourceNote: "첨부파일명 V0.3 · 원문 표지 V0.1 / 본문 V0.2 표기 혼재 · 원문 유지",
}
export const roundMoney = (value: number) => Math.round(value * 100) / 100
export const mockMinimumStake = 1
export function mockQrValue(baseUrl: string, qrVersion: number) {
  const url = new URL(baseUrl)
  url.search = ""
  url.hash = ""
  url.searchParams.set("session_id", `mock-gvx-${qrVersion}`)
  return url.toString()
}
export const money = (value: number | null | undefined) =>
  value == null ? "—" : `$${value.toFixed(2)}`
export const outcomeLabels: Record<Outcome, string> = {
  hole: "보상 1단계 · 홀인원 · 최상위",
  x3: "보상 2단계 · 강조형",
  x2: "보상 3단계 · 강조형",
  "x1.5": "보상 4단계 · 기본형",
  x1: "보상 5단계 · 기본형",
  "x0.5": "보상 6단계 · 기본형",
  none: "확정 미지급 · 축하 연출 없음",
}
export function formatMultiplier(value: number | null) {
  return value === null
    ? "—"
    : `×${value.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 3 })}`
}
export function resultLevel(result: Result) {
  return result.band === 1
    ? "jackpot"
    : result.band === 2 || result.band === 3
      ? "highlight"
      : result.band === "none"
        ? "none"
        : "basic"
}

// Adjustable prototype fixtures, not finalized service timing policy.
export const mockTimingDefaults = {
  resultSeconds: 5,
  connectionNoticeSeconds: 5,
} as const

export const flow = [
  {
    stage: "entry",
    title: "숏게임 진입",
    id: "EP-01",
    detail: "시작 버튼 · WAIT 배너",
  },
  {
    stage: "qr",
    title: "QR 연결",
    id: "EP-02",
    detail: "로그인 · 최초 참가 설정",
  },
  {
    stage: "connecting",
    title: "QR 연결 중",
    id: "EP-02A",
    detail: "양쪽 중앙 연결 진행 안내",
  },
  {
    stage: "connectionfailed",
    title: "QR 연결 실패",
    id: "EP-02A-X",
    detail: "사유 표시 · 요청 취소 · 재시도",
  },
  {
    stage: "connected",
    title: "연결 & 참여 가능 여부",
    id: "EP-03",
    detail: "Evenplay 가능/불가 통지",
  },
  {
    stage: "ready",
    title: "조건 수신 & 샷 준비",
    id: "EP-04·06",
    detail: "자동 참여 · 양쪽 READY / 동시 WAIT",
  },
  {
    stage: "shot",
    title: "샷 & 판정 대기",
    id: "EP-07",
    detail: "시작 시 차감 · 볼 정지 후 지급 처리",
  },
  {
    stage: "result",
    title: "결과 & 보상 연출",
    id: "EP-08·08A",
    detail: "최상위 · 강조형 · 기본형",
  },
  {
    stage: "updating",
    title: "다음 샷 & 종료",
    id: "EP-05·09·10",
    detail: "조건 재조정 · 안전한 종료",
  },
] as const
export function stepIndex(stage: Stage) {
  if (["rolling", "judging", "reconnecting", "practice"].includes(stage))
    return flow.findIndex((item) => item.stage === "shot")
  if (stage === "insufficient")
    return flow.findIndex((item) => item.stage === "updating")
  return Math.max(
    0,
    flow.findIndex((item) => item.stage === stage),
  )
}
export const stageInfo: Record<Stage, {
  title: string
  description: string
  code: string
  action: string
}> = {
  entry: {
    title: "숏게임 진입",
    description:
      "숏게임에서 시작합니다. 이번 연습에서 참여한 적이 없고 센서가 WAIT일 때만 배너를 노출합니다.",
    code: "IDLE",
    action: "Evenplay 시작하기",
  },
  qr: {
    title: "QR 연결 대기",
    description:
      "접속 링크와 session_id로 연결합니다. QR 유효기간·만료·재발급 단계는 없으며 실제 인증은 미연결입니다.",
    code: "QR WAIT",
    action: "모바일 연결 요청 (Mock)",
  },
  connecting: {
    title: "EVENPLAY 연결 중",
    description:
      "키오스크와 스크린 중앙에 연결 진행 안내를 표시합니다. 응답 전에는 연결 완료나 참가 가능으로 판단하지 않습니다.",
    code: "CONNECTING",
    action: "연결 성공 응답 (Mock)",
  },
  connectionfailed: {
    title: "EVENPLAY 연결 실패",
    description:
      "실패 사유를 양쪽 중앙에 표시하고 연결 요청을 취소합니다. 미수신 금액을 0으로 표시하지 않고 닫기 또는 명시적 재시도로 복귀합니다.",
    code: "CONNECTION FAILED",
    action: "QR 연결 다시 시도 (Mock)",
  },
  connected: {
    title: "참여 가능 여부 확인",
    description:
      "Evenplay의 참여 가능/불가 응답만 반영합니다. GVX 회원·게스트·포인트 분기는 없습니다.",
    code: "BET WAIT",
    action: "이번 샷 조건 수신",
  },
  ready: {
    title: "샷 조건 준비 완료",
    description:
      "센서·베팅이 모두 준비되어야 양쪽 READY로 표시하며, 한쪽이 해제되면 양쪽 WAIT로 표시합니다. 베팅 미준비 중에도 센서 입력이 준비되면 무차감 일반 연습이 가능합니다.",
    code: "CONDITIONS READY",
    action: "샷 시뮬레이션",
  },
  shot: {
    title: "샷 진행 중",
    description:
      "베팅 샷 시작 시 참가금을 차감합니다. 이번 샷 조건은 고정하고 비행·착지·굴림을 거쳐 볼 정지 후 결과를 전송합니다.",
    code: "IN PLAY",
    action: "샷 진행 중…",
  },
  rolling: {
    title: "볼 굴림 · 정지 대기",
    description:
      "착지만으로 정산하지 않습니다. 볼이 완전히 정지한 뒤 최종 샷 결과를 전송하고 지급 처리를 기다립니다.",
    code: "BALL ROLLING",
    action: "볼 정지 대기…",
  },
  judging: {
    title: "지급 처리 중",
    description:
      "볼 정지 후 최종 판정·지급 응답을 기다립니다. 하단 버튼을 눌러 결과를 수신하며 지연을 실패나 0원으로 처리하지 않습니다. 거래내역은 모바일에서 확인합니다.",
    code: "PENDING",
    action: "최종 판정 수신 (다음 단계)",
  },
  result: {
    title: "최종 결과 확인",
    description:
      "이번 샷의 핀까지 거리·원금 포함 지급금·확정 잔액만 표시합니다. 목표 거리와 핀까지 거리를 구분하며 거래내역은 모바일에서 확인합니다.",
    code: "RESULT",
    action: "다음 샷 준비하기",
  },
  updating: {
    title: "다음 샷 조건 조정 중",
    description:
      "일반 연습은 계속 가능합니다. 하단 ‘조정된 조건 수신’ 버튼을 누르면 다음 베팅의 볼 위치·타겟 링·지급금 표를 함께 갱신합니다.",
    code: "BET WAIT",
    action: "조정된 조건 수신 (다음 단계)",
  },
  insufficient: {
    title: "최소 참가금 미만 · 베팅 일시정지",
    description:
      "신규 베팅만 일시정지합니다. 일반 연습은 가능하며 모바일 충전 후 베팅 가능 상태를 다시 확인합니다.",
    code: "BET PAUSED",
    action: "충전 후 베팅 가능 응답 (Mock)",
  },
  reconnecting: {
    title: "연결 복구 대기",
    description:
      "베팅 준비를 해제하고 동일 세션으로 자동 재연결합니다. 미정산 샷은 결과를 재송신하며, 미준비 상태에서는 일반 연습이 가능합니다.",
    code: "RECONNECTING",
    action: "재연결 응답 (Mock)",
  },
  practice: {
    title: "일반 연습 샷 · 노베팅",
    description:
      "센서는 READY이지만 베팅은 미준비 상태인 일반 연습 샷입니다. 참가금 차감·판정 요청·보상 지급 없이 기존 연습을 계속합니다.",
    code: "PRACTICE · NO BET",
    action: "일반 연습 샷 진행 중…",
  },
}

export type LogEntry = {
  id: number
  time: string
  event: string
  detail: string
  kind: "info" | "success" | "warning"
}
export function makeLog(
  event: string,
  detail: string,
  kind: LogEntry["kind"] = "info",
): LogEntry {
  return {
    id: Date.now() + Math.random(),
    time: new Date().toLocaleTimeString("en-GB"),
    event,
    detail,
    kind,
  }
}
export const initialLogs = () => [
  makeLog("sdk.initialized", "SDK v2 Mock · 첨부 V0.3 / 18페이지 · 실서버 미연결", "success"),
  makeLog("training.entered", "SHOT 숏게임 · GVX 센서 WAIT"),
  makeLog("policy.loaded", "QR 무기한 · 개인 Shot Clock 없음 · BET WAIT 일반 연습 가능"),
]

export const referenceScreens = [
  {
    title: "참여 진입",
    id: "EP-01",
    image: "/assets/reference-entry.webp",
    description:
      "이번 연습 중 참여 이력이 없는 경우에만 미연결·숏게임·서비스 활성·GVX WAIT에서 반복 노출합니다. 한 번 참여하면 종료 후에도 숨깁니다.",
  },
  {
    title: "QR 연결",
    id: "EP-02",
    image: "/assets/reference-qr.webp",
    description:
      "접속 링크와 session_id로 구성하며 유효기간·만료 안내·만료 재발급 단계는 없습니다(E01).",
  },
  {
    title: "연결 중·실패 토스트",
    id: "EP-02A",
    image: "/assets/spec/page-06.webp?v=2026.10.28",
    description:
      "연결 요청부터 성공·실패 응답을 분리하고 키오스크·스크린 중앙에 문서의 노란 토스트를 함께 표시합니다. 실패 사유를 표시한 뒤 요청을 취소합니다.",
  },
  {
    title: "연결 완료",
    id: "EP-03",
    image: "/assets/reference-connected.webp",
    description:
      "미수신 금액·INDEX는 “—”입니다. 프로필 이미지·EVENPLAY CONNECTED·전체 닉네임·수신 INDEX를 잠시 표시한 뒤 숨기며, 참가 자격은 Evenplay 응답만 반영합니다.",
  },
  {
    title: "BET READY",
    id: "EP-04",
    image: "/assets/spec/ready.webp",
    description:
      "사용자 확정: 참여 중 센서·베팅 중 한쪽이 해제되면 양쪽 WAIT로 표시하고, 둘 다 준비되면 양쪽 READY로 표시합니다. 실제 센서 입력은 유지하므로 BET WAIT에서도 무차감 일반 연습이 가능합니다(E08).",
  },
  {
    title: "타겟 재조정",
    id: "EP-05",
    image: "/assets/spec/target.webp",
    description:
      "정산 후 다음 베팅에서만 목표 거리에 맞춰 볼 위치·타겟 링·지급금 표를 함께 갱신합니다. 같은 보상 구간은 같은 색상입니다(E09·E10).",
  },
  {
    title: "필수 HUD",
    id: "EP-06",
    image: "/assets/spec/hud.webp",
    description:
      "거리 조건·지급 배수·지급금은 독립된 Evenplay 수신 필드를 그대로 표시합니다. GVX는 별도 지급금 계산이나 고정 샘플 배수를 사용하지 않습니다. 대기 표는 이전 조건으로 구분합니다.",
  },
  {
    title: "지급 결과",
    id: "EP-08",
    image: "/assets/spec/result.webp",
    description:
      "$3은 샷 시작 시 차감하고 볼 정지 후 지급 처리합니다. $6 지급은 원금 포함 수령액이며 거래내역은 모바일에서 확인합니다(E04·E13).",
  },
  {
    title: "최상위 연출",
    id: "EP-08A",
    image: "/assets/spec/jackpot.webp",
    description:
      "수신 보상 1단계는 최상위, 2·3단계는 강조형, 4·5·6단계는 기본형입니다. 배수·거리·금액으로 등급을 추정하지 않으며 확정 미지급에는 축하 연출이 없습니다.",
  },
  {
    title: "참여 종료",
    id: "EP-10",
    image: "/assets/spec/exit.webp",
    description:
      "닉네임·금액·보상표·전용 타겟을 제거하고 숏게임 설정을 유지합니다. 진행 중 종료 요청은 현재 샷의 최종 판정·결과 표시 후 처리하며 다음 샷에 참여하지 않습니다.",
  },
]
export const documentPages = [
  "표지",
  "V1 적용 범위 · 클라이언트 / QMS 2차",
  "전체 이용 흐름과 기기별 역할",
  "참여 진입 · 시작 버튼과 배너",
  "QR 연결 팝업",
  "QR 연결 중·실패 처리",
  "연결 완료와 참가 가능 상태",
  "이번 샷 조건 · BET WAIT / READY",
  "개인화 타겟과 보상 조건 갱신",
  "미션 보상 HUD · 수신 거리/배수/지급금",
  "샷 진행과 결과 확인 대기",
  "결과 표시와 성공·실패 연출",
  "보상 6구간과 성공 연출 3종",
  "다음 샷 준비와 반복",
  "참여 종료와 트레이닝 복귀",
  "예외 상태와 플레이어 안내",
  "공통 표시와 운영 규칙",
  "후속 확인 체크리스트",
]
export const policies = [
  {
    id: "SCOPE",
    status: "확정",
    title: "1차 PGA 범위와 활성화",
    detail: "매장 사용 가능 여부와 타석 클라이언트 config가 모두 확인된 경우만 진입을 표시합니다. QMS 참여 가능 타석 설정·결과 이력 관리는 2차 범위이며 1차에서 제외합니다.",
  },
  {
    id: "D01",
    status: "확정",
    title: "진입 순서",
    detail: "숏게임 진입 → 시작 → QR. 연결 후 다른 모드로 이동하지 않습니다.",
  },
  {
    id: "D02",
    status: "확정",
    title: "자동 참여",
    detail: "재수락 없이 자동 참여합니다. 잔액별 참가금을 반영하고 최소 금액 미만이면 신규 베팅만 일시정지하며 일반 연습은 계속 가능합니다.",
  },
  {
    id: "D03",
    status: "확정",
    title: "Evenplay 참가 자격",
    detail: "GVX 계정과 무관. Evenplay 가능/불가 통지만 반영합니다.",
  },
  {
    id: "D04",
    status: "확정",
    title: "다음 샷 조건",
    detail:
      "정산 완료 후 다음 베팅의 목표 거리·보상을 수신해 볼 위치·링·지급금 표를 함께 갱신합니다. 샷 진행·결과 처리 중 조건은 고정합니다.",
  },
  {
    id: "D05",
    status: "일부 반영 · 확인 필요",
    title: "Shot Clock / INDEX",
    detail:
      "개인 모드 Shot Clock은 미적용입니다. 연결 완료 안내에 수신 INDEX(플레이어 실력 지수)를 표시하되 미수신은 —입니다. 실제 제공값·원천 단위·척도는 업체 확인 사항입니다.",
  },
  {
    id: "D06",
    status: "일부 반영 · 확인 필요",
    title: "진행·연결 예외",
    detail:
      "BET WAIT 일반 연습과 자동 재연결·동일 샷 재송신을 Mock으로 반영합니다. 미완료 정산·지연 접수 기한·최종 실패 처리는 □ E05·E11 확인 사항입니다.",
  },
  {
    id: "D07",
    status: "일부 확정",
    title: "결과 연출",
    detail:
      "수신 보상 1단계(홀인원)는 최상위, 2·3단계는 강조형, 4·5·6단계는 기본형입니다. 지급 배수나 금액으로 등급을 추정하지 않습니다. 실제 원천 식별값 매핑·공식 리소스는 업체 확인 사항입니다.",
  },
  {
    id: "D08",
    status: "사용자 결정 · 일부 미정",
    title: "특수 상태 조작",
    detail:
      "현재 샷 판정 후 종료 예약과 원본 숏게임·클럽 유지 결정을 적용합니다. 거래내역은 모바일 전용입니다. ◇ 모바일 연결 해제·볼 위치 등 복구 범위는 GVX 후속 결정 사항입니다.",
  },
  {
    id: "HUD",
    status: "확정",
    title: "표시 데이터의 주체",
    detail: "미션명·설명·거리 조건·지급 배수·지급금은 Evenplay 응답값입니다. GVX 표시·상태 전이 코드에는 보상 계산을 두지 않으며 테스트 응답 생산은 별도 Mock 경계로 분리합니다.",
  },
  {
    id: "QR",
    status: "답변 반영",
    title: "QR 유효시간",
    detail:
      "유효기간 없는 링크·session_id로 연결합니다. 요청 확인 후 양쪽 중앙에 연결 중 토스트를 표시하고 성공/사유 포함 실패로 전환합니다. 실제 실패 코드·대기 종료·재시도 방식은 별도 확인합니다.",
  },
  {
    id: "BANNER",
    status: "사용자 확정",
    title: "배너 반복 노출",
    detail:
      "현재 연습에서 한 번이라도 참여했다면 종료 후에도 계속 비노출합니다. 참여 전에는 GVX WAIT마다 노출하고 READY·샷 진행 중에는 숨깁니다. 새 연습 초기화 시 이력을 지웁니다.",
  },
  {
    id: "READY-SYNC",
    status: "사용자 확정",
    title: "READY / WAIT 표시 동기화",
    detail:
      "7p와 8·17p의 표시 충돌은 사용자 답변 ‘한쪽 해제 시 양쪽 WAIT로 표시’를 적용합니다. 참여 중에는 센서·베팅이 모두 준비되어야 양쪽 READY이며, 한쪽이 미준비이면 양쪽 WAIT입니다. 실제 센서 입력·무차감 일반 연습과 샷 처리·판정 표시는 유지합니다.",
  },
]

export const followUps = [
  { id: "E05·E11", owner: "□ Evenplay 확인", title: "미완료·지연 정산", detail: "차감 후 결과 미전송, 지연 정산 접수 기한, 최종 실패의 취소·반환 기준은 미확정입니다. 샘플은 임의 환불·0원 확정을 하지 않습니다." },
  { id: "E07", owner: "□ Evenplay 확인", title: "공식 리소스·필수 고지", detail: "로고·효과음 제공 여부와 사용 조건, 필수 노출 고지 문구를 확인해야 합니다. 현재 글자 로고·음향은 Mock입니다." },
  { id: "DISPLAY", owner: "□ Evenplay 확인", title: "수신 데이터·원천 단위·INDEX", detail: "거리·배수·지급금 제공은 확정이며 받은 값을 그대로 표시합니다. INDEX는 7p의 실력 지수 안내를 따르되 실제 제공값·척도·원천 단위는 확인 사항입니다. 미수신은 —이며 USD·yd는 샘플 단위입니다." },
  { id: "EP-02A", owner: "□ Evenplay 확인", title: "연결 상태·사유·재시도", detail: "요청·성공·실패 신호와 실제 사유 코드, 무응답 대기 종료 기준, 재시도 연결 방식을 확인해야 합니다. 샘플은 명시적 응답으로 실패를 전달하고 임의 시간 초과로 실패를 가정하지 않습니다." },
  { id: "BAND-MAP", owner: "□ Evenplay 확인", title: "보상 1~6단계 식별값", detail: "정규화된 1~6단계와 연출 매핑은 반영합니다. 실제 Evenplay API의 원천 구간 식별값·매핑은 미확정입니다. 샘플은 배수나 금액으로 구간을 추정하지 않습니다." },
  { id: "E02·E03", owner: "△ 실서버 검증", title: "세션 복구·무활동 퇴장", detail: "동일 세션 재시작 15분 내 복구, 타석 15분·손님 30분 무활동 퇴장은 실서버 미검증입니다. 개인 샷 제한시간과 구분하며 임의 타이머를 만들지 않습니다." },
  { id: "E04·E06·E12", owner: "△ 실서버 검증", title: "인증·실제 베팅·충전", detail: "문서는 통신 접속·응답만 확인했다고 명시합니다. 이 샘플에는 실서버가 연결되지 않았으며 인증·차감·정산·금액 조정·충전 후 재개는 모두 Mock입니다. 최소 참가금 기본 $1도 조절 가능한 테스트 값입니다." },
  { id: "E09·E11", owner: "△ 실서버 검증", title: "볼 이동·결과 재송신", detail: "목표 거리 수신에 따른 화면상 볼 이동과 중복 정산 방지는 Mock으로 검증합니다. 실제 GVX 볼 이동·동일 세션 결과 재송신·지급 응답은 실서버 검증이 필요합니다." },
  { id: "E10", owner: "◇ GVX 결정", title: "결과 영향 설정 제한", detail: "Master 기준, 바람·그린 스피드 등 제한 목록·조작 방식은 미확정입니다. 원본 캡처의 기존 환경을 임의로 재설계하지 않습니다." },
  { id: "E08·D08", owner: "◇ GVX 결정", title: "대기·종료·복구 범위", detail: "샷 판정 후 종료와 일반 연습 허용을 유지합니다. 모바일 연결 해제 및 이전 볼 위치 등 복구 범위는 후속 결정입니다. 샘플은 마지막 볼 위치·클럽을 유지합니다." },
  { id: "D07", owner: "◇ GVX 결정", title: "연출 제작", detail: "성공 3단계는 유지합니다. 최종 영문 문구·시각/음향 강도·노출 시간은 미정이며 결과 표시 5/8/12초는 Mock입니다." },
]
