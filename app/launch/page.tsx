"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { FACTORY_ABI } from "@/lib/factory-abi";

const CHAINS = [
  { id: "sepolia", name: "Sepolia Testnet", icon: "🧪" },
  { id: "ethereum", name: "Ethereum", icon: "🔷" },
  { id: "arbitrum", name: "Arbitrum", icon: "🔵" },
  { id: "base", name: "Base", icon: "⬜" },
  { id: "bsc", name: "BNB Chain", icon: "🟡" },
];

interface PrecomputeResponse {
  launchId: string; salt: string; predictedAddress: string; suffix: string;
  attempts: number; elapsedMs: number; factoryAddress: string;
  deployParams: { salt: string; name: string; symbol: string; totalSupply: string; basePrice: string; slope: string; graduationCap: string; launchDate: string; };
}

export default function LaunchPage() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [form, setForm] = useState({
    tokenName: "", tokenSymbol: "", totalSupply: "1000000", decimals: 18,
    description: "", logoUrl: "", websiteUrl: "", twitterUrl: "", telegramUrl: "",
    targetChain: "sepolia", basePrice: "5e-6", graduationCap: "40",
    launchDate: "", maxLeverage: 50,
  });
  const [step, setStep] = useState<"form" | "precomputing" | "review" | "deploying" | "done">("form");
  const [precompute, setPrecompute] = useState<PrecomputeResponse | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const connectWallet = async () => {
    if (typeof window === "undefined" || !window.ethereum) { setError("Please install MetaMask"); return; }
    try { const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[]; setWalletAddress(accounts[0]); }
    catch (err) { console.error(err); }
  };

  const handlePrecompute = async () => {
    setError("");
    if (!walletAddress) { setError("Connect wallet first"); return; }
    setLoading(true); setStep("precomputing"); setProgress(0);
    const progressInterval = setInterval(() => setProgress((p) => Math.min(95, p + 5)), 500);
    try {
      const res = await fetch("/api/launch/precompute", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ walletAddress, ...form, socialLinks: { twitter: form.twitterUrl || undefined, telegram: form.telegramUrl || undefined } }) });
      const data = await res.json();
      clearInterval(progressInterval); setProgress(100);
      if (data.success) { setPrecompute(data.data); setStep("review"); }
      else { setError(data.error || "Precompute failed"); setStep("form"); }
    } catch { clearInterval(progressInterval); setError("Network error"); setStep("form"); }
    finally { setLoading(false); }
  };

  const handleDeploy = async () => {
    if (!precompute || !walletAddress) return;
    setError(""); setLoading(true); setStep("deploying");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum!);
      const signer = await provider.getSigner();
      const factory = new ethers.Contract(precompute.factoryAddress, FACTORY_ABI, signer);
      const tx = await factory.createLaunch(precompute.deployParams.name, precompute.deployParams.symbol, precompute.deployParams.totalSupply, precompute.deployParams.basePrice, precompute.deployParams.slope, precompute.deployParams.graduationCap, precompute.deployParams.salt, precompute.deployParams.launchDate);
      setTxHash(tx.hash);
      const receipt = await tx.wait();
      const confirmRes = await fetch(`/api/launch/${precompute.launchId}/confirm-deploy`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ txHash: receipt.hash, walletAddress }) });
      const confirmData = await confirmRes.json();
      if (confirmData.success) { setProjectId(confirmData.data?.projectId ?? null); setStep("done"); }
      else { setError(`Confirm failed: ${confirmData.error}`); setStep("review"); }
    } catch (err) { setError(err instanceof Error ? err.message : "Deploy failed"); setStep("review"); }
    finally { setLoading(false); }
  };

  const estimateSlope = () => {
    const cap = Number(form.graduationCap), supply = Number(form.totalSupply), bp = Number(form.basePrice);
    if (supply > 0 && cap > 0 && bp > 0) { const s = 2 * (cap - bp * supply) / (supply * supply); return s > 0 ? s.toExponential(4) : null; }
    return null;
  };

  const lbl = "mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted";
  const inp = "glass-input w-full px-4 py-2.5 text-sm font-medium outline-none focus:border-accent";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8">
        <p className="mb-1 font-mono text-xs uppercase tracking-wider text-muted">Create</p>
        <h1 className="text-3xl font-bold">Launch a Token</h1>
        <p className="mt-2 text-sm text-muted">Deploy your ERC-20 with bonding curve liquidity. Gas paid from your wallet.</p>
      </div>

      {!walletAddress ? (
        <div className="glass mb-6 p-6 text-center">
          <p className="mb-4 text-sm text-muted">Connect your wallet to begin.</p>
          <button onClick={connectWallet} className="glass bg-accent px-8 py-3 font-bold text-white">Connect Wallet</button>
        </div>
      ) : (
        <div className="mb-6 flex items-center gap-2 border-b-2 border-edge pb-4">
          <div className="h-2.5 w-2.5 rounded-full bg-profit" />
          <span className="font-mono text-sm">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
        </div>
      )}

      {error && <div className="glass mb-6 bg-loss/10 text-loss px-4 py-3 text-sm font-bold">{error}</div>}

      {step === "form" && (
        <div className="space-y-6">
          <section className="glass p-6">
            <h2 className="mb-4 text-base font-bold">Token Information</h2>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div><label className={lbl}>Token Name *</label><input type="text" value={form.tokenName} onChange={(e) => setForm({ ...form, tokenName: e.target.value })} className={inp} placeholder="MoonCoin" /></div>
                <div><label className={lbl}>Symbol *</label><input type="text" value={form.tokenSymbol} onChange={(e) => setForm({ ...form, tokenSymbol: e.target.value.toUpperCase() })} className={inp} placeholder="MOON" /></div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div><label className={lbl}>Total Supply *</label><input type="number" value={form.totalSupply} onChange={(e) => setForm({ ...form, totalSupply: e.target.value })} className={inp} /></div>
                <div><label className={lbl}>Chain *</label><select value={form.targetChain} onChange={(e) => setForm({ ...form, targetChain: e.target.value })} className={inp}>{CHAINS.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select></div>
              </div>
            </div>
          </section>

          <section className="glass p-6">
            <h2 className="mb-4 text-base font-bold">Bonding Curve</h2>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div><label className={lbl}>Graduation Cap (ETH) *</label>
                  <input type="text" value={form.graduationCap} onChange={(e) => {
                    const cap = e.target.value, supply = Number(form.totalSupply), capNum = Number(cap);
                    let bp = form.basePrice;
                    if (supply > 0 && capNum > 0) bp = (capNum / supply / 2).toExponential(4);
                    setForm({ ...form, graduationCap: cap, basePrice: bp });
                  }} className={inp} placeholder="10" />
                </div>
                <div><label className={lbl}>Base Price (ETH) <span className="normal-case tracking-normal text-muted">auto</span></label>
                  <input type="text" value={form.basePrice} readOnly className="glass-input w-full px-4 py-2.5 text-sm text-muted outline-none" />
                </div>
              </div>
              <div className="glass-input p-3">
                <div className="flex items-center justify-between text-xs"><span className="text-muted">Formula</span><span className="font-mono font-bold">slope = 2 × (cap − base×supply) / supply²</span></div>
                <div className="mt-1.5 flex items-center justify-between text-xs"><span className="text-muted">Slope</span><span className="font-mono font-bold text-accent">{estimateSlope() ?? "—"}</span></div>
                <div className="mt-1.5 flex items-center justify-between text-xs"><span className="text-muted">Graduation at</span><span className="font-mono font-bold text-profit">{form.graduationCap ? `${form.graduationCap} ETH` : "—"}</span></div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div><label className={lbl}>Launch Date * <span className="normal-case tracking-normal text-muted">{Intl.DateTimeFormat().resolvedOptions().timeZone}</span></label>
                  <input type="datetime-local" value={form.launchDate} onChange={(e) => setForm({ ...form, launchDate: e.target.value })} className={inp} />
                </div>
                <div><label className={lbl}>Max Leverage</label>
                  <select value={form.maxLeverage} onChange={(e) => setForm({ ...form, maxLeverage: Number(e.target.value) })} className={inp}>{[10, 20, 30, 40, 50].map((l) => <option key={l} value={l}>{l}%</option>)}</select>
                </div>
              </div>
            </div>
          </section>

          <section className="glass p-6">
            <h2 className="mb-4 text-base font-bold">Tokenomics</h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { pct: "80%", label: "Bonding Curve", color: "text-accent" },
                { pct: "15%", label: "You (locked 6mo)", color: "text-foreground" },
                { pct: "5%", label: "Platform", color: "text-profit" },
              ].map((t) => (
                <div key={t.label} className="glass-input p-4 text-center">
                  <div className={`text-2xl font-bold ${t.color}`}>{t.pct}</div>
                  <div className="mt-1 text-xs text-muted">{t.label}</div>
                </div>
              ))}
            </div>
          </section>

          <button onClick={handlePrecompute} disabled={loading || !walletAddress || !form.tokenName || !form.tokenSymbol}
            className="glass w-full bg-accent py-3.5 text-sm font-bold text-white disabled:opacity-50">
            Continue →
          </button>
        </div>
      )}

      {step === "precomputing" && (
        <div className="glass p-8 text-center">
          <h2 className="mb-2 text-xl font-bold">Preparing Your Token</h2>
          <p className="mb-6 text-sm text-muted">Generating vanity address ending in ...911</p>
          <div className="mx-auto max-w-md">
            <div className="mb-2 flex justify-between text-xs"><span className="text-muted">Progress</span><span className="font-mono font-bold text-accent">{progress}%</span></div>
            <div className="glass-input h-3 w-full overflow-hidden"><div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} /></div>
          </div>
        </div>
      )}

      {step === "review" && precompute && (
        <div className="space-y-4">
          <div className="glass-glow p-5 text-center">
            <div className="text-lg font-bold text-accent">Ready to Deploy</div>
            <p className="mt-1 text-sm text-muted">Review below, then sign the transaction.</p>
          </div>
          <div className="glass p-5">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">Summary</h2>
            {[["Name", form.tokenName], ["Symbol", form.tokenSymbol], ["Supply", Number(form.totalSupply).toLocaleString()], ["Base Price", `${form.basePrice} ETH`], ["Grad Cap", `${form.graduationCap} ETH`], ["Salt", `${precompute.salt.slice(0, 10)}...`]].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between border-b border-edge/30 py-2.5 last:border-0">
                <span className="text-sm text-muted">{label}</span>
                <span className="font-mono text-sm font-bold">{value}</span>
              </div>
            ))}
          </div>
          <div className="glass border-accent bg-accent-subtle p-4 text-sm font-bold text-accent">Gas paid from your wallet. Ensure ~0.01 ETH on Sepolia.</div>
          <div className="flex gap-3">
            <button onClick={() => setStep("form")} className="glass flex-1 py-3 text-sm font-bold text-muted">Back</button>
            <button onClick={handleDeploy} disabled={loading} className="glass flex-1 bg-accent py-3 text-sm font-bold text-white disabled:opacity-50">
              {loading ? "Signing..." : "Sign & Deploy"}
            </button>
          </div>
        </div>
      )}

      {step === "deploying" && (
        <div className="glass p-8 text-center">
          <h2 className="mb-2 text-xl font-bold">Deploying Token</h2>
          <p className="text-sm text-muted">Sign in your wallet, then wait for confirmation...</p>
          {txHash && <p className="mt-4 font-mono text-xs text-muted">TX: {txHash.slice(0, 10)}...{txHash.slice(-8)}</p>}
        </div>
      )}

      {step === "done" && (
        <div className="glass p-8 text-center">
          <h2 className="mb-2 text-xl font-bold text-profit">Token Deployed</h2>
          <p className="mb-6 text-sm text-muted">Live on-chain with bonding curve liquidity.</p>
          <a href={`/projects/${projectId}`} className="glass inline-block bg-accent px-6 py-2.5 text-sm font-bold text-white">View Project →</a>
        </div>
      )}
    </div>
  );
}
