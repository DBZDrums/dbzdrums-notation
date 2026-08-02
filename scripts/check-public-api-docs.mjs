import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const checkedInReference = join(repositoryRoot, "docs/public-api/reference");
const temporaryRoot = mkdtempSync(join(tmpdir(), "dbzdrums-notation-docs-"));
const generatedReference = join(temporaryRoot, "reference");
const require = createRequire(import.meta.url);

function listFiles(root) {
  const files = [];

  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = join(directory, entry.name);
      if (entry.isDirectory()) visit(absolutePath);
      else if (entry.isFile()) files.push(relative(root, absolutePath));
    }
  }

  if (statSync(root, { throwIfNoEntry: false })?.isDirectory()) visit(root);
  return files.sort();
}

try {
  const typedocPackagePath = require.resolve("typedoc/package.json");
  const typedocPackage = JSON.parse(readFileSync(typedocPackagePath, "utf8"));
  const typedocBin = typeof typedocPackage.bin === "string"
    ? typedocPackage.bin
    : typedocPackage.bin.typedoc;
  const generation = spawnSync(
    process.execPath,
    [
      resolve(dirname(typedocPackagePath), typedocBin),
      "--options",
      join(repositoryRoot, "typedoc.json"),
      "--out",
      generatedReference,
    ],
    { cwd: repositoryRoot, stdio: "inherit" },
  );

  if (generation.status !== 0) process.exitCode = generation.status ?? 1;
  else {
    const expectedFiles = listFiles(checkedInReference);
    const generatedFiles = listFiles(generatedReference);
    const sameFileList = expectedFiles.length === generatedFiles.length &&
      expectedFiles.every((file, index) => file === generatedFiles[index]);
    const changedFiles = sameFileList
      ? expectedFiles.filter((file) =>
          !readFileSync(join(checkedInReference, file)).equals(
            readFileSync(join(generatedReference, file)),
          ))
      : [];

    if (!sameFileList || changedFiles.length > 0) {
      console.error("Generated public API reference is out of date.");
      if (!sameFileList) {
        console.error("Checked-in files:", expectedFiles);
        console.error("Generated files:", generatedFiles);
      }
      if (changedFiles.length > 0) console.error("Changed files:", changedFiles);
      console.error("Run `npm run docs:generate` and commit the result.");
      process.exitCode = 1;
    } else {
      console.log("Generated public API reference is up to date.");
    }
  }
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
