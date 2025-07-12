"use client";
import React from "react";

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
  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: x,
        top: y,
        background: "rgba(0, 0, 0, 0.9)",
        border: "1px solid #444",
        borderRadius: "4px",
        padding: "4px 0",
        zIndex: 2000,
        minWidth: "140px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
      }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div
        style={menuItemStyle}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "rgba(255,255,255,0.1)")
        }
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        onClick={() => {
          onUnselect();
          onClose();
        }}
      >
        Unselect
      </div>
      <div
        style={menuItemStyle}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "rgba(255,255,255,0.1)")
        }
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        onClick={() => {
          onHide();
          onClose();
        }}
      >
        Hide object
      </div>
      <div
        style={{ ...menuItemStyle, color: "#ff6b6b", borderBottom: "none" }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "rgba(255,255,255,0.1)")
        }
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        onClick={() => {
          onBlacklist();
          onClose();
        }}
      >
        Blacklist
      </div>
    </div>
  );
};

const menuItemStyle: React.CSSProperties = {
  padding: "8px 16px",
  color: "#fff",
  cursor: "pointer",
  fontSize: "14px",
  borderBottom: "1px solid #333",
};

export default ContextMenu;
