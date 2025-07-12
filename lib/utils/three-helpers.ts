// lib/utils/three-helpers.ts
import * as THREE from "three";
import { IFCLoader } from "web-ifc-three/IFCLoader";

/**
 * Safely get Express ID from IFC geometry
 */
export function safeGetExpressId(
  geometry: THREE.BufferGeometry,
  faceIndex: number,
  ifcLoader?: IFCLoader
): number {
  try {
    if (!ifcLoader?.ifcManager) return 0;
    if (typeof ifcLoader.ifcManager.getExpressId !== "function") return 0;
    if (!geometry || faceIndex === undefined || faceIndex < 0) return 0;

    const elementId = ifcLoader.ifcManager.getExpressId(geometry, faceIndex);
    return typeof elementId === "number" ? elementId : 0;
  } catch {
    return 0;
  }
}

/**
 * Safely create subset for object highlighting
 */
export function safeCreateSubset(
  elementId: number,
  scene: THREE.Scene,
  ifcLoader?: IFCLoader,
  material?: THREE.Material
): THREE.Mesh | null {
  try {
    if (!ifcLoader?.ifcManager || elementId === 0) return null;
    if (typeof ifcLoader.ifcManager.createSubset !== "function") return null;

    const defaultMaterial = new THREE.MeshStandardMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.3,
      depthTest: false,
    });

    const subset = ifcLoader.ifcManager.createSubset({
      modelID: 0,
      ids: [elementId],
      scene: scene,
      removePrevious: true,
      customID: "hover-subset",
      material: material || defaultMaterial,
    });

    return subset as THREE.Mesh;
  } catch {
    return null;
  }
}

/**
 * Safely remove subset from scene
 */
export function safeRemoveSubset(
  subset: THREE.Mesh,
  scene: THREE.Scene,
  ifcLoader?: IFCLoader
): void {
  try {
    if (!ifcLoader?.ifcManager || !subset) return;

    if (typeof ifcLoader.ifcManager.removeSubset === "function") {
      ifcLoader.ifcManager.removeSubset(0, undefined, "hover-subset");
    }
    scene.remove(subset);
  } catch {
    scene.remove(subset);
  }
}

/**
 * Safely get item properties from IFC
 */
export async function safeGetItemProperties(
  elementId: number,
  ifcLoader?: IFCLoader
): Promise<{ name: string; name2: string }> {
  try {
    if (!ifcLoader?.ifcManager || elementId === 0) {
      return { name: "-", name2: "" };
    }

    if (typeof ifcLoader.ifcManager.getItemProperties !== "function") {
      return { name: "-", name2: "" };
    }

    const props = await ifcLoader.ifcManager.getItemProperties(
      0,
      elementId,
      true
    );
    let name = "-";
    let name2 = "";

    if (props) {
      // Extract name
      if (props.Name && typeof props.Name === "string") name = props.Name;
      else if (props.name && typeof props.name === "string") name = props.name;
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
      ) {
        name = String(props.Name.value);
      } else if (
        props.name &&
        typeof props.name === "object" &&
        props.name.value
      ) {
        name = String(props.name.value);
      } else {
        const stringProps = Object.values(props).find(
          (val) =>
            typeof val === "string" &&
            val.length > 0 &&
            val !== elementId.toString()
        );
        if (stringProps) name = String(stringProps);
      }

      // Extract type
      if (props.ObjectType && typeof props.ObjectType === "string")
        name2 = props.ObjectType;
      else if (props.PredefinedType && typeof props.PredefinedType === "string")
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

/**
 * Get model center point
 */
export function getModelCenter(ifcModel?: THREE.Object3D): THREE.Vector3 {
  if (!ifcModel) return new THREE.Vector3(0, 0, 0);
  const bbox = new THREE.Box3().setFromObject(ifcModel);
  return bbox.getCenter(new THREE.Vector3());
}

/**
 * Remove all IFC models from scene
 */
export function removeAllIFCModelsFromScene(scene: THREE.Scene): void {
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
    if ("geometry" in obj && obj.geometry) {
      obj.geometry.dispose?.();
    }
    if ("material" in obj && obj.material) {
      if (Array.isArray(obj.material)) {
        obj.material.forEach((material) => material.dispose?.());
      } else {
        obj.material.dispose?.();
      }
    }
  });
}
