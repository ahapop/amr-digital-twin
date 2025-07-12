import { useCallback, useRef, useEffect } from "react";
import * as THREE from "three";
import { useAppStore } from "@/lib/store";
import { MODELS } from "@/lib/constants";

export function useThreeScene() {
  const initialized = useRef(false);

  const {
    scene,
    camera,
    renderer,
    controls,
    currentMesh,
    currentModelKey,
    selectedIDs,
    hoveredID,
    setScene,
    setCamera,
    setRenderer,
    setControls,
    setCurrentModel,
    setSelectedIDs,
    setHoveredID,
    setLastHitPoint,
    toggleBimPanel,
  } = useAppStore();

  const animationRef = useRef<number | null>(null);
  const centroidCache = useRef(new Map<number, THREE.Vector3>());
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const needsRender = useRef(true);

  // Example: Init Three.js scene, camera, renderer
  const init = useCallback(
    async (container: HTMLElement) => {
      try {
        if (initialized.current) return;
        initialized.current = true;

        // --- Example Three.js scene setup (customize as needed) ---
        const _scene = new THREE.Scene();
        setScene(_scene);

        const _camera = new THREE.PerspectiveCamera(
          75,
          container.clientWidth / container.clientHeight,
          0.1,
          1000
        );
        _camera.position.set(0, 2, 5);
        setCamera(_camera);

        const _renderer = new THREE.WebGLRenderer({ antialias: true });
        _renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(_renderer.domElement);
        setRenderer(_renderer);

        // Add light
        const ambient = new THREE.AmbientLight(0xffffff, 0.8);
        _scene.add(ambient);

        // Animation loop (example)
        const animate = () => {
          animationRef.current = requestAnimationFrame(animate);
          _renderer.render(_scene, _camera);
        };
        animate();
        // ----------------------------------------------------------
      } catch (e) {
        initialized.current = false;
        throw e;
      }
    },
    [setScene, setCamera, setRenderer, animationRef]
  );
  // React cleanup & responsive handling
  useEffect(() => {
    initialized.current = true;

    // Cleanup on unmount
    return () => {
      if (initialized.current) {
        // Cancel animation
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        // Dispose Three.js objects
        if (renderer) {
          renderer.dispose();
        }
        setScene(null);
        setCamera(null);
        setRenderer(null);
        setControls(null);
        setCurrentModel("", "", null);
      }
      initialized.current = false;
    };
  }, []); // อย่าลืม dependency array

  // Other hook logic, event handlers, etc. (add as needed)

  return {
    scene,
    camera,
    renderer,
    controls,
    currentMesh,
    currentModelKey,
    selectedIDs,
    hoveredID,
    setScene,
    setCamera,
    setRenderer,
    setControls,
    setCurrentModel,
    setSelectedIDs,
    setHoveredID,
    setLastHitPoint,
    toggleBimPanel,
    animationRef,
    centroidCache,
    raycaster,
    mouse,
    needsRender,
    init,
    initialized,
  };
}
