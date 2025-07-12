"use client";
import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";

interface BimDataItem {
  [key: string]: any;
  expressID?: number | string;
  error?: string;
  message?: string;
  loading?: boolean;
}

export default function BimPanel() {
  const { bimBoxEnabled, toggleBimBox, bimPanelData } = useAppStore();

  // Debug: Log state changes
  useEffect(() => {
    console.log("🔧 BimPanel state changed:", {
      bimBoxEnabled,
      hasBimPanelData: !!bimPanelData,
      bimPanelData,
    });
  }, [bimBoxEnabled, bimPanelData]);

  // Slide-in style
  const panelWidth = 400;
  const stylePanel: React.CSSProperties = {
    position: "fixed",
    top: 50,
    right: 0,
    width: panelWidth,
    height: "calc(100vh - 50px)",
    background: "#1a212b",
    color: "#fff",
    zIndex: 1200,
    borderLeft: "2px solid #222a35",
    boxShadow: "-3px 0 12px #0005",
    padding: "12px 7px 14px 7px",
    overflowY: "auto",
    fontSize: 13,
    transition: "transform 0.32s cubic-bezier(0.46,1.48,0.46,0.93)",
    transform: bimBoxEnabled
      ? "translateX(0)"
      : `translateX(${panelWidth + 16}px)`,
  };

  if (!bimBoxEnabled) {
    return <div style={stylePanel}></div>;
  }

  // 🔧 FIX: Helper function สำหรับตรวจสอบ error states
  const isError = bimPanelData?.error;
  const isLoading = bimPanelData?.loading;
  const hasValidData =
    bimPanelData &&
    !isError &&
    !isLoading &&
    Object.keys(bimPanelData).length > 0;

  return (
    <div id="bimPanel" style={stylePanel}>
      {/* ปุ่มปิด */}
      <button
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          background: "#333a",
          color: "#fff",
          border: "none",
          fontSize: 16,
          borderRadius: 8,
          padding: "2px 7px",
          cursor: "pointer",
          transition: "background 0.18s",
        }}
        onClick={() => {
          console.log("🔧 BIM Panel close button clicked");
          toggleBimBox();
        }}
        title="Close"
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#555a";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#333a";
        }}
      >
        ×
      </button>

      <h2
        style={{
          fontSize: 15,
          marginBottom: 8,
          color: "#87e5fc",
          wordBreak: "break-word",
        }}
      >
        BIM information
      </h2>

      <div id="bim-content" style={{ fontSize: 12, paddingRight: 2 }}>
        {/* 🔧 FIX: Loading State */}
        {isLoading && (
          <div
            style={{
              color: "#87e5fc",
              fontStyle: "italic",
              padding: "20px 0",
              textAlign: "center",
            }}
          >
            <div style={{ marginBottom: "10px" }}>🔄 กำลังดึงข้อมูล...</div>
            <div style={{ fontSize: "10px", color: "#666" }}>
              Express ID: {bimPanelData?.expressID}
            </div>
          </div>
        )}

        {/* 🔧 FIX: Error States */}
        {isError && (
          <div
            style={{
              color: "#ff6b6b",
              padding: "20px 0",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "16px", marginBottom: "10px" }}>
              {bimPanelData?.error === "not_found" && "🔍 ไม่พบข้อมูล"}
              {bimPanelData?.error === "api_error" && "⚠️ เกิดข้อผิดพลาด"}
              {bimPanelData?.error === "network_error" && "🌐 เชื่อมต่อไม่ได้"}
            </div>

            <div
              style={{
                color: "#ccc",
                fontSize: "12px",
                marginBottom: "15px",
                lineHeight: "1.4",
              }}
            >
              {bimPanelData?.message || "ไม่สามารถดึงข้อมูล BIM ได้"}
            </div>

            <div
              style={{
                fontSize: "10px",
                color: "#666",
                fontFamily: "monospace",
                marginBottom: "15px",
              }}
            >
              Express ID: {bimPanelData?.expressID}
            </div>

            {/* 🔧 FIX: Suggestions for different error types */}
            <div
              style={{
                fontSize: "11px",
                color: "#999",
                textAlign: "left",
                border: "1px solid #333",
                padding: "10px",
                borderRadius: "5px",
                backgroundColor: "#252525",
              }}
            >
              <strong>แนะนำ:</strong>
              <br />
              {bimPanelData?.error === "not_found" && (
                <>
                  • วัตถุนี้อาจยังไม่มีข้อมูล BIM ในระบบ
                  <br />
                  • ลองดับเบิลคลิกวัตถุอื่นแทน
                  <br />• ติดต่อผู้ดูแลระบบเพื่อเพิ่มข้อมูล
                </>
              )}
              {bimPanelData?.error === "api_error" && (
                <>
                  • ลองรีเฟรชหน้าเว็บ
                  <br />
                  • ตรวจสอบการเชื่อมต่อฐานข้อมูล
                  <br />• ติดต่อผู้ดูแลระบบ
                </>
              )}
              {bimPanelData?.error === "network_error" && (
                <>
                  • ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต
                  <br />
                  • ลองรีเฟรชหน้าเว็บ
                  <br />• ตรวจสอบสถานะเซิร์ฟเวอร์
                </>
              )}
            </div>
          </div>
        )}

        {/* 🔧 FIX: No Data State (when no data and no error) */}
        {!hasValidData && !isError && !isLoading && (
          <div
            style={{
              color: "#ccc",
              fontStyle: "italic",
              padding: "20px 0",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "16px", marginBottom: "10px" }}>
              📋 ไม่มีข้อมูล
            </div>
            <div style={{ color: "#999", fontSize: "12px" }}>
              ดับเบิลคลิกที่วัตถุในโมเดล 3D
              <br />
              เพื่อดูข้อมูล BIM
            </div>
          </div>
        )}

        {/* 🔧 FIX: Valid Data Display */}
        {hasValidData && (
          <div>
            {Object.entries(bimPanelData).map(([key, value]) => {
              // Skip internal fields
              if (["loading", "error", "message"].includes(key)) {
                return null;
              }

              // ปรับการแสดงผลให้สวยงาม
              let displayValue = String(value);

              // ถ้าเป็น JSON object หรือ array ให้ format ให้สวย
              if (typeof value === "object" && value !== null) {
                try {
                  displayValue = JSON.stringify(value, null, 2);
                } catch (e) {
                  displayValue = String(value);
                }
              }

              // ถ้าเป็น string ที่ยาวมาก ให้ตัดให้สั้นลง
              if (typeof value === "string" && value.length > 100) {
                displayValue = value.substring(0, 100) + "...";
              }

              return (
                <div
                  key={key}
                  style={{
                    fontFamily: "monospace",
                    marginBottom: 8,
                    fontSize: 24,
                    padding: "4px 0",
                    borderBottom: "1px solid #333",
                  }}
                >
                  <div
                    style={{
                      color: "#87e5fc",
                      fontWeight: "bold",
                      marginBottom: 2,
                      fontSize: 20,
                    }}
                  >
                    {key}: {displayValue}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Debug info - สามารถลบออกได้เมื่อทำงานแล้ว */}
      {process.env.NODE_ENV === "development" && (
        <div
          style={{
            position: "absolute",
            bottom: 10,
            left: 10,
            right: 10,
            fontSize: 10,
            color: "#666",
            borderTop: "1px solid #333",
            paddingTop: 5,
            fontFamily: "monospace",
          }}
        >
          BIM Enabled: {bimBoxEnabled ? "Yes" : "No"} | Data:{" "}
          {hasValidData
            ? "Valid"
            : isError
            ? "Error"
            : isLoading
            ? "Loading"
            : "None"}{" "}
          | Type: {bimPanelData?.error || "normal"}
        </div>
      )}
    </div>
  );
}
