"use client";

import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";

export default function ModelLoadingOverlay() {
  const { modelLoading, modelLoadingProgress, modelLoadingMessage } =
    useAppStore();
  const [dots, setDots] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);

  // Animated dots
  useEffect(() => {
    if (!modelLoading) return;
    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev === "...") return "";
        return prev + ".";
      });
    }, 500);
    return () => clearInterval(interval);
  }, [modelLoading]);

  // Optional: click outside popup to close (disable if you want force loading)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        // do nothing, or set loading = false if you want
        // Example: setModelLoading(false); // but normally you should NOT allow user to cancel loading
      }
    }
    if (modelLoading) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [modelLoading]);

  if (!modelLoading) return null;

  return (
    <>
      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        @keyframes pulse {
          0%,
          100% {
            opacity: 0.8;
          }
          50% {
            opacity: 0.4;
          }
        }
        @keyframes slideInUp {
          from {
            transform: translateY(30px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes shimmer {
          0% {
            left: -100%;
          }
          100% {
            left: 100%;
          }
        }

        .popup-overlay-bg {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(40, 40, 55, 0.23); /* เบาบาง ไม่บังทั้งจอ */
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(2.5px); /* blur เบาๆ */
        }
        .popup-modal {
          background: rgba(22, 28, 45, 0.98);
          border-radius: 24px;
          box-shadow: 0 8px 48px #000b, 0 2px 10px #1218;
          min-width: 320px;
          max-width: 94vw;
          min-height: 260px;
          max-height: 92vh;
          padding: 34px 36px 32px 36px;
          display: flex;
          flex-direction: column;
          align-items: center;
          animation: slideInUp 0.6s cubic-bezier(0.47, 1.64, 0.41, 0.8);
          position: relative;
        }
        .loading-spinner {
          width: 64px;
          height: 64px;
          border: 4px solid rgba(59, 130, 246, 0.3);
          border-top: 4px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 18px;
        }
        .model-icon {
          font-size: 34px;
          margin-bottom: 13px;
          animation: pulse 2s infinite;
        }
        .loading-title {
          font-size: 22px;
          font-weight: 600;
          color: #ffffff;
          margin-bottom: 8px;
          letter-spacing: 0.6px;
          text-align: center;
        }
        .loading-message {
          font-size: 15px;
          color: #b1c2dd;
          margin-bottom: 20px;
          min-height: 22px;
          text-align: center;
        }
        .loading-progress {
          width: 260px;
          max-width: 80vw;
          height: 6px;
          background: rgba(59, 130, 246, 0.19);
          border-radius: 3px;
          overflow: hidden;
          margin: 0 auto 16px;
        }
        .loading-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #1d4ed8);
          border-radius: 3px;
          transition: width 0.3s cubic-bezier(0.63, 1.48, 0.63, 0.85);
          position: relative;
        }
        .loading-progress-bar::after {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.26),
            transparent
          );
          animation: shimmer 2s infinite;
        }
        .loading-percentage {
          font-size: 14px;
          color: #7c97ba;
          font-weight: 500;
          text-align: center;
        }
        .loading-tips {
          margin-top: 22px;
          padding: 12px 18px 10px 18px;
          background: rgba(59, 130, 246, 0.11);
          border: 1px solid rgba(59, 130, 246, 0.18);
          border-radius: 10px;
          max-width: 300px;
        }
        .loading-tips-title {
          font-size: 14px;
          font-weight: 600;
          color: #3b82f6;
          margin-bottom: 8px;
        }
        .loading-tips-text {
          font-size: 12px;
          color: #94a3b8;
          line-height: 1.4;
        }
        @media (max-width: 600px) {
          .popup-modal {
            min-width: 92vw;
            max-width: 98vw;
            padding: 18px 4vw 14px 4vw;
          }
          .loading-progress {
            width: 80vw;
            min-width: 88px;
          }
        }
      `}</style>

      <div className="popup-overlay-bg">
        <div className="popup-modal" ref={modalRef}>
          <div className="loading-spinner"></div>
          <div className="loading-title">Loading 3D Model{dots}</div>
          <div className="loading-message">
            {modelLoadingMessage || "Preparing model data"}
          </div>
          <div className="loading-progress">
            <div
              className="loading-progress-bar"
              style={{ width: `${Math.max(5, modelLoadingProgress)}%` }}
            ></div>
          </div>
          <div className="loading-percentage">
            {modelLoadingProgress.toFixed(0)}%
          </div>
        </div>
      </div>
    </>
  );
}
