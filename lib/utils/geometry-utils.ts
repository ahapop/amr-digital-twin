// lib/utils/geometry-utils.ts
import * as THREE from "three";
import { ResponsiveSizes } from "@/types/three-scene.types";

/**
 * Compute bounding box for specific Express ID in IFC model
 */
export function computeBoundingBoxForExpressId(
  ifcModel: THREE.Object3D,
  expressId: number
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
        if (curId === expressId) {
          const x = pos.array[i * 3];
          const y = pos.array[i * 3 + 1];
          const z = pos.array[i * 3 + 2];
          const v = new THREE.Vector3(x, y, z).applyMatrix4(child.matrixWorld);
          points.push(v);
        }
      }
    }
  });

  if (points.length === 0) return null;

  const bbox = new THREE.Box3().setFromPoints(points);
  return bbox;
}

/**
 * Get responsive sizes based on camera distance
 */
export function getResponsiveSizes(
  camera: THREE.PerspectiveCamera,
  targetPos: THREE.Vector3
): ResponsiveSizes {
  const cameraPos = camera.position;
  const distance = cameraPos.distanceTo(targetPos);
  const scaleFactor = Math.min(1.0, Math.max(0.1, 50 / distance));

  return {
    fontSize: Math.round(18 * scaleFactor),
    lineWidth: Math.max(2, Math.round(2 * scaleFactor)),
    scale: scaleFactor,
  };
}

/**
 * Create bounding box edge pairs for wireframe
 */
export function createBoundingBoxEdges(bbox: THREE.Box3): number[] {
  const min = bbox.min;
  const max = bbox.max;

  function vertex(x: number, y: number, z: number): THREE.Vector3 {
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
    ], // bottom face
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
    ], // top face
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
    ], // vertical edges
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
    const vStart = vertex(...(start as [number, number, number]));
    const vEnd = vertex(...(end as [number, number, number]));
    points.push(vStart.x, vStart.y, vStart.z, vEnd.x, vEnd.y, vEnd.z);
  }

  return points;
}

/**
 * Create center line points from bounding box
 */
export function createCenterLinePoints(bbox: THREE.Box3): {
  bottom: THREE.Vector3;
  top: THREE.Vector3;
  center: THREE.Vector3;
} {
  const center = bbox.getCenter(new THREE.Vector3());
  const top = new THREE.Vector3(center.x, bbox.max.y, center.z);
  const bottom = new THREE.Vector3(center.x, bbox.min.y, center.z);

  return { bottom, top, center };
}

/**
 * Calculate screen position from 3D world position
 */
export function worldToScreen(
  worldPos: THREE.Vector3,
  camera: THREE.PerspectiveCamera,
  width: number,
  height: number
): { x: number; y: number; z: number } {
  const projected = worldPos.clone().project(camera);

  return {
    x: ((projected.x + 1) / 2) * width,
    y: ((-projected.y + 1) / 2) * height,
    z: projected.z,
  };
}

/**
 * Check if point is visible in camera frustum
 */
export function isPointVisible(
  worldPos: THREE.Vector3,
  camera: THREE.PerspectiveCamera
): boolean {
  const frustum = new THREE.Frustum();
  const cameraMatrix = new THREE.Matrix4().multiplyMatrices(
    camera.projectionMatrix,
    camera.matrixWorldInverse
  );
  frustum.setFromProjectionMatrix(cameraMatrix);

  return frustum.containsPoint(worldPos);
}
