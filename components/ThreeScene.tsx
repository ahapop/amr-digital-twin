"use client";
import React, {
  useRef,
  useEffect,
  useState,
  useLayoutEffect,
  useCallback,
} from "react";
import * as THREE from "three";
import { IFCLoader } from "web-ifc-three/IFCLoader";
import { OrbitControls, Line2, LineGeometry, LineMaterial } from "three-stdlib";
import { PresetAPI, PresetData } from "@/lib/presetApi";
import { useAppStore } from "@/lib/store";
import { MODELS } from "@/lib/constants";
import ContextMenu from "@/components/ContextMenu";

type InfoPos = { x: number; y: number; z: number };

const ZOOM_FACTOR_TARGET = 3;
const LOGO_URL = "/images/amr-seamless-solution-logo_gold.png";
const DEFAULT_PRESET_INDEX = 0;

interface ContextMenuState {
  show: boolean;
  x: number;
  y: number;
  expressID: number | null;
  name: string | null;
}

interface ThreeSceneProps {
  onPresetSaved?: (index: number, preset: PresetData) => void;
  onPresetLoaded?: (index: number, preset: PresetData) => void;
  onPresetDeleted?: (index: number) => void;
  onPresetsLoaded?: (presets: (PresetData | null)[]) => void;
}

const ThreeScene: React.FC<ThreeSceneProps> = ({
  onPresetSaved,
  onPresetLoaded,
  onPresetDeleted,
  onPresetsLoaded,
}) => {
  const {
    setSelectedIDs,
    setCurrentModelKey,
    currentModelKey,
    bimBoxEnabled,
    setBimPanelData,
    bimPanelData,
    setModelLoading,
  } = useAppStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [singleInfo, setSingleInfo] = useState<{
    show: boolean;
    pos: InfoPos | null;
    expressID: number | null;
    name: string | null;
    name2?: string | null;
  }>({ show: false, pos: null, expressID: null, name: null, name2: null });

  const [hoverID, setHoverID] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    show: false,
    x: 0,
    y: 0,
    expressID: null,
    name: null,
  });
  const [blacklist, setBlacklist] = useState<Set<number>>(new Set());
  const [blacklistLoaded, setBlacklistLoaded] = useState(false); // เพิ่ม state
  const [hiddenObjects, setHiddenObjects] = useState<Set<number>>(new Set());

  const infoBoxRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const lineRef = useRef<SVGLineElement>(null);

  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const ifcModelRef = useRef<THREE.Object3D | null>(null);
  const ifcLoaderRef = useRef<IFCLoader | null>(null);

  const hoverSubsetRef = useRef<THREE.Mesh | null>(null);

  const centroidCache = useRef<Map<number, THREE.Vector3>>(new Map());
  const topPointCache = useRef<Map<number, THREE.Vector3>>(new Map());

  const boundaryBoxLineRef = useRef<THREE.Object3D[] | null>(null);
  const centerLineRef = useRef<THREE.Object3D | null>(null);

  const initialDistanceRef = useRef<number | null>(null);
  const lastLoggedZoomRef = useRef<number | null>(null);

  const [modelName, setModelName] = useState<string>(
    currentModelKey || MODELS[0].key
  );
  const [pendingPresetIdx, setPendingPresetIdx] = useState<number | null>(null);
  const [pendingModelKey, setPendingModelKey] = useState<string | null>(null);

  const ifcLoaderCache = useRef<Map<string, THREE.Object3D>>(new Map());
  const presetCache = useRef<Map<string, (PresetData | null)[]>>(new Map());
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  const loadIFCModelRef = useRef<any>(null);

  // Load blacklist from API
  const loadBlacklist = useCallback(async () => {
    try {
      const response = await fetch("/api/blacklist");
      if (response.ok) {
        const blacklistArray = await response.json();
        setBlacklist(
          new Set(blacklistArray.map((item: any) => Number(item.expressid)))
        );
        setBlacklistLoaded(true); // เพิ่มบรรทัดนี้
      }
    } catch (error) {
      setBlacklistLoaded(true); // แม้จะ fail ก็ควร set ให้ไม่ค้าง
      console.error("Failed to load blacklist:", error);
    }
  }, []);

  // Add to blacklist - เพิ่มเข้า blacklist เท่านั้น ไม่ซ่อน
  const addToBlacklist = useCallback(
    async (expressID: number, modelname: string, subobject_name: string) => {
      try {
        const response = await fetch("/api/blacklist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expressID, modelname, subobject_name }),
        });
        if (response.ok) {
          setBlacklist((prev) => new Set([...prev, expressID]));

          if (hoverSubsetRef.current && sceneRef.current) {
            safeRemoveSubset(hoverSubsetRef.current, sceneRef.current);
            hoverSubsetRef.current = null;
          }

          setSingleInfo((prev) => {
            if (prev.expressID === expressID) {
              if (boundaryBoxLineRef.current && sceneRef.current) {
                boundaryBoxLineRef.current.forEach((obj) => {
                  sceneRef.current?.remove(obj);
                });
                boundaryBoxLineRef.current = null;
              }
              if (centerLineRef.current && sceneRef.current) {
                sceneRef.current.remove(centerLineRef.current);
                centerLineRef.current = null;
              }
              setHoverID(null);
              setBimPanelData(null);

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
        }
      } catch (error) {
        console.error("Failed to add to blacklist:", error);
      }
    },
    [setBimPanelData]
  );

  // Hidden subsets storage
  const hiddenSubsetsRef = useRef<Map<number, THREE.Mesh>>(new Map());

  // Hide object function - ซ่อนเฉพาะ object ที่เลือก
  const hideObject = useCallback((expressID: number) => {
    if (
      !ifcLoaderRef.current?.ifcManager ||
      !sceneRef.current ||
      expressID === 0
    )
      return;

    try {
      // Add to hidden objects set
      setHiddenObjects((prev) => new Set([...prev, expressID]));

      // Remove any existing hover subsets
      if (hoverSubsetRef.current && sceneRef.current) {
        safeRemoveSubset(hoverSubsetRef.current, sceneRef.current);
        hoverSubsetRef.current = null;
      }

      // Create invisible subset for this object
      const hiddenSubset = ifcLoaderRef.current.ifcManager.createSubset({
        modelID: 0,
        ids: [expressID],
        scene: sceneRef.current,
        removePrevious: false,
        customID: `hidden-${expressID}`,
        material: new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0,
          visible: false,
        }),
      });

      if (hiddenSubset) {
        // Store reference to hidden subset
        hiddenSubsetsRef.current.set(expressID, hiddenSubset as THREE.Mesh);

        // Remove the subset from scene to completely hide it
        sceneRef.current.remove(hiddenSubset);
      }
    } catch (error) {
      console.error("Error hiding object:", error);
    }
  }, []);

  // Unselect function
  const unselectObject = useCallback(() => {
    setSingleInfo({
      show: false,
      pos: null,
      expressID: null,
      name: null,
      name2: null,
    });

    // Remove bounding box lines
    if (boundaryBoxLineRef.current && sceneRef.current) {
      boundaryBoxLineRef.current.forEach((obj) => {
        sceneRef.current?.remove(obj);
      });
      boundaryBoxLineRef.current = null;
    }
    if (centerLineRef.current && sceneRef.current) {
      sceneRef.current.remove(centerLineRef.current);
      centerLineRef.current = null;
    }

    setHoverID(null);
    setBimPanelData(null);
  }, [setBimPanelData]);

  // Show hidden object back
  const showHiddenObject = useCallback((expressID: number) => {
    if (!sceneRef.current) return;

    // Remove from hidden objects set
    setHiddenObjects((prev) => {
      const newSet = new Set(prev);
      newSet.delete(expressID);
      return newSet;
    });

    // Remove hidden subset if exists
    const hiddenSubset = hiddenSubsetsRef.current.get(expressID);
    if (hiddenSubset) {
      try {
        if (ifcLoaderRef.current?.ifcManager) {
          ifcLoaderRef.current.ifcManager.removeSubset(
            0,
            [expressID],
            `hidden-${expressID}`
          );
        }
        sceneRef.current.remove(hiddenSubset);
        hiddenSubsetsRef.current.delete(expressID);
      } catch (error) {
        console.error("Error showing hidden object:", error);
      }
    }
  }, []);

  // Context menu handlers
  const handleContextMenuAction = useCallback(
    (action: string) => {
      if (!contextMenu.expressID) return;

      switch (action) {
        case "unselect":
          unselectObject();
          break;
        case "hide":
          hideObject(contextMenu.expressID);
          break;
        case "blacklist":
          // PATCH: ส่ง modelname + subobject_name
          addToBlacklist(
            contextMenu.expressID,
            modelName,
            contextMenu.name || "-"
          );
          break;
      }

      setContextMenu({ show: false, x: 0, y: 0, expressID: null, name: null });
    },
    [
      contextMenu.expressID,
      contextMenu.name,
      unselectObject,
      hideObject,
      addToBlacklist,
      modelName,
    ]
  );

  // Hide context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu({ show: false, x: 0, y: 0, expressID: null, name: null });
    };

    if (contextMenu.show) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [contextMenu.show]);

  // Load blacklist on component mount
  useEffect(() => {
    loadBlacklist();
  }, [loadBlacklist]);

  useEffect(() => {
    if (!pendingModelKey) return;
    if (loadIFCModelRef.current) {
      loadIFCModelRef.current(pendingModelKey).then(() => {
        setPendingModelKey(null);
      });
    }
  }, [pendingModelKey]);

  useEffect(() => {
    if (!currentModelKey) return;
    if (loadIFCModelRef.current) {
      loadIFCModelRef.current(currentModelKey);
    }
  }, [currentModelKey]);

  const getCurrentCameraState = useCallback((): PresetData | null => {
    if (
      !cameraRef.current ||
      !controlsRef.current ||
      !initialDistanceRef.current
    ) {
      return null;
    }
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const distance = camera.position.distanceTo(controls.target);
    const zoom = initialDistanceRef.current / distance;
    return {
      label: `Preset ${Date.now()}`,
      position: [camera.position.x, camera.position.y, camera.position.z],
      target: [controls.target.x, controls.target.y, controls.target.z],
      zoom: zoom,
    };
  }, []);

  function animateCameraToPosition(
    targetTarget: THREE.Vector3,
    targetPosition: THREE.Vector3,
    duration: number = 0.8
  ) {
    if (!cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const startTarget = controls.target.clone();
    const startPos = camera.position.clone();
    let startTime: number | null = null;
    function animate(time: number) {
      if (!startTime) startTime = time;
      let t = (time - startTime) / (duration * 1000);
      t = Math.max(0, Math.min(1, t));
      const easeT = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      controls.target.lerpVectors(startTarget, targetTarget, easeT);
      camera.position.lerpVectors(startPos, targetPosition, easeT);
      camera.lookAt(controls.target);
      controls.update();
      if (t < 1) {
        requestAnimationFrame(animate);
      }
    }
    requestAnimationFrame(animate);
  }

  const setCameraState = useCallback(
    (preset: PresetData, animate: boolean = true) => {
      if (
        !cameraRef.current ||
        !controlsRef.current ||
        !initialDistanceRef.current
      ) {
        return;
      }
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      const targetPosition = new THREE.Vector3(...preset.position);
      const targetTarget = new THREE.Vector3(...preset.target);

      if (animate) {
        animateCameraToPosition(targetTarget, targetPosition, 0.8);
      } else {
        controls.target.copy(targetTarget);
        camera.position.copy(targetPosition);
        camera.lookAt(controls.target);
        controls.update();
      }
    },
    []
  );

  function easeInOutCubic(t: number) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  const savePreset = useCallback(
    async (index: number, label: string = `Preset ${index + 1}`) => {
      try {
        const currentState = getCurrentCameraState();
        if (!currentState) {
          return false;
        }
        currentState.label = label;

        const response = await PresetAPI.savePreset(
          modelName,
          index,
          currentState
        );
        if (response.status === "ok") {
          onPresetSaved?.(index, currentState);
          return true;
        } else {
          return false;
        }
      } catch (error) {
        return false;
      }
    },
    [getCurrentCameraState, onPresetSaved, modelName]
  );

  const loadPreset = useCallback(
    async (index: number, targetModelName?: string) => {
      const modelToUse = targetModelName || modelName;
      try {
        const response = await PresetAPI.loadPreset(modelToUse, index);
        if (response.status === "ok" && response.preset) {
          setCameraState(response.preset, true);
          onPresetLoaded?.(index, response.preset);
          return true;
        } else if (response.status === "not_found") {
          return false;
        } else {
          return false;
        }
      } catch (error) {
        return false;
      }
    },
    [setCameraState, onPresetLoaded, modelName]
  );

  const deletePreset = useCallback(
    async (index: number) => {
      try {
        const response = await PresetAPI.deletePreset(modelName, index);
        if (response.status === "ok") {
          onPresetDeleted?.(index);
          return true;
        } else {
          return false;
        }
      } catch (error) {
        return false;
      }
    },
    [onPresetDeleted, modelName]
  );

  const debouncedLoadPresets = useCallback(
    (modelName: string) => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }

      debounceTimeout.current = setTimeout(async () => {
        if (presetCache.current.has(modelName)) {
          const cachedPresets = presetCache.current.get(modelName)!;
          onPresetsLoaded?.(cachedPresets);
          return;
        }

        try {
          const response = await PresetAPI.getAllPresets(modelName);
          if (response.status === "ok" && response.presets) {
            presetCache.current.set(modelName, response.presets);
            onPresetsLoaded?.(response.presets);
          }
        } catch (error) {}
      }, 300);
    },
    [onPresetsLoaded]
  );

  const loadAllPresets = useCallback(
    async (targetModelName?: string) => {
      const modelToUse = targetModelName || modelName;
      debouncedLoadPresets(modelToUse);
    },
    [debouncedLoadPresets, modelName]
  );

  const updatePresetLabel = useCallback(
    async (index: number, newLabel: string) => {
      try {
        const response = await PresetAPI.updatePresetLabel(
          modelName,
          index,
          newLabel
        );
        if (response.status === "ok") {
          const updatedResponse = await PresetAPI.loadPreset(modelName, index);
          if (updatedResponse.status === "ok" && updatedResponse.preset) {
            onPresetSaved?.(index, updatedResponse.preset);
          }
          return true;
        } else {
          return false;
        }
      } catch (error) {
        return false;
      }
    },
    [onPresetSaved, modelName]
  );

  const loadDefaultPreset = useCallback(
    async (targetModelName?: string) => {
      const modelToUse = targetModelName || modelName;
      try {
        const response = await PresetAPI.loadPreset(
          modelToUse,
          DEFAULT_PRESET_INDEX
        );

        if (response.status === "ok" && response.preset) {
          setCameraState(response.preset, false);
          return;
        }

        for (let i = 1; i < 5; i++) {
          const fallbackResponse = await PresetAPI.loadPreset(modelToUse, i);
          if (fallbackResponse.status === "ok" && fallbackResponse.preset) {
            setCameraState(fallbackResponse.preset, false);
            return;
          }
        }

        if (cameraRef.current && controlsRef.current) {
          const modelCenter = getModelCenter();
          cameraRef.current.position.set(30, 30, 30);
          controlsRef.current.target.copy(modelCenter);
          cameraRef.current.lookAt(modelCenter);
          controlsRef.current.update();
        }
      } catch (error) {}
    },
    [setCameraState, modelName]
  );

  const clearCacheIfNeeded = useCallback(() => {
    if (ifcLoaderCache.current.size > 3) {
      const firstKey = ifcLoaderCache.current.keys().next().value;
      ifcLoaderCache.current.delete(firstKey);
    }
    if (presetCache.current.size > 5) {
      const firstKey = presetCache.current.keys().next().value;
      presetCache.current.delete(firstKey);
    }
  }, []);

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
      showHiddenObject, // เพิ่ม function สำหรับแสดง hidden object กลับมา
    };

    if (modelName) {
      loadAllPresets(modelName);
    }

    return () => {};
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
    modelName,
  ]);

  function getModelCenter() {
    if (!ifcModelRef.current) return new THREE.Vector3(0, 0, 0);
    const bbox = new THREE.Box3().setFromObject(ifcModelRef.current);
    return bbox.getCenter(new THREE.Vector3());
  }

  function computeBoundingBoxForExpressId(
    ifcModel: THREE.Object3D,
    eid: number
  ): THREE.Box3 | null {
    let points: THREE.Vector3[] = [];
    ifcModel.traverse((child: any) => {
      if (
        child.isMesh &&
        child.geometry &&
        child.geometry.attributes?.position &&
        child.geometry.attributes?.expressID
      ) {
        const pos = child.geometry.attributes.position;
        const ids = child.geometry.attributes.expressID;
        for (let i = 0; i < ids.count; i++) {
          const curId = ids.array[i];
          if (curId === eid) {
            const x = pos.array[i * 3];
            const y = pos.array[i * 3 + 1];
            const z = pos.array[i * 3 + 2];
            const v = new THREE.Vector3(x, y, z).applyMatrix4(
              child.matrixWorld
            );
            points.push(v);
          }
        }
      }
    });
    if (points.length === 0) return null;
    const bbox = new THREE.Box3().setFromPoints(points);
    return bbox;
  }

  function animateCameraToTargetAbsZoom(
    newTarget: THREE.Vector3,
    zoomFactor: number = ZOOM_FACTOR_TARGET,
    duration: number = 0.8
  ) {
    if (!controlsRef.current || !cameraRef.current) return;
    if (!initialDistanceRef.current || initialDistanceRef.current === 0) return;
    const controls = controlsRef.current;
    const camera = cameraRef.current;
    const startTarget = controls.target.clone();
    const startPos = camera.position.clone();
    const direction = new THREE.Vector3()
      .subVectors(startPos, startTarget)
      .normalize();
    const endTarget = newTarget.clone();
    const endDist = initialDistanceRef.current / zoomFactor;
    const endPos = endTarget.clone().add(direction.multiplyScalar(endDist));
    let startTime: number | null = null;
    function animate(time: number) {
      if (!startTime) startTime = time;
      let t = (time - startTime) / (duration * 1000);
      t = Math.max(0, Math.min(1, t));
      const easeT = easeInOutCubic(t);
      controls.target.lerpVectors(startTarget, endTarget, easeT);
      camera.position.lerpVectors(startPos, endPos, easeT);
      camera.lookAt(controls.target);
      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        const dist = camera.position.distanceTo(controls.target);
        const zoomFact = initialDistanceRef.current! / dist;
        lastLoggedZoomRef.current = zoomFact;
      }
    }
    requestAnimationFrame(animate);
  }

  function getResponsiveSizes() {
    if (!cameraRef.current || !singleInfo.pos)
      return { fontSize: 18, lineWidth: 2, scale: 1 };
    const cameraPos = cameraRef.current.position;
    const targetPos = new THREE.Vector3(
      singleInfo.pos.x,
      singleInfo.pos.y,
      singleInfo.pos.z
    );
    const distance = cameraPos.distanceTo(targetPos);
    const scaleFactor = Math.min(1.0, Math.max(0.1, 50 / distance));
    return {
      fontSize: Math.round(18 * scaleFactor),
      lineWidth: Math.max(2, Math.round(2 * scaleFactor)),
      scale: scaleFactor,
    };
  }

  async function safeGetItemProperties(
    elementId: number
  ): Promise<{ name: string; name2: string }> {
    try {
      if (!ifcLoaderRef.current?.ifcManager || elementId === 0)
        return { name: "-", name2: "" };
      if (
        typeof ifcLoaderRef.current.ifcManager.getItemProperties !== "function"
      )
        return { name: "-", name2: "" };
      const props = await ifcLoaderRef.current.ifcManager.getItemProperties(
        0,
        elementId,
        true
      );
      let name = "-";
      let name2 = "";
      if (props) {
        if (props.Name && typeof props.Name === "string") name = props.Name;
        else if (props.name && typeof props.name === "string")
          name = props.name;
        else if (props.LongName && typeof props.LongName === "string")
          name = props.LongName;
        else if (props.Description && typeof props.Description === "string")
          name = props.Description;
        else if (props.GlobalId && typeof props.GlobalId === "string")
          name = props.GlobalId;
        else if (props.Tag && typeof props.Tag === "string") name = props.Tag;
        else if (
          props.Name &&
          typeof props.Name === "object" &&
          props.Name.value
        )
          name = String(props.Name.value);
        else if (
          props.name &&
          typeof props.name === "object" &&
          props.name.value
        )
          name = String(props.name.value);
        else {
          const stringProps = Object.values(props).find(
            (val) =>
              typeof val === "string" &&
              val.length > 0 &&
              val !== elementId.toString()
          );
          if (stringProps) name = String(stringProps);
        }
        if (props.ObjectType && typeof props.ObjectType === "string")
          name2 = props.ObjectType;
        else if (
          props.PredefinedType &&
          typeof props.PredefinedType === "string"
        )
          name2 = props.PredefinedType;
        else if (props.objectType && typeof props.objectType === "string")
          name2 = props.objectType;
        else if (props.PredefType && typeof props.PredefType === "string")
          name2 = props.PredefType;
      }
      return { name, name2 };
    } catch {
      return { name: "-", name2: "" };
    }
  }

  function safeGetExpressId(
    geometry: THREE.BufferGeometry,
    faceIndex: number
  ): number {
    try {
      if (!ifcLoaderRef.current?.ifcManager) return 0;
      if (typeof ifcLoaderRef.current.ifcManager.getExpressId !== "function")
        return 0;
      if (!geometry || faceIndex === undefined || faceIndex < 0) return 0;
      const elementId = ifcLoaderRef.current.ifcManager.getExpressId(
        geometry,
        faceIndex
      );
      return typeof elementId === "number" ? elementId : 0;
    } catch {
      return 0;
    }
  }

  function safeCreateSubset(
    elementId: number,
    scene: THREE.Scene
  ): THREE.Mesh | null {
    try {
      if (!ifcLoaderRef.current?.ifcManager || elementId === 0) return null;
      if (typeof ifcLoaderRef.current.ifcManager.createSubset !== "function")
        return null;
      const subset = ifcLoaderRef.current.ifcManager.createSubset({
        modelID: 0,
        ids: [elementId],
        scene: scene,
        removePrevious: true,
        customID: "hover-subset",
        material: new THREE.MeshStandardMaterial({
          color: 0xffff00,
          transparent: true,
          opacity: 0.3,
          depthTest: false,
        }),
      });
      return subset as THREE.Mesh;
    } catch {
      return null;
    }
  }

  function safeRemoveSubset(subset: THREE.Mesh, scene: THREE.Scene): void {
    try {
      if (!ifcLoaderRef.current?.ifcManager || !subset) return;
      if (typeof ifcLoaderRef.current.ifcManager.removeSubset === "function") {
        ifcLoaderRef.current.ifcManager.removeSubset(
          0,
          undefined,
          "hover-subset"
        );
      }
      scene.remove(subset);
    } catch {
      scene.remove(subset);
    }
  }

  function removeAllIFCModelsFromScene(scene: THREE.Scene) {
    const removeObjs: THREE.Object3D[] = [];
    scene.traverse((obj) => {
      if (
        (obj.type === "Group" ||
          obj.type === "Mesh" ||
          obj.type === "Object3D") &&
        obj.parent === scene
      ) {
        removeObjs.push(obj);
      }
    });
    removeObjs.forEach((obj) => {
      scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose?.();
      if (obj.material) obj.material.dispose?.();
    });
  }

  const updateOverlayPosition = useRef<() => void>(() => {});
  useEffect(() => {
    updateOverlayPosition.current = () => {
      if (!singleInfo.show || !singleInfo.pos || !cameraRef.current) return;
      if (!infoBoxRef.current || !svgRef.current || !lineRef.current) return;
      if (!containerRef.current) return;
      const { fontSize, lineWidth, scale } = getResponsiveSizes();
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      const targetPos = new THREE.Vector3(
        singleInfo.pos.x,
        singleInfo.pos.y,
        singleInfo.pos.z
      );
      const targetProjected = targetPos.clone().project(cameraRef.current);
      const targetX = ((targetProjected.x + 1) / 2) * width;
      const targetY = ((-targetProjected.y + 1) / 2) * height;
      const objectHeight = 10;
      const screenOffsetY = Math.max(80, objectHeight * scale * 20);
      const offsetX = targetX;
      const offsetY_screen = targetY - screenOffsetY;
      const responsivePadding = Math.max(6, 14 * scale);

      infoBoxRef.current.style.fontSize = `${fontSize}px`;
      infoBoxRef.current.style.lineHeight = `${fontSize + 6}px`;
      infoBoxRef.current.style.padding = `${responsivePadding}px ${
        responsivePadding * 1.2
      }px`;
      infoBoxRef.current.style.borderRadius = `${Math.max(8, 12 * scale)}px`;
      infoBoxRef.current.style.boxShadow = `0 ${4 * scale}px ${
        18 * scale
      }px rgba(0,0,0,0.28)`;
      infoBoxRef.current.style.width = "auto";
      infoBoxRef.current.style.minWidth = `${100 * scale}px`;
      infoBoxRef.current.style.maxWidth = `${Math.min(420, width * 0.5)}px`;

      const box = infoBoxRef.current.getBoundingClientRect();
      const labelW = box.width;
      const labelH = box.height;
      const boxLeft = offsetX - labelW / 2;
      const boxTop = offsetY_screen - labelH / 2;

      infoBoxRef.current.style.left = `${boxLeft}px`;
      infoBoxRef.current.style.top = `${boxTop}px`;

      lineRef.current.setAttribute("stroke-width", lineWidth.toString());
      lineRef.current.setAttribute("x1", (boxLeft + labelW / 2).toString());
      lineRef.current.setAttribute("y1", (boxTop + labelH).toString());
      lineRef.current.setAttribute("x2", targetX.toString());
      lineRef.current.setAttribute("y2", targetY.toString());
    };
  }, [singleInfo]);

  useEffect(() => {
    if (!singleInfo.show || !singleInfo.pos || !cameraRef.current) return;
    if (!infoBoxRef.current || !svgRef.current || !lineRef.current) return;
    if (!containerRef.current) return;
    const { fontSize, scale } = getResponsiveSizes();
    const responsivePadding = Math.max(6, 14 * scale);

    infoBoxRef.current.style.width = "auto";
    infoBoxRef.current.style.height = "auto";
    infoBoxRef.current.style.padding = `${responsivePadding}px ${
      responsivePadding * 1.2
    }px`;
    infoBoxRef.current.style.background = "rgba(0,0,0,0.2)";
    infoBoxRef.current.style.border = "none";
    infoBoxRef.current.style.color = "#fff";
    infoBoxRef.current.style.fontWeight = "600";
    infoBoxRef.current.style.fontSize = `${fontSize}px`;
    infoBoxRef.current.style.lineHeight = `${fontSize + 6}px`;
    infoBoxRef.current.style.borderRadius = `${Math.max(8, 12 * scale)}px`;
    infoBoxRef.current.style.boxShadow = `0 ${4 * scale}px ${
      18 * scale
    }px rgba(0,0,0,0.28)`;
    infoBoxRef.current.style.fontFamily =
      "system-ui, -apple-system, sans-serif";
    infoBoxRef.current.style.minWidth = `${100 * scale}px`;
    infoBoxRef.current.style.maxWidth = `${Math.min(
      420,
      containerRef.current.clientWidth * 0.5
    )}px`;
    infoBoxRef.current.style.wordWrap = "break-word";
    infoBoxRef.current.style.overflowWrap = "break-word";
    infoBoxRef.current.style.whiteSpace = "normal";
    infoBoxRef.current.style.textAlign = "left";
    infoBoxRef.current.style.userSelect = "text";
    setTimeout(() => {
      updateOverlayPosition.current();
    }, 0);
  }, [singleInfo]);

  useEffect(() => {
    if (!singleInfo.show && lineRef.current) {
      lineRef.current.setAttribute("x1", "0");
      lineRef.current.setAttribute("y1", "0");
      lineRef.current.setAttribute("x2", "0");
      lineRef.current.setAttribute("y2", "0");
    }
  }, [singleInfo.show]);

  useEffect(() => {
    let rafId: number;
    function handleCameraUpdate() {
      if (
        singleInfo.show &&
        singleInfo.pos &&
        cameraRef.current &&
        infoBoxRef.current
      ) {
        updateOverlayPosition.current();
      }
      rafId = requestAnimationFrame(handleCameraUpdate);
    }
    if (singleInfo.show) {
      rafId = requestAnimationFrame(handleCameraUpdate);
    }
    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [singleInfo.show, singleInfo.pos]);

  useEffect(() => {
    function onControlsChange() {
      if (!controlsRef.current || !cameraRef.current) return;
    }
    if (controlsRef.current) {
      controlsRef.current.addEventListener("change", onControlsChange);
      return () => {
        controlsRef.current?.removeEventListener("change", onControlsChange);
      };
    }
  }, [modelLoaded, singleInfo]);

  useEffect(() => {
    function syncOverlay() {
      if (singleInfo.show) {
        updateOverlayPosition.current();
      }
    }
    if (controlsRef.current) {
      const controls = controlsRef.current;
      controls.addEventListener("change", syncOverlay);
      return () => {
        controls.removeEventListener("change", syncOverlay);
      };
    }
  }, [singleInfo.show]);

  useLayoutEffect(() => {
    let destroyed = false;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1b2029);
    sceneRef.current = scene;
    cameraRef.current = new THREE.PerspectiveCamera(45, 1, 1, 1000);
    cameraRef.current.position.set(30, 30, 30);
    rendererRef.current = new THREE.WebGLRenderer({ antialias: true });
    const renderer = rendererRef.current;
    renderer.setPixelRatio(window.devicePixelRatio);

    if (containerRef.current) {
      if (
        renderer.domElement.parentNode &&
        renderer.domElement.parentNode !== containerRef.current
      ) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      if (renderer.domElement.parentNode !== containerRef.current) {
        containerRef.current.appendChild(renderer.domElement);
      }
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      renderer.setSize(w, h, false);
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      renderer.domElement.style.position = "absolute";
      renderer.domElement.style.top = "0";
      renderer.domElement.style.left = "0";
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.display = "block";
    }

    const controls = new OrbitControls(cameraRef.current, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = false;
    controls.rotateSpeed = 2.0;
    controls.panSpeed = 5.0;
    controls.zoomSpeed = 2.0;
    controls.screenSpacePanning = true;
    controls.enablePan = true;
    controls.enableRotate = true;
    controls.enableZoom = true;
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dl = new THREE.DirectionalLight(0xffffff, 1.1);
    dl.position.set(50, 60, 22);
    scene.add(dl);

    let destroyedLoader = false;

    async function loadIFCModel(modelKey: string) {
      try {
        setModelLoading(true, 5, "กำลังเตรียมโหลดโมเดล...");
        clearCacheIfNeeded();

        if (ifcLoaderCache.current.has(modelKey)) {
          setModelLoading(true, 80, "กำลังโหลดจาก Cache...");

          const cachedModel = ifcLoaderCache.current.get(modelKey)!;
          const clonedModel = cachedModel.clone();

          if (scene) {
            removeAllIFCModelsFromScene(scene);
            scene.add(clonedModel);
            ifcModelRef.current = clonedModel;
          }

          setModelLoading(true, 90, "กำลังปรับตำแหน่งกล้อง...");
          setModelLoaded(true);

          const center = getModelCenter();
          if (controlsRef.current && cameraRef.current) {
            controlsRef.current.target.copy(center);
            cameraRef.current.lookAt(center);
            controlsRef.current.update();
            initialDistanceRef.current = cameraRef.current.position.distanceTo(
              controlsRef.current.target
            );
            lastLoggedZoomRef.current = 1;
          }

          centroidCache.current.clear();
          topPointCache.current.clear();

          setModelLoading(true, 95, "เสร็จสิ้น...");

          const presetsPromise = loadAllPresets(modelKey);
          const defaultPresetPromise = loadDefaultPreset(modelKey);

          await Promise.allSettled([presetsPromise, defaultPresetPromise]);

          setTimeout(() => {
            setModelLoading(false);
            if (
              typeof window !== "undefined" &&
              (window as any).onPresetReady
            ) {
              (window as any).onPresetReady();
            }
          }, 300);

          return;
        }

        if (scene) {
          removeAllIFCModelsFromScene(scene);
        }
        if (boundaryBoxLineRef.current) {
          boundaryBoxLineRef.current.forEach((obj) => {
            scene.remove(obj);
          });
          boundaryBoxLineRef.current = null;
        }
        if (centerLineRef.current) {
          scene.remove(centerLineRef.current);
          centerLineRef.current = null;
        }
        if (hoverSubsetRef.current && scene) {
          safeRemoveSubset(hoverSubsetRef.current, scene);
          hoverSubsetRef.current = null;
        }

        // Clear hidden subsets
        hiddenSubsetsRef.current.clear();
        setHiddenObjects(new Set());

        ifcModelRef.current = null;
        setSingleInfo({
          show: false,
          pos: null,
          expressID: null,
          name: null,
          name2: null,
        });
        setHoverID(null);
        setSelectedIDs(new Set());
        setModelLoaded(false);

        if (!modelKey) modelKey = MODELS[0].key;
        setModelName(modelKey);

        let modelUrl = `/model3d/${modelKey}.ifc`;

        setModelLoading(true, 15, "กำลังโหลดไฟล์ IFC...");

        ifcLoaderRef.current = new IFCLoader();
        if (
          ifcLoaderRef.current.ifcManager &&
          typeof ifcLoaderRef.current.ifcManager.setWasmPath === "function"
        ) {
          ifcLoaderRef.current.ifcManager.setWasmPath("/libs/web-ifc/");
        }

        return new Promise<void>((resolve, reject) => {
          ifcLoaderRef.current!.load(
            modelUrl,
            async (model) => {
              try {
                if (destroyedLoader || destroyed) return;

                setModelLoading(true, 50, "กำลังประมวลผลโมเดล...");

                if (!model) {
                  setModelLoaded(false);
                  setModelLoading(false);
                  return resolve();
                }

                ifcModelRef.current = model;
                scene.add(model);

                setModelLoading(true, 70, "กำลังปรับตำแหน่งกล้อง...");

                setModelLoaded(true);

                const center = getModelCenter();
                if (controlsRef.current && cameraRef.current) {
                  controlsRef.current.target.copy(center);
                  cameraRef.current.lookAt(center);
                  controlsRef.current.update();
                }
                if (controlsRef.current && cameraRef.current) {
                  initialDistanceRef.current =
                    cameraRef.current.position.distanceTo(
                      controlsRef.current.target
                    );
                  lastLoggedZoomRef.current = 1;
                }

                centroidCache.current.clear();
                topPointCache.current.clear();

                setModelLoading(true, 85, "กำลังโหลดข้อมูล Preset...");

                ifcLoaderCache.current.set(modelKey, model.clone());

                const presetsPromise = loadAllPresets(modelKey);
                const defaultPresetPromise = loadDefaultPreset(modelKey);

                await Promise.allSettled([
                  presetsPromise,
                  defaultPresetPromise,
                  new Promise((resolve) => setTimeout(resolve, 500)),
                ]);

                setModelLoading(true, 95, "กำลังเสร็จสิ้น...");

                setTimeout(() => {
                  setModelLoading(false);

                  if (
                    typeof window !== "undefined" &&
                    (window as any).onPresetReady
                  ) {
                    (window as any).onPresetReady();
                  }
                }, 300);

                resolve();
              } catch (error) {
                setModelLoading(false);
                resolve();
              }
            },
            (xhr) => {
              if (xhr.lengthComputable) {
                const percentComplete = (xhr.loaded / xhr.total) * 40;
                setModelLoading(
                  true,
                  Math.min(percentComplete, 40),
                  "กำลังดาวน์โหลดโมเดล..."
                );
              }
            },
            (error) => {
              setModelLoading(false, 0, "โหลดโมเดลไม่สำเร็จ");
              setModelLoaded(false);
              setTimeout(() => {
                setModelLoading(false);
              }, 2000);

              resolve();
            }
          );
        });
      } catch (error) {
        setModelLoading(false);
        setModelLoaded(false);
        throw error;
      }
    }

    loadIFCModelRef.current = loadIFCModel;
    let initialModelKey = currentModelKey || MODELS[0].key;
    loadIFCModel(initialModelKey);

    function animate() {
      if (destroyed) return;
      renderer.render(scene, cameraRef.current!);
      requestAnimationFrame(animate);
    }
    animate();

    window.addEventListener("resize", () => {
      if (containerRef.current && renderer && cameraRef.current) {
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        renderer.setSize(w, h, false);
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
      }
    });

    return () => {
      destroyed = true;
      destroyedLoader = true;
      if (renderer && renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      ifcLoaderCache.current.clear();
      presetCache.current.clear();
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [
    currentModelKey,
    setSelectedIDs,
    setModelName,
    setBimPanelData,
    loadAllPresets,
    loadDefaultPreset,
    modelName,
    setModelLoading,
    clearCacheIfNeeded,
  ]);

  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer || !renderer.domElement) return;

    const handlePointerMove = async (event: PointerEvent) => {
      if (!blacklistLoaded) return; // เพิ่มเช็คนี้
      if (
        !containerRef.current ||
        !ifcModelRef.current ||
        !cameraRef.current ||
        !ifcLoaderRef.current
      )
        return;
      const mouse = new THREE.Vector2();
      const raycaster = new THREE.Raycaster();
      const bounds = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      mouse.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(mouse, cameraRef.current);

      let intersects: any[] = [];
      try {
        intersects = raycaster.intersectObject(ifcModelRef.current, true) || [];
      } catch {
        intersects = [];
      }

      let newHoverId: number | null = null;
      let newHoverName: string | null = null;
      if (
        intersects.length > 0 &&
        intersects[0]?.object &&
        intersects[0]?.faceIndex !== undefined
      ) {
        const mesh = intersects[0].object as THREE.Mesh;
        const faceIndex = intersects[0].faceIndex!;
        const geometry = mesh.geometry;

        const elementId = safeGetExpressId(geometry, faceIndex);
        if (!blacklist.has(elementId) && !hiddenObjects.has(elementId)) {
          newHoverId = elementId > 0 ? elementId : null;
          // PATCH: ดึงชื่อ object (แบบเดียวกับใน singleInfo)
          if (newHoverId) {
            const props = await safeGetItemProperties(newHoverId);
            newHoverName = props.name || null;
          }
        } else {
          newHoverId = null;
          newHoverName = null;
        }
      }

      if (hoverSubsetRef.current && sceneRef.current) {
        safeRemoveSubset(hoverSubsetRef.current, sceneRef.current);
        hoverSubsetRef.current = null;
      }

      if (newHoverId !== null && sceneRef.current) {
        const subset = safeCreateSubset(newHoverId, sceneRef.current);
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
    };

    const handleRightClick = async (event: MouseEvent) => {
      if (!blacklistLoaded) return; // เพิ่มเช็คนี้
      event.preventDefault();
      if (
        !containerRef.current ||
        !ifcModelRef.current ||
        !cameraRef.current ||
        !ifcLoaderRef.current
      )
        return;

      const mouse = new THREE.Vector2();
      const raycaster = new THREE.Raycaster();
      const bounds = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      mouse.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(mouse, cameraRef.current);

      let intersects: any[] = [];
      try {
        intersects = raycaster.intersectObject(ifcModelRef.current, true) || [];
      } catch {
        intersects = [];
      }

      if (intersects.length > 0) {
        const intersect = intersects[0];
        if (
          intersect &&
          intersect.object &&
          intersect.faceIndex !== undefined
        ) {
          const mesh = intersect.object as THREE.Mesh;
          const faceIndex = intersect.faceIndex!;
          const geometry = mesh.geometry;
          const elementId = safeGetExpressId(geometry, faceIndex);

          let objectName: string | null = null;
          if (
            elementId > 0 &&
            !blacklist.has(elementId) &&
            !hiddenObjects.has(elementId)
          ) {
            // PATCH: ดึงชื่อวัตถุจาก properties
            const props = await safeGetItemProperties(elementId);
            objectName = props.name || null;
            setContextMenu({
              show: true,
              x: event.clientX,
              y: event.clientY,
              expressID: elementId,
              name: objectName,
            });
          }
        }
      }
    };

    const handleDoubleClick = async (event: MouseEvent) => {
      if (!blacklistLoaded) return; // เพิ่มเช็คนี้
      if (event.button !== 0) return;
      if (
        !containerRef.current ||
        !ifcModelRef.current ||
        !cameraRef.current ||
        !ifcLoaderRef.current
      )
        return;

      const mouse = new THREE.Vector2();
      const raycaster = new THREE.Raycaster();
      const bounds = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      mouse.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(mouse, cameraRef.current);

      let intersects: any[] = [];
      try {
        intersects = raycaster.intersectObject(ifcModelRef.current, true) || [];
      } catch {
        intersects = [];
      }

      if (intersects.length === 0) {
        setSingleInfo({
          show: false,
          pos: null,
          expressID: null,
          name: null,
          name2: null,
        });
        if (boundaryBoxLineRef.current && sceneRef.current) {
          boundaryBoxLineRef.current.forEach((obj) => {
            sceneRef.current.remove(obj);
          });
          boundaryBoxLineRef.current = null;
        }
        if (centerLineRef.current && sceneRef.current) {
          sceneRef.current.remove(centerLineRef.current);
          centerLineRef.current = null;
        }
        setHoverID(null);
        await loadDefaultPreset();
        return;
      }

      const intersect = intersects[0];
      if (intersect && intersect.object && intersect.faceIndex !== undefined) {
        const mesh = intersect.object as THREE.Mesh;
        const faceIndex = intersect.faceIndex!;
        const geometry = mesh.geometry;
        const elementId = safeGetExpressId(geometry, faceIndex);

        if (
          !elementId ||
          blacklist.has(elementId) ||
          hiddenObjects.has(elementId)
        )
          return;

        let bbox: THREE.Box3 | null = null;
        if (ifcModelRef.current && elementId) {
          bbox = computeBoundingBoxForExpressId(ifcModelRef.current, elementId);
        }
        if (bbox) {
          const center = bbox.getCenter(new THREE.Vector3());
          animateCameraToTargetAbsZoom(center, 5, 0.5);
        }

        let item = await safeGetItemProperties(elementId);

        if (bbox) {
          const center = bbox.getCenter(new THREE.Vector3());
          setSingleInfo({
            show: true,
            pos: new THREE.Vector3(center.x, bbox.max.y, center.z),
            expressID: elementId,
            name: item.name,
            name2: item.name2,
          });
        } else {
          setSingleInfo({
            show: true,
            pos: null,
            expressID: elementId,
            name: item.name,
            name2: item.name2,
          });
        }

        if (boundaryBoxLineRef.current && sceneRef.current) {
          boundaryBoxLineRef.current.forEach((obj) => {
            sceneRef.current.remove(obj);
          });
          boundaryBoxLineRef.current = null;
        }
        if (centerLineRef.current && sceneRef.current) {
          sceneRef.current.remove(centerLineRef.current);
          centerLineRef.current = null;
        }
        if (bbox && sceneRef.current) {
          const min = bbox.min,
            max = bbox.max;
          function vertex(x: number, y: number, z: number) {
            return new THREE.Vector3(
              x ? max.x : min.x,
              y ? max.y : min.y,
              z ? max.z : min.z
            );
          }
          const edgePairs = [
            [
              [0, 0, 0],
              [1, 0, 0],
            ],
            [
              [1, 0, 0],
              [1, 1, 0],
            ],
            [
              [1, 1, 0],
              [0, 1, 0],
            ],
            [
              [0, 1, 0],
              [0, 0, 0],
            ],
            [
              [0, 0, 1],
              [1, 0, 1],
            ],
            [
              [1, 0, 1],
              [1, 1, 1],
            ],
            [
              [1, 1, 1],
              [0, 1, 1],
            ],
            [
              [0, 1, 1],
              [0, 0, 1],
            ],
            [
              [0, 0, 0],
              [0, 0, 1],
            ],
            [
              [1, 0, 0],
              [1, 0, 1],
            ],
            [
              [1, 1, 0],
              [1, 1, 1],
            ],
            [
              [0, 1, 0],
              [0, 1, 1],
            ],
          ];
          const points: number[] = [];
          for (const [start, end] of edgePairs) {
            const vStart = vertex(...start);
            const vEnd = vertex(...end);
            points.push(vStart.x, vStart.y, vStart.z, vEnd.x, vEnd.y, vEnd.z);
          }
          const lineGeometry = new LineGeometry();
          lineGeometry.setPositions(points);
          const lineMaterial = new LineMaterial({
            color: 0xffff00,
            linewidth: 2,
            transparent: false,
            depthTest: false,
          });
          lineMaterial.resolution.set(
            rendererRef.current?.domElement.width || 1920,
            rendererRef.current?.domElement.height || 1080
          );
          const line = new Line2(lineGeometry, lineMaterial);
          line.renderOrder = 9999;
          sceneRef.current.add(line);
          boundaryBoxLineRef.current = [line];

          const center = bbox.getCenter(new THREE.Vector3());
          const top = new THREE.Vector3(center.x, max.y, center.z);
          const bottom = new THREE.Vector3(center.x, min.y, center.z);
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
            rendererRef.current?.domElement.width || 1920,
            rendererRef.current?.domElement.height || 1080
          );
          const centerLine = new Line2(centerLineGeom, centerLineMat);
          centerLine.renderOrder = 10000;
          sceneRef.current.add(centerLine);
          centerLineRef.current = centerLine;
        }

        if (bimBoxEnabled) {
          setBimPanelData({ loading: true, expressID: elementId });

          try {
            const res = await fetch("/api/get-bim-by-id", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                model: modelName,
                expressID: elementId,
              }),
            });

            if (res.ok) {
              const data = await res.json();
              setBimPanelData(data);
            } else if (res.status === 404) {
              setBimPanelData({
                error: "not_found",
                expressID: elementId,
                message: "ไม่พบข้อมูล BIM สำหรับวัตถุนี้",
              });
            } else {
              setBimPanelData({
                error: "api_error",
                expressID: elementId,
                message: `เกิดข้อผิดพลาดในการดึงข้อมูล (${res.status})`,
              });
            }
          } catch (e) {
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
    };

    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("dblclick", handleDoubleClick);
    renderer.domElement.addEventListener("contextmenu", handleRightClick);

    return () => {
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("dblclick", handleDoubleClick);
      renderer.domElement.removeEventListener("contextmenu", handleRightClick);
    };
  }, [
    bimBoxEnabled,
    modelName,
    setBimPanelData,
    loadDefaultPreset,
    blacklist,
    blacklistLoaded,
    hiddenObjects,
  ]);

  // ... [rest of code เหมือนเดิม ทุกส่วน]

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
        onClose={() => setContextMenu({ ...contextMenu, show: false })}
      />

      <div
        ref={infoBoxRef}
        style={{
          position: "absolute",
          zIndex: 1201,
          pointerEvents: "auto",
          background: "rgba(0,0,0,0.28)",
          color: "#fff",
          borderRadius: 10,
          padding: 10,
          fontWeight: 600,
          display: singleInfo.show ? "block" : "none",
          userSelect: "text",
        }}
      >
        <div style={{ fontSize: "100%" }}>
          {singleInfo.expressID != null ? singleInfo.expressID : "-"}
        </div>
        <div
          style={{
            color: "#ffd300",
            fontSize: "85%",
            fontWeight: 400,
            marginTop: "2px",
            wordBreak: "break-word",
            whiteSpace: "normal",
            userSelect: "text",
          }}
        >
          {singleInfo.name || ""}
        </div>
      </div>
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
        />
      </svg>
    </div>
  );
};

export default ThreeScene;
