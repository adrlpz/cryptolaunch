"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

interface WalletContextType {
  address: string | null;
  chainId: number | null;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType>({
  address: null,
  chainId: null,
  isConnecting: false,
  connect: async () => {},
  disconnect: () => {},
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Restore from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("walletAddress");
    if (saved && window.ethereum) {
      (window.ethereum.request({ method: "eth_accounts" }) as Promise<string[]>)
        .then((accounts) => {
          if (accounts.length > 0 && accounts[0].toLowerCase() === saved.toLowerCase()) {
            setAddress(accounts[0]);
            (window.ethereum!.request({ method: "eth_chainId" }) as Promise<string>)
              .then((id) => setChainId(parseInt(id, 16)));
          } else {
            localStorage.removeItem("walletAddress");
          }
        })
        .catch(() => localStorage.removeItem("walletAddress"));
    }
  }, []);

  // Listen for account/chain changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      if (accounts.length > 0) {
        setAddress(accounts[0]);
        localStorage.setItem("walletAddress", accounts[0]);
      } else {
        setAddress(null);
        localStorage.removeItem("walletAddress");
      }
    };

    const handleChainChanged = (...args: unknown[]) => {
      const id = args[0] as string;
      setChainId(parseInt(id, 16));
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum?.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask");
      return;
    }
    try {
      setIsConnecting(true);
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      }) as string[];
      if (accounts.length > 0) {
        setAddress(accounts[0]);
        localStorage.setItem("walletAddress", accounts[0]);
        const id = await window.ethereum.request({ method: "eth_chainId" }) as string;
        setChainId(parseInt(id, 16));
      }
    } catch (err) {
      console.error("Wallet connect failed:", err);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setChainId(null);
    localStorage.removeItem("walletAddress");
  }, []);

  return (
    <WalletContext.Provider value={{ address, chainId, isConnecting, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
