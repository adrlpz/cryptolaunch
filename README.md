# CryptoLaunch — Margin Launchpad

> Launch tokens with bonding curve liquidity & trade with margin leverage up to 50%

## Overview

CryptoLaunch is a decentralized launchpad platform where:

1. **Creators** launch tokens with vanity address (`...911`) and bonding curve liquidity
2. **Traders** buy tokens with margin/leverage (up to 50%)
3. **Platform** earns fees from margin, trading, and graduation

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes |
| Database | PostgreSQL + Prisma 7 |
| Blockchain | EVM (Ethereum, Arbitrum, Base, BSC) |
| Smart Contracts | Solidity (OpenZeppelin) |
| Testing | Vitest |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL
- MetaMask or Web3 wallet

### Installation

```bash
# Clone & install
git clone <repo>
cd launchpad
npm install

# Setup database
cp .env.example .env
# Edit .env with your DATABASE_URL

# Generate Prisma client
npx prisma generate

# Run migrations (requires running PostgreSQL)
npx prisma migrate dev

# Start development server
npm run dev
```

### Environment Variables

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/crypto_launchpad"
NEXTAUTH_SECRET="your-secret"
ETH_RPC_URL="https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY"
BSC_RPC_URL="https://bsc-dataseed.binance.org/"
PLATFORM_WALLET_ADDRESS="0x..."
ENCRYPTION_KEY="32-byte-key-for-aes-256"
CRON_SECRET="your-cron-secret"
```

## Project Structure

```
launchpad/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── projects/                   # Project listing & detail
│   ├── dashboard/                  # User dashboard
│   ├── launch/                     # Token launch form
│   ├── admin/                      # Admin dashboard
│   └── api/                        # API routes (31 endpoints)
├── components/
│   ├── layout/Navbar.tsx           # Navigation
│   ├── margin/MarginCalculator.tsx # Margin calculator widget
│   ├── margin/PositionCard.tsx     # Position display card
│   ├── launch/WhitelistManager.tsx # Whitelist management
│   └── launch/BondingCurveWidget.tsx # Buy/sell widget
├── lib/
│   ├── prisma.ts                   # Database client
│   ├── margin.ts                   # Margin calculation engine
│   ├── bonding-curve.ts            # Bonding curve math
│   ├── liquidation.ts              # Auto-liquidation engine
│   ├── price.ts                    # Price feed service
│   ├── vanity.ts                   # Vanity address generator
│   ├── encryption.ts               # AES-256 encryption
│   ├── auth.ts                     # SIWE authentication
│   ├── validation.ts               # Input validation
│   └── rate-limit.ts               # Rate limiting
├── contracts/
│   ├── BondingCurve.sol            # Linear bonding curve
│   ├── LaunchpadToken.sol          # ERC-20 with vesting
│   └── LaunchpadFactory.sol        # Factory contract
├── prisma/
│   └── schema.prisma               # Database schema (8 tables)
├── types/
│   └── index.ts                    # TypeScript types
└── middleware.ts                    # Security middleware
```

## API Reference

### Projects

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/projects` | List all projects |
| `GET` | `/api/projects/:id` | Project detail |
| `POST` | `/api/projects/create` | Create project |
| `PUT` | `/api/projects/:id/update` | Update project |

### Token Launch

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/launch/create` | Create token launch |
| `GET` | `/api/launch/:id` | Launch detail |
| `GET` | `/api/launch/:id/vanity-status` | Vanity generation status |
| `POST` | `/api/launch/:id/deploy` | Deploy token |
| `POST` | `/api/launch/:id/cancel` | Cancel launch |
| `GET` | `/api/launch/my` | User's launches |

### Bonding Curve

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/pools/:projectId` | Pool info |
| `GET` | `/api/pools/:projectId/price` | Current price |
| `POST` | `/api/pools/:projectId/buy` | Buy tokens |
| `POST` | `/api/pools/:projectId/sell` | Sell tokens |

### Margin

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/margin/calculate` | Simulate margin |
| `POST` | `/api/margin/open` | Open position |
| `POST` | `/api/margin/close/:id` | Close position |
| `GET` | `/api/margin/positions` | List positions |

### Liquidation

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/liquidation/check` | Run liquidation check |
| `GET` | `/api/liquidation/check` | Liquidation warnings |
| `GET` | `/api/liquidation/history` | Liquidation history |
| `POST` | `/api/cron/liquidation` | Cron endpoint |

### Admin

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/dashboard` | Overview stats |
| `GET` | `/api/admin/risk` | Risk exposure |
| `GET` | `/api/admin/projects` | All projects |
| `GET` | `/api/admin/users` | All users |
| `GET` | `/api/admin/revenue` | Revenue breakdown |

## Core Concepts

### Margin Lending

Users can borrow up to 50% of their modal to buy tokens:

```
Modal $100, Lev 50%:
  Hutang = $50
  Fee = $2.50 (5% of debt, paid upfront)
  Total funds = $147.50
  Liquidation price = ~$0.389 (drop 61.1%)
```

### Bonding Curve

Token price increases as more tokens are bought:

```
price(x) = basePrice + slope × x

Where x = total tokens sold
```

When `totalRaised >= graduationCap`, LP is auto-created on DEX.

### Tokenomics

```
80% → Bonding Curve Pool
15% → Creator (locked 6 months)
 5% → Platform
```

### Fee Structure

| Fee | Rate | When |
|---|---|---|
| Margin Fee | 5% of debt | On position open |
| Trading Fee | 1% per trade | On bonding curve buy/sell |
| Deploy Fee | ~$30 flat | On token launch |
| Platform Fee | 5% of graduation cap | On graduation |

## Running Tests

```bash
npm test           # Run all tests
npm run test:watch # Watch mode
```

## Deployment

### Vercel (Frontend)

```bash
vercel --prod
```

### Database

Use managed PostgreSQL (Supabase, Railway, Neon, etc.)

### Smart Contracts

```bash
# Using Hardhat (install separately)
npx hardhat compile
npx hardhat deploy --network ethereum
```

## Security

- AES-256 encryption for private keys
- Rate limiting on all API endpoints
- Input validation on all user inputs
- Security headers via middleware
- Auto-liquidation engine (5s interval)
- Safety margin (5%) on all positions
- Circuit breaker for price anomalies

## License

MIT
