-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "wallet_address" VARCHAR(42) NOT NULL,
    "email" VARCHAR(255),
    "balance" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "total_margin_debt" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "launchpad_projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "launch_id" UUID,
    "token_name" VARCHAR(50) NOT NULL,
    "token_symbol" VARCHAR(10) NOT NULL,
    "contract_address" VARCHAR(42),
    "token_price" DECIMAL(20,8) NOT NULL,
    "total_supply" DECIMAL(30,8) NOT NULL,
    "available_supply" DECIMAL(30,8) NOT NULL,
    "chain" VARCHAR(50) NOT NULL,
    "max_leverage_percent" INTEGER NOT NULL DEFAULT 50,
    "margin_fee_percent" DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    "safety_margin_percent" DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    "lp_status" VARCHAR(20) NOT NULL DEFAULT 'none',
    "lp_contract_address" VARCHAR(42),
    "dex_name" VARCHAR(30),
    "status" VARCHAR(20) NOT NULL DEFAULT 'upcoming',
    "launch_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "launchpad_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liquidity_pools" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "chain" VARCHAR(50) NOT NULL,
    "pool_address" VARCHAR(42),
    "base_price" DECIMAL(20,12),
    "slope" DECIMAL(20,15),
    "graduation_cap" DECIMAL(20,8),
    "current_reserve_token" DECIMAL(30,8) NOT NULL DEFAULT 0,
    "current_reserve_native" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "total_sold" DECIMAL(30,8) NOT NULL DEFAULT 0,
    "total_raised" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "is_graduated" BOOLEAN NOT NULL DEFAULT false,
    "dex_name" VARCHAR(30),
    "dex_pair_address" VARCHAR(42),
    "lp_token_address" VARCHAR(42),
    "token_reserve" DECIMAL(30,8),
    "native_reserve" DECIMAL(20,8),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "liquidity_pools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "margin_positions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "modal" DECIMAL(20,8) NOT NULL,
    "leverage_percent" INTEGER NOT NULL,
    "debt_amount" DECIMAL(20,8) NOT NULL,
    "fee_amount" DECIMAL(20,8) NOT NULL,
    "total_cost" DECIMAL(20,8) NOT NULL,
    "coins_purchased" DECIMAL(30,8) NOT NULL,
    "purchase_price" DECIMAL(20,8) NOT NULL,
    "liquidation_price" DECIMAL(20,8) NOT NULL,
    "safety_margin" DECIMAL(20,8) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'open',
    "pnl" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "liquidated_at" TIMESTAMP(3),
    CONSTRAINT "margin_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liquidation_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "position_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "trigger_price" DECIMAL(20,8) NOT NULL,
    "coins_sold" DECIMAL(30,8) NOT NULL,
    "sale_proceeds" DECIMAL(20,8) NOT NULL,
    "debt_repaid" DECIMAL(20,8) NOT NULL,
    "user_refund" DECIMAL(20,8),
    "platform_loss" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "liquidation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_launches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "creator_id" UUID NOT NULL,
    "project_id" UUID,
    "token_name" VARCHAR(50) NOT NULL,
    "token_symbol" VARCHAR(10) NOT NULL,
    "decimals" INTEGER NOT NULL DEFAULT 18,
    "total_supply" DECIMAL(30,8) NOT NULL,
    "description" TEXT,
    "logo_url" VARCHAR(500),
    "website_url" VARCHAR(500),
    "social_links" JSONB,
    "base_price" DECIMAL(20,12) NOT NULL,
    "graduation_cap" DECIMAL(20,8) NOT NULL,
    "launch_date" TIMESTAMP(3) NOT NULL,
    "max_leverage_percent" INTEGER NOT NULL DEFAULT 50,
    "vanity_suffix" VARCHAR(10) NOT NULL DEFAULT '51131',
    "contract_address" VARCHAR(42),
    "vanity_generated_at" TIMESTAMP(3),
    "deploy_tx_hash" VARCHAR(66),
    "deployed_at" TIMESTAMP(3),
    "network" VARCHAR(50) NOT NULL DEFAULT 'bsc',
    "deploy_fee_native" DECIMAL(20,8),
    "deploy_fee_paid" BOOLEAN NOT NULL DEFAULT false,
    "platform_fee_percent" DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    "platform_fee_amount" DECIMAL(20,8),
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "token_launches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vanity_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "launch_id" UUID NOT NULL,
    "target_suffix" VARCHAR(10) NOT NULL,
    "attempts" BIGINT NOT NULL DEFAULT 0,
    "max_attempts" BIGINT NOT NULL DEFAULT 10000000,
    "found_address" VARCHAR(42),
    "status" VARCHAR(20) NOT NULL DEFAULT 'running',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "worker_id" VARCHAR(50),
    CONSTRAINT "vanity_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whitelists" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "wallet_address" VARCHAR(42) NOT NULL,
    "max_allocation" DECIMAL(20,8),
    "added_by" VARCHAR(42),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "whitelists_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_wallet_address_key" ON "users"("wallet_address");
CREATE UNIQUE INDEX "launchpad_projects_launch_id_key" ON "launchpad_projects"("launch_id");
CREATE UNIQUE INDEX "liquidity_pools_project_id_key" ON "liquidity_pools"("project_id");
CREATE UNIQUE INDEX "whitelists_project_id_wallet_address_key" ON "whitelists"("project_id", "wallet_address");

-- AddForeignKey
ALTER TABLE "launchpad_projects" ADD CONSTRAINT "launchpad_projects_launch_id_fkey" FOREIGN KEY ("launch_id") REFERENCES "token_launches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "liquidity_pools" ADD CONSTRAINT "liquidity_pools_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "launchpad_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "margin_positions" ADD CONSTRAINT "margin_positions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "margin_positions" ADD CONSTRAINT "margin_positions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "launchpad_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "liquidation_logs" ADD CONSTRAINT "liquidation_logs_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "margin_positions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "liquidation_logs" ADD CONSTRAINT "liquidation_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "token_launches" ADD CONSTRAINT "token_launches_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vanity_jobs" ADD CONSTRAINT "vanity_jobs_launch_id_fkey" FOREIGN KEY ("launch_id") REFERENCES "token_launches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "whitelists" ADD CONSTRAINT "whitelists_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "launchpad_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
