# AgriShield Operational Runbook (M3-DOC02)

This runbook provides complete, step-by-step terminal instructions for launching, configuring, and verifying the **AgriShield** Rainfall-Based Crop Insurance platform.

---

## 1. Prerequisites Checklist

Before proceeding, ensure the following tools are installed:

- **Node.js**: v20.x or v24.x (verified on v24.11.0)
- **Python**: v3.10+ (verified on v3.13.0)
- **Foundry (Anvil & Cast)**: [Foundry installation](https://getfoundry.sh/) (optional, only needed for live Anvil testnet)
- **MetaMask**: Browser extension installed with a test account

---

## 2. Step-by-Step System Startup

### Step 1: Start the Local Anvil Blockchain (Optional for Live Mode)
If running against a live local EVM node instead of mock mode:
```bash
anvil --chain-id 31337 --port 8545
```
Anvil will provide 10 pre-funded test accounts (each with 10,000 test ETH).
*Default Test Account 0:* `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`

---

### Step 2: Deploy Contracts & Fund Payout Pool (Member 1 Layer)
If deploying Member 1's contracts using Foundry `forge` and `cast`:

```bash
# 1. Deploy RTT Token
forge create src/RainfallTestToken.sol:RainfallTestToken \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# 2. Deploy Parametric Insurance Contract
forge create src/CropInsurance.sol:CropInsurance \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --constructor-args <RTT_TOKEN_ADDRESS>

# 3. Mint Test Tokens to Admin & Fund Insurance Contract (M3-A02)
cast send <RTT_TOKEN_ADDRESS> "mint(address,uint256)" <INSURANCE_CONTRACT_ADDRESS> 10000000000000000000000 \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

---

### Step 3: Configure Frontend Environment Variables
In `frontend/.env.local`:

```env
# For Live Anvil Mode:
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
NEXT_PUBLIC_CONTRACT_ADDRESS=<DEPLOYED_CONTRACT_ADDRESS>
NEXT_PUBLIC_MOCK_MODE=false
NEXT_PUBLIC_AI_API_URL=http://127.0.0.1:8000

# OR For Zero-Dependency Mock Mode (Default):
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
NEXT_PUBLIC_CONTRACT_ADDRESS=
NEXT_PUBLIC_MOCK_MODE=true
NEXT_PUBLIC_AI_API_URL=http://127.0.0.1:8000
```

---

### Step 4: Start the Python FastAPI AI Recommendation Backend
```bash
# Navigate to backend directory
cd backend/ai_api

# Install dependencies
python -m pip install -r requirements.txt

# Start ASGI server
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
- Verify API Health:
  ```bash
  curl http://127.0.0.1:8000/health
  ```
- Interactive API Documentation:
  Open `http://127.0.0.1:8000/docs` in your browser.

---

### Step 5: Start the Next.js Frontend Application
In a separate terminal:
```bash
cd frontend

# Install packages
npm install

# Start Next.js development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 3. End-to-End Demo Walkthrough (10 Demonstration Steps)

Follow this sequence to demonstrate the complete AgriShield platform:

| Step | Action | Expected Application State |
| :---: | :--- | :--- |
| **1** | Open Homepage (`/`) | Dashboard displays welcome banner, wallet status indicator, and prompt to connect MetaMask. |
| **2** | Connect MetaMask | Navbar updates with truncated address, RTT balance (1,000 RTT in mock mode), and network badge (`Anvil Local` / `31337`). |
| **3** | Configure Profile (`/profile`) | Enter Farm Latitude (`16.31`), Longitude (`80.44`), Crop (`Maize`), and Sowing Date (`2026-06-15`). Click **Save Profile**. Verified in localStorage. |
| **4** | Browse Policy Catalogue (`/catalogue`) | AI Recommendation Panel (Screen 3) queries FastAPI `/recommend`. Displays Option #5 with **64% Deficit Risk**, suggested start date, and plain-language rationale. Option 0 (Demo) marked as non-applicable for seasonal model. |
| **5** | Apply AI Suggested Date | Click **"Select Recommended Option & Pre-fill Date"** in AI panel. Navigates to `/enroll?option=5&suggestedStart=...`. |
| **6** | Review & Enroll (`/enroll`) | Start date pre-fills aligned to whole-day UTC. Review summary displays calculated end date preview, fixed terms (60 mm trigger, 60 RTT payout), coordinates, and test disclaimer. |
| **7** | Confirm Enrollment | Click **"Confirm & Enroll in Policy #5"**. MetaMask prompts signature (simulated in mock mode). Transaction lifecycle displays: Submitting → Pending (`0x...`) → Confirmed! Redirects to Policy Detail. |
| **8** | Inspect Policy Lifecycle (`/policies/[id]`) | Status badge displays `SCHEDULED` or `ACTIVE`. Timing window shown. In mock policy list, view Policy #104 (Report Received: 42 mm < 60 mm trigger) which displays `ELIGIBLE`. |
| **9** | Claim Payout | On Policy #104 detail page, click **"Claim Payout (60 RTT)"**. Transaction executes. Status transitions to `CLAIMED` and wallet RTT balance increases by 60 RTT. |
| **10** | Inspect Audit Ledger (`/history`) | History page renders complete event table: `PolicyEnrolled`, `RainfallReportAccepted`, and `ClaimPaid` with block numbers, amounts, and copyable hashes. |

---

## 4. Troubleshooting & Diagnostic Matrix

### 1. MetaMask Shows "Wrong Network"
- **Cause**: MetaMask is connected to Ethereum Mainnet or Sepolia instead of Local Anvil (Chain ID 31337).
- **Fix**: Click the red network banner or MetaMask dropdown and select `Localhost 8545` (Chain ID 31337).

### 2. Next.js SWC Binary Issue on Windows
- **Cause**: Node.js v24 on Windows may fail native SWC compilation.
- **Fix**: The repository includes `@next/swc-wasm-nodejs@15.5.28` and an automatic patch script in `scripts/patch-swc.js`. Run:
  ```bash
  node frontend/scripts/patch-swc.js
  ```

### 3. FastAPI Service Unavailable in DApp
- **Cause**: FastAPI server is not running on port 8000 or blocked by firewall.
- **Fix**: Ensure `uvicorn main:app --port 8000` is active. Verify with `curl http://127.0.0.1:8000/health`. The frontend will show an amber service unavailable banner and allow manual enrollment.

### 4. Clearing Mock Storage State
- **Cause**: Local storage has outdated mock policy states.
- **Fix**: Open browser DevTools (`F12`) → Application → Local Storage → Clear keys starting with `crop_insure_` or use the **"Clear Profile"** button on `/profile`.
