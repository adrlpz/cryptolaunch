-- AlterTable
ALTER TABLE "launchpad_projects" ADD COLUMN     "description" TEXT,
ADD COLUMN     "logo_url" VARCHAR(500),
ADD COLUMN     "social_links" JSONB,
ADD COLUMN     "website_url" VARCHAR(500),
ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "liquidation_logs" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "liquidity_pools" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "margin_positions" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "token_launches" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "vanity_jobs" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "whitelists" ALTER COLUMN "id" DROP DEFAULT;
