// hooks/useBlacklistManager.ts
import { useState, useCallback, useRef } from "react";
import * as THREE from "three";
import { IFCLoader } from "web-ifc-three/IFCLoader";
import { BlacklistManagerReturn } from "@/types/three-scene.types";

export function useBlacklistManager(
  ifcLoader: IFCLoader | null,
  scene: THREE.Scene | null
): BlacklistManagerReturn {
  const [blacklist, setBlacklist] = useState<Set<number>>(new Set());
  const [hiddenObjects, setHiddenObjects] = useState<Set<number>>(new Set());
  const [blacklistLoaded, setBlacklistLoaded] = useState(false);

  // Store hidden subsets for cleanup
  const hiddenSubsetsRef = useRef<Map<number, THREE.Mesh>>(new Map());

  /**
   * Load blacklist from API
   */
  const loadBlacklist = useCallback(async () => {
    try {
      const response = await fetch("/api/blacklist");
      if (response.ok) {
        const blacklistArray = await response.json();
        setBlacklist(
          new Set(blacklistArray.map((item: any) => Number(item.expressid)))
        );
      }
    } catch (error) {
      console.error("Failed to load blacklist:", error);
    } finally {
      setBlacklistLoaded(true);
    }
  }, []);

  /**
   * Add object to blacklist
   */
  const addToBlacklist = useCallback(
    async (expressID: number, modelName: string, subobjectName: string) => {
      try {
        const response = await fetch("/api/blacklist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expressID,
            modelname: modelName,
            subobject_name: subobjectName,
          }),
        });

        if (response.ok) {
          setBlacklist((prev) => new Set([...prev, expressID]));
          console.log(`Added ${expressID} to blacklist`);
        } else {
          console.error("Failed to add to blacklist:", await response.text());
        }
      } catch (error) {
        console.error("Failed to add to blacklist:", error);
      }
    },
    []
  );

  /**
   * Hide object from view (different from blacklist)
   */
  const hideObject = useCallback(
    (expressID: number) => {
      if (!ifcLoader?.ifcManager || !scene || expressID === 0) return;

      try {
        // Add to hidden objects set
        setHiddenObjects((prev) => new Set([...prev, expressID]));

        // Create invisible subset for this object
        const hiddenSubset = ifcLoader.ifcManager.createSubset({
          modelID: 0,
          ids: [expressID],
          scene: scene,
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
          scene.remove(hiddenSubset);

          console.log(`Hidden object ${expressID}`);
        }
      } catch (error) {
        console.error("Error hiding object:", error);
      }
    },
    [ifcLoader, scene]
  );

  /**
   * Show hidden object back
   */
  const showHiddenObject = useCallback(
    (expressID: number) => {
      if (!scene) return;

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
          if (ifcLoader?.ifcManager) {
            ifcLoader.ifcManager.removeSubset(
              0,
              [expressID],
              `hidden-${expressID}`
            );
          }
          scene.remove(hiddenSubset);
          hiddenSubsetsRef.current.delete(expressID);

          console.log(`Shown object ${expressID}`);
        } catch (error) {
          console.error("Error showing hidden object:", error);
        }
      }
    },
    [ifcLoader, scene]
  );

  /**
   * Check if object is blacklisted
   */
  const isBlacklisted = useCallback(
    (expressID: number): boolean => {
      return blacklist.has(expressID);
    },
    [blacklist]
  );

  /**
   * Check if object is hidden
   */
  const isHidden = useCallback(
    (expressID: number): boolean => {
      return hiddenObjects.has(expressID);
    },
    [hiddenObjects]
  );

  /**
   * Check if object should be ignored (blacklisted or hidden)
   */
  const shouldIgnoreObject = useCallback(
    (expressID: number): boolean => {
      return isBlacklisted(expressID) || isHidden(expressID);
    },
    [isBlacklisted, isHidden]
  );

  /**
   * Clear all hidden objects
   */
  const clearAllHiddenObjects = useCallback(() => {
    if (!scene) return;

    // Remove all hidden subsets
    hiddenSubsetsRef.current.forEach((subset, expressID) => {
      try {
        if (ifcLoader?.ifcManager) {
          ifcLoader.ifcManager.removeSubset(
            0,
            [expressID],
            `hidden-${expressID}`
          );
        }
        scene.remove(subset);
      } catch (error) {
        console.error("Error removing hidden subset:", error);
      }
    });

    hiddenSubsetsRef.current.clear();
    setHiddenObjects(new Set());

    console.log("Cleared all hidden objects");
  }, [ifcLoader, scene]);

  /**
   * Get blacklist stats
   */
  const getBlacklistStats = useCallback(() => {
    return {
      blacklistedCount: blacklist.size,
      hiddenCount: hiddenObjects.size,
      totalIgnored: blacklist.size + hiddenObjects.size,
    };
  }, [blacklist.size, hiddenObjects.size]);

  return {
    blacklist,
    hiddenObjects,
    blacklistLoaded,
    addToBlacklist,
    hideObject,
    showHiddenObject,
    loadBlacklist,
    isBlacklisted,
    isHidden,
    shouldIgnoreObject,
    clearAllHiddenObjects,
    getBlacklistStats,
  };
}
