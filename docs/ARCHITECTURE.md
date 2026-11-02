# AgriShield System Architecture (M3-DOC05)

This document provides a technical specification of the **AgriShield** Rainfall-Based Parametric Crop Insurance decentralized platform.

---

## 1. System Overview & Component Hierarchy

AgriShield consists of three decoupled architectural layers:

1. **Frontend Presentation & Web3 Integration Layer (Member 3)**:
   - Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS v4.
   - Pure Ethers.js v6 for blockchain interactions (no Wagmi or Viem dependencies).
   - EIP-1193 MetaMask wallet connection and lifecycle event listeners (`accountsChanged`, `chainChanged`).
   - Browser-persistent localStorage keying for farmer profiles (`crop_insure_profile_<wallet>`).
   - Browser mock contract adapter implementing full EVM simulation (Appendix A.3).
2. **Blockchain & Parametric Smart Contract Layer (Member 1)**:
   - EVM Smart Contract (`CropInsurance.sol`) managing 13 fixed parametric options.
   - Standard ERC-20 token (`RainfallTestToken.sol` / RTT) serving as the simulated indemnity payout asset (18 decimals).
   - On-chain event emission: `PolicyEnrolled`, `RainfallReportAccepted`, `ClaimPaid`.
   - Contract custom error specifications (RPD Section 9 & Appendix A.2).
3. **AI Recommendation & Agro-Climatic Serving Layer (Stage 6 / Member 2 & 3)**:
   - Python 3.13 FastAPI serving application exposing `/health` and `/recommend`.
   - Open-Meteo Historical Archive API client with local climatological fallback resilience.
   - Crop vulnerability growth stage matrix across 8 crops (`groundnut`, `maize`, `rice`, `wheat`, `cotton`, `soybean`, `millet`, `sorghum`).
   - Pluggable scikit-learn model loading interface with lazy initialization and MockModelAdapter.

---

## 2. Core Architectural Workflows

### Flow 1: Farmer Profile & AI Recommendation Workflow
```mermaid
sequenceDiagram
    autonumber
    actor Farmer as Farmer (User)
    participant UI as AgriShield DApp (Next.js)
    participant Storage as Browser LocalStorage
    participant AI as FastAPI Service (/recommend)
    participant Weather as Open-Meteo Archive API

    Farmer->>UI: Input Coordinates (Lat/Lon), Crop, Sowing Date
    UI->>Storage: Save profile key: crop_insure_profile_<wallet>
    Farmer->>UI: Navigate to /catalogue
    UI->>Storage: Retrieve connected wallet's saved profile
    UI->>UI: Read 13 catalogue options from Contract / Mock
    UI->>AI: POST /recommend (Profile + Catalogue Options)
    AI->>Weather: Query daily precipitation (historical / recent observations)
    Weather-->>AI: Historical rainfall array
    AI->>AI: Align crop growth stage & calculate deficit probabilities
    AI->>AI: Exclude Option 0 (Demo window too short)
    AI-->>UI: JSON: recommended_option_id, probability_below_trigger, suggested_start_date, rationale
    UI->>Farmer: Render AI Recommendation Panel (Screen 3) with Advisory Disclaimer
```

---

### Flow 2: Policy Enrollment Lifecycle
```mermaid
sequenceDiagram
    autonumber
    actor Farmer as Farmer (User)
    participant UI as Review & Enroll (/enroll)
    participant Wallet as MetaMask (EIP-1193)
    participant Contract as Smart Contract (EVM)

    Farmer->>UI: Click "Select Recommended Option & Pre-fill Date"
    UI->>UI: Populate Option ID and Start Date (UTC Whole Day aligned)
    UI->>UI: Compute preview end time: startTime + durationSeconds
    Farmer->>UI: Review Fixed Terms (Trigger mm, Payout RTT, Coordinates)
    Farmer->>UI: Click "Confirm & Enroll"
    UI->>Wallet: eth_sendTransaction: enroll(optionId, startTime, latE6, lonE6)
    Wallet->>Farmer: Prompt signature & gas approval
    Farmer->>Wallet: Approve transaction
    Wallet->>Contract: Broadcast transaction
    Contract->>Contract: Validate StartTimeInPast, InvalidOption, Alignment
    Contract->>Contract: Assign nextPolicyId, store Policy struct
    Contract-->>UI: Emit PolicyEnrolled(policyId, owner, optionId)
    UI->>Farmer: Display Transaction Confirmed & Link to /policies/[id]
```

---

### Flow 3: Weather Oracle Precipitation Verification & Claim Settlement
```mermaid
sequenceDiagram
    autonumber
    participant Oracle as Weather Oracle (CRE)
    participant Contract as Smart Contract (EVM)
    actor Farmer as Policy Owner
    participant UI as Policy Detail Screen (/policies/[id])
    participant RTT as RTT Token Contract

    Oracle->>Contract: submitRainfallReport(policyId, observedRainfallMm)
    Contract->>Contract: Store rainfallMm, set reportReceived = true
    Contract->>Contract: Evaluate: eligible = (observedRainfallMm < thresholdMm)
    Contract-->>UI: Emit RainfallReportAccepted(policyId, observedRainfallMm)

    Farmer->>UI: Open /policies/[id]
    UI->>Contract: Query getPolicy(policyId)
    UI->>UI: Derive Status (RPD Section 8): ELIGIBLE
    UI->>Farmer: Enable "Claim Insurance Payout" Button
    Farmer->>UI: Click Claim Button
    UI->>Contract: claim(policyId)
    Contract->>Contract: Verify msg.sender == owner, reportReceived, eligible, !claimed
    Contract->>Contract: Set claimed = true
    Contract->>RTT: transfer(owner, payoutAmount)
    Contract-->>UI: Emit ClaimPaid(policyId, owner, payoutAmount)
    UI->>UI: Refresh wallet RTT balance & render Settled Confirmation Receipt
```

---

## 3. Policy Status Derivation State Machine (RPD Section 8)

The frontend derives policy lifecycle states from contract data and current Unix timestamp according to strict precedence rules:

```mermaid
stateDiagram-v2
    [*] --> Scheduled: now < startTime && !reportReceived
    Scheduled --> Active: startTime <= now < endTime && !reportReceived
    Active --> AwaitingReport: now >= endTime && !reportReceived
    
    AwaitingReport --> Eligible: reportReceived && rainfallMm < thresholdMm && !claimed
    AwaitingReport --> NotEligible: reportReceived && rainfallMm >= thresholdMm
    
    Eligible --> Claimed: claim() executed on-chain (claimed == true)
    
    Claimed --> [*]
    NotEligible --> [*]
```

### Precedence Table:
1. **`CLAIMED`**: If `claimed == true` (Highest priority terminal state).
2. **`ELIGIBLE`**: If `reportReceived == true` AND `rainfallMm < thresholdMm`.
3. **`NOT_ELIGIBLE`**: If `reportReceived == true` AND `rainfallMm >= thresholdMm` (Equal counts as not below).
4. **`SCHEDULED`**: If `!reportReceived` AND `now < startTime`.
5. **`AWAITING_REPORT`**: If `!reportReceived` AND `now >= endTime`.
6. **`ACTIVE`**: If `!reportReceived` AND `startTime <= now < endTime`.

---

## 4. Error Handling & Architectural Isolation Guarantees

1. **Smart Contract Custom Errors**:
   All contract reverts (`InvalidOption`, `StartTimeInPast`, `InvalidStartAlignment`, `NotPolicyOwner`, `AlreadyClaimed`, `InsufficientPayoutBalance`) are caught by `errorMapper.ts` and translated into actionable user feedback.
2. **MetaMask Rejection**:
   User signature rejections (EIP-1193 code `4001`) reset transaction state to idle immediately without sticky red error boxes.
3. **Missing Data Protection**:
   Policies awaiting oracle verification **never display 0 mm**; rainfall values are explicitly flagged as *Pending Oracle Report*.
4. **AI Serving Fault Tolerance**:
   If the Python FastAPI backend is offline or network fails, the frontend displays an informational retry banner while keeping catalogue browsing, manual enrollment, and claim settlements 100% operational.
