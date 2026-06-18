# Product Requirements Document (PRD)
# CryptoLaunch — Margin Launchpad

**Version:** 2.0  
**Date:** 15 Juni 2026  
**Status:** Draft

---

## Daftar Isi

1. [Overview](#1-overview)
2. [Fitur Utama](#2-fitur-utama)
   - 2.1 Margin Lending
   - 2.2 Biaya Hutang (Fee)
   - 2.3 Likuidasi Otomatis
   - 2.4 Token Launch oleh End User
   - 2.5 Bonding Curve (pump.fun style)
3. [User Flow](#3-user-flow)
4. [Data Model](#4-data-model)
5. [API Endpoints](#5-api-endpoints)
6. [Komponen UI](#6-komponen-ui)
7. [Perhitungan Keuangan](#7-perhitungan-keuangan)
8. [Keputusan Desain](#8-keputusan-desain)
9. [Tech Stack](#9-tech-stack)
10. [Security Considerations](#10-security-considerations)
11. [Milestones](#11-milestones)

---

## 1. Overview

| Field | Detail |
|---|---|
| **Nama Produk** | CryptoLaunch Margin Launchpad |
| **Tipe** | Web Application (Hybrid: logic off-chain, settlement on-chain) |
| **Target User** | Retail crypto investor & token creator |
| **Revenue Model** | Biaya hutang 5% (margin) + Fee launch token + Bonding curve trading fee |
| **Core Features** | 1) Margin lending, 2) Token launch dengan vanity address `...911`, 3) Bonding curve LP (pump.fun style) |
| **Supported Chains** | Multi-chain: BNB Chain, Ethereum, Arbitrum, Base |

---

## 2. Fitur Utama

### 2.1 Margin Lending

Pengguna dapat meminjam dana berdasarkan persentase dari saldo/modal mereka.

| Level Leverage | % dari Modal | Hutang (Modal $100) | Total Posisi |
|---|---|---|---|
| Lev 10% | 10% | $10 | $110 |
| Lev 20% | 20% | $20 | $120 |
| Lev 30% | 30% | $30 | $130 |
| Lev 40% | 40% | $40 | $140 |
| **Lev 50% (max)** | **50%** | **$50** | **$150** |

**Rumus dasar:**
```
hutang        = modal × lev_percent
total_posisi  = modal + hutang
fee_hutang    = hutang × 5%
```

### 2.2 Biaya Hutang (Fee)

- **Tarif:** 5% dari total hutang
- **Kapan dikenakan:** Di depan (saat posisi dibuka)
- **Cara potong:** Fee dipotong dari modal pengguna

**Contoh perhitungan (Lev 50%, Modal $100):**
```
hutang               = $100 × 50%      = $50
fee                  = $50 × 5%        = $2.50
modal_setelah_fee    = $100 - $2.50    = $97.50
dana_beli_koin       = $97.50 + $50    = $147.50
jumlah_koin          = $147.50 / $1    = 147.5 koin (harga $1/koin)
```

### 2.3 Likuidasi Otomatis

Likuidasi terjadi ketika ekuitas pengguna tidak cukup untuk menutup pokok hutang.

#### Rumus Likuidasi

```
jumlah_koin  = dana_beli_koin / harga_beli_per_koin
ekuitas      = jumlah_koin × harga_sekarang - hutang
likuidasi    = TRUE jika ekuitas ≤ safety_margin
```

#### Tabel Likuidasi per Level (Modal $100, Fee di Depan)

| Lev | Hutang | Fee 5% | Dana Beli | Koin (harga $1) | Harga Likuidasi* | Drop % |
|---|---|---|---|---|---|---|
| 10% | $10 | $0.50 | $109.50 | 109.50 | $0.0913 | 90.87% |
| 20% | $20 | $1.00 | $119.00 | 119.00 | $0.1681 | 83.19% |
| 30% | $30 | $1.50 | $128.50 | 128.50 | $0.2335 | 76.65% |
| 40% | $40 | $2.00 | $138.00 | 138.00 | $0.2899 | 71.01% |
| **50%** | **$50** | **$2.50** | **$147.50** | **147.50** | **$0.3390** | **66.10%** |

> \* Harga likuidasi dengan safety margin 0% (ekuitas = 0).

#### Tabel Likuidasi dengan Safety Margin 5%

| Lev | Harga Likuidasi | Drop % |
|---|---|---|
| 10% | $0.1411 | 85.89% |
| 20% | $0.2202 | 77.98% |
| 30% | $0.2884 | 71.16% |
| 40% | $0.3478 | 65.22% |
| **50%** | **$0.3990** | **60.10%** |

**Rumus dengan safety margin:**
```
safety_margin   = 5% × dana_beli_koin
harga_likuidasi = (hutang + safety_margin) / jumlah_koin
```

### 2.4 Token Launch oleh End User

End user (siapa saja) bisa launch token mereka sendiri di platform ini **tanpa approval admin**.

Setiap token otomatis masuk ke **bonding curve** sebagai liquidity pool.

#### Konsep Vanity Address `911`

Setiap token yang di-launch harus memiliki **contract address yang berakhiran `911`**.

```
Contoh contract address:
  0x7a3B9c2D4e5F6a7B8c9D0e1F2a3B4c5D6e7F8a9Bc  ← tidak valid
  0x1234567890abcdef1234567890abcdef12345678911  ← VALID ✓
```

**Cara kerja:**
1. Sistem brute-force generate **deployer wallet** hingga menemukan address yang menghasilkan contract address berakhiran `911` (menggunakan CREATE opcode)
2. Estimasi: ~1 juta percobaan untuk suffix 5 digit hex (`911` = 5 karakter hex)
3. Proses ini bisa memakan waktu 1-5 menit tergantung hardware
4. Alternatif: gunakan **CREATE2** dengan salt iteration untuk mencari salt yang menghasilkan address target

#### Parameter Token Launch

| Parameter | Required | Description |
|---|---|---|
| Token Name | ✅ | Nama token (misal "MoonCoin") |
| Token Symbol | ✅ | Simbol token (misal "MOON") |
| Total Supply | ✅ | Total supply token |
| Decimals | ✅ | Default 18 |
| Description | ✅ | Deskripsi project |
| Logo URL | ✅ | URL logo token |
| Website | ❌ | URL website project |
| Social Links | ❌ | Twitter, Telegram, Discord |
| Target Chain | ✅ | BNB Chain / Ethereum / Arbitrum / Base |
| Base Price | ✅ | Harga awal token di bonding curve |
| Graduation Cap | ❌ | Default 69 BNB / $50k, bisa dikustomisasi |
| Launch Date | ✅ | Kapan token mulai dijual |
| Max Leverage | ❌ | Default 50%, creator bisa set lebih rendah |

#### Fee Token Launch

| Komponen | Fee |
|---|---|
| **Deploy Fee** | Flat fee dalam native token untuk biaya gas + vanity generation |
| **Platform Fee** | 5% dari total dana yang terkumpul di bonding curve saat graduation |
| **Trading Fee** | 1% per trade di bonding curve (50% creator, 50% platform) |

**Contoh perhitungan:**
```
Token: "MoonCoin" (MOON)
Total supply: 1,000,000 MOON
Graduation cap: 69 BNB (~$40,000)

Deploy fee (flat): 0.05 BNB (~$30)
Platform fee: 5% × $40,000 = $2,000 (saat graduation)
Trading fee: 1% dari semua trade di bonding curve

Creator terima:
  - Dari platform fee: sisa setelah potong 5%
  - Dari trading fee: 50% dari semua trading fee
  - Token reserve: 15% supply (locked 6 bulan)

Contract address: 0x...a3B4c5D6e7F911
```

#### Distribusi Token Saat Launch

```
Total supply: 1,000,000 token

Alokasi:
  80% → Bonding curve pool (dijual otomatis via kurva harga)
  15% → Creator reserve (locked, vesting 6 bulan)
   5% → Platform reserve (ecosystem)

Saat graduation (cap tercapai):
  - Sisa token di curve + BNB terkumpul → masuk DEX LP
  - LP token di-burn → likuiditas permanen
  - Creator dapat 50% dari trading fee yang terkumpul
```

---

### 2.5 Bonding Curve (pump.fun style)

Platform menggunakan bonding curve sebagai **satu-satunya metode** penyediaan likuiditas. Mirip pump.fun:

```
Flow:
  1. Creator launch token → deploy ERC-20 + bonding curve contract
  2. Token masuk bonding curve → user bisa beli langsung
  3. Harga naik otomatis sesuai demand (kurva linear)
  4. Saat bonding curve capai "graduation cap" (misal 69 BNB / $50k):
     a. Sisa token di curve + BNB/ETH terkumpul → masuk DEX LP (Uniswap/PancakeSwap)
     b. LP token di-burn (locked forever)
  5. Trading lanjut di DEX
  6. Platform offer margin trading untuk token ini
```

**Kelebihan:**
- Multi-chain (Ethereum, BNB, Arbitrum, Base)
- Full control, tidak dependency pihak ketiga
- Revenue 100% ke platform + creator (tidak ada potongan Flap/FourMeme)
- Proses sederhana: satu flow dari launch sampai DEX

#### Konsep Bonding Curve

```
Bonding curve = kurva harga otomatis dimana:
  - Harga token NAIK seiring jumlah token yang dibeli
  - Harga token TURUN jika token dijual kembali
  - Tidak perlu order book / market maker
  - Likuiditas selalu tersedia (selama ada sisa token di kurva)

Rumus (Linear bonding curve):
  harga(x) = a + b × x

  dimana:
    x = total token yang sudah dibeli
    a = harga awal (base price)
    b = slope (seberapa cepat harga naik)
```

#### Visualisasi Bonding Curve

```
Harga
  ↑
  │                                    ╱
  │                                  ╱
  │                                ╱
  │                              ╱
  │                           ╱
  │                        ╱
  │                     ╱
  │                  ╱
  │              ╱
  │          ╱
  │      ╱
  │  ╱
  │╱___________________________________→ Token terjual

  Harga awal rendah → naik gradual → mahal di akhir
  (Early buyer dapat harga lebih murah)
```

#### Graduation Mechanism

```
Bonding curve punya "graduation cap" (threshold):

Contoh (BNB Chain):
  Graduation cap = 69 BNB (~$40,000)
  
  Ketika total BNB di bonding curve mencapai 69 BNB:
  1. Bonding curve PAUSE (tidak bisa beli lagi via curve)
  2. Sisa token di curve + 69 BNB → masuk PancakeSwap LP
  3. LP token di-burn → likuiditas permanen
  4. Token bisa di-trade di PancakeSwap normal
  5. Platform offer margin trading untuk token ini

Setelah graduation:
  - Harga ditentukan oleh market (supply/demand di DEX)
  - Tidak ada lagi bonding curve
  - Creator bisa jual token reserve mereka (setelah vesting)
```

#### Parameter Bonding Curve

| Parameter | Default | Description |
|---|---|---|
| **Base Price** | $0.0001 | Harga token pertama |
| **Slope** | Linear | Harga naik linear per token |
| **Graduation Cap** | 69 BNB / $50k | Threshold untuk graduate ke DEX |
| **Virtual Reserves** | Ya | Simulasi AMM untuk harga discovery |
| **Trading Fee** | 1% | Fee per trade di bonding curve |
| **Fee Split** | 50% creator, 50% platform | Fee dari bonding curve trading |

#### Margin Trading di Bonding Curve vs DEX

```
SEBELUM graduation (masih di bonding curve):
  - Margin buyer beli dari bonding curve contract
  - Harga = bonding curve price
  - Likuiditas = sisa token di curve + BNB di curve
  - Margin system tetap jalan (fee 5%, likuidasi otomatis)

SETELAH graduation (sudah di DEX):
  - Margin buyer beli dari DEX (PancakeSwap/Uniswap)
  - Harga = market price
  - Likuiditas = LP pool
  - Margin system tetap jalan
```

---

## 3. User Flow

### 3.1 Buka Posisi (Open Position)

```
1. User connect wallet / login
2. User pilih token yang ingin dibeli di launchpad
3. User input modal (misal $100)
4. User pilih level leverage (10%-50%)
5. Sistem hitung:
   - Hutang        = modal × lev%
   - Fee           = hutang × 5%  (dipotong dari modal)
   - Dana beli     = (modal - fee) + hutang
   - Jumlah koin   = dana_beli / harga_token
   - Harga likuidasi
6. User konfirmasi → posisi dibuka
7. Fee dipotong dari saldo user
```

### 3.2 Monitoring Posisi

```
1. User lihat dashboard posisi aktif
2. Tampilkan:
   - Modal awal
   - Hutang & fee
   - Jumlah koin
   - Harga beli vs harga sekarang
   - PnL (unrealized)
   - Ekuitas saat ini
   - Harga likuidasi
   - Jarak ke likuidasi (dalam %)
```

### 3.3 Likuidasi (Otomatis)

```
1. Sistem monitor harga real-time (setiap 5 detik)
2. Jika harga ≤ harga likuidasi:
   a. Posisi di-liquidate otomatis
   b. Koin dijual di harga pasar
   c. Hasil penjualan → bayar pokok hutang
   d. Sisanya (jika ada) → kembali ke user
   e. Jika kurang → platform tanggung selisih (dari safety margin / insurance fund)
```

### 3.4 Tutup Posisi (Close Position — Manual)

```
1. User pilih "Close Position"
2. Sistem hitung:
   - Nilai koin sekarang = jumlah_koin × harga_sekarang
   - Kurangi: hutang ($50)
   - Sisa = profit/loss user
3. Koin dijual → hutang dibayar → sisa ke user
```

### 3.5 Launch Token (End User)

```
1. User connect wallet
2. User klik "Create Token" / "Launch Token"
3. User isi form:
   - Token name, symbol, decimals
   - Total supply
   - Description, logo, website
   - Target Chain: BNB / Ethereum / Arbitrum / Base
   - Base price (harga awal di bonding curve)
   - Graduation cap (default 69 BNB / $50k)
   - Launch date
   - Max leverage (default 50%)
4. Sistem tampilkan preview:
   - Estimasi vanity address generation time
   - Fee breakdown (deploy fee + trading fee + platform fee)
   - Tokenomics (80% curve / 15% creator / 5% platform)
   - Simulasi bonding curve (harga di berbagai tahap)
5. User konfirmasi & bayar deploy fee
6. Sistem mulai brute-force vanity address (...911)
   - Progress bar ditampilkan
   - User bisa tunggu atau dapat notifikasi saat selesai
7. Vanity address ditemukan → deploy ERC-20 + bonding curve contract
8. Token live di bonding curve → user lain bisa beli
9. Saat graduation cap tercapai → LP auto-created di DEX → LP di-burn
10. Platform enable margin trading untuk token ini
```

---

## 4. Data Model

### 4.1 User

```sql
CREATE TABLE users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address      VARCHAR(42) UNIQUE NOT NULL,
  email               VARCHAR(255),
  balance             DECIMAL(20,8) DEFAULT 0,         -- saldo available
  total_margin_debt   DECIMAL(20,8) DEFAULT 0,         -- total hutang aktif
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);
```

### 4.2 Launchpad Project

```sql
CREATE TABLE launchpad_projects (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  launch_id               UUID REFERENCES token_launches(id),  -- link ke launch
  token_name              VARCHAR(50) NOT NULL,
  token_symbol            VARCHAR(10) NOT NULL,
  contract_address        VARCHAR(42),                          -- token address (0x...911)
  token_price             DECIMAL(20,8) NOT NULL,               -- harga per token saat launch
  total_supply            DECIMAL(30,8) NOT NULL,
  available_supply        DECIMAL(30,8) NOT NULL,
  chain                   VARCHAR(50) NOT NULL,                 -- bsc, ethereum, arbitrum, base
  max_leverage_percent    INT DEFAULT 50,                       -- max leverage %
  margin_fee_percent      DECIMAL(5,2) DEFAULT 5.00,            -- fee hutang %
  safety_margin_percent   DECIMAL(5,2) DEFAULT 5.00,            -- safety margin %

  -- LP info
  lp_status               VARCHAR(20) DEFAULT 'none',           -- none, bonding, graduated, dex
  lp_contract_address     VARCHAR(42),                          -- LP pair address di DEX
  dex_name                VARCHAR(30),                          -- pancakeswap, uniswap, dodo

  status                  VARCHAR(20) DEFAULT 'upcoming',       -- upcoming, active, ended
  launch_date             TIMESTAMP NOT NULL,
  end_date                TIMESTAMP,
  created_at              TIMESTAMP DEFAULT NOW()
);
```

### 4.3 Liquidity Pool

```sql
CREATE TABLE liquidity_pools (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id              UUID NOT NULL REFERENCES launchpad_projects(id),
  chain                   VARCHAR(50) NOT NULL,
  pool_address            VARCHAR(42),                          -- contract address bonding curve

  -- Bonding curve
  base_price              DECIMAL(20,12),                       -- harga awal
  slope                   DECIMAL(20,15),                       -- kenaikan harga per token
  graduation_cap          DECIMAL(20,8),                        -- cap untuk graduate ke DEX
  current_reserve_token   DECIMAL(30,8) DEFAULT 0,              -- token di curve
  current_reserve_native  DECIMAL(20,8) DEFAULT 0,              -- BNB/ETH di curve
  total_sold              DECIMAL(30,8) DEFAULT 0,              -- total token terjual via curve
  total_raised            DECIMAL(20,8) DEFAULT 0,              -- total BNB/ETH terkumpul
  is_graduated            BOOLEAN DEFAULT FALSE,

  -- DEX (setelah graduation)
  dex_name                VARCHAR(30),                          -- pancakeswap, uniswap
  dex_pair_address        VARCHAR(42),                          -- pair address di DEX
  lp_token_address        VARCHAR(42),                          -- LP token address
  token_reserve           DECIMAL(30,8),                        -- token di LP
  native_reserve          DECIMAL(20,8),                        -- BNB/ETH di LP

  created_at              TIMESTAMP DEFAULT NOW(),
  updated_at              TIMESTAMP DEFAULT NOW()
);
```

### 4.3 Margin Position

```sql
CREATE TABLE margin_positions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id),
  project_id          UUID NOT NULL REFERENCES launchpad_projects(id),
  modal               DECIMAL(20,8) NOT NULL,           -- modal user
  leverage_percent    INT NOT NULL,                      -- 10, 20, 30, 40, 50
  debt_amount         DECIMAL(20,8) NOT NULL,            -- pokok hutang
  fee_amount          DECIMAL(20,8) NOT NULL,            -- biaya hutang 5%
  total_cost          DECIMAL(20,8) NOT NULL,            -- modal (sudah dipotong fee)
  coins_purchased     DECIMAL(30,8) NOT NULL,            -- jumlah koin
  purchase_price      DECIMAL(20,8) NOT NULL,            -- harga beli per koin
  liquidation_price   DECIMAL(20,8) NOT NULL,            -- harga likuidasi
  safety_margin       DECIMAL(20,8) NOT NULL,            -- safety margin $
  status              VARCHAR(20) DEFAULT 'open',        -- open, closed, liquidated
  pnl                 DECIMAL(20,8) DEFAULT 0,           -- realized PnL
  opened_at           TIMESTAMP DEFAULT NOW(),
  closed_at           TIMESTAMP,
  liquidated_at       TIMESTAMP
);
```

### 4.4 Liquidation Log

```sql
CREATE TABLE liquidation_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id         UUID NOT NULL REFERENCES margin_positions(id),
  user_id             UUID NOT NULL REFERENCES users(id),
  trigger_price       DECIMAL(20,8) NOT NULL,            -- harga saat likuidasi
  coins_sold          DECIMAL(30,8) NOT NULL,
  sale_proceeds       DECIMAL(20,8) NOT NULL,            -- hasil jual koin
  debt_repaid         DECIMAL(20,8) NOT NULL,            -- hutang yang dibayar
  user_refund         DECIMAL(20,8),                     -- sisa ke user (bisa negatif)
  platform_loss       DECIMAL(20,8) DEFAULT 0,           -- kerugian platform
  created_at          TIMESTAMP DEFAULT NOW()
);
```

### 4.5 Token Launch

```sql
CREATE TABLE token_launches (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id              UUID NOT NULL REFERENCES users(id),
  project_id              UUID REFERENCES launchpad_projects(id),  -- link ke project setelah deploy

  -- Token info
  token_name              VARCHAR(50) NOT NULL,
  token_symbol            VARCHAR(10) NOT NULL,
  decimals                INT DEFAULT 18,
  total_supply            DECIMAL(30,8) NOT NULL,
  description             TEXT,
  logo_url                VARCHAR(500),
  website_url             VARCHAR(500),
  social_links            JSONB,                          -- {twitter, telegram, discord}

  -- Launch config
  initial_price           DECIMAL(20,8) NOT NULL,
  launch_date             TIMESTAMP NOT NULL,
  max_leverage_percent    INT DEFAULT 50,
  tokenomics              JSONB DEFAULT '{"sale":70,"creator":20,"platform":10}',

  -- Vanity address
  vanity_suffix           VARCHAR(10) DEFAULT '911',
  deployer_address        VARCHAR(42),                    -- generated deployer wallet
  deployer_private_key    VARCHAR(66),                    -- encrypted, untuk deploy
  contract_address        VARCHAR(42),                    -- final token address (akhiran 911)
  vanity_generated_at     TIMESTAMP,

  -- Deployment
  deploy_tx_hash          VARCHAR(66),
  deployed_at             TIMESTAMP,
  network                 VARCHAR(50) DEFAULT 'ethereum', -- ethereum, bsc, arbitrum

  -- Fee
  deploy_fee_eth          DECIMAL(20,8),                  -- flat fee dalam ETH
  deploy_fee_paid         BOOLEAN DEFAULT FALSE,
  platform_fee_percent    DECIMAL(5,2) DEFAULT 5.00,
  platform_fee_amount     DECIMAL(20,8),

  -- Status
  status                  VARCHAR(20) DEFAULT 'pending',  -- pending, generating, deployed, active, ended
  created_at              TIMESTAMP DEFAULT NOW(),
  updated_at              TIMESTAMP DEFAULT NOW()
);
```

### 4.6 Vanity Address Job

```sql
CREATE TABLE vanity_jobs (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  launch_id               UUID NOT NULL REFERENCES token_launches(id),
  target_suffix           VARCHAR(10) NOT NULL,           -- '911'
  attempts                BIGINT DEFAULT 0,
  max_attempts            BIGINT DEFAULT 10000000,        -- safety limit
  found_address           VARCHAR(42),
  found_private_key       VARCHAR(66),                    -- encrypted
  status                  VARCHAR(20) DEFAULT 'running',  -- running, found, failed, cancelled
  started_at              TIMESTAMP DEFAULT NOW(),
  completed_at            TIMESTAMP,
  worker_id               VARCHAR(50)                     -- ID worker yang proses
);
```

---

## 5. API Endpoints

### Auth

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/connect-wallet` | Connect wallet & register/login |
| `GET` | `/api/auth/me` | Get current user profile |

### Launchpad Projects

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/projects` | List semua launchpad project |
| `GET` | `/api/projects/:id` | Detail project |
| `GET` | `/api/projects/:id/price` | Harga real-time token |

### Token Launch (End User)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/launch/create` | Submit token launch baru |
| `GET` | `/api/launch/my` | List token yang user launch |
| `GET` | `/api/launch/:id` | Detail token launch |
| `GET` | `/api/launch/:id/vanity-status` | Status vanity address generation |
| `POST` | `/api/launch/:id/deploy` | Trigger deploy setelah vanity address ready |
| `POST` | `/api/launch/:id/cancel` | Batalkan launch (sebelum deploy) |

### Liquidity Pool

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/pools/:projectId` | Info LP untuk project |
| `GET` | `/api/pools/:projectId/price` | Harga saat ini (dari bonding curve atau DEX) |
| `POST` | `/api/pools/:projectId/buy-curve` | Beli token dari bonding curve (pre-graduation) |
| `POST` | `/api/pools/:projectId/sell-curve` | Jual token ke bonding curve (pre-graduation) |
| `GET` | `/api/pools/:projectId/curve-stats` | Stats bonding curve (progress ke graduation) |
| `POST` | `/api/pools/graduation-callback` | Webhook: notifikasi token graduate ke DEX |

### Margin

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/margin/calculate` | Hitung simulasi margin (tanpa buka posisi) |
| `POST` | `/api/margin/open` | Buka posisi margin |
| `POST` | `/api/margin/close/:id` | Tutup posisi (manual) |
| `GET` | `/api/margin/positions` | List posisi aktif user |
| `GET` | `/api/margin/positions/:id` | Detail posisi |

### Liquidation

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/liquidation/check` | Cek posisi yang perlu likuidasi (cron/internal) |
| `GET` | `/api/liquidation/history` | Riwayat likuidasi user |

### Admin

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/dashboard` | Overview platform (total exposure, revenue) |
| `GET` | `/api/admin/positions` | Semua posisi aktif |
| `GET` | `/api/admin/risk` | Risk exposure report per project |
| `PUT` | `/api/admin/projects/:id` | Update project settings |

---

## 6. Komponen UI

### 6.1 Landing Page
- List launchpad project (upcoming, active, ended)
- Filter & sort (status, tanggal, popularitas)
- Banner promosi project aktif

### 6.2 Project Detail Page
- Info token (nama, harga, supply, dll)
- Countdown timer ke launch
- **Margin Calculator** — user input modal & leverage, lihat simulasi real-time:
  - Jumlah koin yang didapat
  - Fee yang dikenakan
  - Harga likuidasi
  - Potensi profit/loss di berbagai harga
- Statistik project (total raised, participants, dll)

### 6.3 User Dashboard
- Saldo & total equity
- List posisi aktif dengan PnL real-time
- **Liquidation Progress Bar** — visualisasi jarak harga ke liquidation price
- Riwayat transaksi & likuidasi

### 6.4 Create Token Page
- **Token Launch Form** — input semua parameter token
- **Fee Preview** — tampilkan deploy fee + platform fee sebelum konfirmasi
- **Vanity Address Generator** — progress bar brute-force generation
  - Tampilkan jumlah attempts
  - Estimasi waktu selesai
  - Cancel button
- **Deploy Confirmation** — review final sebelum deploy on-chain
- **Token Status Page** — setelah deploy, tampilkan:
  - Contract address (dengan highlight suffix `911`)
  - Tokenomics chart (70/20/10)
  - Link ke block explorer
  - Share button

### 6.5 Admin Dashboard
- Total exposure (hutang user ke platform)
- Risk heatmap per project
- Liquidation queue
- Revenue dari fee (hari ini, minggu ini, bulan ini)

---

## 7. Perhitungan Keuangan

### 7.1 Revenue Platform

**Revenue Stream 1: Margin Fee**
```
Per posisi Lev 50%, Modal $100:
  Fee = $50 × 5% = $2.50

Contoh skala:
  1000 user × rata-rata Lev 30%, Modal $200
  Fee per user = $60 × 5% = $3.00
  Total revenue = 1000 × $3 = $3,000
```

**Revenue Stream 2: Token Launch Fee**
```
Per token launch:
  Deploy fee (flat): ~0.05 ETH (~$150)
  Platform fee: 5% dari total raise

Contoh skala:
  50 token launch per bulan
  Rata-rata raise: $50,000 per token
  Deploy fee: 50 × $150 = $7,500
  Platform fee: 50 × $50,000 × 5% = $125,000
  Total launch revenue: $132,500/bulan
```

**Total Revenue (gabungan):**
```
Margin fee:      $3,000/bulan (conservative)
Launch fee:      $132,500/bulan
Total:           ~$135,500/bulan
```

### 7.2 Risk Exposure

```
Total hutang platform = SUM(debt_amount) dari semua posisi status='open'

Risiko: harga jatuh sebelum likuidasi sempat dieksekusi

Mitigasi:
  1. Safety margin 5% dari dana beli
  2. Auto-liquidation engine (cek setiap 5 detik)
  3. Max leverage cap 50%
  4. Max position size per user
  5. Total platform exposure limit per project
  6. Insurance fund dari potongan fee
```

### 7.3 Worst Case Scenario

```
Skenario: Modal $100, Lev 50%, harga token crash 90% dalam 1 detik

  147.5 koin × $0.10 = $14.75 (nilai posisi)
  Hutang = $50
  Ekuitas = $14.75 - $50 = -$35.25 (NEGATIF)

  Platform rugi $35.25 per posisi ini
  (dikurangi insurance fund jika ada)

Mitigasi:
  - Circuit breaker: pause trading jika harga drop > 20% dalam 1 menit
  - Partial liquidation: likuidasi sebagian di tier sebelum crash total
  - Insurance fund: kumpulkan % dari fee untuk cover worst case
```

### 7.4 Insurance Fund Model

```
Setiap fee yang masuk:
  80% → Revenue platform
  20% → Insurance fund

Insurance fund digunakan untuk:
  - Cover kerugian saat likuidasi tidak sempat dieksekusi
  - Top-up jika fund di bawah threshold minimum
```

---

## 8. Keputusan Desain

| Keputusan | Pilihan | Alasan |
|---|---|---|
| **Fee timing** | Di depan (saat buka posisi) | Risiko platform lebih kecil, fee pasti terkumpul |
| **Architecture** | Hybrid (logic off-chain, settlement on-chain) | Cepat develop, tetap transparan untuk settlement |
| **Fee handling** | Dipotong dari modal | Sederhana, user langsung tahu total biaya |
| **Max leverage** | 50% dari modal | Batas aman untuk platform & user |
| **Safety margin** | 5% dari dana beli | Buffer sebelum ekuitas negatif |
| **Liquidation check** | Setiap 5 detik | Responsif tanpa overload sistem |
| **Insurance fund** | 20% dari fee revenue | Proteksi dari worst case scenario |
| **Token launch** | Tanpa approval, open untuk semua user | Desentralisasi, lebih banyak listing |
| **Vanity address** | Suffix `911` pada contract address | Brand identity, mudah verifikasi |
| **Vanity method** | Brute-force CREATE / CREATE2 salt | Standard approach untuk vanity address |
| **Token distribution** | 70% sale / 20% creator / 10% platform | Balance antara sale, creator, dan platform |
| **LP Strategy** | Bonding curve (pump.fun style) | Simpel, full control, revenue 100% ke platform |
| **Bonding curve type** | Linear (pump.fun style) | Sederhana, mudah dipahami user |
| **Graduation cap** | 69 BNB / $50k (dapat dikonfigurasi per token) | Standard pump.fun, adopsi mudah |
| **DEX after graduation** | PancakeSwap (BNB), Uniswap (ETH/ARB/BASE) | Standar DEX per chain |
| **LP burn after graduation** | Ya, LP token di-burn | Likuiditas permanen, build trust |

---

## 9. Tech Stack

| Layer | Technology | Alasan |
|---|---|---|
| Frontend | Next.js 14+ (App Router) | SSR, performa, SEO |
| Language | TypeScript | Type safety, maintainability |
| Styling | Tailwind CSS | Rapid development |
| Backend | Next.js API Routes | Unified codebase |
| Database | PostgreSQL | Relational, mature, reliable |
| ORM | Prisma | Type-safe queries, migration |
| Cache | Redis | Harga real-time, session |
| Blockchain | EVM (Ethereum/BSC/Arbitrum) | Smart contract settlement |
| Wallet | WalletConnect + MetaMask | Standar industri |
| Price Feed | Chainlink Oracle + CoinGecko | Reliable, decentralized |
| Real-time | WebSocket (Socket.io) | Harga & notifikasi real-time |
| Auth | SIWE (Sign-In with Ethereum) | Web3 native auth |
| Hosting | Vercel (FE) + Railway/AWS (BE) | Scalable, mudah deploy |
| Vanity Generator | Custom Rust/Go worker (WASM) | Brute-force vanity address, performa tinggi |
| Smart Contract | OpenZeppelin ERC-20 + custom factory | Standard, audited, CREATE2 support |
| Encryption | AES-256 untuk private key storage | Keamanan deployer wallet |
| Bonding Curve | Custom Solidity contract (virtual AMM) | Pump.fun style bonding curve |
| DEX Integration | Uniswap V2/V3 SDK, PancakeSwap SDK | LP creation & trading after graduation |
| Cross-chain | LayerZero / Wormhole (optional) | Multi-chain bridge |

---

## 10. Security Considerations

1. **Rate limiting** — batasi request ke API margin open/close
2. **Price manipulation protection** — gunakan TWAP (Time-Weighted Average Price)
3. **Max exposure limit** — per project dan total platform
4. **Multi-sig wallet** — untuk treasury & insurance fund
5. **Smart contract audit** — sebelum mainnet
6. **Circuit breaker** — pause trading jika anomali harga terdeteksi
7. **Input validation** — validasi semua parameter margin (modal, leverage, project)
8. **SQL injection protection** — gunakan parameterized queries (Prisma handle ini)
9. **CORS & CSP** — restrict origin yang diizinkan
10. **Logging & monitoring** — log semua transaksi & alert untuk anomali

**Token Launch Security:**
11. **Deployer private key encryption** — AES-256, key di-hardware security module (HSM)
12. **Vanity job rate limit** — max 3 concurrent jobs per user
13. **Smart contract template audit** — template ERC-20 yang di-deploy harus tervalidasi
14. **Supply cap enforcement** — total supply tidak bisa diubah setelah deploy
15. **Creator token lock** — 20% creator reserve harus locked via smart contract (vesting)
16. **Anti-spam** — deploy fee cukup besar untuk mencegah spam token

---

## 11. Milestones

| Phase | Scope | Estimasi |
|---|---|---|
| **M1: Foundation** | Setup project, DB schema, auth, basic UI | 2 minggu |
| **M2: Core Margin** | Margin calculator, open/close position, basic dashboard | 3 minggu |
| **M3: Liquidation** | Auto-liquidation engine, price monitoring, liquidation logs | 2 minggu |
| **M4: Launchpad** | Project listing, token sale integration, whitelist | 2 minggu |
| **M5: Token Launch** | Vanity address generator, token launch form, ERC-20 deploy, token listing | 3 minggu |
| **M6: Bonding Curve & DEX LP** | Bonding curve contract, LP creation, graduation mechanism, DEX integration | 4 minggu |
| **M7: Admin** | Admin dashboard, risk management, reports | 1 minggu |
| **M8: Polish** | Testing, security audit, UI/UX refinement, docs | 2 minggu |

**Total estimasi: ~19 minggu (~5 bulan)**

---

## Appendix: Contoh Perhitungan Lengkap

### Kasus: User Buka Posisi Lev 50%, Modal $100

```
INPUT:
  Modal           = $100
  Leverage        = 50%
  Harga token     = $1.00

HITUNG:
  Hutang          = $100 × 50% = $50.00
  Fee (5%)        = $50 × 5%  = $2.50  (dipotong dari modal)
  Modal bersih    = $100 - $2.50 = $97.50
  Dana beli       = $97.50 + $50 = $147.50
  Jumlah koin     = $147.50 / $1.00 = 147.5 koin
  
  Safety margin   = 5% × $147.50 = $7.375
  Harga likuidasi = ($50 + $7.375) / 147.5 = $0.389 → drop 61.1%

OUTPUT:
  - User bayar     : $100 (modal) + $2.50 (fee dipotong) = $100 total
  - User dapat     : 147.5 koin
  - Hutang user    : $50
  - Harga likuidasi: $0.389
  - Drop sebelum   : 61.1% dari harga beli

SKENARIO PROFIT (harga naik ke $1.50):
  Nilai posisi    = 147.5 × $1.50 = $221.25
  Bayar hutang    = $50
  Sisa ke user    = $221.25 - $50 = $171.25
  Profit user     = $171.25 - $100 (modal) = $71.25 (71.25% ROI)

SKENARIO LOSS (harga turun ke $0.50):
  Nilai posisi    = 147.5 × $0.50 = $73.75
  Bayar hutang    = $50
  Sisa ke user    = $73.75 - $50 = $23.75
  Loss user       = $100 - $23.75 = $76.25 (76.25% loss)

SKENARIO LIKUIDASI (harga turun ke $0.389):
  Nilai posisi    = 147.5 × $0.389 = $57.38
  Bayar hutang    = $50
  Sisa ke user    = $57.38 - $50 = $7.38 (= safety margin)
  → Likuidasi otomatis, user terima $7.38
```

---

## Appendix B: Vanity Address `911` — Technical Detail

### Apa itu Vanity Address?

Vanity address adalah Ethereum address yang mengandung pola tertentu yang diinginkan. Untuk platform ini, semua token contract harus berakhiran `911`.

### Cara Generate

**Opsi 1: Brute-force CREATE (recommended)**
```
1. Generate random private key → derive address (deployer)
2. Deployer address → hitung CREATE contract address:
   contract_address = keccak256(rlp([deployer, nonce]))[12:]
3. Cek apakah contract_address berakhiran 911
4. Jika tidak, ulangi dari step 1
5. Jika ya → deploy contract dari deployer address ini
```

**Opsi 2: CREATE2 dengan salt iteration**
```
1. Platform punya factory contract
2. Iterasi salt (0, 1, 2, ... N):
   contract_address = keccak256(0xff + factory + salt + keccak256(bytecode))[12:]
3. Cek apakah berakhiran 911
4. Jika ya → deploy via factory.create2(salt, bytecode)
```

### Estimasi Waktu

| Suffix Length | Kemungkinan | Estimasi Attempts | Estimasi Waktu* |
|---|---|---|---|
| 3 hex chars | 1/4,096 | ~4,000 | < 1 detik |
| 4 hex chars | 1/65,536 | ~65,000 | 1-5 detik |
| **5 hex chars (`911`)** | **1/1,048,576** | **~1,000,000** | **1-5 menit** |
| 6 hex chars | 1/16,777,216 | ~16,000,000 | 15-60 menit |

> \* Dengan Rust/Go worker di server, ~200k-500k attempts/detik

### Smart Contract Template

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title LaunchpadToken
 * @notice Template ERC-20 untuk token yang di-launch di platform
 * @dev Deployed dari vanity address yang berakhiran 911
 */
contract LaunchpadToken is ERC20, Ownable {
    uint256 public immutable maxSupply;
    uint256 public constant CREATOR_RESERVE_PERCENT = 15;
    uint256 public constant PLATFORM_RESERVE_PERCENT = 5;
    uint256 public constant BONDING_CURVE_PERCENT = 80;

    address public platformWallet;
    address public bondingCurve;  // bonding curve contract
    uint256 public launchDate;
    uint256 public creatorUnlockDate;  // 6 bulan setelah launch

    mapping(address => bool) public vestingExempt;

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 _maxSupply,
        address _platformWallet,
        address _bondingCurve,
        uint256 _launchDate
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        maxSupply = _maxSupply;
        platformWallet = _platformWallet;
        bondingCurve = _bondingCurve;
        launchDate = _launchDate;
        creatorUnlockDate = _launchDate + 180 days;

        uint256 curveAmount = (_maxSupply * BONDING_CURVE_PERCENT) / 100;
        uint256 creatorAmount = (_maxSupply * CREATOR_RESERVE_PERCENT) / 100;
        uint256 platformAmount = (_maxSupply * PLATFORM_RESERVE_PERCENT) / 100;

        _mint(_bondingCurve, curveAmount);     // Bonding curve pool
        _mint(msg.sender, creatorAmount);       // Creator (locked)
        _mint(_platformWallet, platformAmount); // Platform

        vestingExempt[_bondingCurve] = true;
        vestingExempt[_platformWallet] = true;
    }

    /**
     * @notice Transfer token — creator tidak bisa transfer sebelum unlock
     */
    function _transfer(address from, address to, uint256 amount) internal override {
        if (from == owner() && block.timestamp < creatorUnlockDate) {
            revert("Creator tokens locked until unlock date");
        }
        super._transfer(from, to, amount);
    }

    /**
     * @notice Creator bisa transfer setelah unlock date
     */
    function isCreatorUnlocked() public view returns (bool) {
        return block.timestamp >= creatorUnlockDate;
    }
}
```

---

## Appendix C: Bonding Curve Smart Contract

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BondingCurve
 * @notice Pump.fun style bonding curve untuk token launch
 * @dev Deploy bersamaan dengan LaunchpadToken
 */
contract BondingCurve is Ownable {
    IERC20 public immutable token;
    address public platformWallet;
    
    // Curve parameters
    uint256 public basePrice;         // harga awal (dalam wei)
    uint256 public slope;             // kenaikan harga per token
    uint256 public graduationCap;     // BNB cap untuk graduate
    uint256 public graduationTokenThreshold; // sisa token trigger graduation
    
    // State
    uint256 public totalSold;         // total token terjual
    uint256 public totalRaised;       // total BNB terkumpul
    uint256 public tokenBalance;      // token di curve
    bool public isGraduated;
    
    // Fee
    uint256 public constant TRADING_FEE_BPS = 100; // 1%
    
    // DEX info (setelah graduation)
    address public dexRouter;
    address public dexPair;
    
    event TokenPurchased(address indexed buyer, uint256 bnbIn, uint256 tokensOut);
    event TokenSold(address indexed seller, uint256 tokensIn, uint256 bnbOut);
    event Graduated(uint256 bnbLiquidity, uint256 tokenLiquidity);
    
    constructor(
        address _token,
        address _platformWallet,
        uint256 _basePrice,
        uint256 _slope,
        uint256 _graduationCap,
        address _dexRouter
    ) Ownable(msg.sender) {
        token = IERC20(_token);
        platformWallet = _platformWallet;
        basePrice = _basePrice;
        slope = _slope;
        graduationCap = _graduationCap;
        dexRouter = _dexRouter;
    }
    
    /**
     * @notice Beli token dari bonding curve
     */
    function buy() external payable {
        require(!isGraduated, "Already graduated");
        require(msg.value > 0, "Must send BNB");
        
        uint256 fee = (msg.value * TRADING_FEE_BPS) / 10000;
        uint256 bnbAfterFee = msg.value - fee;
        
        // Hitung berapa token yang didapat dari integral kurva
        uint256 tokensToSell = calculateTokensForBnb(bnbAfterFee);
        require(tokensToSell <= tokenBalance, "Exceeds available");
        
        // Transfer fee
        (bool sent, ) = platformWallet.call{value: fee}("");
        require(sent, "Fee transfer failed");
        
        // Transfer token ke buyer
        token.transfer(msg.sender, tokensToSell);
        
        // Update state
        totalSold += tokensToSell;
        totalRaised += bnbAfterFee;
        tokenBalance -= tokensToSell;
        
        emit TokenPurchased(msg.sender, msg.value, tokensToSell);
        
        // Cek graduation
        if (totalRaised >= graduationCap) {
            _graduate();
        }
    }
    
    /**
     * @notice Jual token kembali ke bonding curve
     */
    function sell(uint256 tokenAmount) external {
        require(!isGraduated, "Already graduated, sell on DEX");
        require(tokenAmount > 0, "Amount must be > 0");
        
        // Hitung BNB yang didapat
        uint256 bnbOut = calculateBnbForTokens(tokenAmount);
        uint256 fee = (bnbOut * TRADING_FEE_BPS) / 10000;
        uint256 bnbAfterFee = bnbOut - fee;
        
        // Transfer token dari seller
        token.transferFrom(msg.sender, address(this), tokenAmount);
        
        // Update state
        totalSold -= tokenAmount;
        totalRaised -= bnbOut;
        tokenBalance += tokenAmount;
        
        // Transfer fee
        (bool sent, ) = platformWallet.call{value: fee}("");
        require(sent, "Fee transfer failed");
        
        // Transfer BNB ke seller
        (bool sent2, ) = msg.sender.call{value: bnbAfterFee}("");
        require(sent2, "BNB transfer failed");
        
        emit TokenSold(msg.sender, tokenAmount, bnbAfterFee);
    }
    
    /**
     * @notice Hitung harga saat ini per token
     */
    function currentPrice() public view returns (uint256) {
        return basePrice + (slope * totalSold);
    }
    
    /**
     * @notice Hitung berapa token yang didapat untuk N BNB
     */
    function calculateTokensForBnb(uint256 bnbAmount) public view returns (uint256) {
        // Integral: tokens = (√(basePrice² + 2×slope×bnb) - basePrice) / slope
        // Simplified: iterate
        uint256 tokens = 0;
        uint256 bnbRemaining = bnbAmount;
        uint256 currentSold = totalSold;
        
        while (bnbRemaining > 0 && tokens < tokenBalance) {
            uint256 price = basePrice + (slope * currentSold);
            uint256 bnbForOneToken = price;
            
            if (bnbRemaining >= bnbForOneToken) {
                tokens++;
                bnbRemaining -= bnbForOneToken;
                currentSold++;
            } else {
                break;
            }
        }
        
        return tokens;
    }
    
    /**
     * @notice Hitung berapa BNB yang didapat untuk N token
     */
    function calculateBnbForTokens(uint256 tokenAmount) public view returns (uint256) {
        uint256 bnb = 0;
        uint256 currentSold = totalSold;
        
        for (uint256 i = 0; i < tokenAmount; i++) {
            currentSold--;
            bnb += basePrice + (slope * currentSold);
        }
        
        return bnb;
    }
    
    /**
     * @notice Graduation: buat LP di DEX
     */
    function _graduate() internal {
        isGraduated = true;
        
        // Sisa token + BNB → LP di DEX
        // (Implementasi tergantung DEX router yang dipakai)
        
        uint256 bnbForLiquidity = address(this).balance;
        uint256 tokensForLiquidity = tokenBalance;
        
        // Create LP pair & add liquidity
        // IUniswapV2Router(dexRouter).addLiquidityETH{value: bnbForLiquidity}(...)
        
        // Burn LP token
        
        emit Graduated(bnbForLiquidity, tokensForLiquidity);
    }
    
    /**
     * @notice Progress ke graduation (dalam %)
     */
    function graduationProgress() external view returns (uint256) {
        if (graduationCap == 0) return 0;
        return (totalRaised * 10000) / graduationCap; // basis points
    }
    
    receive() external payable {}
}
```

---

## Appendix D: Bonding Curve Math

### Linear Bonding Curve Formula

```
harga(x) = a + b × x

dimana:
  a = base price (harga token pertama, misal $0.0001)
  b = slope (kenaikan harga per token, misal $0.0000001)
  x = total token yang sudah terjual

Contoh:
  Token #1:     harga = $0.0001
  Token #1000:  harga = $0.0001 + ($0.0000001 × 1000) = $0.0002
  Token #10000: harga = $0.0001 + ($0.0000001 × 10000) = $0.0011
```

### Cost to Buy N Tokens

```
cost(n) = ∫₀ⁿ (a + b×x) dx = a×n + b×n²/2

Contoh: Beli 1000 token pertama
  cost = $0.0001 × 1000 + $0.0000001 × 1000² / 2
  cost = $0.10 + $0.05 = $0.15
```

### Graduation Cap Calculation

```
Total BNB/ETH di bonding curve saat graduation:

integral dari 0 sampai N_max:
  total_raised = a × N_max + b × N_max² / 2

Setting total_raised = graduation_cap (misal 69 BNB):
  N_max = (-a + √(a² + 2×b×graduation_cap)) / b

Contoh:
  a = $0.0001, b = $0.0000001, graduation_cap = $40,000
  N_max = 200,000 token (dari total 1,000,000)
  → 200,000 token terjual via bonding curve, sisa 800,000 masuk LP
```

### Price Impact (Slippage)

```
Beli n token mulai dari x sudah terjual:

harga_rata2 = (harga(x) + harga(x+n)) / 2
            = (a + b×x + a + b×(x+n)) / 2
            = a + b×(2x + n) / 2

slippage = (harga(x+n) - harga(x)) / harga(x) × 100%
         = b×n / (a + b×x) × 100%

Contoh (beli 5000 token, sudah 10000 terjual):
  harga_awal = $0.0001 + $0.0000001 × 10000 = $0.0011
  harga_akhir = $0.0001 + $0.0000001 × 15000 = $0.0016
  slippage = $0.0005 / $0.0011 × 100% = 45.45%
```

---

*Document ini adalah living document. Update sesuai perkembangan implementasi.*
