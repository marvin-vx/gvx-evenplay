import { useEffect, useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Maximize2, Pause, Play, RotateCcw, X } from "lucide-react"
import { Button, Select } from "./Controls"
import { canEnter, getReadyIndicators, isLocked, type Action, type SessionState } from "./engine"
import Modal from "./Modal"
import { formatMultiplier, mockQrValue, money, resultLevel } from "./prototype"

type Props = {
  state: SessionState
  banner: boolean
  connectionNoticeSeconds: number | null
  send: (action: Action) => void
  onEnd: () => void
  onCancelConnection: () => void
}

export default function Simulator({ state, banner, connectionNoticeSeconds, send, onEnd, onCancelConnection }: Props) {
  const { stage, session, result, endRequested } = state
  const { gvxReady, betReady } = getReadyIndicators(state)
  const [club, setClub] = useState("SW")
  const [cameraPlaying, setCameraPlaying] = useState(true)
  const [cameraExpanded, setCameraExpanded] = useState(false)
  const [missionVisible, setMissionVisible] = useState(false)
  const [profileVisible, setProfileVisible] = useState(false)
  const conditions = state.conditions ?? state.shot?.conditions ?? null
  const displayConditions = conditions ?? state.displayConditions
  const rewardRows = displayConditions
    ? [...displayConditions.rewards].sort((a, b) => a.band - b.band)
    : []
  const target = state.ballDistance
  const ballY = Math.max(270, Math.min(320, 297 + (target - 50) * 2.4))
  const moving = ["shot", "rolling", "practice"].includes(stage)
  const qrVisible = stage === "qr" || state.practiceShot?.resumeStage === "qr"
  const staleConditions = !conditions && !!displayConditions
  const busy = isLocked(state)
  const locked = busy || endRequested
  const betLabel = endRequested
    ? result ? "RESULT · 종료 예약" : "판정 후 종료 예약"
    : stage === "practice"
      ? "PRACTICE · NO BET"
      : stage === "shot" || stage === "rolling"
        ? "IN PLAY"
        : stage === "judging"
          ? "PAYOUT PENDING"
          : betReady ? "BET READY" : "BET WAIT"

  useEffect(() => {
    setMissionVisible(betReady)
    if (!betReady) return
    const timer = window.setTimeout(() => setMissionVisible(false), 3000)
    return () => window.clearTimeout(timer)
  }, [betReady, conditions?.id])

  useEffect(() => {
    if (!session || state.connectionNoticeVersion === 0) {
      setProfileVisible(false)
      return
    }
    setProfileVisible(true)
    if (connectionNoticeSeconds === null) return
    const timer = window.setTimeout(() => setProfileVisible(false), connectionNoticeSeconds * 1000)
    return () => window.clearTimeout(timer)
  }, [session, state.connectionNoticeVersion, connectionNoticeSeconds])

  return (
    <div className={`service-canvas stage-${stage}`} aria-label="GVX 기존 서비스 화면">
      {/* Keep the supplied operating GUI intact; only named live layers sit above it. */}
      <img
        className="gvx-original"
        src="/assets/gvx-service-original.png"
        width={946}
        height={397}
        alt="기존 GVX 숏게임 GUI: 왼쪽 샷 계기판·임팩트 카메라, 중앙 코스, 오른쪽 정보창, 하단 메뉴"
        draggable={false}
        fetchPriority="high"
      />
      <img className="gvx-debug-cover" src="/assets/gvx-debug-surface.png" alt="" aria-hidden="true" />
      <img className="gvx-ball-cover" src="/assets/gvx-ball-surface.png" alt="" aria-hidden="true" />
      {!moving && (
        <svg className="gvx-live-ball" viewBox="0 0 946 397" aria-label={`볼 위치 · 목표 거리 ${target} yd`} data-distance={target}>
          <circle cx={583} cy={["judging", "result"].includes(stage) ? 218 : ballY} r="2.5" />
        </svg>
      )}
      <div className={`gvx-native-top-state ${moving ? "in-play" : ""}`}>
        {moving ? "Up and Running" : gvxReady ? "READY" : "WAIT"}
      </div>
      {(gvxReady || moving) && (
        <div className={`gvx-native-shot-state ${moving ? "in-play" : ""}`}>
          {moving ? stage === "rolling" ? "ROLLING" : "IN PLAY" : "READY"}
        </div>
      )}
      <Select
        className="gvx-native-control gvx-native-club"
        aria-label="클럽 선택"
        title="기존 GVX 클럽 선택"
        value={club}
        disabled={locked}
        onChange={(event) => setClub(event.target.value)}
      >
        <option>SW</option>
        <option>AW</option>
        <option>PW</option>
      </Select>
      {club !== "SW" && (
        <>
          <span className="gvx-club-heading">5th {club}</span>
          <span className="gvx-club-value">{club}</span>
          <span className="gvx-screen-club">{club}</span>
        </>
      )}
      {target !== 50 && (
        <>
          <span className="gvx-pin-value">{target.toFixed(1)}yd</span>
          <span className="gvx-target-value">Target Dist. {target} yd</span>
        </>
      )}
      <Button
        className="gvx-native-control gvx-camera-play"
        aria-label={cameraPlaying ? "카메라 일시 정지" : "카메라 재생"}
        disabled={locked}
        onClick={() => setCameraPlaying(!cameraPlaying)}
      >
        {!cameraPlaying && <Play />}
      </Button>
      {!cameraPlaying && <span className="gvx-camera-paused">PAUSED</span>}
      <Button
        className="gvx-native-control gvx-camera-expand"
        aria-label="카메라 확대"
        disabled={locked}
        onClick={() => setCameraExpanded(true)}
      >
        <Maximize2 />
      </Button>
      <div className="gvx-entry-slot">
        {(session || canEnter(state)) && (
          <Button
            className="gvx-evenplay"
            aria-label={endRequested ? "종료 예약됨" : session ? "End EVENPLAY" : "Start EVENPLAY"}
            disabled={endRequested || (!session && locked)}
            title={
              endRequested
                ? "현재 샷 판정·결과 표시 후 종료됩니다."
                : busy
                  ? "현재 샷 판정 후 종료 예약"
                  : session ? "End EVENPLAY" : "Start EVENPLAY"
            }
            onClick={session ? onEnd : () => send({ type: "START" })}
          >
            <span>{endRequested ? "예약됨" : session ? "End" : "Start"}</span>
            <span>EVENPLAY</span>
          </Button>
        )}
      </div>

      {banner && (
        <div className="ep-entry-banner" data-evenplay-layer="entry-banner">
          <strong>EVENPLAY CHALLENGE</strong>
          <span>Tap ‘Start EVENPLAY’ on the kiosk to join</span>
        </div>
      )}

      {session && (
        <>
          <div className="ep-bet-panel" data-evenplay-layer="bet-hud">
            <div className="ep-money">
              <span>Stake {money(conditions?.stake)}</span>
              <strong>Balance {money(state.balance)}</strong>
            </div>
            {displayConditions && (
              <div className="ep-rewards">
                <strong>Payout by Distance</strong>
                {rewardRows.map((reward) => (
                  <div key={reward.id} data-band={reward.band} className={result?.band === reward.band ? "selected" : ""}>
                    <span>
                      {reward.distance === null
                        ? reward.label
                        : `≤ ${reward.distance} yd`}
                    </span>
                    <span className="ep-reward-multiplier">{formatMultiplier(reward.multiplier)}</span>
                    <span>{money(reward.payout)}</span>
                  </div>
                ))}
                <small className="ep-mission-caption">{displayConditions.missionName || "—"} · Target {target.toFixed(1)} yd</small>
                {staleConditions && <small className="ep-stale-label">이전 조건 · 새 베팅 미준비</small>}
              </div>
            )}
            <div className={`ep-bet-state ${betReady ? "ready" : ""}`}>
              {betLabel}
            </div>
            {["connected", "updating", "insufficient", "reconnecting", "practice"].includes(stage) && (
              <div className="ep-practice-hint">
                {stage === "insufficient" ? "자동 베팅 일시정지 · " : "베팅 준비 중 · "}
                일반 연습 가능
              </div>
            )}
          </div>
          {profileVisible && state.online && <div className="ep-player" data-evenplay-layer="participant" role="status">
            {state.player?.avatarUrl
              ? <img className="ep-avatar" src={state.player.avatarUrl} alt={`${state.player.nickname} 프로필 이미지`} />
              : <span className="ep-avatar">{state.player?.nickname.charAt(0) || "—"}</span>}
            <div>
              <span>EVENPLAY CONNECTED</span>
              <strong>{state.player?.nickname ?? "—"}</strong>
              <span className="ep-player-index" title="플레이어 실력 지수 · 수신값">
                EVENPLAY INDEX: {state.player?.index ?? "—"}
              </span>
            </div>
          </div>}
        </>
      )}

      {session && displayConditions && (
        <svg
          className={`ep-target-rings ${staleConditions ? "stale" : ""}`}
          viewBox="0 0 280 100"
          preserveAspectRatio="none"
          aria-label={`Evenplay 타겟 ${target} yd · 지급금 표와 동일 구간 색상`}
          data-evenplay-layer="target"
        >
          {rewardRows.filter((reward) => reward.distance !== null).sort((a, b) => (b.distance ?? 0) - (a.distance ?? 0)).map((reward) => {
            const maxDistance = Math.max(...displayConditions.rewards.map((item) => item.distance ?? 0))
            const ratio = (reward.distance ?? 0) / maxDistance
            return <ellipse key={reward.id} cx="140" cy="50" rx={134 * ratio} ry={44 * ratio} data-band={reward.band} />
          })}
          <ellipse cx="140" cy="50" rx="6" ry="2.5" data-band="1" />
        </svg>
      )}
      {missionVisible && betReady && (
        <div className="ep-mission" data-evenplay-layer="mission">
          <span>MISSION</span>
          <strong>{conditions?.missionName || "—"}</strong>
          <span>{conditions?.missionDescription || "—"}</span>
        </div>
      )}
      {stage === "updating" && (
        <div className="ep-adjustment">
          <RotateCcw />
          <span><strong>EVENPLAY 실시간 연동</strong>다음 샷의 보상과 타겟을 조정 중입니다.</span>
        </div>
      )}
      {stage === "qr" && (
        <div className="ep-screen-notice">휴대폰 연결을 기다리고 있습니다.</div>
      )}
      {["connecting", "connectionfailed"].includes(stage) &&
        (["controller", "screen"] as const).map((location) => (
          <div
            key={location}
            className={`ep-connection-toast ${location}`}
            role={location === "controller" ? stage === "connectionfailed" ? "alert" : "status" : undefined}
            aria-hidden={location === "screen" ? true : undefined}
            data-connection-notice={location}
          >
            <strong>{stage === "connecting" ? "EVENPLAY에 연결 중입니다." : "EVENPLAY 연결 실패"}</strong>
            <span>{stage === "connecting" ? "잠시만 기다려 주세요." : state.connectionFailure?.message}</span>
          </div>
        ))}
      {stage === "connected" && state.eligibility !== "eligible" && (
        <div className="ep-screen-notice">
          {state.eligibility === "restricted"
            ? "Evenplay 참여 불가 · 모바일 안내를 확인해 주세요."
            : "Evenplay 참여 가능 여부를 확인하고 있습니다."}
        </div>
      )}
      {["insufficient", "reconnecting"].includes(stage) && (
        <div className="ep-screen-notice">
          {stage === "insufficient"
            ? "잔액이 최소 참가금보다 적습니다. 자동 베팅은 멈추고 일반 연습은 가능합니다."
            : stage === "reconnecting"
              ? "Evenplay에 자동으로 다시 연결하고 있습니다. 베팅 준비 전 일반 연습은 가능합니다."
              : ""}
        </div>
      )}
      {(stage === "shot" || stage === "practice") && (
        <svg className="gvx-shot-flight" viewBox="0 0 946 397" aria-hidden="true">
          <path d={`M 583 ${ballY} Q 687 83 584 214`} />
          <circle r="2.5">
            <animateMotion dur="1.8s" fill="freeze" path={`M 583 ${ballY} Q 687 83 584 214`} />
          </circle>
        </svg>
      )}
      {stage === "rolling" && (
        <svg className="gvx-shot-flight" viewBox="0 0 946 397" aria-hidden="true">
          <circle r="2.5">
            <animateMotion dur="1s" fill="freeze" path="M 584 214 L 589 218" />
          </circle>
        </svg>
      )}
      {stage === "judging" && (
        <div className="ep-screen-notice ep-pending">
          <span className="loading-spinner" />
          지급 처리 중입니다.
          <small>거래내역은 모바일에서 확인하세요.</small>
          {endRequested && <small>현재 샷 판정 후 종료 예정</small>}
        </div>
      )}
      {stage === "result" && result && (
        <div className={`ep-result tier-${resultLevel(result)}`} data-evenplay-layer="result">
          {result.band !== "none" && (
            <div className="ep-particles" aria-hidden="true">
              {Array.from(
                { length: result.band === 1 ? 12 : resultLevel(result) === "highlight" ? 6 : 3 },
                (_, index) => <i key={index} />,
              )}
            </div>
          )}
          <strong className="ep-result-title">
            {result.band === 1
              ? "HOLE IN ONE!"
              : resultLevel(result) === "highlight"
                ? "GREAT SHOT!"
                : result.band === "none" ? "NO PAYOUT" : "SUCCESS"}
          </strong>
          <strong className="ep-result-payout">{money(result.payout)} payout</strong>
          <span>To pin {result.distance.toFixed(1)} yd · Target {state.shot?.conditions.target.toFixed(1)} yd</span>
          <small className="ep-payout-note">원금 포함 지급금 · 순이익 아님</small>
          <small className="ep-payout-note">거래내역은 모바일에서 확인 · 잠시 후 다음 샷</small>
        </div>
      )}

      {qrVisible && (
        <div className="ep-controller-dim">
          <div className="ep-qr-popup" role="dialog" aria-modal="false" aria-labelledby="ep-qr-title">
            <Button
              className="ep-qr-close"
              aria-label="QR 팝업 닫기"
              disabled={locked}
              onClick={onCancelConnection}
            ><X /></Button>
            <strong id="ep-qr-title"><em>EVENPLAY</em> 이벤트 참여</strong>
            <p>휴대폰 카메라로 QR 코드를 스캔해 주세요</p>
            <div className="ep-qr-code">
              <QRCodeSVG
                value={mockQrValue(window.location.href, state.qrVersion)}
                size={200}
                marginSize={2}
                level="M"
              />
            </div>
            <span className="ep-qr-policy">QR 유효기간 없음 · session_id 연결</span>
            <p>Evenplay에서 로그인·충전 후 이벤트에 참여하세요.</p>
            <p>GVX에서 미션 샷을 완료하면 결과가 전송되어 정산됩니다.</p>
            <Button
              className="ep-qr-dismiss"
              disabled={locked}
              onClick={onCancelConnection}
            >
              닫기
            </Button>
          </div>
        </div>
      )}
      {cameraExpanded && (
        <Modal title="GVX 임팩트 카메라 · 원본 캡처" onClose={() => setCameraExpanded(false)}>
          <img className="native-camera-image" src="/assets/gvx-service-camera.png" alt="제공된 GVX 화면의 임팩트 카메라 원본" />
          <Button className="tool-button" disabled={locked} onClick={() => setCameraPlaying(!cameraPlaying)}>
            {cameraPlaying ? <Pause size={13} /> : <Play size={13} />}
            {cameraPlaying ? "카메라 일시 정지" : "카메라 재생"}
          </Button>
        </Modal>
      )}
    </div>
  )
}
