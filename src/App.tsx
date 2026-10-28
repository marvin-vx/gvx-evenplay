import { useCallback, useEffect, useState } from "react"
import { Expand, FileText, Pause, Play, Settings2 } from "lucide-react"
import { Button } from "./Controls"
import { canEnter, isLocked, shouldShowEntryBanner } from "./engine"
import Modal from "./Modal"
import MockTools from "./MockTools"
import Simulator from "./Simulator"
import SpecReference from "./SpecReference"
import { stageInfo, type Stage } from "./prototype"
import { useSession } from "./useSession"

export default function App() {
  const model = useSession()
  const { state, send } = model
  const [panel, setPanel] = useState<"tools" | "reference" | "end" | null>(null)
  const closePanel = useCallback(() => setPanel(null), [])
  const busy = isLocked(state)
  const locked = busy || state.endRequested
  const current = stageInfo[state.stage]
  const awaitsManualResponse = ["connecting", "judging", "updating"].includes(state.stage)
  const practiceAvailable = !locked &&
    ["entry", "qr", "connectionfailed", "connected", "updating", "insufficient", "reconnecting"].includes(state.stage)
  const actionLabel =
    state.stage === "result" && state.endRequested
      ? "결과 확인 후 참여 종료"
      : state.stage === "judging" && model.delayResult
        ? "최종 응답 재확인 (Mock)"
        : state.stage === "ready" && !state.sensorReady
          ? "GVX 센서 준비하기"
          : current.action
  const primaryDisabled =
    (busy && state.stage !== "connecting" && state.stage !== "judging" && state.stage !== "reconnecting") ||
    (model.demo && !awaitsManualResponse) ||
    (state.stage === "judging" && (!state.online || !state.shot || state.resultSubmissions === 0)) ||
    (["entry", "connectionfailed"].includes(state.stage) && !canEnter(state)) ||
    (state.stage === "connected" && state.eligibility !== "eligible")

  useEffect(() => {
    if (panel === "end" && (!state.session || state.endRequested))
      setPanel(null)
  }, [panel, state.session, state.endRequested])

  function preview(stage: Stage) {
    if (locked) return
    model.setDemo(false)
    if (stage === "result") model.setHoldResult(true)
    send({
      type: "PREVIEW",
      stage,
      outcome: model.outcome,
    })
    model.addLog("preview.fixture_loaded", `${stageInfo[stage].title} 화면 프리셋`)
    closePanel()
  }

  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
    } catch {
      model.addLog("preview.fullscreen_unavailable", "전체 화면 사용 불가", "warning")
    }
  }

  return (
    <div className="service-shell">
      <main className="service-display">
        <Simulator
          state={state}
          connectionNoticeSeconds={model.connectionNoticeSeconds}
          banner={shouldShowEntryBanner(state)}
          send={send}
          onCancelConnection={model.cancelConnection}
          onEnd={() => {
            if (state.session && !state.endRequested) setPanel("end")
          }}
        />
      </main>

      <footer
        className="simulation-toolbar"
        aria-label="서비스 화면 외부 Mock 검증 컨트롤"
      >
        <span className="mock-badge">SDK v2 Mock</span>
        <span className="simulation-state" role="status">
          {state.endRequested ? "종료 예약됨 · " : ""}{current.title}
          {awaitsManualResponse ? " · 수동 진행" : ""}
        </span>
        <Button
          className="tool-button tool-action"
          disabled={primaryDisabled}
          title={awaitsManualResponse ? "이 버튼을 누르기 전까지 현재 단계를 유지합니다." : undefined}
          onClick={model.advance}
        >
          {busy && !awaitsManualResponse && state.stage !== "reconnecting"
            ? <span className="loading-spinner" />
            : <Play size={12} />}
          {actionLabel}
        </Button>
        {state.stage === "connecting" && (
          <Button className="tool-button" onClick={model.failConnection}>
            연결 실패 응답 (Mock)
          </Button>
        )}
        {["qr", "connecting", "connectionfailed"].includes(state.stage) && (
          <Button className="tool-button" onClick={model.cancelConnection}>
            {state.stage === "connectionfailed" ? "실패 안내 닫기" : "연결 요청 취소"}
          </Button>
        )}
        {practiceAvailable && (
          <Button
            className="tool-button"
            disabled={model.demo}
            onClick={model.practice}
          >
            <Play size={12} />
            {state.sensorReady ? "일반 연습 샷 (노베팅)" : "일반 연습 센서 준비"}
          </Button>
        )}
        {state.session && !state.online && state.stage !== "reconnecting" && (
          <Button className="tool-button" onClick={() => send({ type: "RECONNECT" })}>
            재연결 응답 (Mock)
          </Button>
        )}
        {state.stage === "result" && !state.endRequested && (
          <Button
            className="tool-button"
            onClick={() => model.setHoldResult(!model.holdResult)}
          >
            {model.holdResult ? <Play size={12} /> : <Pause size={12} />}
            {model.holdResult ? "자동 다음 샷 재개" : "결과 화면 유지"}
          </Button>
        )}
        <span className="toolbar-spacer" />
        <Button
          className="tool-button"
          disabled={locked}
          onClick={() =>
            model.demo ? model.setDemo(false) : model.startDemo()
          }
        >
          {model.demo ? <Pause size={12} /> : <Play size={12} />}
          {model.demo ? "시연 중지" : "자동 시연"}
        </Button>
        <Button className="tool-button" onClick={() => setPanel("tools")}>
          <Settings2 size={13} />검증 도구
        </Button>
        <Button className="tool-button" onClick={() => setPanel("reference")}>
          <FileText size={13} />기획서
        </Button>
        <Button
          className="tool-button tool-icon"
          aria-label="전체 화면 전환"
          onClick={fullscreen}
        >
          <Expand size={14} />
        </Button>
      </footer>

      {panel === "tools" && (
        <Modal title="Mock 검증 도구 · 실제 GVX GUI 아님" onClose={closePanel} wide>
          <MockTools model={model} onPreview={preview} />
        </Modal>
      )}
      {panel === "reference" && (
        <Modal title="기획서 & 정책 레퍼런스" onClose={closePanel} wide>
          <SpecReference />
        </Modal>
      )}
      {panel === "end" && state.session && !state.endRequested && (
        <Modal
          title={busy ? "현재 샷 판정 후 종료할까요?" : "Evenplay 참여를 종료할까요?"}
          onClose={closePanel}
        >
          <p className="modal-intro">
            {busy && (state.practiceShot
              ? "현재 일반 연습 샷이 끝난 뒤 종료합니다. 참가금 차감이나 지급 처리는 없습니다. "
              : "이미 차감된 참가금과 이번 샷 조건을 유지합니다. 최종 판정과 결과·보상 표시를 마친 뒤 종료하며 다음 샷에는 참여하지 않습니다. ")}
            EVENPLAY 참가자·금액·보상표·전용 타겟만 제거하고, 원래 GVX 숏게임
            화면과 클럽, 마지막 볼 위치는 샘플에서 그대로 유지합니다.
            이전 볼 위치 복구 범위는 GVX 후속 결정 사항입니다.{" "}
            {state.participated
              ? "이번 연습에서 참여 배너는 다시 표시하지 않습니다."
              : "아직 참여 이력이 없어 GVX WAIT에서 배너를 다시 표시합니다."}
          </p>
          <div className="end-actions">
            <Button className="tool-button" onClick={closePanel}>계속 참여하기</Button>
            <Button
              className="tool-button tool-action"
              onClick={() => {
                model.setDemo(false)
                send({ type: busy ? "REQUEST_END" : "END" })
                if (busy)
                  model.addLog(
                    "session.end_requested",
                    "현재 샷 최종 판정·결과 표시 후 종료 · 다음 샷 참여 차단",
                    "warning",
                  )
                closePanel()
              }}
            >
              {busy ? "판정 후 종료 예약" : "참여 종료"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
