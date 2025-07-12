// hooks/useThreeSceneCore.ts
import { useRef, useLayoutEffect, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three-stdlib";
import { ThreeSceneCoreReturn } from "@/types/three-scene.types";

export function useThreeSceneCore(): ThreeSceneCoreReturn {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scene, setScene] = useState<THREE.Scene | null>(null);
  const [camera, setCamera] = useState<THREE.PerspectiveCamera | null>(null);
  const [renderer, setRenderer] = useState<THREE.WebGLRenderer | null>(null);
  const [controls, setControls] = useState<OrbitControls | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const animationRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    let destroyed = false;

    // Create scene
    const newScene = new THREE.Scene();
    newScene.background = new THREE.Color(0x1b2029);
    setScene(newScene);

    // Create camera
    const newCamera = new THREE.PerspectiveCamera(45, 1, 1, 1000);
    newCamera.position.set(30, 30, 30);
    setCamera(newCamera);

    // Create renderer
    const newRenderer = new THREE.WebGLRenderer({ antialias: true });
    newRenderer.setPixelRatio(window.devicePixelRatio);
    setRenderer(newRenderer);

    if (containerRef.current) {
      // Remove existing renderer if any
      if (
        newRenderer.domElement.parentNode &&
        newRenderer.domElement.parentNode !== containerRef.current
      ) {
        newRenderer.domElement.parentNode.removeChild(newRenderer.domElement);
      }

      // Append to container
      if (newRenderer.domElement.parentNode !== containerRef.current) {
        containerRef.current.appendChild(newRenderer.domElement);
      }

      // Set size
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      newRenderer.setSize(w, h, false);
      newCamera.aspect = w / h;
      newCamera.updateProjectionMatrix();

      // Style renderer
      newRenderer.domElement.style.position = "absolute";
      newRenderer.domElement.style.top = "0";
      newRenderer.domElement.style.left = "0";
      newRenderer.domElement.style.width = "100%";
      newRenderer.domElement.style.height = "100%";
      newRenderer.domElement.style.display = "block";
    }

    // Create controls
    const newControls = new OrbitControls(newCamera, newRenderer.domElement);
    newControls.enableDamping = false;
    newControls.rotateSpeed = 2.0;
    newControls.panSpeed = 5.0;
    newControls.zoomSpeed = 2.0;
    newControls.screenSpacePanning = true;
    newControls.enablePan = true;
    newControls.enableRotate = true;
    newControls.enableZoom = true;
    newControls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
    setControls(newControls);

    // Add lighting
    newScene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.1);
    directionalLight.position.set(50, 60, 22);
    newScene.add(directionalLight);

    // Animation loop
    function animate() {
      if (destroyed) return;
      newRenderer.render(newScene, newCamera);
      animationRef.current = requestAnimationFrame(animate);
    }
    animate();

    // Handle window resize
    const handleResize = () => {
      if (containerRef.current && newRenderer && newCamera) {
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        newRenderer.setSize(w, h, false);
        newCamera.aspect = w / h;
        newCamera.updateProjectionMatrix();
      }
    };

    window.addEventListener("resize", handleResize);

    setIsInitialized(true);

    return () => {
      destroyed = true;

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      window.removeEventListener("resize", handleResize);

      if (
        newRenderer &&
        newRenderer.domElement &&
        newRenderer.domElement.parentNode
      ) {
        newRenderer.domElement.parentNode.removeChild(newRenderer.domElement);
      }

      setScene(null);
      setCamera(null);
      setRenderer(null);
      setControls(null);
      setIsInitialized(false);
    };
  }, []);

  return {
    scene,
    camera,
    renderer,
    controls,
    containerRef,
    isInitialized,
  };
}
