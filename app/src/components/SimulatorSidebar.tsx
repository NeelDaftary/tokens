"use client";

import { useRouter } from "next/navigation";
import { 
  SIMULATORS, 
  getSimulatorsByCategory, 
  CATEGORY_INFO,
  type Simulator,
  type SimulatorCategory 
} from "@/config/simulators";

interface SimulatorSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

// Premium SVG icons (replacing emojis)
const icons = {
  network: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
    </svg>
  ),
  chart: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  ),
  vote: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
    </svg>
  ),
  bank: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
    </svg>
  ),
  droplet: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />
    </svg>
  ),
  lightning: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  ),
  exchange: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  ),
  gas: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
    </svg>
  ),
  robot: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
    </svg>
  ),
};

const getIconForSimulator = (id: string) => {
  const iconMap: Record<string, JSX.Element> = {
    "depin": icons.network,
    "bonding-curve": icons.chart,
    "ve-tokenomics": icons.vote,
    "lending-apy": icons.bank,
    "il-calculator": icons.droplet,
    "options-greeks": icons.chart,
    "amm-simulator": icons.exchange,
    "perp-funding": icons.lightning,
    "gas-modeling": icons.gas,
    "mev-analysis": icons.robot,
  };
  return iconMap[id] || icons.network;
};

// Category gradient colors
const categoryGradients: Record<SimulatorCategory, string> = {
  "Protocol Mechanics": "from-blue-500 to-indigo-600",
  "DeFi Protocols": "from-green-500 to-teal-600",
  "Trading Mechanisms": "from-purple-500 to-pink-600",
  "Infrastructure": "from-orange-500 to-red-600",
};

export default function SimulatorSidebar({ isOpen, onClose }: SimulatorSidebarProps) {
  const router = useRouter();
  const simulatorsByCategory = getSimulatorsByCategory();

  const handleSimulatorClick = (simulator: Simulator) => {
    if (simulator.enabled) {
      router.push(simulator.route);
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop with blur */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-md transition-all duration-300 z-40 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full bg-gradient-to-b from-[#0A0A0F] to-[#13131A] border-l border-white/5 shadow-2xl z-50 transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        } w-full sm:w-[440px] md:w-[480px] overflow-y-auto`}
        style={{
          boxShadow: "0 0 60px rgba(59, 130, 246, 0.15)",
        }}
      >
        {/* Header with gradient */}
        <div className="sticky top-0 bg-gradient-to-b from-[#0A0A0F] via-[#0A0A0F] to-transparent backdrop-blur-xl border-b border-white/5 p-6 z-10">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                <span className="text-blue-400">⚡</span>
                Simulation Tools
              </h2>
              <p className="text-sm text-neutral-400 mt-1 font-medium">
                Specialized calculators and simulators
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/5 transition-all text-neutral-400 hover:text-white group"
              aria-label="Close sidebar"
            >
              <svg className="w-5 h-5 transition-transform group-hover:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {Object.entries(simulatorsByCategory).map(([category, simulators]) => (
            <div key={category} className="space-y-4">
              {/* Category Header with gradient */}
              <div className="flex items-center gap-3">
                <div className={`w-1 h-6 rounded-full bg-gradient-to-b ${categoryGradients[category as SimulatorCategory]}`} />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-white tracking-tight">{category}</h3>
                  <p className="text-xs text-neutral-500 font-medium">
                    {CATEGORY_INFO[category as SimulatorCategory].description}
                  </p>
                </div>
              </div>

              {/* Simulators as premium cards */}
              <div className="space-y-3">
                {simulators.map((simulator) => (
                  <button
                    key={simulator.id}
                    onClick={() => handleSimulatorClick(simulator)}
                    disabled={!simulator.enabled}
                    className={`group w-full text-left rounded-xl border transition-all duration-200 ${
                      simulator.enabled
                        ? `border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent hover:border-${categoryGradients[category as SimulatorCategory].split(' ')[1].replace('to-', '')}/30 hover:shadow-lg cursor-pointer hover:scale-[1.01]`
                        : "border-white/5 bg-white/[0.01] cursor-not-allowed opacity-60"
                    }`}
                    style={simulator.enabled ? {
                      boxShadow: "0 1px 3px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05)",
                    } : undefined}
                  >
                    <div className="p-5">
                      <div className="flex items-start gap-4">
                        {/* Icon with gradient background */}
                        <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
                          simulator.enabled 
                            ? `bg-gradient-to-br ${categoryGradients[category as SimulatorCategory]} shadow-lg`
                            : "bg-neutral-800/50"
                        } transition-transform duration-200 ${simulator.enabled ? 'group-hover:scale-110' : ''}`}>
                          <div className="text-white">
                            {getIconForSimulator(simulator.id)}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors tracking-tight">
                              {simulator.name}
                            </h4>
                            {!simulator.enabled && (
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-neutral-800/80 text-neutral-500 uppercase tracking-wider whitespace-nowrap">
                                Soon
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed font-medium">
                            {simulator.description}
                          </p>
                        </div>

                        {/* Arrow for enabled */}
                        {simulator.enabled && (
                          <div className="flex-shrink-0 text-neutral-600 group-hover:text-blue-400 transition-all group-hover:translate-x-1">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Footer */}
          <div className="pt-4 border-t border-white/5">
            <p className="text-xs text-center text-neutral-500 font-medium">
              More tools coming soon •{" "}
              <a href="mailto:feedback@example.com" className="text-blue-400 hover:text-blue-300 transition-colors font-semibold">
                Request a feature
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
