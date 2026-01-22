"use client";

import { useMemo } from "react";
import type { StrikeTranche } from "@/types/liquidity";
import EnhancedInput from "@/components/EnhancedInput";

type Props = {
  loanAmountPct: number;
  loanTermMonths: number;
  strikeTranches: StrikeTranche[];
  clientProvidesStables: boolean;
  monthlyFeeUsd: number;
  onChange: (updates: {
    loanAmountPct?: number;
    loanTermMonths?: number;
    strikeTranches?: StrikeTranche[];
    clientProvidesStables?: boolean;
    monthlyFeeUsd?: number;
  }) => void;
};

export default function LoanCallEditor({
  loanAmountPct,
  loanTermMonths,
  strikeTranches,
  clientProvidesStables,
  monthlyFeeUsd,
  onChange,
}: Props) {
  const strikeTranchesSum = useMemo(() => {
    return strikeTranches.reduce((sum, t) => sum + t.loanPct, 0);
  }, [strikeTranches]);

  const handleAddStrikeTranche = () => {
    const newTranche: StrikeTranche = {
      id: `strike-${Date.now()}`,
      loanPct: strikeTranches.length === 0 ? 100 : 0,
      strikeBasis: "TWAPMultiplier",
      twapMultiplier: 1.5,
    };
    onChange({ strikeTranches: [...strikeTranches, newTranche] });
  };

  const handleUpdateStrikeTranche = (index: number, updates: Partial<StrikeTranche>) => {
    const updated = [...strikeTranches];
    updated[index] = { ...updated[index], ...updates };
    onChange({ strikeTranches: updated });
  };

  const handleRemoveStrikeTranche = (index: number) => {
    const updated = strikeTranches.filter((_, i) => i !== index);
    onChange({ strikeTranches: updated });
  };

  return (
    <div className="space-y-6">
      {/* Info Box */}
      <div className="rounded-lg border border-purple-600/30 bg-purple-600/10 p-4 text-sm text-neutral-300">
        <div className="font-semibold text-purple-400 mb-2">Loan + Call Option Model</div>
        <p>
          Used when the MM borrows tokens and typically provides their own stablecoins (buy-side liquidity).
          The protocol loans tokens to the MM, who provides stablecoins for trading. Call options are granted
          at specific strike prices based on fixed valuations, current price multiples, or TWAP multipliers.
        </p>
      </div>

      {/* Loan Amount */}
      <EnhancedInput
        label="Loan Amount (% of Supply)"
        value={loanAmountPct}
        onChange={(value) => onChange({ loanAmountPct: value })}
        type="number"
        step="0.01"
        min={0}
        max={5}
        placeholder="1.00"
        helpText="Typical range: 0.75% - 1.2% of total supply"
      />

      {/* Loan Term */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-white tracking-tight">
          Loan Term (Months)
        </label>
        <select
          value={loanTermMonths}
          onChange={(e) => onChange({ loanTermMonths: parseInt(e.target.value) || 12 })}
          className="rounded-lg border border-white/10 bg-gradient-to-br from-white/[0.02] to-transparent px-3 py-3 text-sm font-medium text-white focus:border-blue-500 focus:outline-none focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] transition-all"
        >
          <option value={6}>6 months</option>
          <option value={12}>12 months (typical)</option>
          <option value={18}>18 months</option>
          <option value={24}>24 months</option>
        </select>
        <p className="text-xs text-neutral-500">Typically 12 months</p>
      </div>

      {/* Strike Price Structure */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Strike Price Structure</h3>
          <button
            onClick={handleAddStrikeTranche}
            className="text-sm text-blue-400 hover:text-blue-300 font-medium"
          >
            + Add Tranche
          </button>
        </div>

        {strikeTranches.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/[0.1] bg-[rgba(15,20,28,0.5)] p-6 text-center">
            <p className="text-sm text-neutral-400 mb-2">No strike tranches defined</p>
            <button
              onClick={handleAddStrikeTranche}
              className="text-sm text-blue-400 hover:text-blue-300 font-medium"
            >
              Add your first strike tranche
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {strikeTranches.map((tranche, index) => (
              <div
                key={tranche.id}
                className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent p-5 relative"
                style={{
                  boxShadow: "0 1px 3px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05)",
                }}
              >
                <button
                  onClick={() => handleRemoveStrikeTranche(index)}
                  className="absolute top-4 right-4 text-neutral-500 hover:text-red-400 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div className="space-y-4">
                  {/* % of Loan */}
                  <EnhancedInput
                    label={`Tranche ${index + 1} - % of Loan`}
                    value={tranche.loanPct}
                    onChange={(value) => handleUpdateStrikeTranche(index, { loanPct: value })}
                    type="number"
                    step="0.1"
                    min={0}
                    max={100}
                    placeholder="25"
                    helpText="Percentage of total loan assigned to this strike tranche"
                  />

                  {/* Strike Basis */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-white tracking-tight">
                      Strike Basis
                    </label>
                    <select
                      value={tranche.strikeBasis}
                      onChange={(e) =>
                        handleUpdateStrikeTranche(index, {
                          strikeBasis: e.target.value as StrikeTranche["strikeBasis"],
                        })
                      }
                      className="rounded-lg border border-white/10 bg-gradient-to-br from-white/[0.02] to-transparent px-3 py-3 text-sm font-medium text-white focus:border-blue-500 focus:outline-none focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] transition-all"
                    >
                      <option value="FixedPrice">Fixed Price (USD or FDV)</option>
                      <option value="CurrentPrice">Current Price Multiplier</option>
                      <option value="TWAPMultiplier">TWAP Multiplier</option>
                    </select>
                  </div>

                  {/* Conditional inputs based on strike basis */}
                  {tranche.strikeBasis === "FixedPrice" && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <EnhancedInput
                        label="Fixed Price (USD)"
                        value={tranche.fixedPriceUsd || 0}
                        onChange={(value) =>
                          handleUpdateStrikeTranche(index, { fixedPriceUsd: value })
                        }
                        type="currency"
                        placeholder="0.50"
                        helpText="Direct USD price per token"
                      />
                      <EnhancedInput
                        label="Fixed Price (FDV)"
                        value={tranche.fixedPriceFdv || 0}
                        onChange={(value) =>
                          handleUpdateStrikeTranche(index, { fixedPriceFdv: value })
                        }
                        type="currency"
                        placeholder="350000000"
                        helpText="Alternative: Specify as FDV in USD (e.g., $350m)"
                      />
                    </div>
                  )}

                  {tranche.strikeBasis === "CurrentPrice" && (
                    <EnhancedInput
                      label="Current Price Multiplier"
                      value={tranche.currentPriceMultiplier || 1.5}
                      onChange={(value) =>
                        handleUpdateStrikeTranche(index, { currentPriceMultiplier: value })
                      }
                      type="number"
                      step="0.1"
                      min={0.1}
                      placeholder="1.5"
                      helpText="Multiplier of current price (e.g., 1.5 = +50% above current)"
                    />
                  )}

                  {tranche.strikeBasis === "TWAPMultiplier" && (
                    <EnhancedInput
                      label="TWAP Multiplier"
                      value={tranche.twapMultiplier || 1.5}
                      onChange={(value) =>
                        handleUpdateStrikeTranche(index, { twapMultiplier: value })
                      }
                      type="number"
                      step="0.1"
                      min={0.1}
                      placeholder="1.5"
                      helpText="Multiplier of TWAP (e.g., 1.3 = 130% of TWAP, 1.5 = 150% of TWAP)"
                    />
                  )}
                </div>
              </div>
            ))}

            {/* Sum validation */}
            {Math.abs(strikeTranchesSum - 100) > 0.01 && (
              <div className="rounded-lg border border-yellow-600/30 bg-yellow-600/10 p-3 text-sm">
                <div className="flex items-center gap-2 text-yellow-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <span className="font-semibold">Strike tranches sum to {strikeTranchesSum.toFixed(1)}%</span>
                </div>
                <p className="mt-1 text-neutral-300">
                  Strike tranches should sum to 100% of the loan. Current sum: {strikeTranchesSum.toFixed(1)}%
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Client Stablecoin Contribution */}
      <div className="rounded-lg border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent p-5">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-semibold text-white tracking-tight block mb-1">
              Client Stablecoin Contribution
            </label>
            <p className="text-xs text-neutral-400">
              Default: No (MM usually provides stables in this model). Set to Yes only if client will contribute stablecoins.
            </p>
          </div>
          <button
            onClick={() => onChange({ clientProvidesStables: !clientProvidesStables })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              clientProvidesStables ? "bg-cyan-500" : "bg-white/[0.1]"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                clientProvidesStables ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Monthly Fee */}
      <EnhancedInput
        label="Monthly Fee (if any)"
        value={monthlyFeeUsd}
        onChange={(value) => onChange({ monthlyFeeUsd: value })}
        type="currency"
        min={0}
        placeholder="0"
        helpText="Usually $0 for pure loan options, but some hybrid models may include a monthly retainer fee"
      />
    </div>
  );
}
