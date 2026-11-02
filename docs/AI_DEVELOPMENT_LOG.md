# AgriShield AI-Assisted Development Log (M3-DOC08)

This document satisfies the college requirement documenting the use of AI development tools during the design, implementation, and verification of the **AgriShield** Rainfall-Based Crop Insurance project.

---

## 1. Development Environment & AI Tools

- **Primary AI Agent**: Google DeepMind Antigravity Agentic Assistant.
- **Underlying Large Language Model**: Gemini 2.5 Flash / Pro (Inherit Mode).
- **Execution Environment**: Windows 11 64-bit PowerShell Sandbox.
- **Reference Specification (Source of Truth)**: `docs/reference/RPD - Member 3 (Frontend, Wallet, AI Serving and Docs).md` (Version 2.0 strictly; SHA256: `7CF8FC06084AE55A97638EDDEADC270A1F86D734C4D46780ACC498385579CC4F`).

---

## 2. Stage-by-Stage Implementation & Verification Log

### Stage 1: Next.js Scaffold & Wallet Integration
- **Prompt Objective**: Initialize Next.js 15 App Router project with TypeScript, Tailwind CSS, Ethers.js v6, and EIP-1193 MetaMask integration (M3-W01 to M3-W05). Wagmi and Viem strictly disallowed.
- **Generated Artifacts**:
  - `frontend/lib/wallet/walletContext.tsx`: Custom React context managing wallet connection, accounts, and network change listeners.
  - `frontend/components/wallet/WalletButton.tsx`: Connect/disconnect wallet CTA with balance display.
  - `frontend/components/shared/NetworkBanner.tsx`: Network validation banner detecting non-31337 chains.
- **Changes & Fixes Applied**: Configured WebAssembly fallback (`@next/swc-wasm-nodejs`) to resolve Windows SWC binary incompatibilities.
- **Verification Method**: Verified MetaMask account switching and chain switching in browser; verified zero ESLint errors and production build.

### Stage 2: Contract Layer & Mock Adapter
- **Prompt Objective**: Implement Ethers.js contract helpers, ABI definitions (Appendix A.2), catalogue reader, custom error mapper (Section 9), policy status derivation (Section 8), and mock adapter (Appendix A.3).
- **Generated Artifacts**:
  - `frontend/lib/contract/abi.ts`: Contract interfaces, events, and custom error types.
  - `frontend/lib/contract/policyStatus.ts`: Derivation logic implementing all 6 precedence rules.
  - `frontend/lib/contract/errorMapper.ts`: Custom error code translation.
  - `frontend/lib/mock/mockAdapter.ts`: Deterministic in-memory / localStorage contract adapter.
  - `frontend/lib/contract/__tests__/contractLayer.test.ts`: Automated unit test suite.
- **Verification Method**: 18 unit tests passed verifying status rules, error mapping, and catalogue terms.

### Stage 3: Farmer Profile & Catalogue UI
- **Prompt Objective**: Implement farmer profile with coordinate validation (lat/lon), crop selection, sowing date, and wallet-specific persistence (M3-PR01 to M3-PR04). Build catalogue grid for all 13 options with risk and duration filters (M3-C01 to M3-C04). Flag Option 0 as 2-hour Demo.
- **Generated Artifacts**:
  - `frontend/lib/profile/profileStorage.ts`: Profile validator and localStorage manager keying on `crop_insure_profile_<wallet>`.
  - `frontend/components/catalogue/CatalogueTable.tsx` & `OptionCard.tsx`: Filterable catalogue displaying fixed on-chain terms.
  - `frontend/app/profile/page.tsx`: Profile configuration screen.
- **Changes & Fixes Applied**: Updated branding globally to **AgriShield**. Removed test environment banner.
- **Verification Method**: 8 unit tests passed for profile coordinate validation and wallet key isolation.

### Stage 4: Enrollment Flow
- **Prompt Objective**: Build complete enrollment flow: option selection, future start time picker with full-hour and whole-day UTC alignment, end preview, summary review, and transaction lifecycle (M3-E01 to M3-E08).
- **Generated Artifacts**:
  - `frontend/lib/utils/dateHelpers.ts`: Alignment and future-time validation rules.
  - `frontend/components/enrollment/StartDatePicker.tsx`: Aligned datetime picker with AI suggested date pre-fill button.
  - `frontend/components/enrollment/EnrollReview.tsx`: Summary card displaying fixed terms, coordinates, and test disclaimer.
  - `frontend/components/enrollment/TxStatus.tsx`: 5-step transaction lifecycle modal.
  - `frontend/app/enroll/page.tsx`: URL-parameter-driven enrollment page (`?option=ID&suggestedStart=TIMESTAMP`).
- **Verification Method**: 9 unit tests passed; verified Option 0 full-hour alignment and Options 1–12 UTC day alignment.

### Stage 5: Policy Status, Results & Claim
- **Prompt Objective**: Build policy detail screen (`/policies/[id]`), weather oracle report card (never showing missing data as 0 mm), authoritative contract result card, and claim transaction button (M3-D01 to D04, M3-R01 to R09).
- **Generated Artifacts**:
  - `frontend/components/policies/RainfallReportCard.tsx`: Observed vs trigger comparison with CRE provenance tag.
  - `frontend/components/policies/ResultCard.tsx`: Authoritative eligibility outcome and RTT payout terms.
  - `frontend/components/policies/ClaimButton.tsx`: Full claim execution lifecycle with guard checks and disabled reasons.
  - `frontend/app/policies/[id]/page.tsx`: Dynamic policy detail route.
- **Verification Method**: Verified claim transaction updates policy to Claimed, refreshes wallet RTT token balance, and renders Screen 7 confirmation.

### Stage 6: Python FastAPI Recommendation Service
- **Prompt Objective**: Build backend AI serving layer with FastAPI, Pydantic schemas, Open-Meteo archive integration, and crop growth stage vulnerability tables (M3-AI01 to AI12, Appendix A.4). Exclude Option 0.
- **Generated Artifacts**:
  - `backend/ai_api/main.py`: FastAPI app with CORS middleware, request logging, and Swagger docs.
  - `backend/ai_api/schemas.py`: Pydantic models for request/response schemas.
  - `backend/ai_api/model_loader.py`: Artifact manager with `MockModelAdapter` and crop stage calendar.
  - `backend/ai_api/weather_client.py`: Open-Meteo archive API client with regional climatological fallback.
  - `backend/ai_api/recommend.py`: Recommendation engine calculating `probability_below_trigger`.
  - `backend/ai_api/tests/test_api.py`: Pytest test suite.
- **Changes & Fixes Applied**: Refactored async endpoint execution to synchronous `def` on Windows Python 3.13 to prevent anyio socket deadlocks inside sandbox; added lazy loading to prevent 21-second scikit-learn DLL import latency.
- **Verification Method**: 9 automated pytest tests passed in 1.71s.

### Stage 7: AI Recommendation Panel in DApp (Screen 3)
- **Prompt Objective**: Build frontend AI recommendation panel (M3-AP01 to AP07, AP09). Connect to FastAPI `/recommend`, display deficit probabilities, permanent advisory label, mock inference badges, and pre-fill CTA.
- **Generated Artifacts**:
  - `frontend/lib/ai/aiClient.ts`: Typed fetch client with 6s timeout and structured error handling.
  - `frontend/components/ai/AiRecommendationPanel.tsx`: Screen 3 recommendation panel.
  - `frontend/app/catalogue/page.tsx`: Integrated panel above catalogue table with probability map propagation.
- **Verification Method**: Verified manual enrollment works when AI service is offline (M3-AP06); confirmed AI never initiates transactions directly (M3-AP07).

### Stage 8: Transaction History & Complete Documentation
- **Prompt Objective**: Implement `/history` page (M3-H01 to H04), event indexer for `PolicyEnrolled`, `RainfallReportAccepted`, `ClaimPaid`, copy hash buttons, and complete project documentation (M3-DOC01 to DOC10).
- **Generated Artifacts**:
  - `frontend/lib/contract/eventIndexer.ts`: Smart contract event retrieval and mock event logger.
  - `frontend/components/history/HistoryTable.tsx`: Filterable transaction ledger.
  - `frontend/app/history/page.tsx`: Screen 8 history page.
  - `README.md`, `docs/RUNBOOK.md`, `docs/ARCHITECTURE.md`, `docs/AI_DEVELOPMENT_LOG.md`, `docs/DEMO_SCRIPT.md`.
- **Verification Method**: 41 frontend unit tests passed; 9 backend pytest tests passed; Next.js production build succeeded with 0 errors; verified RPD SHA256 checksum remained unchanged.

---

## 3. Summary of Verifications & Checksums

- **Frontend Tests**: 41 passed across 11 test suites.
- **Backend Tests**: 9 passed in 1.71s.
- **TypeScript**: 0 type errors (`tsc --noEmit`).
- **ESLint**: 0 warnings, 0 errors.
- **Next.js Production Build**: All 10 application routes prerendered successfully.
- **RPD File Integrity**: Checksum `7CF8FC06084AE55A97638EDDEADC270A1F86D734C4D46780ACC498385579CC4F` preserved throughout all turns.
