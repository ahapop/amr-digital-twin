import { create } from "zustand";
import * as THREE from "three";
import { MODELS } from "@/lib/constants";

export interface PresetView {
  position: THREE.Vector3;
  target: THREE.Vector3;
  zoom: number;
}

export interface AppState {
  setCurrentModelName: (name: string) => void;
  // Panel visibility
  showQuickPanel: boolean;
  showModelPanel: boolean;
  showPresetBox: boolean;
  showBimPanel: boolean;

  // Current model
  currentModelKey: string | null;
  setCurrentModelKey: (key: string | null) => void;

  currentModelName: string;
  currentMesh: THREE.Object3D | null;

  // UI states
  statusBoxEnabled: boolean;
  multiBoxEnabled: boolean;
  scadaBoxEnabled: boolean;
  reservedBoxEnabled: boolean;
  bimBoxEnabled: boolean;

  bimPanelOpen: boolean;
  bimPanelData: any; // หรือจะกำหนด type ให้ละเอียดขึ้นก็ได้
  setBimPanelData: (data: any) => void;

  // 🔧 NEW: Loading states
  modelLoading: boolean;
  modelLoadingProgress: number;
  modelLoadingMessage: string;
  setModelLoading: (
    loading: boolean,
    progress?: number,
    message?: string
  ) => void;

  // Selection
  selectedIDs: Set<number>;
  hoveredID: number | null;
  lastHitPoint: THREE.Vector3 | null;

  // Presets
  presetViews: (PresetView | null)[];
  presetLabels: string[];
  currentPreset: number | null;
  resetMode: boolean;

  // 3D Scene
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  renderer: THREE.WebGLRenderer | null;
  controls: any;

  // Data
  cmmsIDs: Map<number, any>;
  scadaIDs: Map<number, any>;
  reservedIDs: Set<number>;

  // Actions
  toggleQuickPanel: (show?: boolean) => void;
  toggleModelPanel: (show?: boolean) => void;
  togglePresetBox: (show?: boolean) => void;
  toggleBimPanel: (show?: boolean) => void;

  setCurrentModel: (
    key: string,
    name: string,
    mesh: THREE.Object3D | null
  ) => void;

  toggleStatusBox: () => void;
  toggleMultiBox: () => void;
  toggleScadaBox: () => void;
  toggleReservedBox: () => void;
  toggleBimBox: () => void;

  setSelectedIDs: (ids: Set<number>) => void;
  setHoveredID: (id: number | null) => void;
  setLastHitPoint: (point: THREE.Vector3 | null) => void;
  clearSelection: () => void;

  // PATCH: ให้ switchModel รับ index และ set currentModelKey
  switchModel: (index: number) => Promise<void>;

  savePreset: (index: number) => void;
  loadPreset: (index: number) => void;
  setCurrentPreset: (index: number | null) => void;
  toggleResetMode: () => void;

  setScene: (scene: THREE.Scene | null) => void;
  setCamera: (camera: THREE.PerspectiveCamera | null) => void;
  setRenderer: (renderer: THREE.WebGLRenderer | null) => void;
  setControls: (controls: any | null) => void;

  setCmmsIDs: (ids: Map<number, any>) => void;
  setScadaIDs: (ids: Map<number, any>) => void;
  setReservedIDs: (ids: Set<number>) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  showQuickPanel: false,
  showModelPanel: false,
  showPresetBox: false,
  showBimPanel: false,

  currentModelKey: null,
  setCurrentModelKey: (key: string | null) => set({ currentModelKey: key }),
  currentModelName: "",
  setCurrentModelName: (name) => set({ currentModelName: name }),
  currentMesh: null,

  statusBoxEnabled: true,
  multiBoxEnabled: false,
  scadaBoxEnabled: false,
  reservedBoxEnabled: false,
  bimBoxEnabled: false,
  bimPanelOpen: false, // หรือค่า default ที่ต้องการ
  bimPanelData: null, // ค่า default เป็น null หรือ {}
  setBimPanelData: (data) => set({ bimPanelData: data }),

  // 🔧 NEW: Loading states
  modelLoading: false,
  modelLoadingProgress: 0,
  modelLoadingMessage: "",
  setModelLoading: (loading, progress = 0, message = "") => {
    console.log(
      `🔧 AppStore: setModelLoading(${loading}, ${progress}, "${message}")`
    );
    set({
      modelLoading: loading,
      modelLoadingProgress: progress,
      modelLoadingMessage: message,
    });
  },

  selectedIDs: new Set(),
  hoveredID: null,
  lastHitPoint: null,

  presetViews: new Array(19).fill(null),
  presetLabels: Array.from({ length: 19 }, (_, i) => `Preset ${i + 1}`),
  currentPreset: null,
  resetMode: false,

  scene: null,
  camera: null,
  renderer: null,
  controls: null,

  cmmsIDs: new Map(),
  scadaIDs: new Map(),
  reservedIDs: new Set(),

  // Actions
  toggleQuickPanel: (show) =>
    set((state) => ({
      showQuickPanel: show !== undefined ? show : !state.showQuickPanel,
      showModelPanel: show !== undefined && show ? false : state.showModelPanel,
    })),

  toggleModelPanel: (show) =>
    set((state) => ({
      showModelPanel: show !== undefined ? show : !state.showModelPanel,
      showQuickPanel: show !== undefined && show ? false : state.showQuickPanel,
    })),

  togglePresetBox: (show) =>
    set((state) => ({
      showPresetBox: show !== undefined ? show : !state.showPresetBox,
    })),

  toggleBimPanel: (show) =>
    set((state) => ({
      showBimPanel: show !== undefined ? show : !state.showBimPanel,
    })),

  setCurrentModel: (key, name, mesh) =>
    set({
      currentModelKey: key,
      currentModelName: name,
      currentMesh: mesh,
    }),

  toggleStatusBox: () =>
    set((state) => ({
      statusBoxEnabled: !state.statusBoxEnabled,
    })),

  toggleMultiBox: () =>
    set((state) => ({
      multiBoxEnabled: !state.multiBoxEnabled,
      scadaBoxEnabled: false,
      reservedBoxEnabled: false,
      bimBoxEnabled: false,
    })),

  toggleScadaBox: () =>
    set((state) => ({
      scadaBoxEnabled: !state.scadaBoxEnabled,
      multiBoxEnabled: false,
      reservedBoxEnabled: false,
      bimBoxEnabled: false,
    })),

  toggleReservedBox: () =>
    set((state) => ({
      reservedBoxEnabled: !state.reservedBoxEnabled,
      multiBoxEnabled: false,
      scadaBoxEnabled: false,
      bimBoxEnabled: false,
    })),

  toggleBimBox: () =>
    set((state) => {
      const newBimBoxEnabled = !state.bimBoxEnabled;
      console.log(
        `🔧 AppStore: toggleBimBox() - new state: ${newBimBoxEnabled}`
      );
      return {
        bimBoxEnabled: newBimBoxEnabled,
        multiBoxEnabled: false,
        scadaBoxEnabled: false,
        reservedBoxEnabled: false,
      };
    }),

  setSelectedIDs: (ids) => set({ selectedIDs: ids }),
  setHoveredID: (id) => set({ hoveredID: id }),
  setLastHitPoint: (point) => set({ lastHitPoint: point }),

  clearSelection: () =>
    set({
      selectedIDs: new Set(),
      lastHitPoint: null,
    }),

  // PATCH: เซ็ต currentModelKey อัตโนมัติจาก MODELS[index]
  switchModel: async (index) => {
    const model = MODELS[index];
    if (model?.key) {
      console.log(
        `🔧 AppStore: switchModel(${index}) - switching to "${model.key}"`
      );
      set({ currentModelKey: model.key });
    }
  },

  savePreset: (index) =>
    set((state) => {
      const { camera, controls } = state;
      if (!camera || !controls) return state;

      const newPresetViews = [...state.presetViews];
      newPresetViews[index] = {
        position: camera.position.clone(),
        target: controls.target.clone(),
        zoom: camera.zoom,
      };

      return { presetViews: newPresetViews };
    }),

  loadPreset: (index) => {
    const { presetViews, camera, controls } = get();
    const preset = presetViews[index];
    if (!preset || !camera || !controls) return;

    camera.position.copy(preset.position);
    controls.target.copy(preset.target);
    camera.zoom = preset.zoom;
    camera.updateProjectionMatrix();
    controls.update();
  },

  setCurrentPreset: (index) => set({ currentPreset: index }),

  toggleResetMode: () =>
    set((state) => ({
      resetMode: !state.resetMode,
    })),

  setScene: (scene) => set({ scene }),
  setCamera: (camera) => set({ camera }),
  setRenderer: (renderer) => set({ renderer }),
  setControls: (controls) => set({ controls }),

  setCmmsIDs: (ids) => set({ cmmsIDs: ids }),
  setScadaIDs: (ids) => set({ scadaIDs: ids }),
  setReservedIDs: (ids) => set({ reservedIDs: ids }),
}));
