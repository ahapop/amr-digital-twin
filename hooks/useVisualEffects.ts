// hooks/useVisualEffects.ts (Fixed - No Infinite Loop)
import { useState, useCallback, useEffect, useRef } from "react";
import * as THREE from "three";
import { Line2, LineGeometry, LineMaterial } from "three-stdlib";
import {
  VisualEffectsReturn,
  SingleInfoState,
} from "@/types/three-scene.types";
import {
  createBoundingBoxEdges,
  createCenterLinePoints,
  computeBoundingBoxForExpressId,
} from "@/lib/utils/geometry-utils";

export function useVisualEffects(
  scene: THREE.Scene | null,
  renderer: THREE.WebGLRenderer | null,
  singleInfo: SingleInfoState,
  ifcModel: THREE.Object3D | null
): VisualEffectsReturn {
  const [boundaryBoxLines, setBoundaryBoxLines] = useState<
    THREE.Object3D[] | null
  >(null);
  const [centerLine, setCenterLine] = useState<THREE.Object3D | null>(null);

  // 🔧 Keep track of current visualized object to detect changes
  const currentExpressIDRef = useRef<number | null>(null);
  const clearingRef = useRef(false); // 🔧 Prevent recursive clearing

  /**
   * 🔧 Clear all visual effects - memoized with cleanup prevention
   */
  const clearVisualEffects = useCallback(() => {
    if (!scene || clearingRef.current) return;

    clearingRef.current = true;
    console.log("🧹 Clearing visual effects");

    // Remove bounding box lines
    if (boundaryBoxLines) {
      boundaryBoxLines.forEach((obj) => {
        try {
          scene.remove(obj);
          if ("geometry" in obj && obj.geometry) {
            obj.geometry.dispose();
          }
          if ("material" in obj && obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach((mat) => mat.dispose());
            } else {
              obj.material.dispose();
            }
          }
        } catch (error) {
          console.warn("Error disposing visual effect object:", error);
        }
      });
      setBoundaryBoxLines(null);
    }

    // Remove center line
    if (centerLine) {
      try {
        scene.remove(centerLine);
        if ("geometry" in centerLine && centerLine.geometry) {
          centerLine.geometry.dispose();
        }
        if ("material" in centerLine && centerLine.material) {
          if (Array.isArray(centerLine.material)) {
            centerLine.material.forEach((mat) => mat.dispose());
          } else {
            centerLine.material.dispose();
          }
        }
      } catch (error) {
        console.warn("Error disposing center line:", error);
      }
      setCenterLine(null);
    }

    // Reset current tracked object
    currentExpressIDRef.current = null;
    clearingRef.current = false;

    console.log("✅ Visual effects cleared");
  }, [scene, boundaryBoxLines, centerLine]);

  /**
   * 🔧 Create bounding box visualization - memoized
   */
  const createBoundingBoxVisualization = useCallback(
    (bbox: THREE.Box3, expressID?: number) => {
      if (!scene || !renderer || clearingRef.current) return;

      console.log("🎨 Creating bounding box visualization for:", expressID);

      // 🔧 Clear existing visuals first (but prevent recursive calls)
      if (!clearingRef.current) {
        clearVisualEffects();
      }

      try {
        // Create bounding box wireframe
        const points = createBoundingBoxEdges(bbox);
        const lineGeometry = new LineGeometry();
        lineGeometry.setPositions(points);

        const lineMaterial = new LineMaterial({
          color: 0xffff00,
          linewidth: 2,
          transparent: false,
          depthTest: false,
        });

        lineMaterial.resolution.set(
          renderer.domElement.width || 1920,
          renderer.domElement.height || 1080
        );

        const line = new Line2(lineGeometry, lineMaterial);
        line.renderOrder = 9999;
        scene.add(line);

        setBoundaryBoxLines([line]);

        // Create center line
        const { bottom, top } = createCenterLinePoints(bbox);
        const centerLineGeom = new LineGeometry();
        centerLineGeom.setPositions([
          bottom.x,
          bottom.y,
          bottom.z,
          top.x,
          top.y,
          top.z,
        ]);

        const centerLineMat = new LineMaterial({
          color: 0xffffff,
          linewidth: 0.006,
          transparent: false,
          depthTest: false,
        });

        centerLineMat.resolution.set(
          renderer.domElement.width || 1920,
          renderer.domElement.height || 1080
        );

        const centerLineObj = new Line2(centerLineGeom, centerLineMat);
        centerLineObj.renderOrder = 10000;
        scene.add(centerLineObj);

        setCenterLine(centerLineObj);

        // 🔧 Track current object
        if (expressID) {
          currentExpressIDRef.current = expressID;
        }

        console.log("✅ Bounding box visualization created");
      } catch (error) {
        console.error("❌ Error creating bounding box visualization:", error);
      }
    },
    [scene, renderer, clearVisualEffects]
  );

  // 🔧 React to singleInfo changes with better detection and debouncing
  useEffect(() => {
    // 🔧 Debounce to prevent rapid successive calls
    const timeoutId = setTimeout(() => {
      if (!singleInfo.show || !singleInfo.expressID || !ifcModel) {
        // Clear when no selection, but only if we currently have visuals
        if (currentExpressIDRef.current !== null) {
          console.log("🔄 No selection, clearing visuals");
          clearVisualEffects();
        }
        return;
      }

      // Check if this is a different object than currently visualized
      if (currentExpressIDRef.current === singleInfo.expressID) {
        console.log("⏭️ Same object already visualized, skipping");
        return;
      }

      console.log(
        "🎯 Creating visuals for new selection:",
        singleInfo.expressID
      );

      // Get bounding box for the selected object
      const bbox = computeBoundingBoxForExpressId(
        ifcModel,
        singleInfo.expressID
      );
      if (bbox) {
        createBoundingBoxVisualization(bbox, singleInfo.expressID);
      } else {
        console.warn(
          "⚠️ No bounding box found for object:",
          singleInfo.expressID
        );
        clearVisualEffects();
      }
    }, 50); // 🔧 Small debounce to prevent rapid calls

    return () => clearTimeout(timeoutId);
  }, [
    singleInfo.show,
    singleInfo.expressID,
    ifcModel,
    createBoundingBoxVisualization,
    clearVisualEffects,
  ]);

  // 🔧 Clear visuals when component unmounts
  useEffect(() => {
    return () => {
      console.log("🧹 Cleaning up visual effects on unmount");
      clearingRef.current = false; // Reset flag on unmount
      clearVisualEffects();
    };
  }, [clearVisualEffects]);

  // 🔧 Clear visuals when scene changes (model switching) - with timeout
  useEffect(() => {
    if (!scene) return;

    const timeoutId = setTimeout(() => {
      if (currentExpressIDRef.current !== null) {
        console.log("🔄 Scene changed, clearing visuals");
        clearVisualEffects();
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [scene, clearVisualEffects]);

  return {
    boundaryBoxLines,
    centerLine,
    createBoundingBoxVisualization,
    clearVisualEffects,
  };
}
