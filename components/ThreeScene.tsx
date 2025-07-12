// components/ThreeScene.tsx (Fixed - No Infinite Loop)
"use client";
import React, { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { ThreeSceneProps } from "@/types/three-scene.types";
import { useAppStore } from "@/lib/store";
import { MODELS } from "@/lib/constants";

// Custom Hooks
import { useThreeSceneCore } from "@/hooks/useThreeSceneCore";
import { useIFCLoader } from "@/hooks/useIFCLoader";
import { useCameraControl } from "@/hooks/useCameraControl";
import { useObjectSelection } from "@/hooks/useObjectSelection";
import { useBlacklistManager } from "@/hooks/useBlacklistManager";
import { useVisualEffects } from "@/hooks/useVisualEffects";
import { usePresetManager } from "@/hooks/usePresetManager";
import { useEventHandlers } from "@/hooks/useEventHandlers";

// Components
import InfoOverlay from "@/components/three-scene/InfoOverlay";
import ContextMenu from "@/components/ContextMenu";

const ThreeScene: React.FC<ThreeSceneProps> = ({
  onPresetSaved,
  onPresetLoaded,
  onPresetDeleted,
  onPresetsLoaded,
}) => {
  // 🔧 Get store functions with stable references
  const currentModelKey = useAppStore((state) => state.currentModelKey);
  const setCurrentModelKey = useAppStore((state) => state.setCurrentModelKey);
  const setBimPanelData = useAppStore((state) => state.setBimPanelData);
  const setSelectedIDs = useAppStore((state) => state.setSelectedIDs);

  // 🔧 Ensure we have a valid model name, fallback to first model
  const activeModelKey = currentModelKey || MODELS[0]?.key || "ground";

  // 🔧 Use ref to prevent unnecessary re-renders
  const activeModelRef = useRef(activeModelKey);
  activeModelRef.current = activeModelKey;

  // Core Three.js setup
  const { scene, camera, renderer, controls, containerRef, isInitialized } =
    useThreeSceneCore();

  // IFC Model loading
  const {
    ifcModel,
    ifcLoader,
    modelLoaded,
    loadIFCModel,
    isLoading: modelIsLoading,
  } = useIFCLoader(scene, renderer);

  // Camera control
  const {
    setCameraState,
    getCurrentCameraState,
    animateToTarget,
    loadDefaultPreset,
    initializeCameraDistance,
  } = useCameraControl(camera, controls, ifcModel);

  // Blacklist management
  const {
    blacklist,
    hiddenObjects,
    blacklistLoaded,
    addToBlacklist,
    hideObject,
    showHiddenObject,
    loadBlacklist,
    shouldIgnoreObject,
  } = useBlacklistManager(ifcLoader, scene);

  // 🔧 Object selection with stable model name
  const {
    singleInfo,
    hoverID,
    contextMenu,
    handleDoubleClick,
    handlePointerMove,
    handleRightClick,
    unselectObject,
    selectObjectById,
    closeContextMenu,
    clearHover,
  } = useObjectSelection(
    scene,
    camera,
    renderer,
    ifcModel,
    ifcLoader,
    shouldIgnoreObject,
    activeModelKey
  );

  // 🔧 Visual effects with proper cleanup
  const {
    boundaryBoxLines,
    centerLine,
    createBoundingBoxVisualization,
    clearVisualEffects,
  } = useVisualEffects(scene, renderer, singleInfo, ifcModel);

  // Preset management
  const {
    savePreset,
    loadPreset,
    deletePreset,
    updatePresetLabel,
    loadAllPresets,
  } = usePresetManager(
    getCurrentCameraState,
    setCameraState,
    activeModelKey,
    onPresetSaved,
    onPresetLoaded,
    onPresetDeleted,
    onPresetsLoaded
  );

  // Event handlers setup
  const { setupEventListeners, cleanupEventListeners } = useEventHandlers(
    renderer,
    handlePointerMove,
    handleDoubleClick,
    handleRightClick,
    closeContextMenu
  );

  // 🔧 Memoized cleanup function to prevent recreating
  const clearAllSelectionStates = useCallback(() => {
    console.log("🧹 Clearing all selection states");
    unselectObject();
    clearVisualEffects();
    clearHover();
    setBimPanelData(null);
    setSelectedIDs(new Set());
  }, [
    unselectObject,
    clearVisualEffects,
    clearHover,
    setBimPanelData,
    setSelectedIDs,
  ]);

  // 🔧 Enhanced context menu handlers with stable references
  const handleContextMenuAction = useCallback(
    (action: string) => {
      if (!contextMenu.expressID) return;

      console.log(
        `🎯 Context menu action: ${action} for object ${contextMenu.expressID}`
      );

      switch (action) {
        case "unselect":
          clearAllSelectionStates();
          break;
        case "hide":
          hideObject(contextMenu.expressID);
          // Clear selection if hiding the selected object
          if (singleInfo.expressID === contextMenu.expressID) {
            clearAllSelectionStates();
          }
          break;
        case "blacklist":
          addToBlacklist(
            contextMenu.expressID,
            activeModelRef.current,
            contextMenu.name || "-"
          );
          // Clear selection if blacklisting the selected object
          if (singleInfo.expressID === contextMenu.expressID) {
            clearAllSelectionStates();
          }
          break;
      }
      closeContextMenu();
    },
    [
      contextMenu.expressID,
      contextMenu.name,
      singleInfo.expressID,
      clearAllSelectionStates,
      hideObject,
      addToBlacklist,
      closeContextMenu,
    ]
  );

  // 🔧 Initialize blacklist once on mount
  useEffect(() => {
    loadBlacklist();
  }, [loadBlacklist]);

  // 🔧 Enhanced model loading with better dependency management
  useEffect(() => {
    if (!activeModelKey || !isInitialized || !loadIFCModel) return;

    console.log("🔄 Loading model:", activeModelKey);

    // Clear states before loading new model
    clearAllSelectionStates();

    loadIFCModel(activeModelKey);
  }, [activeModelKey, isInitialized, loadIFCModel, clearAllSelectionStates]);

  // 🔧 Initialize camera distance when model loads - minimal dependencies
  useEffect(() => {
    if (!modelLoaded || !camera || !controls) return;

    console.log("📷 Initializing camera for model:", activeModelRef.current);
    initializeCameraDistance();

    if (activeModelRef.current) {
      loadDefaultPreset(activeModelRef.current);
    }
  }, [
    modelLoaded,
    camera,
    controls,
    initializeCameraDistance,
    loadDefaultPreset,
  ]);

  // 🔧 Setup event listeners with minimal dependencies
  useEffect(() => {
    if (!isInitialized || !blacklistLoaded || modelIsLoading) return;

    setupEventListeners();
    return cleanupEventListeners;
  }, [
    isInitialized,
    blacklistLoaded,
    modelIsLoading,
    setupEventListeners,
    cleanupEventListeners,
  ]);

  // 🔧 Load presets when model changes - using ref to prevent dependency issues
  useEffect(() => {
    if (!modelLoaded) return;

    const currentModel = activeModelRef.current;
    if (currentModel) {
      loadAllPresets(currentModel);
    }
  }, [modelLoaded, loadAllPresets]);

  // 🔧 Auto-animate to selected object with better timing and dependencies
  useEffect(() => {
    if (
      !singleInfo.show ||
      !singleInfo.pos ||
      !camera ||
      !controls ||
      modelIsLoading
    )
      return;

    console.log("🎯 Animating to selected object:", singleInfo.expressID);
    const targetPos = new THREE.Vector3(
      singleInfo.pos.x,
      singleInfo.pos.y,
      singleInfo.pos.z
    );

    // Use timeout to avoid conflicts with other state updates
    const timeoutId = setTimeout(() => {
      animateToTarget(targetPos, 5);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [
    singleInfo.show,
    singleInfo.expressID,
    animateToTarget,
    camera,
    controls,
    modelIsLoading,
  ]);

  // 🔧 Debug log for tracking state changes - throttled to prevent spam
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      console.log("📊 ThreeScene state:", {
        activeModelKey: activeModelRef.current,
        modelLoaded,
        isInitialized,
        blacklistLoaded,
        selectedObject: singleInfo.expressID,
        hasVisualEffects: !!(boundaryBoxLines || centerLine),
      });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [
    modelLoaded,
    isInitialized,
    blacklistLoaded,
    singleInfo.expressID,
    boundaryBoxLines,
    centerLine,
  ]);

  // 🔧 Expose preset functions globally - stable dependencies
  useEffect(() => {
    (window as any).presetFunctions = {
      savePreset,
      loadPreset,
      deletePreset,
      loadAllPresets,
      updatePresetLabel,
      getCurrentCameraState,
      setCameraState,
      loadDefaultPreset,
      showHiddenObject,
    };

    return () => {
      (window as any).presetFunctions = null;
    };
  }, [
    savePreset,
    loadPreset,
    deletePreset,
    loadAllPresets,
    updatePresetLabel,
    getCurrentCameraState,
    setCameraState,
    loadDefaultPreset,
    showHiddenObject,
  ]);

  // 🔧 Expose model switching function - stable dependencies
  useEffect(() => {
    (window as any).switchModelFromSidePanel = (modelIndex: number) => {
      const model = MODELS[modelIndex];
      if (model && model.key !== activeModelRef.current) {
        console.log("🔄 Switching model from side panel:", model.key);
        setCurrentModelKey(model.key);
      }
    };

    return () => {
      (window as any).switchModelFromSidePanel = null;
    };
  }, [setCurrentModelKey]);

  // 🔧 Trigger preset ready callback - minimal dependencies
  useEffect(() => {
    if (!modelLoaded) return;

    const timeoutId = setTimeout(() => {
      if (typeof window !== "undefined" && (window as any).onPresetReady) {
        console.log("🎉 Triggering preset ready callback");
        (window as any).onPresetReady();
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [modelLoaded]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        position: "absolute",
        left: 0,
        top: 0,
        overflow: "hidden",
      }}
    >
      {/* Context Menu */}
      <ContextMenu
        show={contextMenu.show}
        x={contextMenu.x}
        y={contextMenu.y}
        onUnselect={() => handleContextMenuAction("unselect")}
        onHide={() => handleContextMenuAction("hide")}
        onBlacklist={() => handleContextMenuAction("blacklist")}
        onClose={closeContextMenu}
      />

      {/* Info Overlay */}
      <InfoOverlay
        singleInfo={singleInfo}
        camera={camera}
        containerRef={containerRef}
      />

      {/* Loading indicator */}
      {modelIsLoading && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "white",
            fontSize: "18px",
            fontWeight: "bold",
            zIndex: 1000,
            textAlign: "center",
            background: "rgba(0,0,0,0.7)",
            padding: "20px",
            borderRadius: "10px",
          }}
        >
          <div>Loading 3D Model...</div>
          <div style={{ fontSize: "14px", marginTop: "10px", opacity: 0.8 }}>
            Loading {activeModelRef.current} model...
          </div>
        </div>
      )}

      {/* 🔧 Enhanced debug info */}
      {process.env.NODE_ENV === "development" && (
        <div
          style={{
            position: "absolute",
            bottom: 10,
            left: 10,
            color: "white",
            fontSize: "12px",
            fontFamily: "monospace",
            backgroundColor: "rgba(0,0,0,0.7)",
            padding: "8px",
            borderRadius: "5px",
            zIndex: 1000,
            lineHeight: "1.4",
          }}
        >
          <div>
            <strong>Debug Info:</strong>
          </div>
          <div>Model: {activeModelRef.current}</div>
          <div>Loaded: {modelLoaded ? "Yes" : "No"}</div>
          <div>Initialized: {isInitialized ? "Yes" : "No"}</div>
          <div>Blacklisted: {blacklist.size}</div>
          <div>Hidden: {hiddenObjects.size}</div>
          <div>Selected: {singleInfo.expressID || "None"}</div>
          <div>
            Has Visual: {!!(boundaryBoxLines || centerLine) ? "Yes" : "No"}
          </div>
          <div>Info Box: {singleInfo.show ? "Show" : "Hidden"}</div>
          <div>Hovered: {hoverID || "None"}</div>
          <div>Context Menu: {contextMenu.show ? "Open" : "Closed"}</div>
        </div>
      )}

      {/* Performance info (development only) */}
      {process.env.NODE_ENV === "development" && renderer && (
        <div
          style={{
            position: "absolute",
            bottom: 10,
            right: 10,
            color: "white",
            fontSize: "11px",
            fontFamily: "monospace",
            backgroundColor: "rgba(0,0,0,0.7)",
            padding: "6px",
            borderRadius: "5px",
            zIndex: 1000,
          }}
        >
          <div>Renderer: {renderer.info.render.triangles} triangles</div>
          <div>Draw calls: {renderer.info.render.calls}</div>
          <div>
            Memory:{" "}
            {renderer.info.memory.geometries + renderer.info.memory.textures}{" "}
            objects
          </div>
        </div>
      )}
    </div>
  );
};

export default ThreeScene;
