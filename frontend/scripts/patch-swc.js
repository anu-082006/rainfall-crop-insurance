/**
 * patch-swc.js
 *
 * Automatically patches Next.js SWC loader on Windows/Node 24 to resolve
 * @next/swc-wasm-nodejs correctly when native addons fail.
 *
 * Issue: Next.js loadWasmRawBindings converts '@next/swc-wasm-nodejs' to a relative
 * file:/// URL using pathToFileURL() instead of resolving it as a package in node_modules.
 *
 * This postinstall script ensures Next.js resolves @next/swc-wasm-nodejs via require.resolve()
 * in both development ('next dev') and production ('next build').
 */

const fs = require("fs");
const path = require("path");

const swcIndexPath = path.join(
  __dirname,
  "..",
  "node_modules",
  "next",
  "dist",
  "build",
  "swc",
  "index.js"
);

if (fs.existsSync(swcIndexPath)) {
  let content = fs.readFileSync(swcIndexPath, "utf8");

  if (!content.includes("pkgPath = require.resolve(pkg)")) {
    const target = "if (importPath) {\n                    // the import path must be exact when not in node_modules\n                    pkgPath = _path.default.join(importPath, pkg, 'wasm.js');\n                }";
    const replacement = "if (importPath) {\n                    // the import path must be exact when not in node_modules\n                    pkgPath = _path.default.join(importPath, pkg, 'wasm.js');\n                } else {\n                    try {\n                        pkgPath = require.resolve(pkg);\n                    } catch {}\n                }";

    if (content.includes(target)) {
      content = content.replace(target, replacement);
      fs.writeFileSync(swcIndexPath, content, "utf8");
      console.log("[patch-swc] Successfully patched Next.js SWC WebAssembly loader.");
    }
  } else {
    console.log("[patch-swc] Next.js SWC WebAssembly loader is already patched.");
  }
}
