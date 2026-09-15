import { execFile } from "child_process";

/**
 * True if git ignores `filePath`. `git check-ignore` exits 0 when ignored and
 * 1 when not. Any other outcome (not a git repo, git missing) means the file
 * can't be committed by accident, so it is treated as safe.
 */
export function isPathIgnored(filePath: string, cwd: string = process.cwd()): Promise<boolean> {
  return new Promise((resolve) => {
    execFile("git", ["check-ignore", "-q", filePath], { cwd }, (error) => {
      if (!error) {
        resolve(true);
        return;
      }
      resolve((error as { code?: unknown }).code !== 1);
    });
  });
}
