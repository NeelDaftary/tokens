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
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 z-40 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full bg-neutral-900 border-l border-neutral-800 shadow-2xl z-50 transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        } w-full sm:w-[400px] md:w-[450px] overflow-y-auto`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-neutral-900 border-b border-neutral-800 p-6 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>⚡</span>
                Simulation Tools
              </h2>
              <p className="text-sm text-neutral-400 mt-1">
                Specialized calculators and simulators
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white"
              aria-label="Close sidebar"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {Object.entries(simulatorsByCategory).map(([category, simulators]) => (
            <div key={category}>
              {/* Category Header */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{CATEGORY_INFO[category as SimulatorCategory].icon}</span>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-white">{category}</h3>
                  <p className="text-xs text-neutral-500">
                    {CATEGORY_INFO[category as SimulatorCategory].description}
                  </p>
                </div>
              </div>

              {/* Simulators in Category */}
              <div className="space-y-2">
                {simulators.map((simulator) => (
                  <button
                    key={simulator.id}
                    onClick={() => handleSimulatorClick(simulator)}
                    disabled={!simulator.enabled}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      simulator.enabled
                        ? "border-neutral-700 bg-neutral-800/50 hover:bg-neutral-800 hover:border-neutral-600 cursor-pointer"
                        : "border-neutral-800 bg-neutral-900/50 cursor-not-allowed opacity-60"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0">{simulator.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium text-white">
                            {simulator.name}
                          </h4>
                          {!simulator.enabled && (
                            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-neutral-700 text-neutral-400">
                              COMING SOON
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                          {simulator.description}
                        </p>
                      </div>
                      {simulator.enabled && (
                        <svg
                          className="w-5 h-5 text-neutral-500 flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Footer Note */}
          <div className="pt-4 border-t border-neutral-800">
            <p className="text-xs text-neutral-500 text-center">
              More simulators coming soon. Have a suggestion?{" "}
              <a href="mailto:feedback@example.com" className="text-blue-400 hover:text-blue-300">
                Let us know
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

