"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { FACTORY_ABI } from "@/lib/factory-abi";

const CHAINS = [
  { id: "ethereum", name: "Ethereum", icon: "🔷" },
  { id: "arbitrum", name: "Arbitrum", icon: "🔵" },
  { id: "base", name: "Base", icon: "⬜" },
  { id: "bsc", name: "BNB Chain", icon: "🟡" },
];

const SUFFIX = "911";

interface PrecomputeResponse {
  launchId: string;
  salt: string;
  predictedAddress: string;
  suffix: string;
  attempts: number;
  elapsedMs: number;
  factoryAddress: string;
  deployParams: {
    salt: string;
    name: string;
    symbol: string;
    totalSupply: string;
    basePrice: string;
    slope: string;
    graduationCap: string;
    launchDate: string;
  };
}

export default function LaunchPage() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [form, setForm] = useState({
    tokenName: "",
    tokenSymbol: "",
    totalSupply: "1000000",
    decimals: 18,
    description: "",
    logoUrl: "",
    websiteUrl: "",
    twitterUrl: "",
    telegramUrl: "",
    targetChain: "ethereum",
    basePrice: "0.0001",
    graduationCap: "40",
    launchDate: "",
    maxLeverage: 50,
  });
  const [step, setStep] = useState<
    "form" | "precomputing" | "review" | "deploying" | "done"
  >("form");
  const [precompute, setPrecompute] = useState<PrecomputeResponse | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const connectWallet = async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      setError("Please install MetaMask");
      return;
    }
    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];
      setWalletAddress(accounts[0]);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrecompute = async () => {
    setError("");
    if (!walletAddress) {
      setError("Connect wallet first");
      return;
    }
    setLoading(true);
    setStep("precomputing");
    setProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(95, p + 5));
    }, 500);

    try {
      const res = await fetch("/api/launch/precompute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress,
          ...form,
          socialLinks: {
            twitter: form.twitterUrl || undefined,
            telegram: form.telegramUrl || undefined,
          },
        }),
      });

      const data = await res.json();
      clearInterval(progressInterval);
      setProgress(100);

      if (data.success) {
        setPrecompute(data.data);
        setStep("review");
      } else {
        setError(data.error || "Precompute failed");
        setStep("form");
      }
    } catch (err) {
      clearInterval(progressInterval);
      setError("Network error");
      setStep("form");
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async () => {
    if (!precompute || !walletAddress) return;
    setError("");
    setLoading(true);
    setStep("deploying");

    try {
      const provider = new ethers.BrowserProvider(window.ethereum!);
      const signer = await provider.getSigner();

      const factory = new ethers.Contract(
        precompute.factoryAddress,
        FACTORY_ABI,
        signer
      );

      const tx = await factory.createLaunch(
        precompute.deployParams.name,
        precompute.deployParams.symbol,
        precompute.deployParams.totalSupply,
        precompute.deployParams.basePrice,
        precompute.deployParams.slope,
        precompute.deployParams.graduationCap,
        precompute.deployParams.salt,
        precompute.deployParams.launchDate
      );

      console.log("Deploy tx:", tx.hash);
      setTxHash(tx.hash);

      const receipt = await tx.wait();
      console.log("Deploy confirmed:", receipt);

      // Confirm with backend
      const confirmRes = await fetch(
        `/api/launch/${precompute.launchId}/confirm-deploy`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            txHash: receipt.hash,
            walletAddress,
          }),
        }
      );

      const confirmData = await confirmRes.json();
      if (confirmData.success) {
        setStep("done");
      } else {
        setError(`Confirm failed: ${confirmData.error}`);
        setStep("review");
      }
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Deploy failed";
      setError(msg);
      setStep("review");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Launch a Token</h1>
        <p className="text-zinc-400">
          Deploy your ERC-20 with bonding curve. Contract address ends in{" "}
          <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-sm text-purple-400">
            ...{SUFFIX}
          </code>
          . You pay gas directly from your wallet.
        </p>
      </div>

      {/* Wallet Connection */}
      {!walletAddress ? (
        <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-center">
          <p className="mb-4 text-zinc-400">Connect your wallet to launch a token.</p>
          <button
            onClick={connectWallet}
            className="rounded-full bg-gradient-to-r from-purple-500 to-blue-600 px-8 py-3 font-medium text-white transition-opacity hover:opacity-90"
          >
            Connect Wallet
          </button>
        </div>
      ) : (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span className="font-mono text-sm text-zinc-300">
            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </span>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* STEP 1: Form */}
      {step === "form" && (
        <div className="space-y-6">
          {/* Token Info */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="mb-4 text-lg font-bold">Token Information</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm text-zinc-400">Token Name *</label>
                <input
                  type="text"
                  value={form.tokenName}
                  onChange={(e) => setForm({ ...form, tokenName: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white outline-none focus:border-purple-500"
                  placeholder="MoonCoin"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-zinc-400">Symbol *</label>
                <input
                  type="text"
                  value={form.tokenSymbol}
                  onChange={(e) => setForm({ ...form, tokenSymbol: e.target.value.toUpperCase() })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white outline-none focus:border-purple-500"
                  placeholder="MOON"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-zinc-400">Total Supply *</label>
                <input
                  type="number"
                  value={form.totalSupply}
                  onChange={(e) => setForm({ ...form, totalSupply: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-zinc-400">Chain *</label>
                <select
                  value={form.targetChain}
                  onChange={(e) => setForm({ ...form, targetChain: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white outline-none focus:border-purple-500"
                >
                  {CHAINS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Bonding Curve */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="mb-4 text-lg font-bold">Bonding Curve</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm text-zinc-400">Base Price (ETH) *</label>
                <input
                  type="text"
                  value={form.basePrice}
                  onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-zinc-400">Graduation Cap (ETH) *</label>
                <input
                  type="text"
                  value={form.graduationCap}
                  onChange={(e) => setForm({ ...form, graduationCap: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-zinc-400">Launch Date *</label>
                <input
                  type="datetime-local"
                  value={form.launchDate}
                  onChange={(e) => setForm({ ...form, launchDate: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-zinc-400">Max Leverage</label>
                <select
                  value={form.maxLeverage}
                  onChange={(e) => setForm({ ...form, maxLeverage: Number(e.target.value) })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white outline-none focus:border-purple-500"
                >
                  {[10, 20, 30, 40, 50].map((l) => (
                    <option key={l} value={l}>
                      {l}%
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Tokenomics */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="mb-4 text-lg font-bold">Tokenomics</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-4">
                <div className="text-2xl font-bold text-purple-400">80%</div>
                <div className="text-sm text-zinc-400">Bonding Curve</div>
              </div>
              <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
                <div className="text-2xl font-bold text-blue-400">15%</div>
                <div className="text-sm text-zinc-400">You (locked 6mo)</div>
              </div>
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
                <div className="text-2xl font-bold text-green-400">5%</div>
                <div className="text-sm text-zinc-400">Platform</div>
              </div>
            </div>
          </div>

          <button
            onClick={handlePrecompute}
            disabled={loading || !walletAddress || !form.tokenName || !form.tokenSymbol}
            className="w-full rounded-lg bg-gradient-to-r from-purple-500 to-blue-600 py-3 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Generating Vanity Address..." : "Continue →"}
          </button>
        </div>
      )}

      {/* STEP 2: Precomputing */}
      {step === "precomputing" && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
          <div className="mb-4 text-4xl">⛏️</div>
          <h2 className="mb-2 text-xl font-bold">Finding Vanity Salt</h2>
          <p className="mb-4 text-zinc-400">
            Brute-forcing salt values via on-chain precompute...
          </p>
          <div className="mx-auto max-w-md">
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-zinc-500">Progress</span>
              <span className="text-purple-400">{progress}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Review & Sign */}
      {step === "review" && precompute && (
        <div className="space-y-6">
          <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-6">
            <div className="mb-3 text-sm text-zinc-500">
              Your token will be deployed at:
            </div>
            <div className="break-all font-mono text-lg text-green-400">
              {precompute.predictedAddress}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs ${
                  precompute.predictedAddress
                    .toLowerCase()
                    .endsWith(precompute.suffix)
                    ? "bg-green-500/20 text-green-400"
                    : "bg-red-500/20 text-red-400"
                }`}
              >
                {precompute.predictedAddress
                  .toLowerCase()
                  .endsWith(precompute.suffix)
                  ? `✅ ends with ...${precompute.suffix}`
                  : "❌ no suffix match"}
              </span>
              <span className="text-xs text-zinc-500">
                Found in {precompute.attempts} attempts
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="mb-4 text-lg font-bold">Token Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Name</span>
                <span>{form.tokenName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Symbol</span>
                <span>{form.tokenSymbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Total Supply</span>
                <span>{Number(form.totalSupply).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Base Price</span>
                <span>{form.basePrice} ETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Graduation Cap</span>
                <span>{form.graduationCap} ETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Salt</span>
                <span className="font-mono text-xs">
                  {precompute.salt.slice(0, 10)}...
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 text-sm text-yellow-400">
            ⚠️ You will pay gas directly from your wallet. Make sure you have
            enough ETH for the deploy transaction (~0.01 ETH on Sepolia).
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep("form")}
              className="flex-1 rounded-lg border border-zinc-700 py-3 text-zinc-300"
            >
              Back
            </button>
            <button
              onClick={handleDeploy}
              disabled={loading}
              className="flex-1 rounded-lg bg-gradient-to-r from-purple-500 to-blue-600 py-3 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Signing..." : "Sign & Deploy"}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Deploying */}
      {step === "deploying" && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
          <div className="mb-4 text-4xl">🚀</div>
          <h2 className="mb-2 text-xl font-bold">Deploying Token</h2>
          <p className="text-zinc-400">
            Sign the transaction in your wallet. Wait for confirmation...
          </p>
          {txHash && (
            <div className="mt-4 text-xs text-zinc-500">
              TX: {txHash.slice(0, 10)}...{txHash.slice(-8)}
            </div>
          )}
        </div>
      )}

      {/* STEP 5: Done */}
      {step === "done" && precompute && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-8 text-center">
          <div className="mb-4 text-4xl">🎉</div>
          <h2 className="mb-2 text-xl font-bold">Token Deployed!</h2>
          <div className="mb-4 break-all font-mono text-sm text-green-400">
            {precompute.predictedAddress}
          </div>
          <a
            href={`/projects/${precompute.launchId}`}
            className="inline-block rounded-lg bg-gradient-to-r from-purple-500 to-blue-600 px-6 py-2 text-sm font-medium text-white"
          >
            View Project →
          </a>
        </div>
      )}
    </div>
  );
}
