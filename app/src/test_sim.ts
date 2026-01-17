
import { runDePINSimulation } from "./lib/depinSimulation";
import { DEPIN_SCENARIOS } from "./data/presets/depinPresets";
import { DePINScenario } from "./types/depin";

async function runTest() {
    console.log("Starting DePIN simulation stress test...");

    // Custom scenario to trigger low supply
    const deathSpiralScenario: DePINScenario = {
        ...DEPIN_SCENARIOS[0],
        name: "Death Spiral",
        config: {
            ...DEPIN_SCENARIOS[0].config,
            initialSupply: 10000, // Very low supply
            initialTokenPrice: 0.1, // Low price
            protocolParams: {
                ...DEPIN_SCENARIOS[0].config.protocolParams,
                percentBurned: 1.0, // Burn everything
                maxMint: 0, // No minting
            }
        }
    };

    const scenarios = [...DEPIN_SCENARIOS, deathSpiralScenario];

    for (const scenario of scenarios) {
        console.log(`\nTesting scenario: ${scenario.name}`);

        // Try different seed/params configurations
        const testConfigs = [
            { runs: 5, timesteps: 20 },
        ];

        for (const conf of testConfigs) {
            try {
                process.stdout.write(`  Running ${conf.runs} runs x ${conf.timesteps} steps... `);
                const params = {
                    ...scenario.params,
                    runs: conf.runs,
                    timesteps: conf.timesteps,
                    returnRaw: true
                };

                const startTime = Date.now();
                const result = runDePINSimulation(scenario.config, params);
                const duration = Date.now() - startTime;

                // check for NaNs or Infinity or Negative Supply
                let errors = 0;
                if (result.runs) {
                    for (const run of result.runs) {
                        for (const state of run.states) {
                            if (state.circulatingSupply < 0) {
                                console.error(`\n    CRITICAL: Negative Supply at step ${state.timestep}: ${state.circulatingSupply}`);
                                errors++;
                            }
                            if (isNaN(state.tokenPrice) || !isFinite(state.tokenPrice)) {
                                console.error(`\n    CRITICAL: Invalid Price at step ${state.timestep}: ${state.tokenPrice}`);
                                errors++;
                            }
                        }
                    }
                }

                if (errors > 0) {
                    console.log("  FAILED with critical errors.");
                } else {
                    console.log(`OK (${duration}ms)`);
                }

            } catch (error) {
                console.error("\n  FAILED with Exception!");
                console.error(error);
            }
        }
    }
}

runTest().catch(console.error);
