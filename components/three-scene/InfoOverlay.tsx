// components/three-scene/InfoOverlay.tsx (Fixed)
"use client";
import React, { useRef, useEffect, useCallback } from "react";
import * as THREE from "three";
import { InfoOverlayProps } from "@/types/three-scene.types";
import { getResponsiveSizes, worldToScreen } from "@/lib/utils/geometry-utils";

const InfoOverlay: React.FC<InfoOverlayProps> = ({
  singleInfo,
  camera,
  containerRef,
}) => {
  const infoBoxRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const lineRef = useRef<SVGLineElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  /**
   * Update overlay position based on 3D world position
   */
  const updateOverlayPosition = useCallback(() => {
    if (!singleInfo.show || !singleInfo.pos || !camera) return;
    if (!infoBoxRef.current || !svgRef.current || !lineRef.current) return;
    if (!containerRef.current) return;

    try {
      const { fontSize, lineWidth, scale } = getResponsiveSizes(
        camera,
        new THREE.Vector3(singleInfo.pos.x, singleInfo.pos.y, singleInfo.pos.z)
      );

      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      const targetPos = new THREE.Vector3(
        singleInfo.pos.x,
        singleInfo.pos.y,
        singleInfo.pos.z
      );

      const screenPos = worldToScreen(targetPos, camera, width, height);

      // 🔧 Calculate offset for info box with better positioning
      const objectHeight = 10;
      const screenOffsetY = Math.max(80, objectHeight * scale * 20);
      const offsetX = screenPos.x;
      const offsetY_screen = screenPos.y - screenOffsetY;
      const responsivePadding = Math.max(6, 14 * scale);

      // 🔧 Style the info box with forced visibility
      const infoBox = infoBoxRef.current;
      infoBox.style.fontSize = `${fontSize}px`;
      infoBox.style.lineHeight = `${fontSize + 6}px`;
      infoBox.style.padding = `${responsivePadding}px ${
        responsivePadding * 1.2
      }px`;
      infoBox.style.borderRadius = `${Math.max(8, 12 * scale)}px`;
      infoBox.style.boxShadow = `0 ${4 * scale}px ${
        18 * scale
      }px rgba(0,0,0,0.28)`;
      infoBox.style.width = "auto";
      infoBox.style.minWidth = `${100 * scale}px`;
      infoBox.style.maxWidth = `${Math.min(420, width * 0.5)}px`;
      infoBox.style.display = "block"; // 🔧 Force visible
      infoBox.style.visibility = "visible"; // 🔧 Force visible
      infoBox.style.opacity = "1"; // 🔧 Force visible

      // Get info box dimensions after styling
      const box = infoBox.getBoundingClientRect();
      const labelW = box.width;
      const labelH = box.height;

      // 🔧 Position the info box with bounds checking
      let boxLeft = offsetX - labelW / 2;
      let boxTop = offsetY_screen - labelH / 2;

      // Keep within viewport bounds
      boxLeft = Math.max(10, Math.min(boxLeft, width - labelW - 10));
      boxTop = Math.max(10, Math.min(boxTop, height - labelH - 10));

      infoBox.style.left = `${boxLeft}px`;
      infoBox.style.top = `${boxTop}px`;

      // 🔧 Update line connecting info box to object
      const line = lineRef.current;
      line.setAttribute("stroke-width", lineWidth.toString());
      line.setAttribute("x1", (boxLeft + labelW / 2).toString());
      line.setAttribute("y1", (boxTop + labelH).toString());
      line.setAttribute("x2", screenPos.x.toString());
      line.setAttribute("y2", screenPos.y.toString());
      line.style.display = "block"; // 🔧 Force visible
      line.style.visibility = "visible"; // 🔧 Force visible

      console.log("📍 Info overlay positioned:", {
        expressID: singleInfo.expressID,
        boxLeft,
        boxTop,
        screenPos,
        scale,
      });
    } catch (error) {
      console.error("❌ Error updating overlay position:", error);
    }
  }, [singleInfo, camera, containerRef]);

  /**
   * Apply responsive styling to info box
   */
  const applyResponsiveStyles = useCallback(() => {
    if (!singleInfo.show || !singleInfo.pos || !camera) return;
    if (!infoBoxRef.current || !containerRef.current) return;

    try {
      const { fontSize, scale } = getResponsiveSizes(
        camera,
        new THREE.Vector3(singleInfo.pos.x, singleInfo.pos.y, singleInfo.pos.z)
      );

      const responsivePadding = Math.max(6, 14 * scale);
      const infoBox = infoBoxRef.current;

      // 🔧 Apply all styles with forced visibility
      Object.assign(infoBox.style, {
        width: "auto",
        height: "auto",
        padding: `${responsivePadding}px ${responsivePadding * 1.2}px`,
        background: "rgba(0,0,0,0.75)", // 🔧 Stronger background
        border: "1px solid rgba(255,255,255,0.1)", // 🔧 Add border
        color: "#fff",
        fontWeight: "600",
        fontSize: `${fontSize}px`,
        lineHeight: `${fontSize + 6}px`,
        borderRadius: `${Math.max(8, 12 * scale)}px`,
        boxShadow: `0 ${4 * scale}px ${18 * scale}px rgba(0,0,0,0.4)`, // 🔧 Stronger shadow
        fontFamily: "system-ui, -apple-system, sans-serif",
        minWidth: `${100 * scale}px`,
        maxWidth: `${Math.min(420, containerRef.current.clientWidth * 0.5)}px`,
        wordWrap: "break-word",
        overflowWrap: "break-word",
        whiteSpace: "normal",
        textAlign: "left",
        userSelect: "text",
        display: "block", // 🔧 Force visible
        visibility: "visible", // 🔧 Force visible
        opacity: "1", // 🔧 Force visible
        pointerEvents: "auto", // 🔧 Allow interaction
        zIndex: "1201", // 🔧 Ensure on top
      });

      // 🔧 Update position after styling with delay
      requestAnimationFrame(() => {
        updateOverlayPosition();
      });
    } catch (error) {
      console.error("❌ Error applying responsive styles:", error);
    }
  }, [singleInfo, camera, containerRef, updateOverlayPosition]);

  /**
   * Hide line and box when info is not shown
   */
  const hideOverlay = useCallback(() => {
    if (lineRef.current) {
      lineRef.current.setAttribute("x1", "0");
      lineRef.current.setAttribute("y1", "0");
      lineRef.current.setAttribute("x2", "0");
      lineRef.current.setAttribute("y2", "0");
      lineRef.current.style.display = "none";
    }
    if (infoBoxRef.current) {
      infoBoxRef.current.style.display = "none";
      infoBoxRef.current.style.visibility = "hidden";
      infoBoxRef.current.style.opacity = "0";
    }
  }, []);

  // 🔧 Enhanced effect for singleInfo changes
  useEffect(() => {
    console.log("🔄 SingleInfo changed:", {
      show: singleInfo.show,
      expressID: singleInfo.expressID,
      hasPos: !!singleInfo.pos,
      name: singleInfo.name,
    });

    if (singleInfo.show && singleInfo.pos) {
      // Apply styles first, then position
      applyResponsiveStyles();
    } else {
      hideOverlay();
    }
  }, [
    singleInfo.show,
    singleInfo.expressID,
    singleInfo.pos,
    singleInfo.name,
    applyResponsiveStyles,
    hideOverlay,
  ]);

  /**
   * Setup continuous position updates during camera movement
   */
  useEffect(() => {
    function handleCameraUpdate() {
      if (singleInfo.show && singleInfo.pos && camera && infoBoxRef.current) {
        updateOverlayPosition();
      }
      animationFrameRef.current = requestAnimationFrame(handleCameraUpdate);
    }

    if (singleInfo.show) {
      animationFrameRef.current = requestAnimationFrame(handleCameraUpdate);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [singleInfo.show, singleInfo.pos, camera, updateOverlayPosition]);

  // 🔧 Force initial render when component mounts
  useEffect(() => {
    if (singleInfo.show && infoBoxRef.current) {
      console.log("🎨 Force rendering info overlay");
      infoBoxRef.current.style.display = "block";
      infoBoxRef.current.style.visibility = "visible";
      infoBoxRef.current.style.opacity = "1";
    }
  }, [singleInfo.show]);

  // 🔧 Always render the elements, control visibility with CSS
  return (
    <>
      {/* Info Box - Always rendered */}
      <div
        ref={infoBoxRef}
        style={{
          position: "absolute",
          zIndex: 1201,
          pointerEvents: "auto",
          background: "rgba(0,0,0,0.75)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "#fff",
          borderRadius: 10,
          padding: 10,
          fontWeight: 600,
          display: singleInfo.show ? "block" : "none", // 🔧 Control visibility
          visibility: singleInfo.show ? "visible" : "hidden",
          opacity: singleInfo.show ? "1" : "0",
          userSelect: "text",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Express ID */}
        <div style={{ fontSize: "100%", marginBottom: "4px" }}>
          ID: {singleInfo.expressID != null ? singleInfo.expressID : "-"}
        </div>

        {/* Object Name */}
        <div
          style={{
            color: "#ffd300",
            fontSize: "85%",
            fontWeight: 400,
            marginBottom: singleInfo.name2 ? "2px" : "0",
            wordBreak: "break-word",
            whiteSpace: "normal",
            userSelect: "text",
          }}
        >
          {singleInfo.name || "Unknown Object"}
        </div>

        {/* Object Type (if available) */}
        {singleInfo.name2 && (
          <div
            style={{
              color: "#87ceeb",
              fontSize: "75%",
              fontWeight: 300,
              fontStyle: "italic",
            }}
          >
            Type: {singleInfo.name2}
          </div>
        )}
      </div>

      {/* Connecting Line - Always rendered */}
      <svg
        ref={svgRef}
        style={{
          position: "absolute",
          zIndex: 1200,
          pointerEvents: "none",
          width: "100%",
          height: "100%",
          left: 0,
          top: 0,
          display: singleInfo.show ? "block" : "none",
        }}
      >
        <line
          ref={lineRef}
          x1={0}
          y1={0}
          x2={0}
          y2={0}
          stroke="#ffffff"
          strokeWidth={2}
          strokeOpacity={0.8}
          style={{
            display: singleInfo.show ? "block" : "none",
          }}
        />
      </svg>
    </>
  );
};

export default InfoOverlay;
