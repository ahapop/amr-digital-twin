"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { PresetData, PresetAPI } from "@/lib/presetApi";

const NUM_COLS = 2;
const MAX_PRESETS = 20;
const NUM_ROWS = Math.ceil(MAX_PRESETS / NUM_COLS);
const DEFAULT_PRESET_LABELS = [
  "Preset 1",
  "Preset 2",
  "Preset 3",
  "Preset 4",
  "Preset 5",
  "Preset 6",
  "Preset 7",
  "Preset 8",
  "Preset 9",
  "Preset 10",
  "Preset 11",
  "Preset 12",
  "Preset 13",
  "Preset 14",
  "Preset 15",
  "Preset 16",
  "Preset 17",
  "Preset 18",
  "Preset 19",
  "Preset 20",
];

export default function PresetBox() {
  const { showPresetBox, togglePresetBox, currentModelKey } = useAppStore();
  const [presets, setPresets] = useState<(PresetData | null)[]>(
    Array(MAX_PRESETS).fill(null)
  );
  const [currentPreset, setCurrentPreset] = useState<number | null>(null);
  const [resetMode, setResetMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const boxRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  const loadingRef = useRef(false);
  const lastModelRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAllPresets = useCallback(async () => {
    if (!currentModelKey) {
      return;
    }
    if (loadingRef.current) {
      return;
    }
    if (lastModelRef.current === currentModelKey) {
      return;
    }
    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const { status, presets: arr } = await PresetAPI.getAllPresets(
        currentModelKey
      );

      if (status === "ok") {
        setPresets(arr);
        lastModelRef.current = currentModelKey;
        setError(null);
      } else {
        setError("ไม่สามารถโหลด Presets ได้");
      }
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการโหลด Presets");
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [currentModelKey]);

  useEffect(() => {
    if (showPresetBox && currentModelKey) {
      loadAllPresets();
      setCurrentPreset(null);
    } else if (!showPresetBox) {
      loadingRef.current = false;
      lastModelRef.current = null;
    }
  }, [showPresetBox, currentModelKey, loadAllPresets]);

  useEffect(() => {
    const handlePresetReady = () => {
      if (showPresetBox && currentModelKey) {
        lastModelRef.current = null;
        loadAllPresets();
        setCurrentPreset(null);
      }
    };

    (window as any).onPresetReady = handlePresetReady;

    return () => {
      (window as any).onPresetReady = null;
    };
  }, [showPresetBox, currentModelKey, loadAllPresets]);

  const handlePresetClick = (idx: number) => {
    if (resetMode) return;
    const preset = presets[idx];

    if (preset) {
      const pf = (window as any).presetFunctions;
      if (pf?.setCameraState) {
        pf.setCameraState(preset as PresetData, true);
        setCurrentPreset(idx);
      }
    } else {
      handlePresetSave(idx);
    }
  };

  const handlePresetSave = async (idx: number) => {
    if (!currentModelKey) {
      alert("ไม่สามารถบันทึกได้: ไม่พบข้อมูล Model");
      return;
    }

    const pf = (window as any).presetFunctions;
    if (!pf?.getCurrentCameraState) {
      alert("ไม่สามารถบันทึกได้: ไม่พบ Camera State");
      return;
    }

    try {
      const currentState = pf.getCurrentCameraState();
      if (!currentState) {
        alert("ไม่สามารถดึงข้อมูลมุมมองปัจจุบันได้");
        return;
      }

      const defaultLabel = `Preset ${idx + 1}`;
      const label = prompt("ตั้งชื่อ Preset:", defaultLabel);
      if (!label || !label.trim()) {
        return;
      }

      currentState.label = label.trim();

      const response = await PresetAPI.savePreset(
        currentModelKey,
        idx,
        currentState
      );

      if (response.status === "ok") {
        lastModelRef.current = null;
        await loadAllPresets();
        setCurrentPreset(idx);

        alert(`บันทึก "${label}" เรียบร้อยแล้ว!`);
      } else {
        alert("ไม่สามารถบันทึก Preset ได้");
      }
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการบันทึก");
    }
  };

  const handlePresetDoubleClick = async (idx: number) => {
    const preset = presets[idx];
    if (!preset) return;

    const oldLabel = preset.label || DEFAULT_PRESET_LABELS[idx];
    const label = prompt("ตั้งชื่อ Preset:", oldLabel);
    if (label?.trim() && currentModelKey) {
      const response = await PresetAPI.updatePresetLabel(
        currentModelKey,
        idx,
        label.trim()
      );

      if (response.status === "ok") {
        lastModelRef.current = null;
        await loadAllPresets();
      } else {
        alert("ไม่สามารถเปลี่ยนชื่อ Preset ได้");
      }
    }
  };

  const handlePresetReset = async (idx: number) => {
    if (!resetMode || !presets[idx] || !currentModelKey) return;

    const presetLabel = presets[idx]!.label || DEFAULT_PRESET_LABELS[idx];
    if (
      confirm(
        `ลบ Preset "${presetLabel}"?\n\nการลบจะไม่ส่งผลต่อลำดับของปุ่มอื่น`
      )
    ) {
      const response = await PresetAPI.deletePreset(currentModelKey, idx);

      if (response.status === "ok") {
        lastModelRef.current = null;
        await loadAllPresets();
        if (currentPreset === idx) setCurrentPreset(null);

        alert(`ลบ "${presetLabel}" เรียบร้อยแล้ว!`);
      } else {
        alert("ไม่สามารถลบ Preset ได้");
      }
    }
  };

  const handleToggleResetMode = () => setResetMode((v) => !v);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!boxRef.current) return;
    const rect = boxRef.current.getBoundingClientRect();
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setIsDragging(true);
    document.body.style.userSelect = "none";
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && boxRef.current) {
      boxRef.current.style.left = `${e.clientX - dragOffset.x}px`;
      boxRef.current.style.top = `${e.clientY - dragOffset.y}px`;
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    document.body.style.userSelect = "";
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  const buttonMatrix: (number | "reset")[][] = [];
  for (let row = 0; row < NUM_ROWS; row++) {
    const r: (number | "reset")[] = [];
    for (let col = 0; col < NUM_COLS; col++) {
      const idx = row + col * NUM_ROWS;
      r.push(idx < MAX_PRESETS ? idx : (null as any));
    }
    buttonMatrix.push(r);
  }
  buttonMatrix[NUM_ROWS - 1][NUM_COLS - 1] = "reset";

  const btnW = 142,
    btnH = 42,
    gapX = 16,
    gapY = 12;
  const boxW = NUM_COLS * btnW + (NUM_COLS - 1) * gapX + 56;
  const boxH = 74 + NUM_ROWS * btnH + (NUM_ROWS - 1) * gapY + 28;

  if (!showPresetBox) return null;

  return (
    <>
      <style jsx>{`
        .preset-box {
          position: fixed;
          top: 120px;
          left: 56vw;
          width: ${boxW}px;
          min-width: 340px;
          background: rgba(40, 44, 55, 0.5);
          border-radius: 18px;
          box-shadow: 0 12px 48px #0008, 0 2px 6px #0003;
          border: 2.5px solid #222a;
          z-index: 1400;
          padding-bottom: 20px;
          user-select: none;
          transition: box-shadow 0.13s;
        }
        .preset-header {
          padding: 14px 18px 10px 22px;
          font-size: 21px;
          font-weight: 600;
          color: #fff;
          background: #3e4048;
          border-radius: 18px 18px 0 0;
          border-bottom: 2px solid #2225;
          display: flex;
          align-items: center;
          cursor: move;
        }
        .preset-close {
          background: #d22d2d;
          color: #fff;
          border: none;
          border-radius: 50%;
          font-size: 22px;
          width: 36px;
          height: 36px;
          margin-left: auto;
          cursor: pointer;
          font-weight: 800;
          transition: background 0.13s;
        }
        .preset-close:hover {
          background: #ff4545;
        }
        .preset-area {
          padding: 18px 28px 0 28px;
          display: grid;
          grid-template-columns: repeat(${NUM_COLS}, ${btnW}px);
          grid-template-rows: repeat(${NUM_ROWS}, ${btnH}px);
          gap: ${gapY}px ${gapX}px;
        }
        .preset-btn {
          border-radius: 13px;
          border: 2.5px solid #4449;
          min-height: 42px;
          font-size: 17px;
          font-weight: 500;
          color: #fff;
          background: linear-gradient(
            90deg,
            rgba(59, 52, 135, 0.5) 60%,
            rgba(64, 78, 163, 0.5) 100%
          );
          box-shadow: 0 2px 10px #2221;
          cursor: pointer;
          transition: background 0.16s, box-shadow 0.13s, color 0.11s;
          outline: none;
          padding: 0 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          width: 100%;
        }
        .preset-btn.active {
          background: linear-gradient(
            90deg,
            rgba(31, 201, 116, 0.5) 70%,
            rgba(17, 161, 65, 0.5) 100%
          );
          color: #fff;
          border-color: #11a141;
        }

        .preset-btn.empty {
          background: linear-gradient(
            90deg,
            rgba(100, 100, 100, 0.3) 60%,
            rgba(120, 120, 120, 0.3) 100%
          );
          color: #bbb;
          border-color: #666;
          border-style: dashed;
        }

        .preset-btn.empty:hover {
          background: linear-gradient(
            90deg,
            rgba(59, 130, 246, 0.4) 60%,
            rgba(37, 99, 235, 0.4) 100%
          );
          color: #fff;
          border-color: #3b82f6;
          border-style: solid;
        }

        .preset-btn.empty .center-text::after {
          content: " 💾";
          font-size: 0.8em;
          opacity: 0.7;
        }

        .preset-btn.empty:hover .center-text::after {
          content: " ✨";
          opacity: 1;
        }
        .preset-btn.current {
          border-width: 3.5px;
          box-shadow: 0 0 14px #32ffbb77;
          color: #fff !important;
        }
        .preset-btn:hover {
          filter: brightness(1.09);
        }
        .preset-btn .center-wrap {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          width: 100%;
          text-align: center;
        }
        .preset-btn .center-text {
          display: inline-block;
          text-align: center;
          line-height: 1.25;
          word-break: break-word;
          white-space: pre-line;
          font-size: inherit;
          font-weight: inherit;
          vertical-align: middle;
        }
        .preset-btn .delete {
          margin-left: 8px;
          background: #ee4444;
          border: none;
          border-radius: 50%;
          width: 22px;
          height: 22px;
          color: #fff;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          display: ${resetMode ? "inline-flex" : "none"};
          align-items: center;
          justify-content: center;
          opacity: ${resetMode ? 1 : 0};
          pointer-events: ${resetMode ? "auto" : "none"};
          transition: opacity 0.12s;
          flex-shrink: 0;
        }
        .reset-btn {
          background: rgba(196, 44, 44, 0.5);
          border: 2.5px solid #bb1b1b;
          color: #fff;
          font-weight: 500;
          font-size: 18px;
          min-height: 42px;
          border-radius: 13px;
          box-shadow: 0 2px 10px #6118;
          transition: background 0.16s;
          cursor: pointer;
          overflow: hidden;
          padding: 0 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .reset-btn .center-text {
          text-align: center;
          line-height: 1.2;
          word-break: break-word;
          white-space: pre-line;
          display: block;
          width: 100%;
        }
        .loading-overlay {
          position: absolute;
          left: 0;
          top: 54px;
          width: 100%;
          color: #ddd;
          font-weight: 700;
          text-align: center;
        }
        .error-overlay {
          position: absolute;
          left: 10px;
          right: 10px;
          top: 54px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          padding: 16px;
          color: #ff6b6b;
          text-align: center;
          font-size: 12px;
        }
      `}</style>
      <div
        ref={boxRef}
        className="preset-box"
        style={{ width: boxW, minHeight: boxH, position: "fixed" }}
      >
        <div className="preset-header" onMouseDown={handleMouseDown}>
          Preset View
          <button
            className="preset-close"
            onClick={() => togglePresetBox(false)}
          >
            ×
          </button>
        </div>
        <div className="preset-area">
          {buttonMatrix.flat().map((v, idx) => {
            if (v === "reset") {
              return (
                <button
                  key="reset"
                  className="reset-btn"
                  onClick={handleToggleResetMode}
                >
                  <span className="center-text">Reset</span>
                </button>
              );
            }
            if (v == null) return <div key={`empty${idx}`} />;
            const preset = presets[v];
            const label = preset?.label || DEFAULT_PRESET_LABELS[v];
            let fs = 17;
            if (label.length > 17) fs = 15;
            if (label.length > 26) fs = 13;
            if (label.length > 36) fs = 11;
            return (
              <button
                key={v}
                className={
                  "preset-btn" +
                  (preset ? " active" : " empty") +
                  (currentPreset === v ? " current" : "")
                }
                title={
                  preset
                    ? resetMode
                      ? `"${preset.label}" - Click X เพื่อลบ, Double click: เปลี่ยนชื่อ`
                      : `"${preset.label}" - Click: โหลด Preset, Double click: เปลี่ยนชื่อ`
                    : resetMode
                    ? `${label} - ว่าง (ไม่สามารถลบได้)`
                    : `${label} - Click: บันทึกมุมมองปัจจุบัน`
                }
                style={{ fontSize: fs }}
                onClick={() => handlePresetClick(v)}
                onDoubleClick={() => handlePresetDoubleClick(v)}
              >
                <span className="center-wrap">
                  <span className="center-text">
                    {preset ? preset.label : label}
                  </span>
                  {preset && (
                    <span
                      className="delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePresetReset(v);
                      }}
                    >
                      ×
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
