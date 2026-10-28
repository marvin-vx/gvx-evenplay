import { useState } from "react"
import { ChevronLeft, ChevronRight, FileText, Info } from "lucide-react"
import { Button, Select } from "./Controls"
import { documentInfo, documentPages, followUps, policies, referenceScreens } from "./prototype"

export default function SpecReference() {
  const [tab, setTab] = useState<"screens" | "document" | "policies" | "followUps">(
    "document",
  )
  const [page, setPage] = useState(0)
  const [screen, setScreen] = useState(0)
  return (
    <>
      <p className="modal-intro">
        {documentInfo.version} · {documentInfo.date} · 최신 PDF 전체 {documentPages.length}페이지.
        답변 반영·Mock 구현·실서버 검증·후속 확인을 구분합니다.
        <br />{documentInfo.sourceNote}
      </p>
      <div className="reference-tabs reference-main-tabs">
        <Button
          className={tab === "document" ? "selected" : ""}
          onClick={() => setTab("document")}
        >
          <FileText size={13} />
          전체 문서 · {documentPages.length}p
        </Button>
        <Button
          className={tab === "screens" ? "selected" : ""}
          onClick={() => setTab("screens")}
        >
          화면 레퍼런스 · {referenceScreens.length}개
        </Button>
        <Button
          className={tab === "policies" ? "selected" : ""}
          onClick={() => setTab("policies")}
        >
          정책 결정 현황
        </Button>
        <Button
          className={tab === "followUps" ? "selected" : ""}
          onClick={() => setTab("followUps")}
        >
          후속 확인 · 미검증 사항
        </Button>
      </div>
      {tab === "document" && (
        <>
          <div className="document-pager">
            <Button
              className="icon-button"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              aria-label="이전 페이지"
            >
              <ChevronLeft size={16} />
            </Button>
            <Select
              aria-label="기획서 페이지"
              value={page}
              onChange={(event) => setPage(Number(event.target.value))}
            >
              {documentPages.map((title, i) => (
                <option key={title} value={i}>
                  {String(i + 1).padStart(2, "0")} · {title}
                </option>
              ))}
            </Select>
            <span>{page + 1} / {documentPages.length}</span>
            <Button
              className="icon-button"
              disabled={page === documentPages.length - 1}
              onClick={() => setPage(page + 1)}
              aria-label="다음 페이지"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
          <div className="reference-image document-page">
            <img
              key={page}
              src={`/assets/spec/page-${String(page + 1).padStart(2, "0")}.webp?v=${documentInfo.date}`}
              alt={`기획서 ${page + 1}페이지 · ${documentPages[page]}`}
            />
          </div>
        </>
      )}
      {tab === "screens" && (
        <>
          <div className="reference-tabs">
            {referenceScreens.map((item, i) => (
              <Button
                key={item.id}
                className={screen === i ? "selected" : ""}
                onClick={() => setScreen(i)}
              >
                {item.id}
                <span>{item.title}</span>
              </Button>
            ))}
          </div>
          <div className="reference-image">
            <img
              key={screen}
              src={referenceScreens[screen].image}
              alt={`${referenceScreens[screen].id} ${referenceScreens[screen].title} 기획서 원본 화면`}
            />
          </div>
          <p className="reference-description">
            {referenceScreens[screen].description}
          </p>
        </>
      )}
      {tab === "policies" && (
        <div className="policy-list">
          {policies.map((item) => (
            <div key={item.id} className="policy-row">
              <span className="ep-tag">{item.id}</span>
              <div>
                <strong>
                  {item.title}
                  <span
                    className={`policy-status ${
                      ["확정", "사용자 확정", "답변 반영"].includes(item.status)
                        ? "confirmed"
                        : ""
                    }`}
                  >
                    {item.status}
                  </span>
                </strong>
                <p>{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      {tab === "followUps" && (
        <div className="policy-list">
          {followUps.map((item) => (
            <div key={item.id} className="policy-row">
              <span className="ep-tag">{item.id}</span>
              <div>
                <strong>{item.title}<span className="policy-status">{item.owner}</span></strong>
                <p>{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="reference-notice">
        <Info size={15} />
        <span>
          문서의 통신 접속 확인과 이 샘플의 Mock 검증은 별개입니다. 실제
          인증·충전·판정·정산 API는 미연결입니다. 샘플 금액·거리·연출과 최소
          참가금은 운영 확정값이 아니며, 거래내역은 모바일 전용입니다.
        </span>
      </div>
    </>
  )
}
