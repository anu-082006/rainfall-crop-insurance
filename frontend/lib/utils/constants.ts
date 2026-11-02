/**
 * constants.ts
 * App-wide constants derived from environment variables and fixed values.
 * All NEXT_PUBLIC_ vars are safe to expose in the browser.
 */

// ── Network configuration (M3-W05) ───────────────────────────────────────────
export const CHAIN_ID = parseInt(
  process.env.NEXT_PUBLIC_CHAIN_ID ?? "31337",
  10,
);
export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? "http://127.0.0.1:8545";
export const CHAIN_NAME =
  process.env.NEXT_PUBLIC_CHAIN_NAME?.replace(/^"|"$/g, "") ?? "Anvil Local";

// ── Contract ──────────────────────────────────────────────────────────────────
export const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";
export const TOKEN_ADDRESS =
  process.env.NEXT_PUBLIC_TOKEN_ADDRESS ?? "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

// ── Block explorer ────────────────────────────────────────────────────────────
export const EXPLORER_URL =
  process.env.NEXT_PUBLIC_EXPLORER_URL ?? "";

// ── Mock mode ─────────────────────────────────────────────────────────────────
// When true, the app uses mock catalogue, mock policies and mock ABI.
// Visible MOCK DATA banner is shown on every page.
export const MOCK_MODE =
  process.env.NEXT_PUBLIC_MOCK_MODE !== "false";

// ── AI service ────────────────────────────────────────────────────────────────
export const AI_API_URL =
  process.env.NEXT_PUBLIC_AI_API_URL ?? "http://localhost:8000";

// ── Admin ─────────────────────────────────────────────────────────────────────
export const ADMIN_ADDRESS =
  (process.env.NEXT_PUBLIC_ADMIN_ADDRESS ?? "").toLowerCase();

// ── RTT token ─────────────────────────────────────────────────────────────────
// RTT uses 18 decimals (same as ETH).
export const RTT_DECIMALS = 18;
export const RTT_SYMBOL = "RTT";

// ── Supported crops ───────────────────────────────────────────────────────────
// Must match the list in the FastAPI service schemas.py.
// Member 2 must confirm the final list.
export const SUPPORTED_CROPS = [
  "groundnut",
  "rice",
  "wheat",
  "maize",
  "cotton",
  "sorghum",
  "soybean",
  "sunflower",
] as const;
export type SupportedCrop = (typeof SUPPORTED_CROPS)[number];

// ── Navigation routes ─────────────────────────────────────────────────────────
export const ROUTES = {
  DASHBOARD: "/",
  PROFILE: "/profile",
  CATALOGUE: "/catalogue",
  ENROLL: "/enroll",
  POLICY: (id: number | string) => `/policies/${id}`,
  HISTORY: "/history",
  ADMIN: "/admin",
} as const;
