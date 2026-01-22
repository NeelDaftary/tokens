# Token Design Toolkit - Project Scratchpad

## Background and Motivation

Building a comprehensive web application called **Token Design Toolkit** that guides users through designing and modeling crypto token economics. The app enables users to:

1. **Step 1**: Select domain presets (DeFi/DePIN/L1/L2) and configure token distribution & emission schedules
2. **Step 2**: Model token demand over time (simple or composed from multiple sources)
3. **Step 3**: Estimate market cap using comparable projects
4. **Step 4**: Model sell pressure from different allocation groups
5. **Global**: Compare designs using standardized XLSX export/import

The tool helps token designers, founders, and investors understand token economics before launch by modeling supply, demand, and sell pressure dynamics.

## Key Challenges and Analysis

### Technical Challenges
1. **Complex calculations**: Monthly vesting schedules with various unlock frequencies, cliff periods, and TGE unlocks
2. **Data relationships**: Multiple interconnected models (distribution → emissions → demand → sell pressure → market cap)
3. **Chart rendering**: Multiple time series charts (stacked area, line, donut) that update reactively
4. **Export/import integrity**: XLSX format must preserve all project state for perfect restoration
5. **Validation logic**: Allocation percentages must sum to 100, vesting parameters must be valid

### UX Challenges
1. **Multi-step workflow**: Users need to see progress and be able to navigate between steps
2. **Real-time updates**: Charts and summaries must update as users edit parameters
3. **Comparison feature**: Overlay charts and diff tables across multiple projects
4. **Preset management**: Domain presets must be editable after loading

### Architecture Decisions
- **Next.js App Router**: Modern React framework with server components
- **SQLite + Prisma**: Simple local DB, easy to migrate to Postgres later
- **shadcn/ui**: Consistent, accessible component library
- **Recharts**: Flexible charting library for all visualization needs
- **SheetJS/exceljs**: XLSX generation and parsing

## High-level Task Breakdown

### Phase 1: Project Setup & Foundation
- [ ] **Task 1.1**: Scaffold Next.js project with TypeScript, Tailwind, shadcn/ui
  - Success criteria: `pnpm dev` runs, shadcn components accessible
- [ ] **Task 1.2**: Set up Prisma with SQLite schema for TokenProject and related models
  - Success criteria: Schema defined, migrations run, DB connection works
- [ ] **Task 1.3**: Create preset data files (domain presets, sell presets, comps dataset)
  - Success criteria: JSON files exist with all required presets

### Phase 2: Core Data Model & CRUD
- [ ] **Task 2.1**: Implement TokenProject CRUD API routes
  - Success criteria: Create, read, update, delete projects via API
- [ ] **Task 2.2**: Implement DistributionGroup CRUD (nested under projects)
  - Success criteria: Add/edit/delete groups, validate allocation sums
- [ ] **Task 2.3**: Implement vesting calculation engine (monthly resolution)
  - Success criteria: Given group params, returns monthly unlock series

### Phase 3: Step 1 - Distribution & Emissions
- [ ] **Task 3.1**: Build domain selector UI with preset loader
  - Success criteria: Select domain → loads preset groups into form
- [ ] **Task 3.2**: Build editable distribution table with validation
  - Success criteria: Edit groups, see allocation sum, normalize button works
- [ ] **Task 3.3**: Build emission schedule editor (vesting params per group)
  - Success criteria: Edit TGE%, cliff, vest months, frequency per group
- [ ] **Task 3.4**: Build summary panel (stats, distribution preview charts)
  - Success criteria: Shows totals, internal/external breakdown, donut charts
- [ ] **Task 3.5**: Build unlock schedule chart (stacked area over months)
  - Success criteria: Chart updates live when vesting params change

### Phase 4: Step 2 - Demand Modeling
- [ ] **Task 4.1**: Build simple demand input UI (USD or tokens per month)
  - Success criteria: Toggle mode, input values, see monthly series
- [ ] **Task 4.2**: Build composed demand component system
  - Success criteria: Add/remove components, configure params per type
- [ ] **Task 4.3**: Implement demand calculation engine
  - Success criteria: Generates monthly demand series (tokens/USD)
- [ ] **Task 4.4**: Build demand charts (demand over time, demand vs supply)
  - Success criteria: Two charts render correctly, update on param changes

### Phase 5: Step 3 - Market Cap Estimation
- [ ] **Task 5.1**: Build comparable projects picker UI
  - Success criteria: Select 2-3 comps, identify leader, set achievable %
- [ ] **Task 5.2**: Implement market cap calculation logic
  - Success criteria: Computes mcap/FDV at launch based on comps + %
- [ ] **Task 5.3**: Build market cap results UI
  - Success criteria: Shows estimated mcap, FDV, implied token price

### Phase 6: Step 4 - Sell Pressure Modeling
- [ ] **Task 6.1**: Build sell pressure table (per group configuration)
  - Success criteria: Edit cost basis, FDV, preset, toggle sell pressure
- [ ] **Task 6.2**: Implement sell pressure calculation engine
  - Success criteria: Computes monthly sell tokens/USD per group
- [ ] **Task 6.3**: Build stacked sell pressure chart
  - Success criteria: Shows cumulative USD outflow by group over time

### Phase 7: Comparison Feature
- [ ] **Task 7.1**: Build compare drawer UI (project selector)
  - Success criteria: Select 1-3 saved projects, open comparison view
- [ ] **Task 7.2**: Build overlay charts (supply, demand, sell pressure)
  - Success criteria: Multiple projects shown on same chart with legends
- [ ] **Task 7.3**: Build metrics diff table
  - Success criteria: Side-by-side comparison of key metrics

### Phase 8: Export/Import
- [ ] **Task 8.1**: Implement XLSX export with all sheets
  - Success criteria: Generates XLSX with Meta, Distribution, Vesting, UnlockSchedule, DemandModel, MarketCap, SellPressure, SnapshotJSON sheets
- [ ] **Task 8.2**: Implement XLSX import (read SnapshotJSON)
  - Success criteria: Import XLSX → recreates project exactly

### Phase 9: Testing & Polish
- [ ] **Task 9.1**: Write tests for vesting calculations
  - Success criteria: Tests cover cliff, vesting, frequency variations
- [ ] **Task 9.2**: Write tests for allocation validation
  - Success criteria: Tests verify sum=100, normalize function
- [ ] **Task 9.3**: Write tests for export/import integrity
  - Success criteria: Export → import → project matches original
- [ ] **Task 9.4**: End-to-end testing of all steps
  - Success criteria: Complete workflow from Step 1 → 4 → export → import → compare

## Project Status Board

- [ ] Phase 1: Project Setup & Foundation (in progress)
- [ ] Phase 2: Core Data Model & CRUD
- [ ] Phase 3: Step 1 - Distribution & Emissions
- [ ] Phase 4: Step 2 - Demand Modeling
- [ ] Phase 5: Step 3 - Market Cap Estimation
- [ ] Phase 6: Step 4 - Sell Pressure Modeling
- [ ] Phase 7: Comparison Feature
- [ ] Phase 8: Export/Import
- [ ] Phase 9: Testing & Polish

## Current Status / Progress Tracking

**Status**: Tab 1 (Distribution & Emissions), Tab 2 (Token Demand and Sell Pressure), and Tab 3 (Staking Program Designer) complete. Three-tab navigation working. Tab 1 has full dark mode UI with distribution groups (add/delete/edit), per-group color pickers, pie chart with 2 modes, and stacked bar chart for unlocks. Tab 2 has demand modeling, sell pressure configuration, and three charts for market pressure analysis. Tab 3 has comprehensive staking simulation across 5 archetypes with demand modeling, yield calculations, and stress testing.

**Last Updated**: 📋 PLANNING - Market Maker Contract UI Revamp (Step 5 in Liquidity Tab)

### ✅ Completed: Tab 4: DePIN Simulation Module
1. **Complete Type System** (`/types/depin.ts` - 327 lines): All DePIN types, demand scenarios, macro conditions, provider states, protocol parameters, aggregation structures
2. **6 Production Presets** (`/data/presets/depinPresets.ts` - 326 lines): Baseline Growth, Bear Market Stress Test, High Burn/Low Mint, Incentive Launch, Volatile Market, Minimal Burn scenarios
3. **Core Simulation Engine** (`/lib/depinSimulation.ts` - 550+ lines): Full TypeScript port of radCAD model including:
   - Seeded RNG with Poisson, lognormal, normal, uniform distributions
   - Demand generation for 4 scenarios (consistent, growth, high_to_decay, volatile)
   - Provider dynamics (onboarding, exits, capacity/cost distributions)
   - Protocol service & token flows (mint/burn mechanics, reward distribution)
   - Pricing mechanisms (service price elasticity, token price response to flows)
   - Macro dynamics (bullish/bearish/sideways drift)
   - Complete simulation runner with deterministic seeding
4. **Aggregation & Validation** (`/lib/depinAggregation.ts` - 340 lines): Statistical aggregation (mean/std/percentiles), config validation, histogram generation, warning detection
5. **Full UI Page** (`/app/depin/page.tsx` - 600+ lines): Complete DePIN simulation interface with:
   - 6 Scenario preset buttons
   - Configuration panels (token, demand, macro, protocol, provider params)
   - Simulation controls (timesteps, runs, seed, raw data toggle)
   - Run simulation button with validation
   - Error and warning displays
6. **6 Standard Charts**: Token Price, Circulating Supply, Demand, Providers, Capacity, Service Price (all with mean/std shading)
7. **Advanced Visualizations**: 
   - Spaghetti plots (per-run traces for all metrics)
   - 3 Histogram charts (final token price, supply, providers distributions)
   - Collapsible advanced section
8. **Export Features**: JSON and CSV export with full metadata
9. **Integration**: Linked from main toolkit with navigation buttons

### Completed: Tab 3: Staking Program Designer
(Previous updates below...)

### Tab 3: Staking Program Designer
1. **Complete Type System** (`/types/staking.ts`): 327 lines defining all staking models, 5 archetypes (Consensus L1/L2, DeFi, Liquid Staking, Restaking, veGovernance), price scenarios, rewards sources, staking mechanics, demand models, and risk assumptions
2. **Computation Engine** (`/lib/stakingEngine.ts`): 417 lines of staking dynamics simulation including:
   - Dynamic staking ratio calculation using sigmoid demand elasticity curve
   - Price scenario modeling (flat, bull/base/bear, custom series)
   - Multi-source rewards (inflation, fees, other streams)
   - Net APR with operator commission, risk penalties, lockup costs
   - LST/Restaking/veGovernance cohort yield calculations
   - Stress test scenarios (rate hike, fee drawdown, price crash, slash event)
3. **6 Production-Ready Presets**: L1 PoS Conservative, L1 PoS Aggressive, DeFi Emissions Farm, App Bond Required, Liquid Staking Enabled, veTokenomics
4. **Comprehensive UI** (`/components/StakingTab.tsx`): Full input/output interface with:
   - Archetype selector with hybrid mode toggle
   - Preset loader with descriptions
   - Input panels: Token & Supply, Time Config, Rewards (inflation/fees), Staking Mechanics, Demand Model
   - Advanced settings for risk parameters
   - KPI cards: Staking Ratio, Avg Net APR, Stake Value, Real Yield %
   - Charts: Staking Ratio Over Time (actual vs target), Gross vs Net APR
   - Cohort yields table for LST/Restaking/ve participants
   - One-click stress tests with alert summaries
5. **Integration**: Added as third tab in main navigation, seamlessly integrated with existing UI

### Previous: Tab 2: Sell Pressure
1. **Sell Pressure Types**: Added SellPressureConfig with 4 presets (Not a Seller 0%, Conservative 10-20%, Moderate 20-50%, Aggressive 50-80%)
2. **SellPressureTable Component**: Interactive table with cost basis input, implied FDV calculation, preset dropdown, and Yes/No toggles matching user's design mockup
3. **Calculation Engine**: Profit multiplier logic (adjusts sell rate based on ROI: <1x=0.5×, 1-5x=1.0×, 5-20x=1.5×, 20-100x=2.0×, 100x+=3.0×), price-dependent selling (±20% based on price trajectory), per-group sell pressure computation from unlock schedule
4. **Three Charts**: (a) Demand chart (green stacked bars), (b) Sell Pressure chart (red stacked bars by group), (c) Net Pressure chart (diverging bars showing positive=bullish/negative=bearish)
5. **Summary Stats Panel**: Displays total demand, total sell pressure, D/S ratio, sentiment score (0-100), peak sell month, highest/lowest risk groups, equilibrium month
6. **API Integration**: Sell pressure configs persist to/from sellPressureModel JSON field, auto-sync with distribution groups via useEffect, current token price configurable

## Executor's Feedback or Assistance Requests

- Dev note: use Node 20 (`nvm use 20`) when running Prisma commands. Prisma 5.21 used to keep SQLite + simple schema support (stringified JSON).

## Lessons

- Prisma 7 on Node 22 raised ESM issues and new config requirements; downgrading to Prisma 5.21 with Node 20 avoided it.
- SQLite connector doesn't support Decimal/Json/enums directly; store numbers as Float and JSON as String for MVP simplicity.
- Tab navigation requires wrapping multiple sibling sections in React fragments (<>) to satisfy JSX single parent requirement.
- Recharts Tooltip formatter needs to handle undefined values explicitly: `(value: number | undefined) => value ? fmt(value) : ''`
- Pie chart label function needs proper typing: `label={(entry: any) => ...}` to avoid type errors with Recharts.
- For modular demand calculations, separating calculation logic into a lib file (`demandCalculations.ts`) keeps the main component clean and testable.
- When implementing multiple similar components (9 demand sources), a single reusable component with type switching (DemandSourceCard) is more maintainable than 9 separate components.
- Green color palette for demand chart generated using HSL: `hsl(${120 + idx * 15}, 70%, ${45 + idx * 5}%)` provides good variation in green shades.
- Sell pressure calculation requires syncing with unlock schedule: use `unlocks.byGroup` to get per-group monthly unlocked tokens, then apply sell percentage and profit multipliers.
- Diverging bar charts (positive/negative values) in Recharts require using `<Cell>` component to conditionally color each bar based on data value.
- Profit-based multipliers make sell pressure more realistic: early investors with 100x returns are 3x more likely to sell than base rate, while those at a loss are 0.5x as likely.
- Cost basis and implied FDV provide crucial context for sell pressure modeling: $0.001 seed vs $0.10 public sale results in vastly different selling behavior at same token price.
- Staking demand modeling benefits from yield-spread-to-participation sigmoid curves: enables realistic simulation of how stakers respond to net APR vs opportunity cost.
- Separating computation engine from UI allows for complex multi-step calculations (price series → rewards → APR → demand target → actual staking ratio) to be pure functions, easily testable and debuggable.
- Stress tests as one-click buttons with alert outputs provide immediate insights: designers can quickly see impact of rate hikes, fee drawdowns, price crashes without manual parameter tweaking.
- Cohort modeling (LST, Restaking, ve) adds depth: different participant types with different yield profiles and lockup requirements show the full complexity of modern staking systems.
- DePIN simulation ported from Python radCAD to TypeScript: full feature parity achieved with deterministic seeding, provider dynamics, token flows, and statistical aggregation across Monte Carlo runs.
- Next.js 16 breaking change: params in API routes are now Promise<{id}> instead of {id}, requiring `const {id} = await params` pattern.
- Recharts Bar fill prop no longer accepts functions in newer versions; use Cell components inside Bar for conditional coloring.
- TypeScript config spreading with dynamic keys needs type assertions: `{...config, [field]: value} as ConfigType` to maintain type safety.
- All 4 major tabs (Distribution, Demand/Sell, Staking, DePIN) now complete with full UI, calculations, charts, and persistence. Dev server running successfully at http://127.0.0.1:3001.
- Code bloat reduction: Extracting reusable components (NumberInput, ConfigSection, DePINChart) reduced main page.tsx from 847 to 599 lines (29% reduction, -248 lines). Created 3 small components totaling 143 lines for net -105 line reduction while dramatically improving maintainability and readability.
- Repetitive input fields benefit from NumberInput wrapper: handles NaN edge cases, consistent styling, and reduces duplication. 20+ inputs replaced with clean single-line calls.
- Chart components with prop-based configuration: DePINChart handles both area and line charts with 6 metrics using just ~80 lines vs 160+ lines of duplicated JSX per chart.
- Debug code removal: Excessive console.logs and debug UI boxes were useful during development but add noise in production. Remove after features stabilize.
- Further simplification: Removed advanced visualizations (spaghetti plots, histograms) reduced page.tsx from 599 to 493 lines. Focus on essential 6 charts that provide core insights.
- DePIN simulation chicken-and-egg bug: Provider onboarding checks `expectedRevenue = capacity × rewardRate × tokenPrice`. When network starts with 0 providers, rewardRate=0, so expectedRevenue=0, and no providers ever onboard. Fix: bootstrap logic allows early providers to onboard based on potential future rewards when totalCapacity=0.
- User feedback is critical: Added progress indicator (blue box during simulation), success banner (green box with stats), empty state placeholder, and auto-scroll to results. Users need to know: 1) What's happening now, 2) When it's done, 3) Where to look for results.
- Scalable navigation architecture: Moved specialized simulators from main tab bar to a right sidebar drawer. Core token design tools (Distribution, Demand, Staking) stay in tabs, while simulators (DePIN, future tools) are accessible via "⚡ Simulators" button. Sidebar includes categorized list with descriptions, coming soon badges, and smooth animations. This pattern scales to 10+ simulators without UI clutter.
- Simulator registry pattern: Created central config file (simulators.ts) that acts as single source of truth for all simulators. Adding new tools requires only updating this registry - sidebar automatically renders new items. Includes metadata (name, description, category, icon, route, enabled status) for easy management.
- Premium design system implementation: Replaced generic emoji icons with professional Heroicons SVG line icons. Added Vercel-style glassmorphism cards with gradient borders per category (blue→indigo for Protocol, green→teal for DeFi, etc.). Implemented depth through layered shadows and subtle background gradients. Cards scale and glow on hover for premium feel.
- Enhanced input system with real-time validation: Created EnhancedInput component with live validation feedback (green checkmark for valid, red warning for invalid), focus ring glows (blue/green/red based on state), prefix/suffix support for currency/percentages, tooltip help text, and smooth animations. Inputs feel responsive and provide clear feedback to users.
- Typography system: Configured Geist font from Vercel with proper font-smoothing. Implemented consistent scale (Hero 32px/bold, Title 24px/semibold, Heading 16px/semibold, Body 14px, Caption 12px) with tight tracking for modern look. All components updated to use font-semibold and font-bold for better hierarchy.
- Midnight color palette: Deeper backgrounds than default neutrals (#0A0A0F primary, #13131A surfaces, #1F1F28 elevated). Borders use rgba(255,255,255,0.05-0.1) for subtlety. Text uses #E5E5E7 primary and #8B8B96 secondary. Creates more premium, less flat appearance compared to generic grays.
- Demand Drivers Architecture: Created shared module contract system (`demandDrivers/shared.ts`) with standard inputs (P[t], S_circ[t], optional Users/FeesUSD/VolumeUSD) and outputs (buy_tokens, hold_tokens, spend_tokens, burn_tokens, sell_tokens, debug). Common helpers include saturating adoption curve and adoption speed presets (slow/medium/fast). Token Buybacks driver (`demandDrivers/buybacks.ts`) implements all three revenue models: (A) Target end revenue with logistic tail stagnation, (B) Initial + growth with tail flatten, (C) Ramp → Peak → Stabilize with shape parameter. Buybacks driver properly calculates buy pressure, burn vs treasury split, and outputs all standard metrics.
- Staking Demand Driver: Implemented comprehensive staking driver (`demandDrivers/staking.ts`) following shared module contract. Features: (1) Saturating adoption curve f_target[t] = f_max * (1 - exp(-k*t)) with state tracking S_staked[t], (2) Two reward mechanisms: Emissions (token minting with sell pressure) and Revenue Share (fee-based yield with APY calculation), (3) Proper outputs: hold_tokens (sink demand), buy_tokens (market purchases), sell_tokens (from emissions), (4) Debug metrics include staked amount, emissions, APY. UI updated with new inputs: f_max, adoption speed, market buy share, reward mechanism toggle, emission schedule presets, revenue share percentage. State properly tracks cumulative staking over time.
- Locking for Yield Driver: Implemented ve/escrow locking driver (`demandDrivers/locking.ts`) as stronger float sink than staking. Features: (1) Saturating adoption curve f_lock_target[t] = f_lock_max * (1 - exp(-k*t)) with state tracking S_locked[t], (2) Optional unlock approximation (leaky bucket): Unlock[t] ≈ S_locked[t-1] / D_months for realistic token release over time, (3) Lock duration presets: Short (3mo), Medium (12mo), Long (36mo), or Custom, (4) Outputs: hold_tokens (net locked), buy_tokens (only new locks), (5) State properly tracks cumulative locked tokens with unlock effects. UI includes max locked ratio, adoption speed, lock duration preset/input, market buy share, and unlock approximation toggle.
- Fee Discounts Driver: Implemented hold-to-unlock fee discounts driver (`demandDrivers/feeDiscounts.ts`) as stock demand driver. Features: (1) Two configuration approaches: Manual Tier Uptake (tiers with H_i tokens and p_i user %) and Segment Mapping (retail/pro/whale segments with tier choices), (2) Manual tier: HoldFee[t] = U[t] * Σ(p_i * H_i), (3) Segment mapping: HoldFee[t] = U[t] * (share_r*H_r + share_p*H_p + share_w*H_w), (4) Automatic normalization of tier percentages and segment shares to 100%, (5) Outputs: hold_tokens (total hold requirement), buy_tokens (only on increases), (6) Buy pressure only on increases: m * max(0, HoldFee[t] - HoldFee[t-1]). UI supports both approaches with tier table editor, segment distribution inputs, tier requirements, and segment tier choices.
- Payment Token Driver: Implemented payment token driver (`demandDrivers/payment.ts`) for tokens used to pay for actions/fees/subscriptions. Features: (1) Two spend basis options: Direct USD spend or Activity-based (Users × Actions × USD/Action), (2) Base spend: SpendTokens[t] = SpendUSD[t] / P[t], (3) Wallet inventory: hold_tokens[t] = (B/30) * SpendTokens[t] where B is buffer days (default 7-14), (4) Pay-fees-in-token sub-feature: FeesPayUSD[t] = opt_in_share * FeesUSD[t] * (1 - d_pay), adds to spend_tokens, adjusts net fees for buybacks/revshare elsewhere, (5) Outputs: spend_tokens (primary), hold_tokens (inventory), (6) Guardrails: Separate from gas token (product spend vs gas spend). UI includes spend basis selector, direct/activity inputs, buffer days slider, and pay-fees-in-token toggle with opt-in share and discount inputs.
- Collateral in DeFi Driver: Implemented collateral driver (`demandDrivers/collateral.ts`) with market-cap ceiling. Features: (1) Borrow USD can be constant or adoption curve to target, (2) Core calculations: NeedUSD[t] = BorrowUSD[t] * CR, McapUSD[t] = P[t] * S_circ[t], CeilingUSD[t] = c_mcap * McapUSD[t], PostedUSD[t] = min(NeedUSD[t], CeilingUSD[t]), CollatTokens[t] = PostedUSD[t] / P[t], (3) Market cap ceiling prevents unrealistic collateral demand (default 2-10% of mcap), (4) Outputs: hold_tokens (collateral locked), buy_tokens (only on increases), (5) State tracking for buy pressure: m * max(0, CollatTokens[t] - CollatTokens[t-1]). UI includes borrow USD/target with adoption curve toggle, collateral ratio input, market cap ceiling slider, and market buy share. Acceptance test: Tiny c_mcap clamps collateral even if BorrowUSD grows fast.
- Token-Gated Features Driver: Implemented token-gated driver (`demandDrivers/tokenGated.ts`) for simple stock demand. Features: (1) Gated users can be constant or adoption curve (saturation), (2) Core calculation: GateHold[t] = U_gate[t] * H_gate, (3) Outputs: hold_tokens (total requirement), buy_tokens (only on increases), (4) Buy pressure only on increases: m * max(0, GateHold[t] - GateHold[t-1]), (5) State tracking for incremental buy pressure. UI includes gated users input with adoption curve toggle, tokens required per user, and market buy share. Acceptance test: Doubling H_gate doubles hold_tokens.
- Gas Token Driver: Implemented gas token driver (`demandDrivers/gas.ts`) for chain throughput-driven spend demand. Features: (1) Transaction count can be constant or adoption curve (tx_peak + speed), (2) Fee presets: Low (0.001), Medium (0.01), High (0.1) tokens/tx, or Custom, (3) Core calculation: GasSpend[t] = tx_count[t] * fee_native_per_tx, (4) Outputs: spend_tokens (primary), burn_tokens (burn_frac * GasSpend[t]), (5) Optional wallet buffer: hold_tokens[t] = (B/30)*GasSpend[t] for "people hold gas" effect, (6) Guardrails: Separate from payment token (gas spend vs product spend). UI includes tx count/peak with adoption curve toggle, fee preset selector, burn fraction input, and optional wallet buffer toggle. Acceptance test: Increasing tx_count increases spend_tokens linearly.
- Bonding Curve / AMM Base-Pair Sink Driver: Implemented bonding curve driver (`demandDrivers/bondingCurve.ts`) for launchpad liquidity sink. Features: (1) Launches per month can be constant or adoption curve (launch_peak + speed), (2) Core calculation (v0): ΔLocked[t] = N_launch[t] * L_seed_native * l_lock, (3) Optional decay/unlock: λ = ln(2)/unlock_half_life, Locked[t] = Locked[t-1]*exp(-λ) + ΔLocked[t], (4) Outputs: hold_tokens (locked sink), buy_tokens (m * ΔLocked[t]), (5) State tracking for cumulative locked with optional exponential decay, (6) Stickiness slider (l_lock 0-100%) controls fraction of seeded liquidity that stays locked. UI includes launches/peak with adoption curve toggle, seed native tokens per launch, stickiness slider, optional decay toggle with half-life input, and market buy share (default 70%). Acceptance tests: Doubling launches doubles locked sink; with long half-life, net locked monotonically increases.

