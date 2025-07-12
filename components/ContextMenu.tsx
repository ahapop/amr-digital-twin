// components/ContextMenu.tsx (Updated)
"use client";
import React, { useEffect, useRef } from "react";

interface ContextMenuProps {
  show: boolean;
  x: number;
  y: number;
  onUnselect: () => void;
  onHide: () => void;
  onBlacklist: () => void;
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  show,
  x,
  y,
  onUnselect,
  onHide,
  onBlacklist,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close
  useEffect(() => {
    if (!show) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Use setTimeout to avoid immediate closing
    const timeoutId = setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("click", handleClickOutside);
    };
  }, [show, onClose]);

  // Handle escape key
  useEffect(() => {
    if (!show) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [show, onClose]);

  if (!show) return null;

  // Ensure menu stays within viewport
  const adjustedX = Math.min(x, window.innerWidth - 160);
  const adjustedY = Math.min(y, window.innerHeight - 120);

  const menuItems = [
    {
      label: "Unselect Object",
      icon: "🔄",
      onClick: onUnselect,
      description: "Clear current selection",
      color: "#4ade80",
    },
    {
      label: "Hide Object",
      icon: "👁️",
      onClick: onHide,
      description: "Hide this object from view",
      color: "#f59e0b",
    },
    {
      label: "Add to Blacklist",
      icon: "🚫",
      onClick: onBlacklist,
      description: "Permanently blacklist this object",
      color: "#ef4444",
      dangerous: true,
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "transparent",
          zIndex: 1999,
          pointerEvents: "auto",
        }}
        onClick={onClose}
      />

      {/* Context Menu */}
      <div
        ref={menuRef}
        data-context-menu
        style={{
          position: "fixed",
          left: adjustedX,
          top: adjustedY,
          background: "rgba(30, 30, 30, 0.95)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "8px",
          padding: "6px 0",
          zIndex: 2000,
          minWidth: "180px",
          boxShadow:
            "0 10px 30px rgba(0, 0, 0, 0.4), 0 4px 12px rgba(0, 0, 0, 0.2)",
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: "14px",
          animation: "contextMenuSlideIn 0.15s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      >
        <style jsx>{`
          @keyframes contextMenuSlideIn {
            from {
              opacity: 0;
              transform: scale(0.95) translateY(-5px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }
        `}</style>

        {menuItems.map((item, index) => (
          <div
            key={index}
            style={{
              padding: "10px 16px",
              color: "#ffffff",
              cursor: "pointer",
              borderBottom:
                index < menuItems.length - 1
                  ? "1px solid rgba(255, 255, 255, 0.08)"
                  : "none",
              transition: "all 0.15s ease",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              position: "relative",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = item.dangerous
                ? "rgba(239, 68, 68, 0.15)"
                : "rgba(255, 255, 255, 0.1)";
              if (item.dangerous) {
                e.currentTarget.style.borderLeft = "3px solid #ef4444";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.borderLeft = "none";
            }}
            onClick={() => {
              item.onClick();
              onClose();
            }}
          >
            {/* Icon */}
            <span
              style={{
                fontSize: "16px",
                width: "20px",
                textAlign: "center",
                filter: item.dangerous ? "brightness(1.2)" : "none",
              }}
            >
              {item.icon}
            </span>

            {/* Content */}
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontWeight: "500",
                  color: item.dangerous ? "#fca5a5" : "#ffffff",
                  marginBottom: "2px",
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: item.dangerous ? "#fca5a5" : "#a1a1aa",
                  opacity: 0.8,
                }}
              >
                {item.description}
              </div>
            </div>

            {/* Keyboard shortcut hint (optional) */}
            {index === 0 && (
              <span
                style={{
                  fontSize: "11px",
                  color: "#71717a",
                  fontFamily: "monospace",
                  background: "rgba(255, 255, 255, 0.1)",
                  padding: "2px 6px",
                  borderRadius: "4px",
                }}
              >
                ESC
              </span>
            )}
          </div>
        ))}

        {/* Footer info */}
        <div
          style={{
            padding: "8px 16px 6px",
            fontSize: "11px",
            color: "#71717a",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            textAlign: "center",
          }}
        >
          Right-click to close • ESC to cancel
        </div>
      </div>
    </>
  );
};

export default ContextMenu;
