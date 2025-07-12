// types/three-scene.types.ts
import * as THREE from "three";
import { OrbitControls } from "three-stdlib";
import { IFCLoader } from "web-ifc-three/IFCLoader";
import { PresetData } from "@/lib/presetApi";

// ===== Basic Types =====
export interface InfoPos {
  x: number;
  y: number;
  z: number;
}

export interface ContextMenuState {
  show: boolean;
  x: number;
  y: number;
  expressID: number | null;
  name: string | null;
}

export interface SingleInfoState {
  show: boolean;
  pos: InfoPos | null;
  expressID: number | null;
  name: string | null;
  name2?: string | null;
}

// ===== Hook Return Types =====
export interface ThreeSceneCoreReturn {
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  renderer: THREE.WebGLRenderer | null;
  controls: OrbitControls | null;
  containerRef: React.RefObject<HTMLDivElement>;
  isInitialized: boolean;
}

export interface IFCLoaderReturn {
  ifcModel: THREE.Object3D | null;
  ifcLoader: IFCLoader | null;
  modelLoaded: boolean;
  loadIFCModel: (modelKey: string) => Promise<void>;
  isLoading: boolean;
}

export interface CameraControlReturn {
  setCameraState: (preset: PresetData, animate?: boolean) => Promise<void>;
  getCurrentCameraState: () => PresetData | null;
  animateToTarget: (
    target: THREE.Vector3,
    zoomFactor?: number
  ) => Promise<void>;
  loadDefaultPreset: (modelKey?: string) => Promise<void>;
  initialDistance: number | null;
  initializeCameraDistance: () => void;
  getCurrentZoom: () => number;
  setZoom: (zoomFactor: number, animate?: boolean) => Promise<void>;
  resetCamera: () => void;
}

export interface ObjectSelectionReturn {
  singleInfo: SingleInfoState;
  hoverID: number | null;
  contextMenu: ContextMenuState;
  handleDoubleClick: (event: MouseEvent) => Promise<void>;
  handlePointerMove: (event: PointerEvent) => Promise<void>;
  handleRightClick: (event: MouseEvent) => Promise<void>;
  unselectObject: () => void;
  selectObjectById: (expressID: number) => Promise<void>;
  closeContextMenu: () => void;
  clearHover: () => void;
}

export interface PresetManagerReturn {
  savePreset: (index: number, label?: string) => Promise<boolean>;
  loadPreset: (index: number, modelKey?: string) => Promise<boolean>;
  deletePreset: (index: number) => Promise<boolean>;
  updatePresetLabel: (index: number, newLabel: string) => Promise<boolean>;
  loadAllPresets: (modelKey?: string) => Promise<void>;
}

export interface BlacklistManagerReturn {
  blacklist: Set<number>;
  hiddenObjects: Set<number>;
  blacklistLoaded: boolean;
  addToBlacklist: (
    expressID: number,
    modelName: string,
    subobjectName: string
  ) => Promise<void>;
  hideObject: (expressID: number) => void;
  showHiddenObject: (expressID: number) => void;
  loadBlacklist: () => Promise<void>;
  isBlacklisted: (expressID: number) => boolean;
  isHidden: (expressID: number) => boolean;
  shouldIgnoreObject: (expressID: number) => boolean;
  clearAllHiddenObjects: () => void;
  getBlacklistStats: () => {
    blacklistedCount: number;
    hiddenCount: number;
    totalIgnored: number;
  };
}

export interface VisualEffectsReturn {
  boundaryBoxLines: THREE.Object3D[] | null;
  centerLine: THREE.Object3D | null;
  createBoundingBoxVisualization: (bbox: THREE.Box3) => void;
  clearVisualEffects: () => void;
}

export interface EventHandlersReturn {
  setupEventListeners: () => void;
  cleanupEventListeners: () => void;
}

// ===== Component Props =====
export interface ThreeSceneProps {
  onPresetSaved?: (index: number, preset: PresetData) => void;
  onPresetLoaded?: (index: number, preset: PresetData) => void;
  onPresetDeleted?: (index: number) => void;
  onPresetsLoaded?: (presets: (PresetData | null)[]) => void;
}

export interface InfoOverlayProps {
  singleInfo: SingleInfoState;
  camera: THREE.PerspectiveCamera | null;
  containerRef: React.RefObject<HTMLDivElement>;
}

// ===== Configuration Types =====
export interface ResponsiveSizes {
  fontSize: number;
  lineWidth: number;
  scale: number;
}

// ===== Constants =====
export const ZOOM_FACTOR_TARGET = 3;
export const DEFAULT_PRESET_INDEX = 0;
export const LOGO_URL = "/images/amr-seamless-solution-logo_gold.png";
