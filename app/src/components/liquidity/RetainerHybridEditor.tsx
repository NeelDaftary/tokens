"use client";

import EnhancedInput from "@/components/EnhancedInput";

type Props = {
  retainerMonthlyUsd: number;
  assetDeploymentModel: "ClientFunded" | "ProfitShare" | undefined;
  liquidityFundingStablesUsd: number;
  liquidityFundingTokensUsd: number;
  contractDurationMonths: number;
  profitSharePct: number;
  onChange: (updates: {
    retainerMonthlyUsd?: number;
    assetDeploymentModel?: "ClientFunded" | "ProfitShare";
    liquidityFundingStablesUsd?: number;
    liquidityFundingTokensUsd?: number;
    contractDurationMonths?: number;
    profitSharePct?: number;
  }) => void;
};

export default function RetainerHybridEditor({
  retainerMonthlyUsd,
  assetDeploymentModel,
  liquidityFundingStablesUsd,
  liquidityFundingTokensUsd,
  contractDurationMonths,
  profitSharePct,
  onChange,
}: Props) {
  return (
    <div className="space-y-6">
      {/* Info Box */}
      <div className="rounded-lg border border-blue-600/30 bg-blue-600/10 p-4 text-sm text-neutral-300">
        <div className="font-semibold text-blue-400 mb-2">Retainer / Hybrid Model</div>
        <p>
          Used when the protocol pays a monthly fee and/or provides the inventory (tokens + stables) for the MM to trade.
          This model provides predictable costs and can include profit-sharing arrangements.
        </p>
      </div>

      {/* Monthly Retainer Fee */}
      <EnhancedInput
        label="Monthly Retainer Fee (USD)"
        value={retainerMonthlyUsd}
        onChange={(value) => onChange({ retainerMonthlyUsd: value })}
        type="currency"
        min={0}
        placeholder="5000"
        helpText="Per exchange or flat fee. Typical range varies based on tier and scope."
      />

      {/* Asset Deployment Model */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-white tracking-tight block">
          Asset Deployment Model
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <button
            onClick={() => onChange({ assetDeploymentModel: "ClientFunded" })}
            className={`rounded-xl border-2 p-4 text-left transition-all ${
              assetDeploymentModel === "ClientFunded"
                ? "border-blue-500 bg-blue-500/10"
                : "border-white/[0.1] bg-[rgba(15,20,28,0.5)] hover:border-cyan-500/30"
            }`}
          >
            <div className="text-sm font-semibold text-white">Client Funded</div>
            <div className="mt-1 text-xs text-neutral-400">
              Client provides both Tokens + Stables for MM to trade
            </div>
          </button>
          <button
            onClick={() => onChange({ assetDeploymentModel: "ProfitShare" })}
            className={`rounded-xl border-2 p-4 text-left transition-all ${
              assetDeploymentModel === "ProfitShare"
                ? "border-blue-500 bg-blue-500/10"
                : "border-white/[0.1] bg-[rgba(15,20,28,0.5)] hover:border-cyan-500/30"
            }`}
          >
            <div className="text-sm font-semibold text-white">Profit Share</div>
            <div className="mt-1 text-xs text-neutral-400">
              Client provides Tokens; MM provides Stables
            </div>
          </button>
        </div>
      </div>

      {/* Liquidity Funding Requirements */}
      {assetDeploymentModel && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Liquidity Funding Requirements</h3>

          {/* Stablecoins - only show for Client Funded */}
          {assetDeploymentModel === "ClientFunded" && (
            <EnhancedInput
              label="Stablecoins Required (USD)"
              value={liquidityFundingStablesUsd}
              onChange={(value) => onChange({ liquidityFundingStablesUsd: value })}
              type="currency"
              min={0}
              placeholder="120000"
              helpText="USD amount of stablecoins required for liquidity provision"
            />
          )}

          {/* Tokens - show for both models */}
          <EnhancedInput
            label={`Tokens Required ${assetDeploymentModel === "ClientFunded" ? "(USD Value)" : "(USD Value or Token Amount)"}`}
            value={liquidityFundingTokensUsd}
            onChange={(value) => onChange({ liquidityFundingTokensUsd: value })}
            type="currency"
            min={0}
            placeholder="120000"
            helpText={
              assetDeploymentModel === "ClientFunded"
                ? "USD value of tokens required for liquidity provision"
                : "USD value or token amount. Can be specified as percentage of supply or absolute token count."
            }
          />

          {/* Note for Profit Share */}
          {assetDeploymentModel === "ProfitShare" && (
            <div className="rounded-lg border border-green-600/30 bg-green-600/10 p-3 text-sm">
              <div className="flex items-center gap-2 text-green-400 mb-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-semibold">MM Provides Stablecoins</span>
              </div>
              <p className="text-neutral-300">
                In Profit Share model, the market maker provides their own stablecoins. You only need to provide tokens.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Contract Duration */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-white tracking-tight">
          Contract Duration (Months)
        </label>
        <select
          value={contractDurationMonths}
          onChange={(e) => onChange({ contractDurationMonths: parseInt(e.target.value) || 12 })}
          className="rounded-lg border border-white/10 bg-gradient-to-br from-white/[0.02] to-transparent px-3 py-3 text-sm font-medium text-white focus:border-blue-500 focus:outline-none focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] transition-all"
        >
          <option value={3}>3 months</option>
          <option value={6}>6 months</option>
          <option value={12}>12 months (standard)</option>
          <option value={18}>18 months</option>
          <option value={24}>24 months</option>
        </select>
        <p className="text-xs text-neutral-500">Standard duration is typically 12 months</p>
      </div>

      {/* Profit Share % - only show for Profit Share model */}
      {assetDeploymentModel === "ProfitShare" && (
        <EnhancedInput
          label="Profit Share %"
          value={profitSharePct}
          onChange={(value) => onChange({ profitSharePct: value })}
          type="percentage"
          min={0}
          max={100}
          placeholder="20"
          helpText="Percentage of NAV increase shared with MM"
        />
      )}
    </div>
  );
}
