// scripts/migrate-threescene.js
/**
 * Migration script to help refactor ThreeScene.tsx
 * Run with: node scripts/migrate-threescene.js
 */

const fs = require("fs");
const path = require("path");

// Directory structure to create
const directories = [
  "types",
  "lib/utils",
  "lib/constants",
  "hooks",
  "components/three-scene",
];

// Files to create with their content
const files = {
  "types/three-scene.types.ts": "// Add types from artifacts",
  "lib/utils/three-helpers.ts": "// Add three-helpers from artifacts",
  "lib/utils/geometry-utils.ts": "// Add geometry-utils from artifacts",
  "lib/utils/animation-utils.ts": "// Add animation-utils from artifacts",
  "hooks/useThreeSceneCore.ts": "// Add useThreeSceneCore from artifacts",
  "hooks/useIFCLoader.ts": "// Add useIFCLoader from artifacts",
  "hooks/useCameraControl.ts": "// Add useCameraControl from artifacts",
  "hooks/useObjectSelection.ts": "// Add useObjectSelection from artifacts",
  "hooks/useBlacklistManager.ts": "// Add useBlacklistManager from artifacts",
  "hooks/useVisualEffects.ts": "// Add useVisualEffects from artifacts",
  "hooks/usePresetManager.ts": "// Add usePresetManager from artifacts",
  "hooks/useEventHandlers.ts": "// Add useEventHandlers from artifacts",
  "components/three-scene/InfoOverlay.tsx": "// Add InfoOverlay from artifacts",
  "lib/constants/three-scene.constants.ts": "// Add constants from artifacts",
};

// Index files for clean exports
const indexFiles = {
  "types/index.ts": "export * from './three-scene.types';",
  "lib/utils/index.ts":
    "export * from './three-helpers';\nexport * from './geometry-utils';\nexport * from './animation-utils';",
  "hooks/index.ts":
    "export * from './useThreeSceneCore';\n// ... other exports",
  "components/three-scene/index.ts":
    "export { default as ThreeScene } from '../ThreeScene';\nexport { default as InfoOverlay } from './InfoOverlay';",
  "lib/constants/index.ts": "export * from './three-scene.constants';",
};

function createDirectories() {
  console.log("📁 Creating directories...");
  directories.forEach((dir) => {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`✅ Created: ${dir}`);
    } else {
      console.log(`⏭️  Already exists: ${dir}`);
    }
  });
}

function createPlaceholderFiles() {
  console.log("\n📄 Creating placeholder files...");
  Object.entries(files).forEach(([filePath, content]) => {
    const fullPath = path.join(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) {
      fs.writeFileSync(fullPath, content);
      console.log(`✅ Created: ${filePath}`);
    } else {
      console.log(`⏭️  Already exists: ${filePath}`);
    }
  });
}

function createIndexFiles() {
  console.log("\n📋 Creating index files...");
  Object.entries(indexFiles).forEach(([filePath, content]) => {
    const fullPath = path.join(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) {
      fs.writeFileSync(fullPath, content);
      console.log(`✅ Created: ${filePath}`);
    } else {
      console.log(`⏭️  Already exists: ${filePath}`);
    }
  });
}

function backupOriginalFile() {
  console.log("\n💾 Backing up original ThreeScene.tsx...");
  const originalPath = path.join(process.cwd(), "components/ThreeScene.tsx");
  const backupPath = path.join(
    process.cwd(),
    "components/ThreeScene.original.tsx"
  );

  if (fs.existsSync(originalPath) && !fs.existsSync(backupPath)) {
    fs.copyFileSync(originalPath, backupPath);
    console.log("✅ Backup created: components/ThreeScene.original.tsx");
  } else if (fs.existsSync(backupPath)) {
    console.log("⏭️  Backup already exists");
  } else {
    console.log("⚠️  Original file not found");
  }
}

function showNextSteps() {
  console.log("\n🎉 Directory structure created successfully!");
  console.log("\n📋 Next steps:");
  console.log("1. Copy code from artifacts to the placeholder files");
  console.log("2. Update imports in existing components");
  console.log("3. Test each hook individually");
  console.log("4. Replace ThreeScene.tsx with refactored version");
  console.log("5. Run tests to ensure everything works");
  console.log("\n📚 Files to update:");
  Object.keys(files).forEach((file) => {
    console.log(`   - ${file}`);
  });
  console.log("\n💡 Pro tip: Use search & replace to update imports:");
  console.log('   Old: import { safeGetExpressId } from "../utils"');
  console.log('   New: import { safeGetExpressId } from "@/lib/utils"');
}

// Run migration
function main() {
  console.log("🚀 Starting ThreeScene.tsx refactoring migration...\n");

  try {
    createDirectories();
    createPlaceholderFiles();
    createIndexFiles();
    backupOriginalFile();
    showNextSteps();
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };

// package.json script addition:
// "scripts": {
//   "migrate:threescene": "node scripts/migrate-threescene.js"
// }
