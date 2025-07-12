export interface PresetData {
  id?: number;
  label: string;
  position: [number, number, number];
  target: [number, number, number];
  zoom: number;
  preset_index?: number;
}

export const API_URL = "/api";

export const MAX_PRESETS = 20;

export const PresetAPI = {
  async getAllPresets(model: string): Promise<{
    status: string;
    presets: (PresetData | null)[];
  }> {
    try {
      console.log(`🔧 PresetAPI.getAllPresets called with model: "${model}"`);

      const res = await fetch(`${API_URL}/get-presets-by-model`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model }),
      });

      if (!res.ok) {
        console.error("API getAllPresets failed:", res.status);
        return { status: "error", presets: Array(MAX_PRESETS).fill(null) };
      }

      const data = await res.json();
      console.log(`🔧 PresetAPI.getAllPresets response for "${model}":`, data);

      if (data.status !== "ok" || !Array.isArray(data.presets)) {
        console.error("Bad payload getAllPresets:", data);
        return { status: "error", presets: Array(MAX_PRESETS).fill(null) };
      }

      // 🔧 FIX: สร้าง array ขนาด MAX_PRESETS และใส่ข้อมูลตาม preset_index
      const presetsArray: (PresetData | null)[] = Array(MAX_PRESETS).fill(null);

      data.presets.forEach((row: any) => {
        const idx = parseInt(row.preset_index, 10);
        if (!isNaN(idx) && idx >= 0 && idx < MAX_PRESETS) {
          presetsArray[idx] = {
            id: row.id,
            label: row.label,
            position: [row.position_x, row.position_y, row.position_z],
            target: [row.target_x, row.target_y, row.target_z],
            zoom: row.zoom,
            preset_index: idx,
          };
        }
      });

      console.log(
        `🔧 Mapped ${data.presets.length} presets into ${MAX_PRESETS} slots for model "${model}"`
      );

      return { status: "ok", presets: presetsArray };
    } catch (error) {
      console.error("getAllPresets error:", error);
      return { status: "error", presets: Array(MAX_PRESETS).fill(null) };
    }
  },

  async loadPreset(
    model: string,
    index: number
  ): Promise<{
    status: string;
    preset?: PresetData | null;
  }> {
    try {
      console.log(
        `🔧 PresetAPI.loadPreset called with model: "${model}", index: ${index}`
      );

      const res = await fetch(`${API_URL}/get-preset-by-index`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, preset_index: index }),
      });

      if (res.status === 404) {
        // 🔧 FIX: ไม่ถือว่า 404 เป็น error ร้ายแรง
        console.log(
          `🔧 No preset found for model: "${model}", index: ${index} (this is normal)`
        );
        return { status: "not_found", preset: null };
      }

      if (!res.ok) {
        console.error("API loadPreset failed:", res.status);
        return { status: "error", preset: null };
      }

      const data = await res.json();
      console.log(
        `🔧 PresetAPI.loadPreset response for "${model}", index ${index}:`,
        data
      );

      if (data.status !== "ok" || !data.preset) {
        console.log("No preset data found, but this is normal for empty slots");
        return { status: "not_found", preset: null };
      }

      const row = data.preset;
      return {
        status: "ok",
        preset: {
          id: row.id,
          label: row.label,
          position: [row.position_x, row.position_y, row.position_z],
          target: [row.target_x, row.target_y, row.target_z],
          zoom: row.zoom,
          preset_index:
            typeof row.preset_index === "number" ? row.preset_index : index,
        },
      };
    } catch (error) {
      console.error("loadPreset error:", error);
      return { status: "error", preset: null };
    }
  },

  // 🔧 FIX: เพิ่ม savePreset method ที่ขาดหาย
  async savePreset(
    model: string,
    index: number,
    preset: PresetData
  ): Promise<{
    status: string;
    message?: string;
  }> {
    try {
      console.log(
        `🔧 PresetAPI.savePreset called with model: "${model}", index: ${index}`
      );

      const res = await fetch(`${API_URL}/save-preset-to-db`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          preset_index: index,
          label: preset.label,
          position_x: preset.position[0],
          position_y: preset.position[1],
          position_z: preset.position[2],
          target_x: preset.target[0],
          target_y: preset.target[1],
          target_z: preset.target[2],
          zoom: preset.zoom,
        }),
      });

      if (!res.ok) {
        console.error("API savePreset failed:", res.status);
        return { status: "error" };
      }

      const data = await res.json();
      console.log(
        `🔧 PresetAPI.savePreset response for "${model}", index ${index}:`,
        data
      );

      return { status: data.status, message: data.message };
    } catch (error) {
      console.error("savePreset error:", error);
      return { status: "error" };
    }
  },

  // 🔧 FIX: เพิ่ม deletePreset method ที่ขาดหาย
  async deletePreset(
    model: string,
    index: number
  ): Promise<{
    status: string;
    message?: string;
  }> {
    try {
      console.log(
        `🔧 PresetAPI.deletePreset called with model: "${model}", index: ${index}`
      );

      const res = await fetch(`${API_URL}/delete-preset-from-db`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          preset_index: index,
        }),
      });

      if (!res.ok) {
        console.error("API deletePreset failed:", res.status);
        return { status: "error" };
      }

      const data = await res.json();
      console.log(
        `🔧 PresetAPI.deletePreset response for "${model}", index ${index}:`,
        data
      );

      return { status: data.status, message: data.message };
    } catch (error) {
      console.error("deletePreset error:", error);
      return { status: "error" };
    }
  },

  // 🔧 FIX: เพิ่ม updatePresetLabel method ที่ขาดหาย
  async updatePresetLabel(
    model: string,
    index: number,
    label: string
  ): Promise<{
    status: string;
    message?: string;
  }> {
    try {
      console.log(
        `🔧 PresetAPI.updatePresetLabel called with model: "${model}", index: ${index}, label: "${label}"`
      );

      const res = await fetch(`${API_URL}/update-preset-label`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          preset_index: index,
          label,
        }),
      });

      if (!res.ok) {
        console.error("API updatePresetLabel failed:", res.status);
        return { status: "error" };
      }

      const data = await res.json();
      console.log(
        `🔧 PresetAPI.updatePresetLabel response for "${model}", index ${index}:`,
        data
      );

      return { status: data.status, message: data.message };
    } catch (error) {
      console.error("updatePresetLabel error:", error);
      return { status: "error" };
    }
  },

  // 🔧 FIX: เพิ่ม getPresetCount method สำหรับการตรวจสอบ
  async getPresetCount(model: string): Promise<{
    status: string;
    count?: number;
  }> {
    try {
      console.log(`🔧 PresetAPI.getPresetCount called with model: "${model}"`);

      const res = await fetch(`${API_URL}/get-preset-count`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model }),
      });

      if (!res.ok) {
        console.error("API getPresetCount failed:", res.status);
        return { status: "error" };
      }

      const data = await res.json();
      console.log(`🔧 PresetAPI.getPresetCount response for "${model}":`, data);

      return { status: data.status, count: data.count };
    } catch (error) {
      console.error("getPresetCount error:", error);
      return { status: "error" };
    }
  },
};
