# AgriShield Screenshots & UI Verification Guide (M3-DOC06)

This document provides a catalog and visual reference guide for all primary screens and states across the **AgriShield** application.

---

## Screen Catalogue & Verification Checklist

| Figure | Screen Name | Route | Key Verification Elements |
| :---: | :--- | :--- | :--- |
| **01** | **Dashboard** | `/` | Wallet connection status, RTT balance (1,000 RTT), policy summary counter, quick action buttons. |
| **02** | **Farmer Profile** | `/profile` | Latitude/Longitude coordinate inputs, crop selector (8 crops), sowing date picker, wallet key isolation. |
| **03** | **Policy Catalogue** | `/catalogue` | 13-option grid, Option 0 Demo badge (2h), Severe/Moderate/Mild risk tier filters, fixed terms notice. |
| **04** | **AI Recommendation Panel** | `/catalogue` (top) | Screen 3: Indigo panel, `MOCK AI RECOMMENDATION` badge, 64% deficit risk, suggested start date, advisory label. |
| **05** | **AI Offline State** | `/catalogue` | Amber alert banner: "AI Recommendation Service Offline", retry button, manual enrollment unaffected (M3-AP06). |
| **06** | **Review & Enroll** | `/enroll?option=ID` | Aligned start date picker (UTC whole-day), computed preview end date, fixed terms, test disclaimer (M3-E07). |
| **07** | **Transaction Lifecycle** | `/enroll` | 5-step transaction indicator: Submitting → Pending (`0x...`) → Confirmed (`Policy #201`) → Link to detail. |
| **08** | **Policy Detail (Active)** | `/policies/[id]` | Status badge `ACTIVE`, ownership pill, fixed terms strip, coverage dates, pending report notice. |
| **09** | **Rainfall Report Card** | `/policies/[id]` | Observed rainfall (42 mm) vs trigger (60 mm), comparison verdict (Below trigger / Eligible), CRE provenance tag. |
| **10** | **Authoritative Result** | `/policies/[id]` | Contract verdict: "Policy is Eligible for Payout", claimable amount (60 RTT), smart contract authority disclaimer. |
| **11** | **Claim Settlement** | `/policies/[id]` | Active claim button, successful claim receipt, status transitions to `CLAIMED`, wallet balance updates. |
| **12** | **Transaction Ledger** | `/history` | Screen 8: Event table (`PolicyEnrolled`, `RainfallReportAccepted`, `ClaimPaid`), block numbers, copy hash button. |
| **13** | **Network Warning** | Global | Amber banner when wallet is on wrong chain (e.g. Mainnet/Sepolia instead of 31337). |
| **14** | **Swagger UI Docs** | `http://127.0.0.1:8000/docs` | FastAPI interactive API documentation with OpenAPI schema schemas for `/recommend` and `/health`. |

---

## Capturing Updated Verification Screenshots

To generate fresh screenshots for final presentation slides or report appendices:

1. Ensure the Next.js development server is running on `http://localhost:3000`.
2. Ensure the FastAPI backend is running on `http://127.0.0.1:8000`.
3. Open Google Chrome with the MetaMask browser extension.
4. Execute the 10 demonstration steps detailed in [`docs/DEMO_SCRIPT.md`](../DEMO_SCRIPT.md).
5. Save captured PNG images in `docs/screenshots/` using filenames matching the figure numbering:
   - `fig01_dashboard.png`
   - `fig02_farmer_profile.png`
   - `fig03_catalogue_grid.png`
   - `fig04_ai_recommendation_panel.png`
   - `fig05_ai_offline_fallback.png`
   - `fig06_review_and_enroll.png`
   - `fig07_transaction_confirmed.png`
   - `fig08_policy_detail_active.png`
   - `fig09_rainfall_report_eligible.png`
   - `fig10_result_card_outcome.png`
   - `fig11_claim_settlement_receipt.png`
   - `fig12_transaction_history_table.png`
   - `fig13_wrong_network_banner.png`
   - `fig14_fastapi_swagger_docs.png`
