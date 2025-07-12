// lib/utils/animation-utils.ts
import * as THREE from "three";
import { OrbitControls } from "three-stdlib";

/**
 * Easing function for smooth animations
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Animate camera to target position with zoom
 */
export function animateCameraToTargetAbsZoom(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  newTarget: THREE.Vector3,
  initialDistance: number,
  zoomFactor: number = 3,
  duration: number = 0.8
): Promise<void> {
  return new Promise((resolve) => {
    if (!initialDistance || initialDistance === 0) {
      resolve();
      return;
    }

    const startTarget = controls.target.clone();
    const startPos = camera.position.clone();
    const direction = new THREE.Vector3()
      .subVectors(startPos, startTarget)
      .normalize();

    const endTarget = newTarget.clone();
    const endDist = initialDistance / zoomFactor;
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
        resolve();
      }
    }

    requestAnimationFrame(animate);
  });
}

/**
 * Animate camera to position and target
 */
export function animateCameraToPosition(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  targetTarget: THREE.Vector3,
  targetPosition: THREE.Vector3,
  duration: number = 0.8
): Promise<void> {
  return new Promise((resolve) => {
    const startTarget = controls.target.clone();
    const startPos = camera.position.clone();
    let startTime: number | null = null;

    function animate(time: number) {
      if (!startTime) startTime = time;

      let t = (time - startTime) / (duration * 1000);
      t = Math.max(0, Math.min(1, t));

      const easeT = easeInOutCubic(t);

      controls.target.lerpVectors(startTarget, targetTarget, easeT);
      camera.position.lerpVectors(startPos, targetPosition, easeT);
      camera.lookAt(controls.target);
      controls.update();

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    }

    requestAnimationFrame(animate);
  });
}

/**
 * Set camera state without animation
 */
export function setCameraStateImmediate(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  position: [number, number, number],
  target: [number, number, number]
): void {
  const targetPosition = new THREE.Vector3(...position);
  const targetTarget = new THREE.Vector3(...target);

  controls.target.copy(targetTarget);
  camera.position.copy(targetPosition);
  camera.lookAt(controls.target);
  controls.update();
}

/**
 * Calculate zoom factor from distance
 */
export function calculateZoomFactor(
  currentDistance: number,
  initialDistance: number
): number {
  if (!initialDistance || initialDistance === 0) return 1;
  return initialDistance / currentDistance;
}

/**
 * Get distance from camera to target
 */
export function getCameraTargetDistance(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls
): number {
  return camera.position.distanceTo(controls.target);
}

/**
 * Smooth zoom to target with animation
 */
export function animateZoomToTarget(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  targetZoom: number,
  initialDistance: number,
  duration: number = 0.5
): Promise<void> {
  return new Promise((resolve) => {
    const startDistance = getCameraTargetDistance(camera, controls);
    const endDistance = initialDistance / targetZoom;

    const direction = new THREE.Vector3()
      .subVectors(camera.position, controls.target)
      .normalize();

    let startTime: number | null = null;

    function animate(time: number) {
      if (!startTime) startTime = time;

      let t = (time - startTime) / (duration * 1000);
      t = Math.max(0, Math.min(1, t));

      const easeT = easeInOutCubic(t);
      const currentDistance = THREE.MathUtils.lerp(
        startDistance,
        endDistance,
        easeT
      );

      const newPosition = controls.target
        .clone()
        .add(direction.clone().multiplyScalar(currentDistance));

      camera.position.copy(newPosition);
      camera.lookAt(controls.target);

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    }

    requestAnimationFrame(animate);
  });
}
