// src/utils/storage.js
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

const STORAGE_KEY = "permiplan_v2_data";

// Default initial state for a new profile
export const createNewProfile = (name) => ({
  id: Date.now(),
  name: name || "Nouveau Profil",
  startDate: new Date().toISOString().split("T")[0],
  refYear: new Date().getFullYear() + 1,
  targetWaveDate: "",
  holidays: [
    { id: 1, name: "Aïd el-Fitr", date: "2026-03-20" },
    { id: 2, name: "Aïd al-Adha", date: "2026-05-27" },
  ],
  blocks: [
    { id: 1, type: "TRAVAIL", duration: 45 },
    { id: 2, type: "PERMISSION", duration: 15 },
    { id: 3, type: "TRAVAIL", duration: 45 },
  ],
});

// Load all data or migrate from v1
export const loadAllData = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);

    // Migration from v1 (your old localStorage keys)
    const oldStart = localStorage.getItem("startDate");
    if (oldStart) {
      const migratedProfile = {
        ...createNewProfile("Mon Profil"),
        startDate: JSON.parse(oldStart),
        refYear: JSON.parse(localStorage.getItem("refYear") || "2026"),
        targetWaveDate: JSON.parse(
          localStorage.getItem("targetWaveDate") || '""',
        ),
        holidays: JSON.parse(localStorage.getItem("holidays") || "[]"),
        blocks: JSON.parse(localStorage.getItem("blocks") || "[]"),
      };
      return { profiles: [migratedProfile], activeId: migratedProfile.id };
    }

    // Fresh install
    const firstProfile = createNewProfile("Principal");
    return { profiles: [firstProfile], activeId: firstProfile.id };
  } catch {
    const p = createNewProfile("Principal");
    return { profiles: [p], activeId: p.id };
  }
};

export const saveData = (data) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

// EXPORT TO FILE (ANDROID COMPATIBLE)
export const exportBackup = async (data) => {
  const fileName = `permiplan-backup-${new Date().toISOString().split("T")[0]}.json`;
  const fileData = JSON.stringify(data, null, 2);

  try {
    // 1. Write file to Cache
    const result = await Filesystem.writeFile({
      path: fileName,
      data: fileData,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });

    // 2. Share the file (User chooses where to save)
    await Share.share({
      title: "Sauvegarde PermiPlan",
      text: "Voici ta sauvegarde PermiPlan",
      url: result.uri,
      dialogTitle: "Sauvegarder le fichier JSON",
    });
  } catch (e) {
    console.error("Backup error", e);
    // Fallback for Web
    const blob = new Blob([fileData], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
  }
};
