// hooks/useObjectSelection.ts (Fixed - No Infinite Loop)
import { useState, useCallback, useRef } from "react";
import * as THREE from "three";
import { IFCLoader } from "web-ifc-three/IFCLoader";
import {
  ObjectSelectionReturn,
  SingleInfoState,
  ContextMenuState,
} from "@/types/three-scene.types";
import {
  safeGetExpressId,
  safeCreateSubset,
  safeRemoveSubset,
  safeGetItemProperties,
} from "@/lib/utils/three-helpers";
import { computeBoundingBoxForExpressId } from "@/lib/utils/geometry-utils";
import { useAppStore } from "@/lib/store";

export function useObjectSelection(
  scene: THREE.Scene | null,
  camera: THREE.PerspectiveCamera | null,
  renderer: THREE.WebGLRenderer | null,
  ifcModel: THREE.Object3D | null,
  ifcLoader: IFCLoader | null,
  shouldIgnoreObject: (expressID: number) => boolean,
  modelName: string
): ObjectSelectionReturn {
  const [singleInfo, setSingleInfo] = useState<SingleInfoState>({
    show: false,
    pos: null,
    expressID: null,
    name: null,
    name2: null,
  });

  const [hoverID, setHoverID] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    show: false,
    x: 0,
    y: 0,
    expressID: null,
    name: null,
  });

  const hoverSubsetRef = useRef<THREE.Mesh | null>(null);

  // 🔧 Get store functions with stable references
  const setBimPanelData = useAppStore((state) => state.setBimPanelData);
  const bimBoxEnabled = useAppStore((state) => state.bimBoxEnabled);

  // 🔧 Stable reference to prevent infinite loops
  const stableModelName = useRef(modelName);
  stableModelName.current = modelName;

  /**
   * Handle pointer move for hover effects
   */
  const handlePointerMove = useCallback(
    async (event: PointerEvent) => {
      if (!renderer?.domElement || !ifcModel || !camera || !ifcLoader) return;

      const mouse = new THREE.Vector2();
      const raycaster = new THREE.Raycaster();
      const bounds = renderer.domElement.getBoundingClientRect();

      mouse.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      mouse.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      let intersects: any[] = [];
      try {
        intersects = raycaster.intersectObject(ifcModel, true) || [];
      } catch {
        intersects = [];
      }

      let newHoverId: number | null = null;

      if (
        intersects.length > 0 &&
        intersects[0]?.object &&
        intersects[0]?.faceIndex !== undefined
      ) {
        const mesh = intersects[0].object as THREE.Mesh;
        const faceIndex = intersects[0].faceIndex!;
        const geometry = mesh.geometry;

        const elementId = safeGetExpressId(geometry, faceIndex, ifcLoader);
        if (!shouldIgnoreObject(elementId) && elementId > 0) {
          newHoverId = elementId;
        }
      }

      // Remove existing hover subset
      if (hoverSubsetRef.current && scene) {
        safeRemoveSubset(hoverSubsetRef.current, scene, ifcLoader);
        hoverSubsetRef.current = null;
      }

      // Create new hover subset
      if (newHoverId !== null && scene) {
        const subset = safeCreateSubset(newHoverId, scene, ifcLoader);
        if (subset) {
          hoverSubsetRef.current = subset;
          renderer.domElement.style.cursor = "pointer";
          setHoverID(newHoverId);
        } else {
          renderer.domElement.style.cursor = "";
          setHoverID(null);
        }
      } else {
        renderer.domElement.style.cursor = "";
        setHoverID(null);
      }
    },
    [renderer, ifcModel, camera, ifcLoader, scene, shouldIgnoreObject]
  );

  /**
   * Handle right click for context menu
   */
  const handleRightClick = useCallback(
    async (event: MouseEvent) => {
      event.preventDefault();

      if (!renderer?.domElement || !ifcModel || !camera || !ifcLoader) return;

      const mouse = new THREE.Vector2();
      const raycaster = new THREE.Raycaster();
      const bounds = renderer.domElement.getBoundingClientRect();

      mouse.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      mouse.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      let intersects: any[] = [];
      try {
        intersects = raycaster.intersectObject(ifcModel, true) || [];
      } catch {
        intersects = [];
      }

      if (intersects.length > 0) {
        const intersect = intersects[0];
        if (intersect?.object && intersect?.faceIndex !== undefined) {
          const mesh = intersect.object as THREE.Mesh;
          const faceIndex = intersect.faceIndex!;
          const geometry = mesh.geometry;
          const elementId = safeGetExpressId(geometry, faceIndex, ifcLoader);

          if (elementId > 0 && !shouldIgnoreObject(elementId)) {
            const props = await safeGetItemProperties(elementId, ifcLoader);

            setContextMenu({
              show: true,
              x: event.clientX,
              y: event.clientY,
              expressID: elementId,
              name: props.name,
            });
          }
        }
      }
    },
    [renderer, ifcModel, camera, ifcLoader, shouldIgnoreObject]
  );

  /**
   * Handle double click for object selection
   */
  const handleDoubleClick = useCallback(
    async (event: MouseEvent) => {
      if (event.button !== 0) return; // Only left click

      if (!renderer?.domElement || !ifcModel || !camera || !ifcLoader) return;

      const mouse = new THREE.Vector2();
      const raycaster = new THREE.Raycaster();
      const bounds = renderer.domElement.getBoundingClientRect();

      mouse.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      mouse.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      let intersects: any[] = [];
      try {
        intersects = raycaster.intersectObject(ifcModel, true) || [];
      } catch {
        intersects = [];
      }

      // If no intersection, unselect
      if (intersects.length === 0) {
        // 🔧 Direct state update without calling unselectObject to avoid loop
        setSingleInfo({
          show: false,
          pos: null,
          expressID: null,
          name: null,
          name2: null,
        });
        setHoverID(null);
        setBimPanelData(null);
        return;
      }

      const intersect = intersects[0];
      if (intersect?.object && intersect?.faceIndex !== undefined) {
        const mesh = intersect.object as THREE.Mesh;
        const faceIndex = intersect.faceIndex!;
        const geometry = mesh.geometry;
        const elementId = safeGetExpressId(geometry, faceIndex, ifcLoader);

        if (!elementId || shouldIgnoreObject(elementId)) return;

        // 🔧 Get object properties first
        const item = await safeGetItemProperties(elementId, ifcLoader);

        // 🔧 Get bounding box for position and visual effects
        let bbox: THREE.Box3 | null = null;
        if (ifcModel) {
          bbox = computeBoundingBoxForExpressId(ifcModel, elementId);
        }

        // 🔧 Set selection info immediately
        const newSingleInfo: SingleInfoState = {
          show: true,
          expressID: elementId,
          name: item.name,
          name2: item.name2,
          pos: null,
        };

        if (bbox) {
          const center = bbox.getCenter(new THREE.Vector3());
          newSingleInfo.pos = {
            x: center.x,
            y: bbox.max.y,
            z: center.z,
          };
        }

        setSingleInfo(newSingleInfo);

        console.log("🎯 Object selected:", {
          expressID: elementId,
          name: item.name,
          pos: newSingleInfo.pos,
          hasBbox: !!bbox,
        });

        // 🔧 Load BIM data if panel is enabled
        if (bimBoxEnabled) {
          setBimPanelData({ loading: true, expressID: elementId });

          try {
            console.log("🔍 Fetching BIM data for:", {
              model: stableModelName.current,
              expressID: elementId,
            });

            const res = await fetch("/api/get-bim-by-id", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                model: stableModelName.current,
                expressID: elementId,
              }),
            });

            console.log("📡 BIM API response status:", res.status);

            if (res.ok) {
              const data = await res.json();
              console.log("✅ BIM data received:", data);
              setBimPanelData(data);
            } else if (res.status === 404) {
              console.log("⚠️ BIM data not found for:", elementId);
              setBimPanelData({
                error: "not_found",
                expressID: elementId,
                message: "ไม่พบข้อมูล BIM สำหรับวัตถุนี้",
              });
            } else {
              console.error("❌ BIM API error:", res.status);
              const errorText = await res.text();
              console.error("Error details:", errorText);
              setBimPanelData({
                error: "api_error",
                expressID: elementId,
                message: `เกิดข้อผิดพลาดในการดึงข้อมูล (${res.status})`,
              });
            }
          } catch (e) {
            console.error("❌ BIM fetch error:", e);
            setBimPanelData({
              error: "network_error",
              expressID: elementId,
              message: "เกิดข้อผิดพลาดในการเชื่อมต่อ",
            });
          }
        } else {
          setBimPanelData(null);
        }
      }
    },
    [
      renderer,
      ifcModel,
      camera,
      ifcLoader,
      shouldIgnoreObject,
      bimBoxEnabled,
      setBimPanelData,
    ]
  );

  /**
   * 🔧 Unselect current object - memoized to prevent infinite loops
   */
  const unselectObject = useCallback(() => {
    console.log("🔄 Unselecting object");

    setSingleInfo((prev) => {
      // Only update if currently showing
      if (prev.show) {
        return {
          show: false,
          pos: null,
          expressID: null,
          name: null,
          name2: null,
        };
      }
      return prev;
    });

    setHoverID((prev) => (prev !== null ? null : prev));
    setBimPanelData(null);

    console.log("✅ Object unselected");
  }, [setBimPanelData]); // 🔧 Minimal dependencies

  /**
   * Select object by Express ID
   */
  const selectObjectById = useCallback(
    async (expressID: number) => {
      if (!ifcModel || !ifcLoader || shouldIgnoreObject(expressID)) return;

      const bbox = computeBoundingBoxForExpressId(ifcModel, expressID);
      const item = await safeGetItemProperties(expressID, ifcLoader);

      const newSingleInfo: SingleInfoState = {
        show: true,
        expressID: expressID,
        name: item.name,
        name2: item.name2,
        pos: null,
      };

      if (bbox) {
        const center = bbox.getCenter(new THREE.Vector3());
        newSingleInfo.pos = {
          x: center.x,
          y: bbox.max.y,
          z: center.z,
        };
      }

      setSingleInfo(newSingleInfo);
      setHoverID(expressID);

      console.log(`Selected object: ${expressID} (${item.name})`);
    },
    [ifcModel, ifcLoader, shouldIgnoreObject]
  );

  /**
   * Close context menu
   */
  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => {
      if (prev.show) {
        return {
          show: false,
          x: 0,
          y: 0,
          expressID: null,
          name: null,
        };
      }
      return prev;
    });
  }, []);

  /**
   * Clear hover effects
   */
  const clearHover = useCallback(() => {
    if (hoverSubsetRef.current && scene) {
      safeRemoveSubset(hoverSubsetRef.current, scene, ifcLoader);
      hoverSubsetRef.current = null;
    }
    setHoverID((prev) => (prev !== null ? null : prev));
    if (renderer?.domElement) {
      renderer.domElement.style.cursor = "";
    }
  }, [scene, ifcLoader, renderer]);

  return {
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
  };
}
