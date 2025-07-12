"use client";
import { useAppStore } from "@/lib/store";
import { MODELS } from "@/lib/constants";

export default function TopBar() {
  const {
    showQuickPanel,
    showModelPanel,
    showPresetBox,
    currentModelKey,
    toggleQuickPanel,
    toggleModelPanel,
    togglePresetBox,
  } = useAppStore();

  return (
    <div
      id="top-bar"
      style={{
        width: "100%",
        height: 60,
        position: "fixed",
        left: 0,
        top: 0,
        zIndex: 1900,
        background: "rgba(255, 255, 255, 0.2)",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "0 22px",
        boxShadow: "0 2px 12px #0006",
      }}
    >
      {/* ปุ่ม Quick menu */}
      <button
        onClick={() => toggleQuickPanel(!showQuickPanel)}
        style={{
          background: showQuickPanel
            ? "rgba(255, 0, 0, 0.5)"
            : "rgba(115,236,148,0.5)", // สีเขียวโปร่งแสง
          color: showQuickPanel ? "#fff" : "#fff",
          fontWeight: 700,
          fontSize: 18,
          borderRadius: 10,
          //border: showQuickPanel ? "3px solid #ff9a9a" : "3px solid #9bf7bc",
          padding: "7px 24px",
          boxShadow: "0 2px 6px #2222",
          opacity: 1,
          transition: "background 0.1s",
        }}
      >
        Quick menu
      </button>
      {/* ปุ่ม Models */}
      <button
        onClick={() => toggleModelPanel(!showModelPanel)}
        style={{
          background: showModelPanel
            ? "rgba(255, 0, 0, 0.5)"
            : "rgba(115,236,148,0.5)", // สีเขียวโปร่งแสง
          color: showModelPanel ? "#fff" : "#fff",
          fontWeight: 700,
          fontSize: 18,
          borderRadius: 10,
          //border: showModelPanel ? "3px solid #ff9a9a" : "3px solid #9bf7bc",
          padding: "7px 24px",
          boxShadow: "0 2px 6px #2222",
          opacity: 1,
          transition: "background 0.1s",
        }}
      >
        Models
      </button>
      {/* ปุ่ม View */}
      <button
        onClick={() => togglePresetBox(!showPresetBox)}
        style={{
          background: showPresetBox
            ? "rgba(255, 0, 0, 0.5)"
            : "rgba(115,236,148,0.5)", // สีเขียวโปร่งแสง
          color: showPresetBox ? "#fff" : "#fff",
          fontWeight: 700,
          fontSize: 18,
          borderRadius: 10,
          //border: showPresetBox ? "3px solid #ff9a9a" : "3px solid #9bf7bc",
          padding: "7px 30px",
          boxShadow: "0 2px 6px #2222",
          opacity: 1,
          transition: "background 0.1s",
        }}
      >
        View
      </button>
      <span
        style={{
          marginLeft: 16,
          padding: "6px 24px",
          borderRadius: 10,
          fontSize: 28,
          fontWeight: 700,
          background: "#fff2",
          color: "#ffd300",
          letterSpacing: "1.2px",
          boxShadow: "0 1px 2px #1114",
        }}
      >
        {/* แสดงชื่อ Model ที่เลือกจาก SidePanel */}
        {MODELS.find((m) => m.key === currentModelKey)?.label ||
          "No Model Selected"}
      </span>
      <div style={{ flex: 1 }} />
    </div>
  );
}
