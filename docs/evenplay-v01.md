# GVX × Evenplay V0.3-upload interactive prototype

Current source: the latest PDF uploaded as attachment
`6a2740ce-66c6-4294-af3c-8c27ca844818`, filename **GVX & Evenplay 상세 기획서
V0.3.pdf**, actual length **18 physical pages**. The source mixes a V0.1 cover,
V0.2 body footers and a new 2026-10-28 EP-02A page; the final printed page number
is 21 despite an 18-page PDF. Preserve those original images/text rather than
silently repairing the planning document. App metadata uses the upload's V0.3
label and 2026-10-28 revision, and the viewer indexes the actual 18-page order.
This replaces the previous 20-page V0.2 document, not the original GVX GUI.
The legacy filename of this implementation note is retained for existing links.

## Scope and verification boundary

This is a frontend-only, in-memory SDK mock, not a connected GVX installation
or Evenplay service. No real authentication, check-in, wallet, payments, durable
records, transaction history or settlement API is configured.

The PDF reports communication connection/response receipt only and says
authentication keys were not registered. That statement is a source-document
claim, not a verification performed by this Make prototype. E01–E13 answer
reflection, Mock behavior and actual-server verification must never be conflated.

## GUI source of truth — do not redesign

`public/assets/gvx-service-original.png` is the user's unchanged, lossless
946 × 397 operating-GVX capture. The instrument grid, camera, native bottom
menu, right telemetry, course and landscape proportions remain intact.
Do not introduce another dashboard, device-card layout, branding, course photo
or mobile rearrangement.

Only the documented EVENPLAY layers and corresponding native data slots are
live: Start/End, invitation banner, controller QR, participant and money HUD,
mission/target/reward table, practice/betting status and current-shot results.
Small source-derived sky/grass patches hide the captured developer coordinates
and fixed ball. A data-driven ball marker illustrates target-distance updates;
it does not claim a real 3D GVX ball-position API is connected.

All Mock transport, presets, response injection and diagnostics stay outside the
service canvas. The settings dialog is closed by default. The separate document
viewer contains all 18 newly rendered source pages, including the new connection
progress/failure page and the owner-specific follow-up checklist. Old V0.2 pages
19/20 are removed from the current viewer/assets. Illustrative screenshot text never
overrides the revised definitions in the PDF.

## V0.3-upload changes

| Source | Applied behavior |
| --- | --- |
| 2/4p | A known-enabled shop and known-enabled client bay config are both required for entry. QMS bay setup/result-history management is explicitly phase 2 and excluded from the first PGA version. No CMS/admin/backend is added. |
| 5/6p, EP-02A | QR → explicit mobile connection request → connecting → success or failure. The yellow/black centered toast from the source appears on both controller and screen, not a new dialog/dashboard theme. |
| 6/18p | Server unavailable, no response and rejected request are distinct Mock reasons. Explicit failure cancels that attempt; late success/failure callbacks cannot attach to a retry. Retry/cancel restores a usable entry/QR state. No invented timeout or QR expiry is introduced. |
| 7p | Success briefly displays the received profile image (or a non-photo placeholder), CONNECTED, full nickname and received INDEX. Missing values stay “—”, including INDEX; 0 is valid. The notice hides after a configurable five-second Mock exposure, without hiding money/bet HUD or replaying on reconnection. |
| 7/8/17p, user clarification | During participation, both readiness indicators show READY only when sensor and bet are ready; releasing either displays WAIT on both. The physical sensor input and uncharged practice remain separate from this display policy. |
| 8p | Mission name/description are response fields, announced on every transition to the synchronized BET READY display, including a restored sensor. The default Mock copy preserves the source's literal “Closet to the Pin”; GVX does not hardcode a replacement title. |
| 10p | Distance condition, payout multiplier and payout are separate supplied fields. Render them directly, without deriving a multiplier from a legacy Mock selector name or recalculating payout from stake. The Mock response producer is isolated in `src/mockEvenplay.ts`. |
| 12/13p | Final normalized band 1 → jackpot, 2/3 → highlight, 4/5/6 → basic. Animation tier is not inferred from multiplier, distance or amount. Confirmed “none” alone is no payout; missing/unmapped result data stays pending. |
| 18p | Actual connection signals/reason codes/deadlines/retry strategy and vendor band-ID mapping remain explicit follow-ups. The readiness-display contradiction is resolved by the user's explicit answer, not a change to the original PDF. |

### Readiness-display conflict resolved by the user

Page 7 proposes simultaneous WAIT if either READY is released and explicitly
marks it “재확인 필요”; pages 8 and 17 retain independent sensor/betting displays
and ordinary practice during BET WAIT. The user confirmed:
**“한쪽 해제 시 양쪽 WAIT로 표시.”** This overrides the conflicting display text.

`getReadyIndicators` derives both participating READY indicators from the same
validated betting-shot gate. A missing sensor, conditions, eligibility, funds or
connection displays WAIT on both; pause/reconnection reasons remain in their
existing notices. Flight, rolling, practice, pending-result and end-reservation
messages retain their distinct processing states and never advertise a new READY.
The mission announcement follows actual transitions into the displayed BET READY,
not conditions receipt alone.

This is display synchronization, not a physical sensor reset. Keep the independent
sensor input, valid conditions and uncharged BET WAIT practice unchanged. Before
participation or after ending Evenplay, native readiness follows the sensor alone.
The reference viewer lists READY-SYNC as user-confirmed, not an open follow-up;
the original PDF pages remain unchanged.

## Retained betting and training behavior

| Source | Applied behavior |
| --- | --- |
| E01, 5p | QR is a link with `session_id`, with no expiry, countdown, expiration notice or expiration-reissue action. Closing/reopening still invalidates a closed connection attempt. |
| E02, 5/16/18p | Mock disconnection automatically restores the same session. Reconnect timing and a disable switch are diagnostic fixtures, not production recovery/idle policies. |
| Retained E03 answer | Individual mode has no Shot Clock. Countdown fields, controls and timeout transitions remain removed. Native bay remaining time in the source GUI is a different concept. |
| E04, 3/11p | A betting shot deducts its stake exactly once at shot start. Landing is followed by rolling; only ball stop submits the final shot result. The matching final response supplies the principal-inclusive payout and final balance. |
| E06, 8/14/16p | The Mock response adjusts stake/rewards to available balance. Below minimum only new betting pauses; ordinary practice remains available. Top-up is a Mock eligibility response, followed by the manual conditions checkpoint. |
| E08, 3/8/16/17p + user clarification | Readiness displays are synchronized: one side not ready means WAIT on both. The physical sensor remains independent; without betting readiness it can start uncharged practice, not a failed or accepted bet. |
| E09–E10, 9/14p | After settlement, receiving the next conditions atomically updates native ball placement, target distance, colored rings and payout table. Bet/practice processing does not accept an early target mutation. |
| 9/10p | The same normalized band uses the same semantic color in its ring and payout-table marker. Known target/mission/reward data stay visible and old display snapshots are explicitly labeled during updates. |
| E11, 11/15/16p | Disconnection does not stop physical flight/rolling or undo a debit. Reconnect re-submits the same stopped shot. Duplicates cannot debit or credit twice; no timeout becomes an assumed loss, zero payout or refund. |
| E13, 12/16p | GVX shows the current shot's target distance, distinct To Pin distance, principal-inclusive payout and final balance. Transaction history stays on mobile, not a GVX player-facing list. |
| 18p | Evenplay confirmations, actual-server verification and GVX decisions remain separate in the viewer's follow-up tab. |

## Native practice versus betting

- A shot with synchronized READY, eligibility, online service, adequate funds and
  physical sensor readiness is a betting shot. There is no extra per-shot player acceptance.
- In entry/QR/BET WAIT/condition adjustment/betting pause/idle reconnect states,
  a READY sensor input can start ordinary practice even when both participating
  indicators display WAIT. It does not create a betting
  snapshot, debit funds, submit an Evenplay result or show a payout.
- Practice has its own identity and returns to its previous waiting state after
  the ball stops. Conditions arriving during practice are deferred and applied
  only after stop; they cannot turn that practice shot into a bet.
- A betting shot freezes a complete conditions snapshot. Flight → landing →
  rolling → stop → “지급 처리 중” → final result is the enforced sequence.
- Monetary examples: $100 opening balance / $3 stake becomes $97 at shot start;
  a final $6 payout produces $103, not $100 or $106. A $1.50 payout can leave a
  lower balance; payout is not profit and includes principal.

## User-confirmed inspection and safety rules

- `connecting`, `judging` and `updating` are manual Mock response checkpoints, including during
  automatic demonstration and after automatic reconnection. They do not advance
  merely because time passes. The bottom toolbar's receive button advances only
  the corresponding valid response. These are test transport controls, not
  per-shot user participation acceptance.
- During initial connection the only mutating exceptions are valid success/failure
  responses or explicit cancel. A failed/canceled attempt invalidates its nonce;
  it cannot later create a connected participant from an obsolete response.
- Immediate end, additional shots, reset, presets, club, camera, sensor and
  test-setting mutations stay locked through flight, rolling, final-result
  processing and native practice. Read-only views and valid recovery/response
  actions remain accessible. Reducer guards enforce the same restrictions.
- End during a betting shot queues termination: settle the current matching shot,
  expose its final result, then remove EVENPLAY layers without requesting another
  bet. A queued end overrides result/demo hold. During non-betting practice, a
  queued end waits for practice stop without fabricating a settlement.
- At idle end, the native training GUI, club and last ball placement stay in the
  sample. Exact pre-EVENPLAY ball/settings restoration and mobile unlinking remain
  GVX follow-up decisions; the sample must not claim they are finalized.
- The screen banner repeats only before the current training session's first
  eligible participation and only in native WAIT. READY/QR/shots hide it.
  Participation keeps it hidden after ending EVENPLAY or changing modes.
  Pending/restricted attempts alone do not count. New-training reset or reload
  clears in-memory history. The earlier explicit user clarification resolves the
  contradictory “persistent V1” wording that remains on page 4.

## Explicit Mock values, not finalized operating policy

- Opening-balance fixtures: $100, $2 and $0.50. The minimum-stake default is $1,
  adjustable to $0.50/$1/$2 for testing. The PDF supplies no operating minimum;
  this threshold must not be presented as Evenplay's real limit.
- Result exposure: 5 seconds by default, 8/12-second options and manual hold.
  Connection-success profile exposure is 5 seconds by default, 3/5/8-second
  options or a review hold. Those durations are not finalized vendor policy.
  Connecting/failure toasts stay inspectable until a response, cancel or retry;
  the real wait-ending threshold is an Evenplay follow-up, not an invented timer.
  Initial conditions and automatic reconnect use 1.4/1.5-second transport fixtures.
  Ball flight/rolling/practice durations are animations, not shot time limits.
- Target samples 50/55/45 yd, USD/yd labels, mock sine-wave sound and demonstration
  reward amounts are not production policies or official vendor assets.
  `mockEvenplay.ts` is the only response-producing fixture boundary. Client state
  and HUD consume its mission, band, distance, multiplier, payout and profile.
  Different fixture replies deliberately vary multipliers and values.
- Native ball-marker projection is a visual fixture. Actual target receipt,
  physical ball relocation, Master/environment restrictions and final distance
  semantics require the indicated GVX/vendor and actual-server checks.

## Still unconfirmed — do not silently implement as production rules

- □ Evenplay E05/E11: charge without transmitted result, late-settlement
  acceptance deadline, final failure/cancel/refund policy.
- □ Evenplay E07: official logos/sounds, usage terms and required notices.
- □ Display data: raw distance unit and INDEX provision/scale. Distance,
  multiplier and payout provision are now confirmed; their values are supplied
  by the response. “Player ability index” is the 7p description, not a locally
  calculated number.
- □ Connection request/success/failure signals, reason codes, no-response deadline
  and retry semantics; actual API band 1–6 identifiers/normalization.
- △ Actual server: authentication/check-in/betting/settlement, adjusted stakes,
  top-up resumption, same-session recovery, real result retransmission and payout.
- △ E02/E03: the source's 15-minute restart-recovery window and bay/customer
  15/30-minute inactivity behavior require verification. Do not add personal shot
  clocks, automatic logout, invented deadlines or timer-based refunds.
- ◇ GVX: wind/green-speed restrictions, mobile unlinking, pre-session restoration,
  final English copy, visual/sound intensity and result-exposure timing.

## Verification

```sh
pnpm test
pnpm build
pnpm exec tsc --noEmit
```

Native Node tests cover non-expiring QR/session identity, no personal clock,
eligible versus uncharged practice, exact start debit, rolling/stop sequencing,
deferred conditions, stake adjustment/pause, persistent display snapshots,
same-shot reconnect/re-submission, duplicate protection, result tiers, banner
history, termination locks and synchronized readiness/release/recovery without
blocking physical practice. Browser checks additionally cover all 18 document
pages, paired yellow connection toasts and reason-specific retry/cancel, temporary
profile/INDEX, repeated mission announcements, authoritative three-column rewards,
six-band animation mapping, manual checkpoints, native GUI preservation,
automatic recovery, top-up and narrow viewport proportions.
