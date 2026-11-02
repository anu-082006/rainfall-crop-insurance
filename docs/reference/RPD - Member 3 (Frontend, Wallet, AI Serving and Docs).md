# RPD: Member 3 (Frontend, Wallet Integration, AI Serving and Documentation)

*Component-level requirements for the Rainfall-Based Parametric Crop Insurance DApp. Version 2.0, updated to the revised project concept (fixed policy catalogue, farmer profile, AI policy recommendation). It must stay consistent with the full-project RPD.*

**What changed in version 2.0** (these changes override any older wording elsewhere in this document):

- Policies are chosen from a fixed catalogue of 13 options plus a future start date. The farmer no longer types a threshold, duration or payout.
- The contract computes the end time as start plus duration.
- New off-chain farmer profile (farm location, crop, sowing date), stored in the browser per wallet address.
- No premiums. All amounts are RTT test tokens with no real value.
- The AI service now recommends a catalogue option and a start date. For each option it estimates the chance that rainfall over that option's window falls below that option's trigger. This replaces the single 7-day risk endpoint.
- New policy status: Scheduled (coverage not started yet).
- Screens: profile, catalogue with recommendation, review and enroll, policy status, result, claim confirmation, history.
- Unchanged: AI only advises; the contract decides eligibility and payout.

## 1. Purpose and scope

Member 3 owns everything the user sees and touches, the service that serves AI policy recommendations, and the documentation that makes the project reproducible.

**Core principle:** AI helps the farmer choose, the oracle reports measured rainfall, and the smart contract applies the predefined trigger and payout. The wallet address is the user's account, so there is no login and no database.

**Deliverables**

1. Next.js and TypeScript DApp with MetaMask and Ethers.js: profile, catalogue, enrollment, policy status, result and claim screens.
2. FastAPI recommendation service that loads Member 2's trained model, crop table and recommendation rule.
3. AI recommendation panel inside the DApp.
4. README, architecture diagram, screenshots, technical report inputs and demo script.

**Not owned:** contract logic and tests (Member 1), CRE workflow, dataset and model training (Member 2). Member 3 consumes their outputs through agreed interfaces.

**Guiding rules**

- The frontend shows real contract state, including the catalogue, never hardcoded values.
- Policy terms are chosen from the catalogue and never typed in by the user.
- The AI panel is advisory and visually separate from the verified on-chain report.
- Any AI failure must not break enrollment or claiming.
- Errors are shown plainly; missing data is never shown as zero or as low risk.
- Profile data stays off-chain in the browser. Only the selected policy's location goes to the contract.

## 2. Dependencies on other members

| Needs | From | By when | Format |
| --- | --- | --- | --- |
| ABI and deployed address | Member 1 | Day 1 hour 5 | JSON deployment artifact |
| Function, event and custom error names, including enroll and the catalogue getters | Member 1 | Day 1 hour 2 | Committed interface file |
| Catalogue of 13 options readable from the contract (option count and option getter) | Member 1 | Day 1 hour 2 | Contract view functions |
| Report fields and units (integer mm) | Members 1 and 2 | Day 1 hour 2 | Documented payload |
| Crop table: crop, season length, critical growth stage, typical water need | Member 2 | Day 1 hour 5 | JSON or CSV file |
| Feature definition and per-option label (rainfall below trigger over the option window) | Member 2 | Day 1 hour 2 | Short spec |
| Trained model and preprocessing pipeline | Member 2 | Day 1 hour 8 | joblib files plus model README |
| Recommendation rule (combines crop-stage fit and estimated risk) | Member 2 | Day 1 hour 8 | Python module with a documented function |
| CRE simulation output and status | Member 2 | Day 2 hour 5 | Text and screenshots for docs |

Until real artifacts arrive, build against a mock ABI, a mock catalogue and a stub recommendation response with the agreed shape, clearly marked as mock.

## 3. Technology and tools

| Area | Choice |
| --- | --- |
| Framework | Next.js with TypeScript |
| Wallet and chain | MetaMask, Ethers.js (do not add Viem or Wagmi) |
| Styling | Tailwind CSS (optional) |
| Profile storage | Browser localStorage keyed by wallet address; no database |
| Location input | Latitude and longitude fields are enough; a map pin is optional |
| AI service | Python 3, FastAPI, Uvicorn, Pydantic, scikit-learn and joblib (to load the model), pandas |
| Weather input for AI | Open-Meteo archive API (called by the service to build features) |
| Tooling | VS Code, Node.js and npm, Python virtual environment, Git and GitHub, Postman for API checks |
| Local chain | Anvil from Member 1's setup |

Pin all versions and record them in the README.

## 4. Frontend functional requirements

Priority: **M** = must, **S** = should, **C** = could.

### 4.1 Wallet and network

| ID | Requirement | Pri |
| --- | --- | --- |
| M3-W01 | Connect and disconnect MetaMask; show shortened address, chain name and test-token balance | M |
| M3-W02 | Detect wrong network; show a banner with a switch-network action | M |
| M3-W03 | React to account and chain changes without a page reload | M |
| M3-W04 | Show a friendly message if MetaMask is not installed | M |
| M3-W05 | Chain ID and RPC settings come from environment configuration | M |

### 4.2 Farmer profile, catalogue and enrollment

**Farmer profile (Screen 1)**

| ID | Requirement | Pri |
| --- | --- | --- |
| M3-PR01 | Profile form: farm location (latitude and longitude, map pin optional), crop type chosen from the supported crop list, sowing date | M |
| M3-PR02 | Save the profile off-chain in browser localStorage keyed by wallet address. No database. The farmer can edit or clear it | M |
| M3-PR03 | Validate coordinates, sowing date and that the crop is in the supported list | M |
| M3-PR04 | Explain on screen that the profile feeds the AI recommendation only. The selected policy's location is what goes to the contract for the oracle | M |

**Policy catalogue (Screen 2)**

| ID | Requirement | Pri |
| --- | --- | --- |
| M3-C01 | Read the catalogue from the contract (option count plus option getter). Never hardcode terms | M |
| M3-C02 | Show each option read-only: option id, risk label, duration, trigger in mm, payout in RTT. The farmer chooses an option and cannot edit its terms | M |
| M3-C03 | Group or filter options by risk label and duration | S |
| M3-C04 | Mark option 0 as the Demo option (2 hours) | M |

**Review and enroll (Screen 4)**

| ID | Requirement | Pri |
| --- | --- | --- |
| M3-E01 | Start date and time picker accepting future times only. Option 0 needs a full-hour start. Options of 30 days or more use whole-day starts | M |
| M3-E02 | Show the end time as a preview (start plus duration) and state that the contract computes the real end time | M |
| M3-E03 | Review screen: chosen option, start, end, trigger, payout, farm location | M |
| M3-E04 | Submit the enroll transaction with pending, confirmed and failed states and the transaction hash | M |
| M3-E05 | After confirmation, read the PolicyEnrolled event to get the policy ID and link to its detail page | M |
| M3-E06 | Block enrollment when the wallet is on the wrong network or no profile location is saved | M |
| M3-E07 | Show a notice: RTT are test tokens with no real value and no premium is charged | M |
| M3-E08 | If the AI suggests a start date, pre-fill the picker with it. The farmer can change it | S |

### 4.3 Farmer dashboard

| ID | Requirement | Pri |
| --- | --- | --- |
| M3-D01 | List the connected wallet's policies by reading contract state and events | M |
| M3-D02 | Each policy card shows option label, location, start and end, trigger, payout in RTT and a status badge: Scheduled, Active, Coverage ended (awaiting report), Eligible, Not eligible, Claimed | M |
| M3-D03 | Status is derived from contract fields and the current time (section 8), not stored in the frontend | M |
| M3-D04 | Empty state with a call to action to complete the profile or browse the catalogue | M |
| M3-D05 | Refresh on new blocks or after a transaction confirms | S |

### 4.4 Policy detail, rainfall report and claim

| ID | Requirement | Pri |
| --- | --- | --- |
| M3-R01 | Show the accepted rainfall total (mm) next to the trigger with a clear comparison: below, equal or above | M |
| M3-R02 | If no report exists, show Scheduled, Active or Coverage ended (awaiting report) as appropriate. Never display zero | M |
| M3-R03 | Claim button enabled only if the connected wallet owns the policy, the report is accepted, the policy is eligible and it is unclaimed | M |
| M3-R04 | Claim submits the transaction and shows hash, status, RTT received and updated token balance | M |
| M3-R05 | Disabled states explain why: coverage not started, coverage still running, report not received, not eligible, already claimed | M |
| M3-R06 | Map contract custom errors to readable messages: duplicate claim, unfunded contract, not owner, report missing, wrong network | M |
| M3-R07 | Show a data-source label: CRE simulation, CRE live or local fallback reporter | S |
| M3-R08 | Result screen (Screen 6): actual rainfall, trigger, eligibility, payout amount in RTT and a claim action | M |
| M3-R09 | Claim confirmation (Screen 7): transaction hash, payout received, status Claimed, one claim per policy | M |

### 4.5 Transaction and audit history

| ID | Requirement | Pri |
| --- | --- | --- |
| M3-H01 | Table of PolicyCreated, RainfallReportAccepted and ClaimPaid events with block, policy ID, amount and transaction hash | S |
| M3-H02 | Transaction hash copy button and explorer link where an explorer exists | C |

### 4.6 Admin and test helper (demo only)

| ID | Requirement | Pri |
| --- | --- | --- |
| M3-A01 | Optional page for the test admin to mint test tokens and fund the insurance contract, visible only to the admin address | C |
| M3-A02 | If skipped, document the equivalent cast commands in the README | M |

## 5. AI service and advisory panel requirements

### 5.1 FastAPI recommendation service

The service recommends a catalogue option and a start date. For each candidate option it estimates the probability that total rainfall over that option's coverage window is **strictly below that option's trigger**, which is the same condition the contract checks. It never enrolls anyone, changes the catalogue or touches a contract.

| ID | Requirement | Pri |
| --- | --- | --- |
| M3-AI01 | GET /health returns service status and whether the model, crop table and recommendation rule are loaded | M |
| M3-AI02 | POST /recommend accepts latitude, longitude, crop, sowing\_date, as\_of\_date and a list of candidate options (option\_id, duration\_seconds, trigger\_mm, payout). The frontend builds the list from the contract catalogue. Validated with Pydantic in schemas.py | M |
| M3-AI03 | Load the saved model, preprocessing pipeline and crop table once at startup; fail clearly if an artifact is missing | M |
| M3-AI04 | Build input features exactly as Member 2's training code does, using only data before as\_of\_date; reuse shared code where possible to avoid training and serving mismatch | M |
| M3-AI05 | For each applicable option return probability\_below\_trigger (0 to 1) for that option's window | M |
| M3-AI06 | Option 0 (2-hour demo) returns applicable false with a reason and is never recommended, because a seasonal model cannot forecast a 2-hour window | M |
| M3-AI07 | Call Member 2's recommendation rule to pick recommended\_option\_id and suggested\_start\_date from crop-stage fit and estimated risk. Do not reimplement the rule in the service | M |
| M3-AI08 | Response also includes a short rationale, model\_name, model\_version, trained\_on\_range and advisory set to true | M |
| M3-AI09 | Error behaviour: 422 for invalid input, 503 when the model or weather data is unavailable. Never return a default low-risk value | M |
| M3-AI10 | Enable CORS only for the frontend origin | M |
| M3-AI11 | Request timeout and a clear message when the weather source is slow | S |
| M3-AI12 | Log requests without storing secrets; no API keys in the repo | M |

### 5.2 AI recommendation panel in the DApp (Screen 3)

| ID | Requirement | Pri |
| --- | --- | --- |
| M3-AP01 | Separate panel titled AI policy recommendation, visually distinct from the verified on-chain report | M |
| M3-AP02 | Show the recommended option, coverage duration, suggested start date, trigger and payout, plus a plain statement such as: estimated 64% chance rainfall is below 60 mm (example values) | M |
| M3-AP03 | Show the estimated probability for every applicable option so the farmer can compare | M |
| M3-AP04 | Permanent label: Advisory only. AI helps you choose; the contract decides eligibility and payout | M |
| M3-AP05 | Loading, error and unavailable states; on error show a message, not a blank, a zero or a made-up recommendation | M |
| M3-AP06 | The panel is optional: if the service is down, the farmer can still browse the catalogue, choose an option and enroll manually, and claims still work | M |
| M3-AP07 | No frontend code path may send AI output to a contract function. Enroll parameters come only from the farmer's own selection | M |
| M3-AP08 | After a report is accepted, show predicted probability next to the observed rainfall and the claim outcome (demo step 10) | M |
| M3-AP09 | Short expandable note on model limitations, with a link to the evaluation section of the docs | S |

## 6. Documentation requirements

| ID | Requirement | Pri |
| --- | --- | --- |
| M3-DOC01 | README with summary, features, architecture diagram, prerequisites and tested versions | M |
| M3-DOC02 | Step-by-step runbook: install, start Anvil, deploy contracts, set frontend config, start FastAPI, start frontend | M |
| M3-DOC03 | Section stating whether CRE is simulated or deployed, and which chain, using Member 2's input | M |
| M3-DOC04 | Labelled fallback instructions | M |
| M3-DOC05 | Architecture diagram with both workflows: insurance and blockchain, and AI advisory | M |
| M3-DOC06 | Screenshots: wallet connected, policy creation, report, eligible claim, claim transaction, duplicate-claim error, AI panel, AI error state | M |
| M3-DOC07 | .env.example for frontend and AI service; .gitignore covering secrets and model artifacts if large | M |
| M3-DOC08 | Log of AI-assisted development: tool used, what it generated, what was changed, how verified (college requirement) | M |
| M3-DOC09 | Security assumptions, limitations, no-real-funds disclaimer, contributors and each member's contribution | M |
| M3-DOC10 | Demo script and speaker notes for the presentation | M |

## 7. Pages and navigation

| Page | Route | Key content |
| --- | --- | --- |
| Dashboard | / | Wallet status, policy list, RTT balance |
| Farmer profile (Screen 1) | /profile | Farm location, crop, sowing date |
| Catalogue and recommendation (Screens 2 and 3) | /catalogue | Options read from the contract and the AI recommendation panel |
| Review and enroll (Screen 4) | /enroll?option=ID | Start picker, end preview, review, enroll transaction |
| Policy detail (Screens 5 to 7) | /policies/\[id\] | Status, rainfall report, result, claim and confirmation, predicted versus observed rainfall |
| History | /history | Event and transaction table |
| Admin (optional) | /admin | Mint and fund RTT |

Shared components: WalletButton, NetworkBanner, ProfileForm, CatalogueTable, OptionCard, AiRecommendationPanel, StartDatePicker, EnrollReview, PolicyCard, StatusBadge, RainfallReportCard, ResultCard, ClaimButton, TxStatus, ErrorNotice, ProvenanceTag.

## 8. Policy status logic

The frontend derives status from contract data and the current time, in this order:

1. Claimed flag set: **Claimed**.
2. Report accepted and rainfall strictly below the trigger: **Eligible**.
3. Report accepted and rainfall not below the trigger (equal counts as not below): **Not eligible**.
4. Current time before the start time: **Scheduled** (coverage not started).
5. Current time at or after the end time and no report: **Coverage ended, awaiting report**.
6. Otherwise: **Active** (coverage running).

## 9. Error handling matrix

| Situation | User-facing behaviour |
| --- | --- |
| MetaMask missing | Install prompt, features disabled |
| Wrong network | Banner with switch action; writes disabled |
| User rejects transaction | Neutral message, no error state stuck |
| Profile missing | Prompt to complete the profile before AI recommendation or enrollment |
| Invalid profile input | Inline field errors |
| Option id not in the catalogue | Contract error mapped to: This policy option does not exist |
| Start time in the past | Inline error before signing; contract error mapped to the same message if it still reverts |
| Demo option start not on a full hour | Inline error asking for a full-hour start |
| Claim before coverage ends or before report | Button disabled with reason |
| Duplicate claim | Contract error mapped to: This policy has already been paid |
| Contract unfunded | Message: payout pool is not funded; suggest the admin fund it |
| Contract call failure | Show decoded reason and hash if available |
| AI service down | Recommendation panel shows unavailable; catalogue, enrollment and claims still work |
| AI input or data error | Panel shows the returned error text |
| Missing weather data (oracle side) | Show Coverage ended, awaiting report; never zero |

## 10. Non-functional requirements

| ID | Requirement |
| --- | --- |
| M3-NF01 | Every async action has a loading state and an error state |
| M3-NF02 | Readable at laptop and phone widths; usable with keyboard; labels on form fields |
| M3-NF03 | No private keys, seed phrases or secrets in frontend code or the repo |
| M3-NF04 | ABI and address are imported from deployment artifacts, not hand-copied |
| M3-NF05 | A new reviewer can run the full stack in under 30 minutes from the README |
| M3-NF06 | Prediction endpoint responds in under 2 seconds on a typical laptop |
| M3-NF07 | Visible test-only disclaimer on the main pages |
| M3-NF08 | Clean TypeScript build and lint with no errors |

## 11. Repository structure (Member 3 parts)

frontend/ has app (routes), components, lib (contract helpers, catalogue reader, ABI loader, profile storage, date helpers, formatters, error mapper), public and package.json. backend/ai\_api/ has main.py, schemas.py, model\_loader.py, recommend.py (calls Member 2's rule) and requirements. docs/ has architecture diagram, screenshots, demo script, ai-usage-log.md and runbook.

## 12. Schedule

| Time | Tasks |
| --- | --- |
| Day 1, h1-2 | Scaffold Next.js; agree ABI, catalogue getters, enroll signature and the /recommend schema; create mock catalogue and stub responses |
| Day 1, h2-5 | Wallet connection, network banner, profile screen (localStorage), catalogue screen reading the mock catalogue; scaffold FastAPI with /health and a stub /recommend |
| Day 1, h5-8 | Enrollment flow (start picker, review, enroll transaction and receipt); import real ABI, address and catalogue; load the trained model and crop table in FastAPI |
| Day 2, h1-3 | Policy status, result and claim UI; recommendation panel wired to FastAPI; error mapping |
| Day 2, h3-5 | End-to-end test: profile, recommendation, enroll in the demo option, report, claim, duplicate claim, AI-down test |
| Day 2, h5-8 | Polish loading and error states; README, diagram, screenshots, AI usage log, demo rehearsal |

**Priority:** the enroll and claim flow comes first, then the AI recommendation. Keep the profile simple (browser storage). If time runs short, show the recommendation endpoint separately rather than cutting contract integration.

## 13. Test plan

### 13.1 Frontend manual and automated checks

| Test | Expected |
| --- | --- |
| Connect and disconnect wallet | Address and RTT balance update correctly |
| Switch to wrong chain | Banner appears, writes blocked |
| Save profile and reload the page | Profile persists for the same wallet and is separate for another wallet |
| Open the catalogue | All options match the contract; no editable terms |
| Choose a start time in the past | Inline error, no transaction |
| Demo option with a start not on a full hour | Inline error, no transaction |
| Enroll in a valid option | Receipt shown; policy appears as Scheduled or Active; end time equals start plus duration |
| View policy before start | Scheduled, claim disabled |
| View policy during coverage | Active, claim disabled with reason |
| View policy after end with no report | Coverage ended, awaiting report; rainfall not shown as zero |
| View after accepted report below the trigger | Eligible, claim enabled |
| Rainfall equal to the trigger | Not eligible |
| Claim as non-owner | Claim disabled or rejected with message |
| Claim an eligible policy | Transaction hash shown; RTT balance increases by the payout |
| Duplicate claim | Mapped error, no second payout |
| Unfunded contract | Funding message shown |
| Stop AI service | Panel shows unavailable; enrollment and claim still work |
| Hardcoded values check | Changing contract state, including the catalogue, changes the UI |

### 13.2 AI service tests

| Test | Expected |
| --- | --- |
| GET /health | Model, crop table and rule loaded: true |
| Valid /recommend | Matches the agreed schema; each probability is between 0 and 1; the recommended option is applicable and is not option 0 |
| Request includes option 0 | That option returns applicable false with a reason |
| Invalid coordinates, date or option list | 422 |
| Unsupported crop | 422 |
| Missing model or crop table | Clear startup failure |
| Weather source unreachable | 503, not a default value |
| Same input twice | Same output (deterministic) |
| Label definition check | Probability means rainfall strictly below the trigger over that option's window, matching the contract rule |
| Training and serving feature check | Features for a known sample match those in the training notebook |

## 14. Acceptance criteria and definition of done

1. Wallet connects on the agreed chain and shows the RTT balance.
2. The profile saves and reloads per wallet.
3. The catalogue shows every option read from the contract, and the farmer cannot edit terms.
4. The AI panel shows a recommended option, suggested start date and per-option probabilities from FastAPI, labelled advisory and separate from the verified report.
5. The farmer can enroll with a future start date; the policy appears from real contract data with the correct end time and status.
6. Rainfall report, trigger comparison and eligibility display correctly.
7. An eligible claim succeeds with a visible transaction hash and updated balance; a duplicate claim shows a clear error; rainfall equal to the trigger shows Not eligible.
8. With the AI service stopped, manual enrollment and claiming still work and the panel shows a clear message.
9. No code path lets AI output influence a transaction.
10. README, diagram, screenshots, AI usage log and demo script are complete and a fresh clone runs by following the README.

## 15. Risks

| Risk | Mitigation |
| --- | --- |
| ABI or function names change late | Interface file committed early; ABI loaded from artifacts |
| Catalogue inconsistent across documents (illustrative options A to C versus options 0 to 12) | Treat the 13-option table as authoritative and read it from the contract |
| Enroll function signature differs (for example location not passed) | Isolate the call in one contract helper; confirm with Member 1 |
| Model or crop table not ready when the API is built | Stub with the agreed schema, marked mock, swap on delivery |
| Nobody owns the recommendation rule | Member 2 writes it as a Python module; Member 3 only calls it |
| Demo option cannot be forecast | Return applicable false and never recommend it |
| Start-time alignment or timezone mistakes | Use Unix seconds, one timezone convention, and full-hour or whole-day checks in one date helper |
| Profile lost when browser storage is cleared | Warn the farmer and make re-entry quick; no database in scope |
| Training and serving feature mismatch | Share feature code or add a known-sample test |
| Wallet and chain config confusion | Single environment file; network banner |
| Documentation left to the end | Capture screenshots and notes as each feature lands |
| CORS or port issues in the demo | Document ports and test the full stack before rehearsal |

## 16. Questions Member 3 must be able to answer

- Why is the AI panel separate from the verified report?
- What happens in the UI when the AI service is down?
- How does the frontend know whether a policy is eligible?
- How are duplicate claims shown to the user?
- Why can the farmer not edit the trigger, duration or payout?
- Where is the profile stored, and what goes on-chain?
- How does the recommendation relate to the rule the contract checks?
- How are training and prediction features kept consistent?
- What in the demo is live, simulated or fallback?

## Appendix A: Assumed interfaces, sample data and build prompts

*These are **proposed** shapes so Member 3 can build and test alone. Members 1 and 2 must confirm or correct them. At integration time, replace the mocks with the real ABI, address and model.*

### A.1 Policy catalogue (13 options)

This table is the authoritative catalogue for the build. The real values are read from the contract; use this table only as mock data. The options A, B and C shown as examples in the concept document are illustrations, not part of this catalogue.

| Option | Risk label | Duration | Trigger (mm) | Payout (RTT) |
| --- | --- | --- | --- | --- |
| 0 | Demo | 2 hours | 1 | 10 |
| 1 | Severe | 30 days | 30 | 90 |
| 2 | Severe | 60 days | 60 | 180 |
| 3 | Severe | 90 days | 90 | 270 |
| 4 | Severe | 120 days | 120 | 360 |
| 5 | Moderate | 30 days | 60 | 60 |
| 6 | Moderate | 60 days | 120 | 120 |
| 7 | Moderate | 90 days | 180 | 180 |
| 8 | Moderate | 120 days | 240 | 240 |
| 9 | Mild | 30 days | 90 | 30 |
| 10 | Mild | 60 days | 180 | 60 |
| 11 | Mild | 90 days | 270 | 90 |
| 12 | Mild | 120 days | 360 | 120 |

Prototype values, not actuarially calibrated.

### A.2 Proposed contract interface (from Member 1)

Functions:

- optionCount() returns the number of catalogue options
- getOption(optionId) returns the Option struct
- enroll(optionId, startTime, latitudeE6, longitudeE6) returns policyId
- getPolicy(policyId) returns the Policy struct
- nextPolicyId() returns the number of policies created
- claim(policyId)
- RTT token: balanceOf(address), approve, mint (admin only)

Option struct fields: riskLabel, durationSeconds, thresholdMm, payoutAmount.

Policy struct fields: owner, optionId, latitudeE6, longitudeE6, startTime, endTime, thresholdMm, payoutAmount, reportReceived, rainfallMm, eligible, claimed.

Date rule: the contract computes endTime = startTime + durationSeconds. The frontend only previews it.

Events: PolicyEnrolled(policyId, owner, optionId), RainfallReportAccepted(policyId, rainfallMm), ClaimPaid(policyId, owner, amount).

Custom errors to map to messages: InvalidOption, StartTimeInPast, InvalidStartAlignment, InvalidLocation, NotPolicyOwner, ReportNotAccepted, ReportTooEarly, NotEligible, AlreadyClaimed, InsufficientPayoutBalance.

Unit conventions: latitude and longitude are degrees multiplied by 1,000,000 (integers); times are Unix seconds; rainfall and threshold are whole millimetres; RTT amounts use 18 decimals.

This is a proposal. Member 1 must confirm names, the enroll parameters and whether eligibility is a stored flag or computed.

### A.3 Sample policy states for mock mode

| State | Start time | End time | reportReceived | rainfallMm | thresholdMm | eligible | claimed | UI status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Not started | future | future | false | 0 | 60 | false | false | Scheduled |
| Running | past | future | false | 0 | 60 | false | false | Active |
| Ended, no report | past | past | false | 0 | 60 | false | false | Coverage ended (awaiting report) |
| Below trigger | past | past | true | 42 | 60 | true | false | Eligible |
| Equal to trigger | past | past | true | 60 | 60 | false | false | Not eligible |
| Above trigger | past | past | true | 85 | 60 | false | false | Not eligible |
| Paid | past | past | true | 42 | 60 | true | true | Claimed |

Mock mode must show a visible MOCK DATA banner and be switchable off with an environment variable.

### A.4 Sample AI API

Request to POST /recommend (the options list is built from the contract catalogue; abridged here):

```
{
  "latitude": 12.97,
  "longitude": 77.59,
  "crop": "groundnut",
  "sowing_date": "2026-07-10",
  "as_of_date": "2026-07-25",
  "options": [
    { "option_id": 0, "duration_seconds": 7200, "trigger_mm": 1, "payout": 10 },
    { "option_id": 5, "duration_seconds": 2592000, "trigger_mm": 60, "payout": 60 }
  ]
}
```

Success (200, abridged; values are examples):

```
{
  "recommended_option_id": 5,
  "suggested_start_date": "2026-08-12",
  "rationale": "Moderate cover over the pod-filling stage",
  "options": [
    { "option_id": 0, "applicable": false, "reason": "Window too short for a seasonal model" },
    { "option_id": 5, "applicable": true, "probability_below_trigger": 0.64 }
  ],
  "model_name": "logistic_regression",
  "model_version": "0.1-mock",
  "trained_on_range": "2000-01-01 to 2023-12-31",
  "advisory": true
}
```

Validation error (422):

```
{ "detail": "crop is not in the supported list" }
```

Unavailable (503):

```
{ "detail": "Weather data unavailable; no recommendation made" }
```

At integration, check that the real field names and ranges match these.

### A.5 Staged prompts for another AI code generator

Paste the whole Member 3 RPD with every prompt. Run one stage at a time and test before moving on.

**Global constraints (include in every prompt):** Next.js with TypeScript; Ethers.js only (no Wagmi or Viem); FastAPI for the AI service; pinned versions; no hardcoded contract state or catalogue; policy terms are never typed in by the user; AI output never calls a contract function; no secrets in code; every async action has loading and error states; ABI and address loaded from a config file; profile stored only in browser localStorage.

1. **Scaffold and wallet.** Create the Next.js project, routes from section 7, WalletButton, NetworkBanner and environment config (M3-W01 to M3-W05).
2. **Contract layer.** Create Ethers.js helpers against the interface in A.2, an ABI loader, a catalogue reader, an error mapper, the status function from section 8, and a mock mode using A.1 and A.3.
3. **Profile and catalogue.** Build the profile screen with localStorage and the catalogue screen showing read-only options (M3-PR01 to M3-PR04, M3-C01 to M3-C04).
4. **Enrollment.** Build the start picker with full-hour and whole-day rules, end preview, review screen and enroll transaction with receipt and event parsing (M3-E01 to M3-E08).
5. **Policy status, result and claim.** Build PolicyCard, StatusBadge, RainfallReportCard, ResultCard and ClaimButton with disabled-state reasons (M3-D, M3-R).
6. **FastAPI service.** Build main.py, schemas.py, model\_loader.py and recommend.py per section 5.1, returning a stub that follows A.4 until real artifacts exist; include /health and the error behaviour.
7. **Recommendation panel.** Build the panel per section 5.2 with loading, error and unavailable states, pre-fill of the suggested start date, and a test showing manual enrollment works when the service is down.
8. **History and docs helpers.** Event history table, README skeleton and runbook following section 6.

After each stage, ask the model for a short test checklist, and run it yourself before continuing.

### A.6 Integration checklist (when the others finish)

1. Replace the mock ABI, address and catalogue with Member 1's deployment artifact and contract values.
2. Compare function, event and error names with A.2; adjust the contract helper and error mapper only.
3. Turn off mock mode and re-run the section 13.1 tests against the real contract.
4. Drop in Member 2's model, crop table and recommendation rule; compare features for a known sample with the training notebook.
5. Check the response fields against A.4, then re-run the section 13.2 tests.
6. Retake the screenshots with real data and note whether CRE was simulated, live or fallback.

### A.7 Open items to confirm with the team

1. Is the 13-option table the final catalogue? (The concept document also shows illustrative options A to C.)
2. Does enroll take latitude and longitude, or is location handled another way?
3. Will the contract expose optionCount and getOption so the UI never hardcodes terms?
4. Final event and error names, including PolicyEnrolled and ReportTooEarly.
5. Start-time alignment: full hour for option 0, whole day for others, and which timezone.
6. Which crops are supported (groundnut only, or a short list)?
7. Who writes the recommendation rule (suggested: Member 2) and in what form (Python module)?
8. Risk-category wording and cutoffs, if any are shown beyond probabilities.
