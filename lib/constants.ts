export const MODELS = [
  { key: "third", label: "Third Fl.", path: "/model3d/third.ifc" },
  { key: "second", label: "Second Fl.", path: "/model3d/second.ifc" },
  { key: "ground", label: "Ground", path: "/model3d/ground.ifc" },
  { key: "main", label: "Main", path: "/model3d/main.ifc" },
  { key: "machine", label: "Machine", path: "/model3d/machine.ifc" },
];

export const PRESETS = [
  "Preset 1",
  "Preset 2",
  "Preset 3",
  "Preset 4",
  "Preset 5",
  "Preset 6",
  "Preset 7",
  "Preset 8",
  "Preset 9",
  "Preset 10",
  "Preset 11",
  "Preset 12",
  "Preset 13",
  "Preset 14",
  "Preset 15",
  "Preset 16",
  "Preset 17",
  "Preset 18",
  "Preset 19",
];

export const GAP = 150;
export const BATCH = 40;

export const MQTT_CONFIG = {
  URL: "ws://localhost:9001",
  TOPICS: {
    LAMP: "lamp",
  },
};

export const API_ENDPOINTS = {
  // Original endpoints
  SAVE_PRESET: "/api/save-preset",
  ADD_CMMS: "/api/add-cmms",
  ADD_SCADA: "/api/add-scada",
  ADD_RESERVE: "/api/add-reserve",

  // New database-based preset endpoints
  GET_PRESETS_BY_MODEL: "/api/get-presets-by-model",
  SAVE_PRESET_TO_DB: "/api/save-preset-to-db",
  GET_PRESET_BY_INDEX: "/api/get-preset-by-index",
  DELETE_PRESET_FROM_DB: "/api/delete-preset-from-db",
  UPDATE_PRESET_LABEL: "/api/update-preset-label",
  GET_PRESET_COUNT: "/api/get-preset-count",

  // BIM endpoint (for reference)
  GET_BIM_BY_ID: "/api/get-bim-by-id",
};

export const FILE_PATHS = {
  STATUS: (model: string) => `/config/status/${model}_status.txt`,
  PRESET: (model: string) => `/config/preset/${model}_preset.txt`,
  RESERVE: (model: string) => `/config/reserve/${model}_reserve.txt`,
  SCADA: (model: string) => `/config/scada/${model}_scada.txt`,
  BIM: (model: string) => `/config/bim/${model}_bim.txt`,
};

// Database table names for each model
export const DB_TABLES = {
  PRESET: (model: string) => `${model}_preset`,
  BIM: (model: string) => `${model}_bim`,
  STATUS: (model: string) => `${model}_status`,
  SCADA: (model: string) => `${model}_scada`,
  RESERVE: (model: string) => `${model}_reserve`,
};

// Database schema reference for preset tables
export const PRESET_TABLE_SCHEMA = {
  id: "INTEGER PRIMARY KEY AUTOINCREMENT",
  model: "TEXT NOT NULL",
  preset_index: "INTEGER NOT NULL",
  label: "TEXT NOT NULL",
  position_x: "REAL NOT NULL",
  position_y: "REAL NOT NULL",
  position_z: "REAL NOT NULL",
  target_x: "REAL NOT NULL",
  target_y: "REAL NOT NULL",
  target_z: "REAL NOT NULL",
  zoom: "REAL NOT NULL",
  created_at: "DATETIME DEFAULT CURRENT_TIMESTAMP",
  updated_at: "DATETIME DEFAULT CURRENT_TIMESTAMP",
};
