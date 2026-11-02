# AgriShield Presentation Demo Script & Speaker Notes (M3-DOC10)

This script provides a 10-minute presentation and live walkthrough guide for demonstrating the **AgriShield** platform.

---

## 1. Presentation Outline & Timing

| Step | Time | Screen / Feature | Key Message |
| :---: | :---: | :--- | :--- |
| **1** | 0:00 - 1:00 | Slides / Intro | The Problem: Smallholder drought vulnerability and traditional insurance failure. |
| **2** | 1:00 - 2:00 | Architecture | 3-tier architecture: EVM contracts, Python AI serving, Next.js dApp. |
| **3** | 2:00 - 3:00 | Dashboard & Wallet | Connecting MetaMask to local Anvil; RTT test token economics. |
| **4** | 3:00 - 4:00 | Farmer Profile (Screen 1) | Setting farm coordinates, crop type (Maize), and sowing date. |
| **5** | 4:00 - 5:30 | Catalogue & AI Advisory (Screens 2 & 3) | AI Deficit Probability (64%), suggested start date, Option 0 Demo exclusion. |
| **6** | 5:30 - 7:00 | Review & Enroll (Screen 4) | Fixed terms, UTC whole-day alignment, calculated end date, transaction lifecycle. |
| **7** | 7:00 - 8:00 | Policy Details (Screen 5) | Lifecycle derivation rules; missing data is never shown as 0 mm. |
| **8** | 8:00 - 9:00 | Claim Execution (Screens 6 & 7) | Authoritative contract evaluation; claiming 60 RTT; balance refresh. |
| **9** | 9:00 - 9:45 | Transaction History (Screen 8) | Immutable event ledger: `PolicyEnrolled`, `RainfallReportAccepted`, `ClaimPaid`. |
| **10** | 9:45 - 10:00 | Conclusion & Q&A | Strict AI advisory separation; smart contract authority. |

---

## 2. Step-by-Step Speaker Notes

### Step 1: Introduction & Problem Context
- **Speaker**: "Welcome everyone. Today we are presenting AgriShield, an autonomous rainfall-based parametric crop insurance platform designed to protect smallholder farmers from climate volatility."
- **Talking Points**: Traditional insurance requires manual field adjusters, taking months to settle claims. Parametric insurance automates payouts: if rainfall drops below a verified threshold during a crop's critical growth window, funds are released immediately without manual claims assessment.

### Step 2: System Architecture & Team Roles
- **Speaker**: "AgriShield is divided cleanly across three specialized layers:
  - Member 1 implemented the EVM smart contracts, managing the fixed 13-option catalogue and ERC-20 RTT tokens.
  - Member 2 engineered the machine learning pipeline and weather oracle integration using historical Open-Meteo precipitation data.
  - Member 3 built the Next.js 15 frontend, MetaMask wallet integration, and the Python FastAPI serving layer."

### Step 3: Wallet Connection (Homepage `/`)
- **Action**: Click **"Connect Wallet"** in top right.
- **Speaker**: "Notice our wallet connection bar. AgriShield connects directly to MetaMask using Ethers.js v6 without third-party abstraction layers. Our wallet balance shows 1,000 RTT. RTT stands for Rainfall Test Tokens—simulated tokens with zero real-world value to guarantee a safe test environment."

### Step 4: Farmer Profile (Screen 1 `/profile`)
- **Action**: Navigate to `/profile`. Enter Latitude `16.31`, Longitude `80.44`, Crop `Maize`, Sowing Date `2026-06-15`. Click **"Save Profile"**.
- **Speaker**: "The farmer sets up their profile once. Notice that coordinates are stored locally in the farmer's browser indexed by their wallet address. This privacy-preserving design feeds the AI recommendation engine without leaking unnecessary personal data."

### Step 5: Policy Catalogue & AI Advisory (Screens 2 & 3 `/catalogue`)
- **Action**: Navigate to `/catalogue`. Point to the indigo **AI Policy Recommendation Panel**.
- **Speaker**: "Here is our AI Recommendation Panel. The FastAPI backend analyzed 23 years of Open-Meteo rainfall archives for these coordinates and aligned them with maize's flowering stage.
  - The model recommends Option #5 (Moderate Cover, 30 days) with an estimated **64% Deficit Risk** below the 60 mm trigger.
  - Notice our permanent advisory label: *AI helps you choose; the contract decides eligibility and payout.*
  - Notice that Option 0 (the 2-hour Demo) is explicitly marked non-applicable because rapid demo windows cannot be modeled as agricultural policies."

### Step 6: Review & Enrollment (Screen 4 `/enroll`)
- **Action**: Click **"Select Recommended Option & Pre-fill Date"**.
- **Speaker**: "Notice that clicking the AI recommendation did NOT execute a transaction. It seamlessly pre-filled the enrollment form with the suggested date.
  - The policy start date is strictly validated in the future and aligned to 00:00:00 UTC.
  - The end date is calculated as a preview; the smart contract calculates the official end time on-chain.
  - The farmer cannot alter trigger thresholds or payout amounts, preserving parametric contract integrity."
- **Action**: Click **"Confirm & Enroll in Policy #5"**. Show the 5-step transaction lifecycle modal.

### Step 7: Policy Details & Lifecycle Derivation (Screen 5 `/policies/[id]`)
- **Action**: Open Policy #104.
- **Speaker**: "On the policy detail page, status is dynamically derived using our strict 6-rule precedence logic from Section 8 of the specification.
  - For policies awaiting reports, rainfall is **never displayed as 0 mm**—it is clearly marked as Pending Oracle Report to prevent confusing farmers.
  - In Policy #104, the oracle submitted 42 mm of observed rainfall. Because 42 mm is strictly below the 60 mm trigger, the contract rules this policy ELIGIBLE."

### Step 8: Authoritative Claim Settlement (Screens 6 & 7)
- **Action**: Click **"Claim Payout (60 RTT)"**.
- **Speaker**: "Notice the claim button is active only because all contract conditions are met: the caller is the policy owner, the report is accepted, the policy is eligible, and it has not been claimed yet.
  - We submit the claim transaction.
  - The contract marks the policy as claimed, transfers 60 RTT to the farmer's wallet, and our balance updates in real-time to 1,060 RTT."

### Step 9: Transaction Audit Ledger (Screen 8 `/history`)
- **Action**: Navigate to `/history`.
- **Speaker**: "Finally, Screen 8 provides a complete on-chain event ledger. Every `PolicyEnrolled`, `RainfallReportAccepted`, and `ClaimPaid` event is indexed with its block number, timestamp, and transaction hash with one-click copy support. In mock mode, this clearly discloses that simulated events are active."

### Step 10: Conclusion & Examiner Q&A
- **Speaker**: "In conclusion, AgriShield demonstrates how EVM smart contracts and machine learning can work together in agriculture: AI advises farmers with calibrated historical probabilities, while the smart contract remains the sole authoritative arbiter of financial settlements. Thank you."

---

## 3. Anticipated Examination Questions & Answers

**Q1: What happens if the AI service goes offline? Can farmers still buy insurance?**
> *Answer*: Yes, absolutely (Requirement M3-AP06). The AI service is strictly decoupled and advisory. If FastAPI is offline, an informational banner appears, but the farmer can manually browse all 13 catalogue options, enroll, and settle claims without interruption.

**Q2: What happens if observed rainfall exactly equals the trigger threshold?**
> *Answer*: Per RPD Section 8 Rule 3, rainfall must fall *strictly below* the trigger threshold (`rainfallMm < thresholdMm`). If rainfall equals the trigger, the contract verdict is `NOT_ELIGIBLE`. Equal counts as not below.

**Q3: Why is Option 0 excluded from AI recommendations?**
> *Answer*: Option 0 is a 2-hour demonstration window designed exclusively for rapid testing of EVM lifecycle transitions during evaluations. An agricultural crop cannot be meaningfully evaluated over a 2-hour window, so the AI model explicitly rejects Option 0 with the reason *"Window too short for a seasonal model"*.
