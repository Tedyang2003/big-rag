"use strict";

// Makes the installed plugin folder correct, in the two ways `lms dev --install` gets wrong.
//
// It copies IN what the installer leaves out: a runtime data file imported by no module, so
// the bundler never sees it. Without eng.traineddata beside the plugin, tesseract.js fetches
// it from the network on the first OCR run.
//
// And it deletes what the installer brings along: `lms dev --install` copies the whole project
// folder minus git-ignored paths, so the evaluation sets, the architecture docs and the build
// toolchain all land in a folder that only ever runs one bundled file.
//
// What may go is settled by two facts, not by taste. `.lmstudio/production.js` is a complete
// bundle - it requires node builtins and the declared runtime packages, and nothing under
// src/ - and LM Studio's own installed plugin carries no typescript, no esbuild and no @types
// even though it declares @types/node, so dev dependencies are not loaded at runtime. src/,
// tsconfig.json, package-lock.json and README.md stay because that reference layout keeps
// them: this prunes the folder, it does not redesign it.
//
// Pass --dry-run to print what would go without touching anything.

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { execFileSync } = require("node:child_process");

const dryRun = process.argv.includes("--dry-run");
const projectRoot = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(projectRoot, "manifest.json"), "utf8"));

const installDir = path.join(
    os.homedir(),
    ".lmstudio",
    "extensions",
    "plugins",
    manifest.owner,
    manifest.name,
);

if (!fs.existsSync(installDir)) {
    console.error(`[prepare-install] Install directory not found: ${installDir}`);
    console.error(`[prepare-install] Run "lms dev --install -y" first.`);
    process.exit(1);
}

// Project material the plugin never reads. Everything here is either documentation, an
// evaluation corpus, a test fixture or a dev-side script - `scripts/` included, since this
// file runs from the repository and not from the install.
const UNUSED = [
    "documentation",
    "docs",
    "eval",
    "test-fixtures",
    "scripts",
    "EXAMPLES.md",
    "QUICKSTART.md",
    "TESTING.md",
    "GAPS.md",
    "REGROUND.md",
];

function sizeOf(target) {
    const stat = fs.statSync(target);
    if (!stat.isDirectory()) return stat.size;
    let total = 0;
    for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
        total += sizeOf(path.join(target, entry.name));
    }
    return total;
}

function mb(bytes) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Copied FIRST, because it is the only part of this script the plugin cannot run without.
// Everything below is housekeeping that reclaims disk, and housekeeping that throws must not
// be able to leave the install missing its OCR data - which is what happens when the copy goes
// last and `npm prune` hits a file LM Studio holds open.
const asset = "eng.traineddata";
if (dryRun) {
    console.log(`[prepare-install] would copy ${asset}`);
} else {
    const dest = path.join(installDir, asset);
    fs.copyFileSync(path.join(projectRoot, asset), dest);
    console.log(`[prepare-install] copied ${asset} -> ${dest}`);
}

let reclaimed = 0;

for (const name of UNUSED) {
    const target = path.join(installDir, name);
    if (!fs.existsSync(target)) continue;
    const bytes = sizeOf(target);
    reclaimed += bytes;
    if (dryRun) {
        console.log(`[prepare-install] would remove ${name} (${mb(bytes)})`);
        continue;
    }
    fs.rmSync(target, { recursive: true, force: true });
    console.log(`[prepare-install] removed ${name} (${mb(bytes)})`);
}

// npm decides what a dev dependency pulls in - esbuild alone brings a platform binary under
// its own name - so this prunes by the lockfile rather than by a list of names kept in step
// by hand. `npm prune` only deletes; it installs nothing and reaches no network.
const modules = path.join(installDir, "node_modules");
if (fs.existsSync(modules)) {
    const before = sizeOf(modules);
    if (dryRun) {
        console.log(`[prepare-install] would prune dev dependencies from node_modules (${mb(before)})`);
    } else {
        // A prune that fails is a smaller install we did not get, not a broken one: LM Studio
        // never loads a dev dependency, so leaving them in place costs disk and nothing else.
        // Worth a warning, not an exit - the install above is already usable.
        try {
            // Through a shell on Windows, where npm is a .cmd shim that execFileSync cannot
            // launch directly. Node warns that a shell leaves arguments unescaped; both of
            // these are fixed literals, so there is nothing here to escape.
            execFileSync("npm", ["prune", "--omit=dev"], {
                cwd: installDir,
                stdio: "inherit",
                shell: process.platform === "win32",
            });
            // npm removes the package and leaves the scope directory, so @esbuild survives as
            // an empty folder. Scopes only, and only when empty - a scope still holding a
            // package is holding one npm decided to keep.
            for (const entry of fs.readdirSync(modules, { withFileTypes: true })) {
                if (!entry.isDirectory() || !entry.name.startsWith("@")) continue;
                const scope = path.join(modules, entry.name);
                if (fs.readdirSync(scope).length === 0) fs.rmdirSync(scope);
            }
            const after = sizeOf(modules);
            reclaimed += before - after;
            console.log(`[prepare-install] pruned node_modules: ${mb(before)} -> ${mb(after)}`);
        } catch (error) {
            console.warn(
                `[prepare-install] could not prune dev dependencies (${error.message.split("\n")[0]}); ` +
                    `the install works, it is just ${mb(before)} of node_modules.`,
            );
        }
    }
}

console.log(
    `[prepare-install] ${dryRun ? "would reclaim" : "reclaimed"} ${mb(reclaimed)}; ` +
        `installed plugin is now ${mb(sizeOf(installDir))}`,
);
