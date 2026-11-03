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

// ── Helpers ──────────────────────────────────────────────────────────────────
function detectMetaMask(): boolean {
  if (typeof window === "undefined") return false;
  return (
    typeof window.ethereum !== "undefined" &&
    (window.ethereum.isMetaMask === true ||
      // Some wallets inject as an array
      (Array.isArray(window.ethereum.providers) &&
        window.ethereum.providers.some((p: { isMetaMask?: boolean }) => p.isMetaMask)))
  );
}

function chainIdToHex(id: number): string {
  return "0x" + id.toString(16);
}

async function fetchRttBalance(
  address: string,
  provider: BrowserProvider,
): Promise<string | null> {
  if (MOCK_MODE || !CONTRACT_ADDRESS) {
    // Mock mode with no address: return a mock balance for UI display
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
    return null;
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

  useEffect(() => {
    setIsMetaMaskInstalled(detectMetaMask());
  }, []);

  const isCorrectNetwork = chainId === CHAIN_ID;

  // ── Internal: load balance ───────────────────────────────────────────────
  const loadBalance = useCallback(async (addr: string) => {
    if (!isMetaMaskInstalled) return;
    setBalanceLoading(true);
    try {
      const provider = new BrowserProvider(window.ethereum);
      const balance = await fetchRttBalance(addr, provider);
      setRttBalance(balance);
    } catch {
      setRttBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  }, [isMetaMaskInstalled]);

  // ── Internal: apply account state ───────────────────────────────────────
  const applyAccount = useCallback(
    async (addr: string, currentChainId: number) => {
      setAddress(addr);
      setChainId(currentChainId);
      if (currentChainId !== CHAIN_ID) {
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
    if (!isMetaMaskInstalled) {
      setStatus("no_metamask");
      return;
    }
    setStatus("connecting");
    setError(null);
    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];
      const chainHex = (await window.ethereum.request({
        method: "eth_chainId",
      })) as string;
      const detectedChainId = parseInt(chainHex, 16);
      if (accounts.length === 0) {
        setStatus("disconnected");
        setError("No accounts returned by MetaMask.");
        return;
      }
      await applyAccount(accounts[0], detectedChainId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection failed.";
      // User rejected
      if (typeof err === "object" && err !== null && "code" in err && (err as { code: number }).code === 4001) {
        setStatus("disconnected");
        setError(null); // Neutral – user cancelled
      } else {
        setStatus("disconnected");
        setError(msg);
      }
    }
  }, [isMetaMaskInstalled, applyAccount]);

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
    if (!isMetaMaskInstalled) return;
    setError(null);
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainIdToHex(CHAIN_ID) }],
      });
    } catch (err: unknown) {
      // Error code 4902 = chain not added yet
      if (typeof err === "object" && err !== null && "code" in err && (err as { code: number }).code === 4902) {
        try {
          await window.ethereum.request({
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
          const msg = addErr instanceof Error ? addErr.message : "Failed to add network.";
          setError(msg);
        }
      } else if (typeof err === "object" && err !== null && "code" in err && (err as { code: number }).code !== 4001) {
        const msg = err instanceof Error ? (err as Error).message : "Failed to switch network.";
        setError(msg);
      }
    }
  }, [isMetaMaskInstalled]);

  // ── Refresh balance ──────────────────────────────────────────────────────
  const refreshBalance = useCallback(async () => {
    if (address) await loadBalance(address);
  }, [address, loadBalance]);

  // ── MetaMask event listeners (M3-W03) ───────────────────────────────────
  useEffect(() => {
    if (!isMetaMaskInstalled) {
      setStatus("no_metamask");
      return;
    }

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        const chainHex = (await window.ethereum.request({
          method: "eth_chainId",
        })) as string;
        await applyAccount(accounts[0], parseInt(chainHex, 16));
      }
    };

    const handleChainChanged = async (chainHex: string) => {
      const newChainId = parseInt(chainHex, 16);
      setChainId(newChainId);
      if (address) {
        await applyAccount(address, newChainId);
      }
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    // Auto-connect if MetaMask already has a permitted account (no popup)
    (window.ethereum.request({ method: "eth_accounts" }) as Promise<string[]>)
      .then(async (accounts) => {
        if (accounts.length > 0) {
          const chainHex = (await window.ethereum.request({
            method: "eth_chainId",
          })) as string;
          await applyAccount(accounts[0], parseInt(chainHex, 16));
        }
      })
      .catch(() => {/* silent – MetaMask may block the call */});

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
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
