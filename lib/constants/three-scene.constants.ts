// lib/constants/three-scene.constants.ts
export const ZOOM_FACTOR_TARGET = 3;
export const DEFAULT_PRESET_INDEX = 0;
export const LOGO_URL = "/images/amr-seamless-solution-logo_gold.png";

export const VISUAL_EFFECTS_CONFIG = {
  boundingBoxMaterial: {
    color: 0xffff00,
    linewidth: 2,
    transparent: false,
    depthTest: false,
  },
  centerLineMaterial: {
    color: 0xffffff,
    linewidth: 0.006,
    transparent: false,
    depthTest: false,
  },
  hoverMaterial: {
    color: 0xffff00,
    transparent: true,
    opacity: 0.3,
    depthTest: false,
  },
};

export const ANIMATION_CONFIG = {
  defaultDuration: 0.8,
  zoomDuration: 0.5,
  easingFunction: "easeInOutCubic",
};

export const EVENT_CONFIG = {
  debounceDelay: 300,
  pointerMoveThrottle: 16, // ~60fps
  contextMenuDelay: 100,
};
