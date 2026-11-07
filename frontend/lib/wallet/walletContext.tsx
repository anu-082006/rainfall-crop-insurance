"use client";

/**
 * walletContext.tsx
 * React context that manages MetaMask wallet state for the entire app.
 *
 * Covers:
 *   M3-W01 – Connect/disconnect; address, chain name, RTT balance
 *   M3-W02 – Wrong network detection
 *   M3-W03 – Account and chain change events without page reload
 *   M3-W04 – MetaMask not installed detection
 *   M3-W05 – Chain ID from env config
 *
 * RTT balance is read via the ERC-20 balanceOf() call.
 * The contract address comes from env; if absent in mock mode we skip the call.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { BrowserProvider, Contract, formatUnits } from "ethers";
import { CHAIN_ID, CHAIN_NAME, CONTRACT_ADDRESS, MOCK_MODE, RTT_DECIMALS, TOKEN_ADDRESS } from "@/lib/utils/constants";

// ── Minimal ERC-20 ABI for balanceOf ────────────────────────────────────────
const ERC20_BALANCE_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
];

// ── Types ────────────────────────────────────────────────────────────────────
export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "wrong_network"
  | "no_metamask";

export interface WalletState {
  /** Current connection status */
  status: ConnectionStatus;
  /** Connected wallet address (checksummed) or null */
  address: string | null;
  /** Chain ID currently in MetaMask */
  chainId: number | null;
  /** Human-readable chain name */
  chainName: string | null;
  /** RTT token balance as a formatted decimal string, or null if not loaded */
  rttBalance: string | null;
  /** True if a balance fetch is in progress */
  balanceLoading: boolean;
  /** Error message from the last failed operation */
  error: string | null;
  /** Whether MetaMask is installed in the browser */
  isMetaMaskInstalled: boolean;
  /** Whether the connected chain matches the required chain */
  isCorrectNetwork: boolean;
  /** Connect MetaMask */
  connect: () => Promise<void>;
  /** Disconnect (clears local state; MetaMask does not expose a true disconnect) */
  disconnect: () => void;
  /** Re-fetch RTT balance */
  refreshBalance: () => Promise<void>;
  /** Ask MetaMask to switch to the required network */
  switchNetwork: () => Promise<void>;
}

// ── Context ──────────────────────────────────────────────────────────────────
const WalletContext = createContext<WalletState | null>(null);

// ── Types ────────────────────────────────────────────────────────────────────
interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>;
  on?: (event: string, listener: (arg: unknown) => void) => void;
  removeListener?: (event: string, listener: (arg: unknown) => void) => void;
  isMetaMask?: boolean;
  providers?: Eip1193Provider[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function getInjectedProvider(): Eip1193Provider | null {
  if (typeof window === "undefined") return null;
  const anyWindow = window as unknown as { ethereum?: Eip1193Provider };
  if (!anyWindow.ethereum) return null;

  // Handle multiple wallet extensions (e.g. MetaMask + Coinbase / Phantom / Rabby)
  if (Array.isArray(anyWindow.ethereum.providers)) {
    const metaMask = anyWindow.ethereum.providers.find(
      (p) => p.isMetaMask
    );
    return metaMask || anyWindow.ethereum.providers[0];
  }

  return anyWindow.ethereum;
}

function detectMetaMask(): boolean {
  return !!getInjectedProvider();
}

function chainIdToHex(id: number): string {
  return "0x" + id.toString(16);
}

async function fetchRttBalance(
  address: string,
  provider: BrowserProvider,
): Promise<string | null> {
  if (MOCK_MODE || !CONTRACT_ADDRESS) {
    // Mock mode with no address: return simulated test balance for UI display
    return "1000.0";
  }
  try {
    // Resolve RTT token address dynamically from CropInsurance or fallback to TOKEN_ADDRESS
    let targetToken = TOKEN_ADDRESS;
    try {
      const insurance = new Contract(
        CONTRACT_ADDRESS,
        ["function payoutToken() view returns (address)"],
        provider,
      );
      const onChainToken = await insurance.payoutToken();
      if (onChainToken && onChainToken !== "0x0000000000000000000000000000000000000000") {
        targetToken = onChainToken;
      }
    } catch {
      // Fallback to verified TOKEN_ADDRESS
    }

    const contract = new Contract(targetToken, ERC20_BALANCE_ABI, provider);
    const raw: bigint = await contract.balanceOf(address);
    return formatUnits(raw, RTT_DECIMALS);
  } catch {
    return MOCK_MODE ? "1000.0" : null;
  }
}

function resolveChainName(id: number): string {
  if (id === CHAIN_ID) return CHAIN_NAME;
  const known: Record<number, string> = {
    1: "Ethereum Mainnet",
    5: "Goerli Testnet",
    11155111: "Sepolia Testnet",
    137: "Polygon Mainnet",
    80001: "Mumbai Testnet",
    31337: "Anvil Local",
  };
  return known[id] ?? `Chain ${id}`;
}

// ── Provider ─────────────────────────────────────────────────────────────────
export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [rttBalance, setRttBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState<boolean>(false);

  // Initialize and listen for asynchronous extension injection
  useEffect(() => {
    const check = () => {
      const detected = detectMetaMask();
      setIsMetaMaskInstalled(detected);
      return detected;
    };

    if (check()) return;

    const onInit = () => check();
    if (typeof window !== "undefined") {
      window.addEventListener("ethereum#initialized", onInit, { once: true });
      const t1 = setTimeout(check, 150);
      const t2 = setTimeout(check, 500);
      const t3 = setTimeout(check, 1200);

      return () => {
        window.removeEventListener("ethereum#initialized", onInit);
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, []);

  const isCorrectNetwork = MOCK_MODE ? true : chainId === CHAIN_ID;

  // ── Internal: load balance ───────────────────────────────────────────────
  const loadBalance = useCallback(async (addr: string) => {
    const providerObj = getInjectedProvider();
    if (!providerObj) {
      if (MOCK_MODE) setRttBalance("1000.0");
      return;
    }
    setBalanceLoading(true);
    try {
      if (MOCK_MODE || !CONTRACT_ADDRESS) {
        setRttBalance("1000.0");
        return;
      }
      const provider = new BrowserProvider(providerObj);
      const balance = await fetchRttBalance(addr, provider);
      setRttBalance(balance ?? (MOCK_MODE ? "1000.0" : null));
    } catch {
      setRttBalance(MOCK_MODE ? "1000.0" : null);
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  // ── Internal: apply account state ───────────────────────────────────────
  const applyAccount = useCallback(
    async (addr: string, currentChainId: number) => {
      setAddress(addr);
      setChainId(currentChainId);
      if (!MOCK_MODE && currentChainId !== CHAIN_ID) {
        setStatus("wrong_network");
      } else {
        setStatus("connected");
        await loadBalance(addr);
      }
    },
    [loadBalance],
  );

  // ── Connect ──────────────────────────────────────────────────────────────
  const connect = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      setStatus("no_metamask");
      setError("MetaMask extension not detected. Please install or unlock MetaMask.");
      return;
    }

    setStatus("connecting");
    setError(null);

    try {
      // Direct call on window.ethereum triggers the MetaMask popup window directly
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];

      const chainHex = (await window.ethereum.request({
        method: "eth_chainId",
      })) as string;

      const detectedChainId = parseInt(chainHex, 16);

      if (!accounts || accounts.length === 0) {
        setStatus("disconnected");
        setError("No accounts selected in MetaMask.");
        return;
      }

      await applyAccount(accounts[0], detectedChainId);
    } catch (err: unknown) {
      const anyErr = err as { code?: number; message?: string };
      // User cancelled
      if (anyErr?.code === 4001) {
        setStatus("disconnected");
        setError(null);
        return;
      }
      // Request already pending in MetaMask popup
      if (anyErr?.code === -32002) {
        setStatus("disconnected");
        setError("Approval request already pending in MetaMask. Please click your browser's MetaMask extension icon to approve.");
        return;
      }
      const msg = err instanceof Error ? err.message : anyErr?.message ?? "Wallet connection failed.";
      setStatus("disconnected");
      setError(msg);
    }
  }, [applyAccount]);

  // ── Disconnect ───────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    setAddress(null);
    setChainId(null);
    setRttBalance(null);
    setStatus("disconnected");
    setError(null);
  }, []);

  // ── Switch network ───────────────────────────────────────────────────────
  const switchNetwork = useCallback(async () => {
    const provider = getInjectedProvider();
    if (!provider) return;
    setError(null);
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainIdToHex(CHAIN_ID) }],
      });
    } catch (err: unknown) {
      const anyErr = err as { code?: number; message?: string };
      // Error code 4902 = chain not added yet
      if (anyErr?.code === 4902) {
        try {
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: chainIdToHex(CHAIN_ID),
                chainName: CHAIN_NAME,
                rpcUrls: [process.env.NEXT_PUBLIC_RPC_URL ?? "http://127.0.0.1:8545"],
                nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
              },
            ],
          });
        } catch (addErr: unknown) {
          const msg = addErr instanceof Error ? addErr.message : "Failed to add network. (Ensure local node is running if using Anvil).";
          setError(msg);
        }
      } else if (anyErr?.code !== 4001) {
        const msg = err instanceof Error ? (err as Error).message : "Failed to switch network.";
        setError(msg);
      }
    }
  }, []);

  // ── Refresh balance ──────────────────────────────────────────────────────
  const refreshBalance = useCallback(async () => {
    if (address) await loadBalance(address);
  }, [address, loadBalance]);

  // ── MetaMask event listeners (M3-W03) ───────────────────────────────────
  useEffect(() => {
    const provider = getInjectedProvider();
    if (!provider || typeof provider.on !== "function") {
      return;
    }

    const handleAccountsChanged = async (accountsRaw: unknown) => {
      const accounts = accountsRaw as string[];
      if (!accounts || accounts.length === 0) {
        disconnect();
      } else {
        try {
          const chainHex = (await provider.request({
            method: "eth_chainId",
          })) as string;
          await applyAccount(accounts[0], parseInt(chainHex, 16));
        } catch {
          await applyAccount(accounts[0], CHAIN_ID);
        }
      }
    };

    const handleChainChanged = async (chainHexRaw: unknown) => {
      const chainHex = chainHexRaw as string;
      const newChainId = parseInt(chainHex, 16);
      setChainId(newChainId);
      if (address) {
        await applyAccount(address, newChainId);
      }
    };

    provider.on("accountsChanged", handleAccountsChanged);
    provider.on("chainChanged", handleChainChanged);

    // Auto-connect if MetaMask already has a permitted account (no popup)
    if (typeof provider.request === "function") {
      (provider.request({ method: "eth_accounts" }) as Promise<string[]>)
        .then(async (accounts) => {
          if (accounts && accounts.length > 0) {
            const chainHex = (await provider.request({
              method: "eth_chainId",
            })) as string;
            await applyAccount(accounts[0], parseInt(chainHex, 16));
          }
        })
        .catch(() => {/* silent */});
    }

    return () => {
      if (typeof provider.removeListener === "function") {
        provider.removeListener("accountsChanged", handleAccountsChanged);
        provider.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, [isMetaMaskInstalled, address, applyAccount, disconnect]);

  const chainName = chainId !== null ? resolveChainName(chainId) : null;

  const value: WalletState = useMemo(
    () => ({
      status,
      address,
      chainId,
      chainName,
      rttBalance,
      balanceLoading,
      error,
      isMetaMaskInstalled,
      isCorrectNetwork,
      connect,
      disconnect,
      refreshBalance,
      switchNetwork,
    }),
    [
      status,
      address,
      chainId,
      chainName,
      rttBalance,
      balanceLoading,
      error,
      isMetaMaskInstalled,
      isCorrectNetwork,
      connect,
      disconnect,
      refreshBalance,
      switchNetwork,
    ],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet must be used inside <WalletProvider>");
  }
  return ctx;
}

// ── Window type augmentation ──────────────────────────────────────────────────
// Typed narrowly so event handlers match the MetaMask spec.
export type EthereumEventMap = {
  accountsChanged: (accounts: string[]) => void;
  chainChanged: (chainId: string) => void;
};

declare global {
  interface Window {
    ethereum: {
      isMetaMask?: boolean;
      providers?: Array<{ isMetaMask?: boolean }>;
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on<K extends keyof EthereumEventMap>(event: K, handler: EthereumEventMap[K]): void;
      removeListener<K extends keyof EthereumEventMap>(event: K, handler: EthereumEventMap[K]): void;
    };
  }
}
