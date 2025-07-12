// hooks/useEventHandlers.ts (Fixed)
import { useCallback, useEffect } from "react";
import * as THREE from "three"; // 🔧 เพิ่มบรรทัดนี้
import { EventHandlersReturn } from "@/types/three-scene.types";

export function useEventHandlers(
  renderer: THREE.WebGLRenderer | null,
  handlePointerMove: (event: PointerEvent) => Promise<void>,
  handleDoubleClick: (event: MouseEvent) => Promise<void>,
  handleRightClick: (event: MouseEvent) => Promise<void>,
  closeContextMenu: () => void
): EventHandlersReturn {
  /**
   * Setup all event listeners
   */
  const setupEventListeners = useCallback(() => {
    if (!renderer?.domElement) return;

    console.log("Setting up event listeners");

    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("dblclick", handleDoubleClick);
    renderer.domElement.addEventListener("contextmenu", handleRightClick);

    // Global click handler for closing context menu
    const handleGlobalClick = (event: MouseEvent) => {
      // Check if click is outside context menu
      const target = event.target as Element;
      if (!target.closest("[data-context-menu]")) {
        closeContextMenu();
      }
    };

    document.addEventListener("click", handleGlobalClick);

    // Store cleanup function
    (renderer.domElement as any)._cleanupEventListeners = () => {
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("dblclick", handleDoubleClick);
      renderer.domElement.removeEventListener("contextmenu", handleRightClick);
      document.removeEventListener("click", handleGlobalClick);
    };
  }, [
    renderer,
    handlePointerMove,
    handleDoubleClick,
    handleRightClick,
    closeContextMenu,
  ]);

  /**
   * Cleanup all event listeners
   */
  const cleanupEventListeners = useCallback(() => {
    if (!renderer?.domElement) return;

    console.log("Cleaning up event listeners");

    // Use stored cleanup function if available
    if ((renderer.domElement as any)._cleanupEventListeners) {
      (renderer.domElement as any)._cleanupEventListeners();
      delete (renderer.domElement as any)._cleanupEventListeners;
    } else {
      // Fallback cleanup
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("dblclick", handleDoubleClick);
      renderer.domElement.removeEventListener("contextmenu", handleRightClick);
    }
  }, [renderer, handlePointerMove, handleDoubleClick, handleRightClick]);

  // Auto cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupEventListeners();
    };
  }, [cleanupEventListeners]);

  return {
    setupEventListeners,
    cleanupEventListeners,
  };
}
