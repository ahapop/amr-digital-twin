// hooks/usePresetManager.ts
import { useCallback, useRef } from "react";
import { PresetData, PresetAPI } from "@/lib/presetApi";
import { PresetManagerReturn } from "@/types/three-scene.types";

export function usePresetManager(
  getCurrentCameraState: () => PresetData | null,
  setCameraState: (preset: PresetData, animate?: boolean) => Promise<void>,
  modelName: string,
  onPresetSaved?: (index: number, preset: PresetData) => void,
  onPresetLoaded?: (index: number, preset: PresetData) => void,
  onPresetDeleted?: (index: number) => void,
  onPresetsLoaded?: (presets: (PresetData | null)[]) => void
): PresetManagerReturn {
  const presetCache = useRef<Map<string, (PresetData | null)[]>>(new Map());
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  /**
   * Save current camera state as preset
   */
  const savePreset = useCallback(
    async (index: number, label: string = `Preset ${index + 1}`) => {
      try {
        const currentState = getCurrentCameraState();
        if (!currentState) {
          console.warn("Cannot get current camera state for saving preset");
          return false;
        }

        currentState.label = label;

        const response = await PresetAPI.savePreset(
          modelName,
          index,
          currentState
        );

        if (response.status === "ok") {
          // Clear cache for this model
          presetCache.current.delete(modelName);

          onPresetSaved?.(index, currentState);
          console.log(`Saved preset ${index}: ${label}`);
          return true;
        } else {
          console.error("Failed to save preset:", response);
          return false;
        }
      } catch (error) {
        console.error("Error saving preset:", error);
        return false;
      }
    },
    [getCurrentCameraState, modelName, onPresetSaved]
  );

  /**
   * Load preset by index
   */
  const loadPreset = useCallback(
    async (index: number, targetModelName?: string) => {
      const modelToUse = targetModelName || modelName;

      try {
        const response = await PresetAPI.loadPreset(modelToUse, index);

        if (response.status === "ok" && response.preset) {
          await setCameraState(response.preset, true);
          onPresetLoaded?.(index, response.preset);
          console.log(`Loaded preset ${index}: ${response.preset.label}`);
          return true;
        } else if (response.status === "not_found") {
          console.warn(`Preset ${index} not found for model ${modelToUse}`);
          return false;
        } else {
          console.error("Failed to load preset:", response);
          return false;
        }
      } catch (error) {
        console.error("Error loading preset:", error);
        return false;
      }
    },
    [setCameraState, modelName, onPresetLoaded]
  );

  /**
   * Delete preset by index
   */
  const deletePreset = useCallback(
    async (index: number) => {
      try {
        const response = await PresetAPI.deletePreset(modelName, index);

        if (response.status === "ok") {
          // Clear cache for this model
          presetCache.current.delete(modelName);

          onPresetDeleted?.(index);
          console.log(`Deleted preset ${index}`);
          return true;
        } else {
          console.error("Failed to delete preset:", response);
          return false;
        }
      } catch (error) {
        console.error("Error deleting preset:", error);
        return false;
      }
    },
    [modelName, onPresetDeleted]
  );

  /**
   * Update preset label
   */
  const updatePresetLabel = useCallback(
    async (index: number, newLabel: string) => {
      try {
        const response = await PresetAPI.updatePresetLabel(
          modelName,
          index,
          newLabel
        );

        if (response.status === "ok") {
          // Clear cache for this model
          presetCache.current.delete(modelName);

          // Get updated preset data
          const updatedResponse = await PresetAPI.loadPreset(modelName, index);
          if (updatedResponse.status === "ok" && updatedResponse.preset) {
            onPresetSaved?.(index, updatedResponse.preset);
          }

          console.log(`Updated preset ${index} label to: ${newLabel}`);
          return true;
        } else {
          console.error("Failed to update preset label:", response);
          return false;
        }
      } catch (error) {
        console.error("Error updating preset label:", error);
        return false;
      }
    },
    [modelName, onPresetSaved]
  );

  /**
   * Load all presets for a model (with debouncing)
   */
  const debouncedLoadPresets = useCallback(
    (targetModelName: string) => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }

      debounceTimeout.current = setTimeout(async () => {
        // Check cache first
        if (presetCache.current.has(targetModelName)) {
          const cachedPresets = presetCache.current.get(targetModelName)!;
          onPresetsLoaded?.(cachedPresets);
          return;
        }

        try {
          const response = await PresetAPI.getAllPresets(targetModelName);

          if (response.status === "ok" && response.presets) {
            // Cache the results
            presetCache.current.set(targetModelName, response.presets);
            onPresetsLoaded?.(response.presets);
            console.log(
              `Loaded ${
                response.presets.filter((p) => p !== null).length
              } presets for model: ${targetModelName}`
            );
          } else {
            console.warn("Failed to load presets:", response);
            onPresetsLoaded?.([]);
          }
        } catch (error) {
          console.error("Error loading presets:", error);
          onPresetsLoaded?.([]);
        }
      }, 300);
    },
    [onPresetsLoaded]
  );

  /**
   * Load all presets for a model
   */
  const loadAllPresets = useCallback(
    async (targetModelName?: string) => {
      const modelToUse = targetModelName || modelName;
      debouncedLoadPresets(modelToUse);
    },
    [debouncedLoadPresets, modelName]
  );

  /**
   * Clear preset cache
   */
  const clearPresetCache = useCallback(() => {
    presetCache.current.clear();
    console.log("Cleared preset cache");
  }, []);

  /**
   * Get cached presets for a model
   */
  const getCachedPresets = useCallback(
    (targetModelName?: string): (PresetData | null)[] | null => {
      const modelToUse = targetModelName || modelName;
      return presetCache.current.get(modelToUse) || null;
    },
    [modelName]
  );

  return {
    savePreset,
    loadPreset,
    deletePreset,
    updatePresetLabel,
    loadAllPresets,
    clearPresetCache,
    getCachedPresets,
  };
}
