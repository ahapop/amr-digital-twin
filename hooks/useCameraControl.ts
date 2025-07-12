// hooks/useCameraControl.ts
import { useCallback, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three-stdlib";
import { PresetData, PresetAPI } from "@/lib/presetApi";
import { CameraControlReturn } from "@/types/three-scene.types";
import {
  animateCameraToPosition,
  animateCameraToTargetAbsZoom,
  setCameraStateImmediate,
  getCameraTargetDistance,
} from "@/lib/utils/animation-utils";
import { getModelCenter } from "@/lib/utils/three-helpers";

export function useCameraControl(
  camera: THREE.PerspectiveCamera | null,
  controls: OrbitControls | null,
  ifcModel: THREE.Object3D | null
): CameraControlReturn {
  const initialDistanceRef = useRef<number | null>(null);
  const lastLoggedZoomRef = useRef<number | null>(null);

  /**
   * Set camera state with optional animation
   */
  const setCameraState = useCallback(
    async (preset: PresetData, animate: boolean = true) => {
      if (!camera || !controls || !initialDistanceRef.current) {
        console.warn("Camera or controls not available for setCameraState");
        return;
      }

      const targetPosition = new THREE.Vector3(...preset.position);
      const targetTarget = new THREE.Vector3(...preset.target);

      if (animate) {
        await animateCameraToPosition(
          camera,
          controls,
          targetTarget,
          targetPosition,
          0.8
        );
      } else {
        setCameraStateImmediate(
          camera,
          controls,
          preset.position,
          preset.target
        );
      }

      // Update zoom tracking
      const distance = getCameraTargetDistance(camera, controls);
      const zoomFactor = initialDistanceRef.current / distance;
      lastLoggedZoomRef.current = zoomFactor;

      console.log(
        `Camera set to preset: ${preset.label}, zoom: ${zoomFactor.toFixed(2)}`
      );
    },
    [camera, controls]
  );

  /**
   * Get current camera state as preset data
   */
  const getCurrentCameraState = useCallback((): PresetData | null => {
    if (!camera || !controls || !initialDistanceRef.current) {
      console.warn(
        "Camera or controls not available for getCurrentCameraState"
      );
      return null;
    }

    const distance = getCameraTargetDistance(camera, controls);
    const zoom = initialDistanceRef.current / distance;

    return {
      label: `Preset ${Date.now()}`,
      position: [camera.position.x, camera.position.y, camera.position.z],
      target: [controls.target.x, controls.target.y, controls.target.z],
      zoom: zoom,
    };
  }, [camera, controls]);

  /**
   * Animate camera to target with zoom
   */
  const animateToTarget = useCallback(
    async (target: THREE.Vector3, zoomFactor: number = 3) => {
      if (!camera || !controls || !initialDistanceRef.current) {
        console.warn("Camera or controls not available for animateToTarget");
        return;
      }

      await animateCameraToTargetAbsZoom(
        camera,
        controls,
        target,
        initialDistanceRef.current,
        zoomFactor,
        0.8
      );

      // Update zoom tracking
      lastLoggedZoomRef.current = zoomFactor;

      console.log(`Camera animated to target, zoom: ${zoomFactor}`);
    },
    [camera, controls]
  );

  /**
   * Load default preset for model
   */
  const loadDefaultPreset = useCallback(
    async (modelKey?: string) => {
      if (!camera || !controls) {
        console.warn("Camera or controls not available for loadDefaultPreset");
        return;
      }

      if (!modelKey) {
        console.warn("No model key provided for loadDefaultPreset");
        return;
      }

      try {
        // Try to load preset index 0 first
        const response = await PresetAPI.loadPreset(modelKey, 0);

        if (response.status === "ok" && response.preset) {
          await setCameraState(response.preset, false);
          console.log(`Loaded default preset for model: ${modelKey}`);
          return;
        }

        // Fallback: try presets 1-4
        for (let i = 1; i < 5; i++) {
          const fallbackResponse = await PresetAPI.loadPreset(modelKey, i);
          if (fallbackResponse.status === "ok" && fallbackResponse.preset) {
            await setCameraState(fallbackResponse.preset, false);
            console.log(`Loaded fallback preset ${i} for model: ${modelKey}`);
            return;
          }
        }

        // Final fallback: use model center
        if (ifcModel) {
          const modelCenter = getModelCenter(ifcModel);
          camera.position.set(30, 30, 30);
          controls.target.copy(modelCenter);
          camera.lookAt(modelCenter);
          controls.update();

          // Set initial distance
          initialDistanceRef.current = getCameraTargetDistance(
            camera,
            controls
          );
          lastLoggedZoomRef.current = 1;

          console.log(`Used model center as fallback for model: ${modelKey}`);
        }
      } catch (error) {
        console.error("Error loading default preset:", error);

        // Emergency fallback
        if (camera && controls) {
          camera.position.set(30, 30, 30);
          controls.target.set(0, 0, 0);
          camera.lookAt(controls.target);
          controls.update();

          initialDistanceRef.current = getCameraTargetDistance(
            camera,
            controls
          );
          lastLoggedZoomRef.current = 1;
        }
      }
    },
    [camera, controls, ifcModel, setCameraState]
  );

  /**
   * Initialize camera distance tracking
   */
  const initializeCameraDistance = useCallback(() => {
    if (!camera || !controls) return;

    initialDistanceRef.current = getCameraTargetDistance(camera, controls);
    lastLoggedZoomRef.current = 1;

    console.log(`Initialized camera distance: ${initialDistanceRef.current}`);
  }, [camera, controls]);

  /**
   * Get current zoom factor
   */
  const getCurrentZoom = useCallback((): number => {
    if (!camera || !controls || !initialDistanceRef.current) return 1;

    const distance = getCameraTargetDistance(camera, controls);
    return initialDistanceRef.current / distance;
  }, [camera, controls]);

  /**
   * Set zoom level
   */
  const setZoom = useCallback(
    async (zoomFactor: number, animate: boolean = true) => {
      if (!camera || !controls || !initialDistanceRef.current) return;

      const targetDistance = initialDistanceRef.current / zoomFactor;
      const direction = new THREE.Vector3()
        .subVectors(camera.position, controls.target)
        .normalize();

      const newPosition = controls.target
        .clone()
        .add(direction.multiplyScalar(targetDistance));

      if (animate) {
        await animateCameraToPosition(
          camera,
          controls,
          controls.target,
          newPosition,
          0.5
        );
      } else {
        camera.position.copy(newPosition);
        camera.lookAt(controls.target);
        controls.update();
      }

      lastLoggedZoomRef.current = zoomFactor;
    },
    [camera, controls]
  );

  /**
   * Reset camera to default position
   */
  const resetCamera = useCallback(() => {
    if (!camera || !controls) return;

    const modelCenter = ifcModel
      ? getModelCenter(ifcModel)
      : new THREE.Vector3(0, 0, 0);

    camera.position.set(30, 30, 30);
    controls.target.copy(modelCenter);
    camera.lookAt(modelCenter);
    controls.update();

    initializeCameraDistance();

    console.log("Camera reset to default position");
  }, [camera, controls, ifcModel, initializeCameraDistance]);

  return {
    setCameraState,
    getCurrentCameraState,
    animateToTarget,
    loadDefaultPreset,
    initialDistance: initialDistanceRef.current,
    initializeCameraDistance,
    getCurrentZoom,
    setZoom,
    resetCamera,
  };
}
