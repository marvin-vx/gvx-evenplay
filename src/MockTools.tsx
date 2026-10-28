import { Button, Field, Select, Toggle } from "./Controls"
import { isLocked } from "./engine"
import {
  flow,
  documentInfo,
  outcomeLabels,
  type ConnectionFailureReason,
  type Eligibility,
  type Outcome,
  type Service,
  type Stage,
} from "./prototype"
import type { useSession } from "./useSession"

type Props = {
  model: ReturnType<typeof useSession>
  onPreview: (stage: Stage) => void
}

export default function MockTools({ model, onPreview }: Props) {
  const { state, send } = model
  const locked = isLocked(state) || state.endRequested
  return (
    <div className="mock-tools">
      <p className="mock-disclaimer">
        이 패널은 실제 GVX GUI가 아닌 동작 검증 도구입니다. 운영 화면은 제공하신
        원본 캡처를 유지하며, EVENPLAY GUI만 실시간 상태로 표시합니다.
        실제 GVX 실행 환경·인증·충전·정산 API는 연결하지 않았습니다.
        {documentInfo.version} · {documentInfo.date} · {documentInfo.pageCount}페이지 기준이며
        실서버 검증 완료를 뜻하지 않습니다. 1차 PGA는 클라이언트 config로
        노출을 판단하고 QMS 관리 기능은 2차 범위로 제외합니다.
      </p>
      <div className="mock-presets" aria-label="화면 프리셋">
        {flow.map((item) => (
          <Button
            key={item.stage}
            disabled={locked}
            onClick={() => onPreview(item.stage)}
          >
            {item.title}
          </Button>
        ))}
      </div>
      <div className="mock-columns">
        <section aria-label="응답 설정">
          <strong className="mock-section-title">응답 설정</strong>
          <Field label="Evenplay 참여 가능 응답">
            <Select
              aria-label="Evenplay 참여 가능 응답"
              value={state.session ? state.eligibility : model.eligibility}
              disabled={locked || model.demo}
              onChange={(event) => {
                const value = event.target.value as Eligibility
                model.setEligibility(value)
                if (state.session) send({ type: "ELIGIBILITY", value })
              }}
            >
              <option value="eligible">참여 가능</option>
              <option value="pending">응답 미수신</option>
              <option value="restricted">참여 불가</option>
            </Select>
          </Field>
          <Field label="다음 연결 프로필 샘플">
            <Select
              aria-label="다음 연결 프로필 샘플"
              value={model.profileComplete ? "complete" : "unknown"}
              disabled={locked || state.session || model.demo}
              onChange={(event) => model.setProfileComplete(event.target.value === "complete")}
            >
              <option value="unknown">Marvin · 이미지/INDEX 미수신</option>
              <option value="complete">Test A · 프로필 이미지/INDEX 72.4 (Mock)</option>
            </Select>
          </Field>
          <Field label="연결 실패 사유 샘플">
            <Select
              aria-label="연결 실패 사유 샘플"
              value={model.failureReason}
              disabled={locked || model.demo}
              onChange={(event) => model.setFailureReason(event.target.value as ConnectionFailureReason)}
            >
              <option value="server">서버 연결 불가</option>
              <option value="no-response">EVENPLAY 응답 없음</option>
              <option value="rejected">연결 요청 거절</option>
            </Select>
          </Field>
          <Field label="최종 보상 구간">
            <Select
              aria-label="최종 보상 구간"
              value={model.outcome}
              disabled={locked || model.demo}
              onChange={(event) =>
                model.setOutcome(event.target.value as Outcome)
              }
            >
              {Object.entries(outcomeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </Field>
          <Toggle
            label="GVX 센서 입력 READY (Mock)"
            checked={state.sensorReady}
            disabled={locked}
            onChange={(event) =>
              send({ type: "SENSOR", ready: event.target.checked })
            }
          />
          <Toggle
            label="최초 연결 조건 자동 응답"
            checked={model.autoResponses}
            disabled={locked || model.demo}
            onChange={(event) => model.setAutoResponses(event.target.checked)}
          />
          <Toggle
            label="결과 화면 유지"
            checked={model.holdResult}
            disabled={locked}
            onChange={(event) => model.setHoldResult(event.target.checked)}
          />
          <Toggle
            label="연출음 미리보기"
            checked={model.sound}
            disabled={locked}
            onChange={(event) => model.setSound(event.target.checked)}
          />
          <Toggle
            label="자동 재연결 (Mock)"
            checked={model.autoReconnect}
            disabled={locked}
            onChange={(event) => model.setAutoReconnect(event.target.checked)}
          />
          <Toggle
            label="샷 중 연결단절 예약"
            checked={model.disconnectOnShot}
            disabled={locked || state.stage !== "ready"}
            onChange={(event) => model.setDisconnectOnShot(event.target.checked)}
          />
        </section>
        <section aria-label="운영 및 Mock 시간">
          <strong className="mock-section-title">운영 및 Mock 시간</strong>
          <Field label="매장 EVENPLAY 사용 설정">
            <Select
              aria-label="매장 EVENPLAY 사용 설정"
              value={state.shopService}
              disabled={locked || state.session || state.stage === "qr"}
              onChange={(event) => send({ type: "SHOP_SERVICE", value: event.target.value as Service })}
            >
              <option value="enabled">사용 가능 매장</option>
              <option value="disabled">사용 불가 · 미노출</option>
              <option value="unknown">설정 미확인 · 미노출</option>
            </Select>
          </Field>
          <Field label="타석 클라이언트 config">
            <Select
              aria-label="타석 클라이언트 config"
              value={state.service}
              disabled={locked || state.session || state.stage === "qr"}
              onChange={(event) =>
                send({ type: "SERVICE", value: event.target.value as Service })
              }
            >
              <option value="enabled">활성</option>
              <option value="disabled">비활성 · 진입 UI 숨김</option>
              <option value="unknown">설정 미확인 · 진입 UI 숨김</option>
            </Select>
          </Field>
          <Field label="트레이닝 모드">
            <Select
              aria-label="트레이닝 모드"
              value={state.shortGame ? "short" : "range"}
              disabled={locked || state.session || state.stage === "qr"}
              onChange={(event) =>
                send({ type: "MODE", shortGame: event.target.value === "short" })
              }
            >
              <option value="short">SHOT · 숏게임</option>
              <option value="range">몸풀기 연습장 · 미지원</option>
            </Select>
          </Field>
          <Field label="계정 연결 완료 알림 유지 · Mock">
            <Select
              aria-label="계정 연결 완료 알림 유지"
              value={model.connectionNoticeSeconds ?? "hold"}
              disabled={locked}
              onChange={(event) => model.setConnectionNoticeSeconds(event.target.value === "hold" ? null : Number(event.target.value))}
            >
              <option value="3">3초</option>
              <option value="5">5초 · Mock 기본값</option>
              <option value="8">8초</option>
              <option value="hold">검토 중 유지</option>
            </Select>
          </Field>
          <Field label="잔액 응답 샘플 · Mock">
            <Select
              aria-label="잔액 응답 샘플"
              value={model.openingBalance}
              disabled={locked}
              onChange={(event) => {
                const balance = Number(event.target.value)
                model.setOpeningBalance(balance)
                if (state.session)
                  send({ type: "BALANCE", balance, minimumStake: model.minimumStake })
              }}
            >
              <option value="100">$100 · 기본 잔액</option>
              <option value="2">$2 · 참가금 조정 샘플</option>
              <option value="0.5">$0.50 · 최소 미만 샘플</option>
            </Select>
          </Field>
          <Field label="최소 참가금 · Mock 운영값 아님">
            <Select
              aria-label="최소 참가금 Mock"
              value={model.minimumStake}
              disabled={state.session}
              onChange={(event) =>
                model.setMinimumStake(Number(event.target.value))
              }
            >
              <option value="0.5">$0.50 · Mock</option>
              <option value="1">$1 · Mock 기본값</option>
              <option value="2">$2 · Mock</option>
            </Select>
          </Field>
          <p className="mock-disclaimer">
            E01 · QR 유효기간 없음<br />
            E03 · 개인 모드 Shot Clock 없음<br />
            최소 참가금은 업체 확정값이 아닌 테스트 값입니다.
          </p>
          <Field label="결과 유지 시간 · Mock">
            <Select
              aria-label="결과 유지 시간"
              value={model.resultSeconds}
              disabled={locked}
              onChange={(event) =>
                model.setResultSeconds(Number(event.target.value))
              }
            >
              <option value="5">5초 · 기본값</option>
              <option value="8">8초</option>
              <option value="12">12초</option>
            </Select>
          </Field>
        </section>
      </div>
      <section aria-label="예외 상황 주입">
        <strong className="mock-section-title">예외 상황 주입</strong>
        <div className="mock-exceptions">
          <Button
            disabled={state.stage !== "connecting"}
            onClick={model.failConnection}
          >
            연결 실패 응답 (Mock)
          </Button>
          <Button
            disabled={locked || !state.session || !state.online}
            onClick={() => {
              model.setDemo(false)
              send({ type: "DISCONNECT" })
            }}
          >
            연결 끊김
          </Button>
          <Button
            disabled={locked || !state.session}
            onClick={() => {
              model.setDemo(false)
              send({ type: "INSUFFICIENT" })
            }}
          >
            최소 참가금 미만 응답
          </Button>
          <Button
            disabled={locked || state.stage !== "ready"}
            onClick={() => {
              model.setDemo(false)
              model.setDelayResult(!model.delayResult)
            }}
          >
            {model.delayResult ? "판정 지연 해제" : "판정 지연 주입"}
          </Button>
          <Button
            disabled={locked}
            title="새 연습 시작 · 참여 이력 초기화"
            onClick={model.reset}
          >
            초기화
          </Button>
        </div>
      </section>
      <p className="mock-disclaimer">
        배너는 최초 참여 전 GVX WAIT에서만 반복 노출합니다. 한 번 참여하면
        이번 연습이 끝날 때까지 숨깁니다. 샷 처리 중에는 종료 예약·응답 복구 외
        상태 변경을 차단합니다. 연결 응답·최종 판정·조정된 조건은 자동 시연 중에도
        화면 아래 버튼을 눌러야 수신합니다. 이는 Mock 응답 제어이며 매 샷 참가
        재수락이 아닙니다. 미확정 시간은 조절 가능한 Mock 값입니다.
        참여 중 센서·베팅 중 한쪽이 미준비이면 양쪽을 WAIT로 표시합니다.
        표시와 별개로 BET WAIT·최소 금액 미만·연결 복구 중에도 센서 입력이
        READY이면 무차감 일반 연습을 계속할 수 있습니다.
        거래내역은 모바일에서 확인하며 GVX에는 이번 샷
        결과만 표시합니다.
        연결 대기 종료 기준·실제 실패 코드·재시도 연결 방식은 업체 확인 전이므로
        임의 시간 초과로 실패를 만들지 않습니다. 실패 사유는 명시적 Mock 응답으로
        전달하고, 성공 알림 5초는 조절 가능한 검토 값입니다.
      </p>
      <details className="mock-log">
        <summary>이벤트 로그 · {model.logs.length}</summary>
        <ol>
          {model.logs.map((item) => (
            <li key={item.id} className={item.kind}>
              <time>{item.time}</time>
              <strong>{item.event}</strong>
              <span>{item.detail}</span>
            </li>
          ))}
        </ol>
      </details>
    </div>
  )
}
