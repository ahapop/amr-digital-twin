"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { MODELS } from "@/lib/constants";

// ===== Find Ground index (if not found fallback 0) =====
function getGroundIndex() {
  const idx = MODELS.findIndex((m) => m.key.toLowerCase() === "ground");
  return idx >= 0 ? idx : 0;
}

// PATCH: call ThreeScene window method for model switch
function switchModelViaWindow(idx: number) {
  if (
    typeof window !== "undefined" &&
    (window as any).switchModelFromSidePanel
  ) {
    (window as any).switchModelFromSidePanel(idx);
  }
}

export default function SidePanel() {
  const {
    showQuickPanel,
    showModelPanel,
    currentModelKey,
    statusBoxEnabled,
    multiBoxEnabled,
    scadaBoxEnabled,
    reservedBoxEnabled,
    bimBoxEnabled,
    toggleQuickPanel,
    toggleModelPanel,
    toggleStatusBox,
    toggleMultiBox,
    toggleScadaBox,
    toggleReservedBox,
    toggleBimBox,
    clearSelection,
    switchModel,
  } = useAppStore();

  const quickTimer = useRef<NodeJS.Timeout | null>(null);
  const modelTimer = useRef<NodeJS.Timeout | null>(null);
  const quickInteracted = useRef(false);
  const modelInteracted = useRef(false);

  // Timer delays
  const noInteractionDelay = 2000; // 2 seconds if no interaction
  const afterInteractionDelay = 5000; // 5 seconds after interaction

  // ===== QUICK CONTROLS HANDLERS =====
  const handleQuickMouseEnter = () => {
    console.log("🐭 Quick menu: Mouse entered");
    if (quickTimer.current) {
      clearTimeout(quickTimer.current);
      quickTimer.current = null;
    }
  };

  const handleQuickMouseLeave = () => {
    console.log("🐭 Quick menu: Mouse left");
    // Start 5-second timer when mouse leaves
    quickTimer.current = setTimeout(() => {
      console.log("⏰ Quick menu: Auto-hide after mouse leave (5s)");
      toggleQuickPanel(false);
      quickInteracted.current = false;
    }, afterInteractionDelay);
  };

  const handleQuickInteraction = (actionName: string) => {
    console.log(`🎯 Quick menu: Interaction - ${actionName}`);
    quickInteracted.current = true;

    // Clear existing timer
    if (quickTimer.current) {
      clearTimeout(quickTimer.current);
    }

    // Start 5-second timer after interaction
    quickTimer.current = setTimeout(() => {
      console.log("⏰ Quick menu: Auto-hide after interaction (5s)");
      toggleQuickPanel(false);
      quickInteracted.current = false;
    }, afterInteractionDelay);
  };

  // ===== MODEL PANEL HANDLERS =====
  const handleModelMouseEnter = () => {
    console.log("🐭 Model menu: Mouse entered");
    if (modelTimer.current) {
      clearTimeout(modelTimer.current);
      modelTimer.current = null;
    }
  };

  const handleModelMouseLeave = () => {
    console.log("🐭 Model menu: Mouse left");
    // Start 5-second timer when mouse leaves
    modelTimer.current = setTimeout(() => {
      console.log("⏰ Model menu: Auto-hide after mouse leave (5s)");
      toggleModelPanel(false);
      modelInteracted.current = false;
    }, afterInteractionDelay);
  };

  const handleModelInteraction = (modelIndex: number, modelName: string) => {
    console.log(`🎯 Model menu: Interaction - ${modelName}`);
    modelInteracted.current = true;

    // Execute model switch
    switchModel(modelIndex);
    switchModelViaWindow(modelIndex);

    // Clear existing timer
    if (modelTimer.current) {
      clearTimeout(modelTimer.current);
    }

    // Start 5-second timer after interaction
    modelTimer.current = setTimeout(() => {
      console.log("⏰ Model menu: Auto-hide after interaction (5s)");
      toggleModelPanel(false);
      modelInteracted.current = false;
    }, afterInteractionDelay);
  };

  // ===== AUTO-HIDE ON PANEL OPEN =====
  useEffect(() => {
    if (showQuickPanel && !quickInteracted.current) {
      console.log("🕐 Quick menu: Starting 2s no-interaction timer");
      quickTimer.current = setTimeout(() => {
        if (!quickInteracted.current) {
          console.log("⏰ Quick menu: Auto-hide (no interaction after 2s)");
          toggleQuickPanel(false);
        }
      }, noInteractionDelay);
    }

    return () => {
      if (quickTimer.current) {
        clearTimeout(quickTimer.current);
        quickTimer.current = null;
      }
    };
  }, [showQuickPanel, toggleQuickPanel]);

  useEffect(() => {
    if (showModelPanel && !modelInteracted.current) {
      console.log("🕐 Model menu: Starting 2s no-interaction timer");
      modelTimer.current = setTimeout(() => {
        if (!modelInteracted.current) {
          console.log("⏰ Model menu: Auto-hide (no interaction after 2s)");
          toggleModelPanel(false);
        }
      }, noInteractionDelay);
    }

    return () => {
      if (modelTimer.current) {
        clearTimeout(modelTimer.current);
        modelTimer.current = null;
      }
    };
  }, [showModelPanel, toggleModelPanel]);

  // ===== CLEANUP =====
  useEffect(() => {
    return () => {
      if (quickTimer.current) clearTimeout(quickTimer.current);
      if (modelTimer.current) clearTimeout(modelTimer.current);
    };
  }, []);

  // PATCH: select Ground as default at start
  useEffect(() => {
    const groundIdx = getGroundIndex();
    if (!currentModelKey && MODELS[groundIdx]?.key) {
      switchModel(groundIdx);
      switchModelViaWindow(groundIdx);
    }
    // eslint-disable-next-line
  }, []);

  return (
    <>
      <style jsx>{`
        /* Uniform button styles for side panels */
        .uniform-btn {
          width: 120px !important;
          height: 45px !important;
          margin: 4px 0 !important;
          border: none !important;
          border-radius: 8px !important;
          font-size: 14px !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          text-align: center !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
        }

        .uniform-btn:hover {
          transform: scale(1.05) !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
        }

        /* Quick Controls specific styles */
        .uniform-btn.status-btn {
          background-color: #3b82f6 !important;
          color: white !important;
        }

        .uniform-btn.status-btn.active {
          background-color: #1d4ed8 !important;
          box-shadow: 0 0 0 2px #93c5fd !important;
        }

        .uniform-btn.clear-btn {
          background-color: #ef4444 !important;
          color: white !important;
        }

        .uniform-btn.toggle-btn {
          background-color: #6b7280 !important;
          color: white !important;
        }

        .uniform-btn.toggle-btn.active {
          background-color: #374151 !important;
          box-shadow: 0 0 0 2px #9ca3af !important;
        }

        /* Model buttons specific styles */
        .uniform-btn.model-btn {
          background-color: #6b7280 !important;
          color: white !important;
        }

        .uniform-btn.model-btn.active {
          background-color: #f59e0b !important;
          color: white !important;
          box-shadow: 0 0 0 2px #fbbf24 !important;
        }

        /* Container adjustments */
        .side-panel {
          padding: 12px !important;
        }

        .label-title {
          display: block !important;
          margin-bottom: 8px !important;
          color: #9ca3af !important;
          font-size: 16px !important;
          font-weight: 600 !important;
          text-align: center !important;
        }

        #model-area {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
        }
      `}</style>

      {/* Quick Controls Panel */}
      <div
        className={`side-panel ${showQuickPanel ? "shown" : ""}`}
        onMouseEnter={handleQuickMouseEnter}
        onMouseLeave={handleQuickMouseLeave}
      >
        <span className="label-title">Quick Controls</span>

        <button
          onClick={() => {
            toggleStatusBox();
            handleQuickInteraction("Status");
          }}
          className={`uniform-btn status-btn ${
            statusBoxEnabled ? "active" : ""
          }`}
        >
          Status
        </button>

        <button
          onClick={() => {
            clearSelection();
            handleQuickInteraction("Clear");
          }}
          className="uniform-btn clear-btn"
        >
          Clear
        </button>

        <button
          onClick={() => {
            toggleMultiBox();
            handleQuickInteraction("CMMS");
          }}
          className={`uniform-btn toggle-btn ${
            multiBoxEnabled ? "active" : ""
          }`}
        >
          CMMS
        </button>

        <button
          onClick={() => {
            toggleScadaBox();
            handleQuickInteraction("SCADA/IoT");
          }}
          className={`uniform-btn toggle-btn ${
            scadaBoxEnabled ? "active" : ""
          }`}
        >
          SCADA/IoT
        </button>

        <button
          onClick={() => {
            toggleReservedBox();
            handleQuickInteraction("Reserved");
          }}
          className={`uniform-btn toggle-btn ${
            reservedBoxEnabled ? "active" : ""
          }`}
        >
          Reserved
        </button>

        <button
          onClick={() => {
            toggleBimBox();
            handleQuickInteraction("BIM");
          }}
          className={`uniform-btn toggle-btn ${bimBoxEnabled ? "active" : ""}`}
        >
          BIM
        </button>
      </div>

      {/* Models Panel */}
      <div
        className={`side-panel ${showModelPanel ? "shown" : ""}`}
        onMouseEnter={handleModelMouseEnter}
        onMouseLeave={handleModelMouseLeave}
      >
        <span className="label-title">Models</span>
        <div id="model-area">
          {MODELS.map((model, index) => (
            <button
              key={model.key}
              onClick={() => handleModelInteraction(index, model.label)}
              className={`uniform-btn model-btn ${
                currentModelKey === model.key ? "active" : ""
              }`}
            >
              {model.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
