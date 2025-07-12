// hooks/useIFCLoader.ts
import { useState, useRef, useCallback } from "react";
import * as THREE from "three";
import { IFCLoader } from "web-ifc-three/IFCLoader";
import { IFCLoaderReturn } from "@/types/three-scene.types";
import {
  removeAllIFCModelsFromScene,
  getModelCenter,
} from "@/lib/utils/three-helpers";
import { useAppStore } from "@/lib/store";

export function useIFCLoader(
  scene: THREE.Scene | null,
  renderer: THREE.WebGLRenderer | null
): IFCLoaderReturn {
  const [ifcModel, setIFCModel] = useState<THREE.Object3D | null>(null);
  const [ifcLoader, setIFCLoader] = useState<IFCLoader | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const ifcLoaderCache = useRef<Map<string, THREE.Object3D>>(new Map());
  const { setModelLoading } = useAppStore();

  const clearCacheIfNeeded = useCallback(() => {
    if (ifcLoaderCache.current.size > 3) {
      const firstKey = ifcLoaderCache.current.keys().next().value;
      ifcLoaderCache.current.delete(firstKey);
    }
  }, []);

  const loadIFCModel = useCallback(
    async (modelKey: string) => {
      if (!scene) return;

      try {
        setIsLoading(true);
        setModelLoading(true, 5, "กำลังเตรียมโหลดโมเดล...");
        clearCacheIfNeeded();

        // Check cache first
        if (ifcLoaderCache.current.has(modelKey)) {
          setModelLoading(true, 80, "กำลังโหลดจาก Cache...");

          const cachedModel = ifcLoaderCache.current.get(modelKey)!;
          const clonedModel = cachedModel.clone();

          removeAllIFCModelsFromScene(scene);
          scene.add(clonedModel);
          setIFCModel(clonedModel);

          setModelLoading(true, 90, "กำลังปรับตำแหน่งกล้อง...");
          setModelLoaded(true);

          setModelLoading(true, 95, "เสร็จสิ้น...");

          setTimeout(() => {
            setModelLoading(false);
            setIsLoading(false);
          }, 300);

          return;
        }

        // Remove existing models
        removeAllIFCModelsFromScene(scene);
        setIFCModel(null);
        setModelLoaded(false);

        // Create new IFC loader
        const newIfcLoader = new IFCLoader();
        if (
          newIfcLoader.ifcManager &&
          typeof newIfcLoader.ifcManager.setWasmPath === "function"
        ) {
          newIfcLoader.ifcManager.setWasmPath("/libs/web-ifc/");
        }
        setIFCLoader(newIfcLoader);

        const modelUrl = `/model3d/${modelKey}.ifc`;
        setModelLoading(true, 15, "กำลังโหลดไฟล์ IFC...");

        return new Promise<void>((resolve, reject) => {
          newIfcLoader.load(
            modelUrl,
            async (model) => {
              try {
                setModelLoading(true, 50, "กำลังประมวลผลโมเดล...");

                if (!model) {
                  setModelLoaded(false);
                  setModelLoading(false);
                  setIsLoading(false);
                  return resolve();
                }

                setIFCModel(model);
                scene.add(model);

                setModelLoading(true, 70, "กำลังปรับตำแหน่งกล้อง...");
                setModelLoaded(true);

                setModelLoading(true, 85, "กำลังโหลดข้อมูล Preset...");

                // Cache the model
                ifcLoaderCache.current.set(modelKey, model.clone());

                // Small delay to show completion
                await new Promise((resolve) => setTimeout(resolve, 500));

                setModelLoading(true, 95, "กำลังเสร็จสิ้น...");

                setTimeout(() => {
                  setModelLoading(false);
                  setIsLoading(false);
                }, 300);

                resolve();
              } catch (error) {
                setModelLoading(false);
                setIsLoading(false);
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
              setIsLoading(false);

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
        setIsLoading(false);
        throw error;
      }
    },
    [scene, setModelLoading, clearCacheIfNeeded]
  );

  return {
    ifcModel,
    ifcLoader,
    modelLoaded,
    loadIFCModel,
    isLoading,
  };
}
