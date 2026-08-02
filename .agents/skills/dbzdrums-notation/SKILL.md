---
name: dbzdrums-notation
description: Use when working with the installed @dbzdrums/notation package; consult its version-matched public API documentation before writing integration code.
---

1. Locate the installed package with:

   ```sh
   node -p "require.resolve('@dbzdrums/notation/package.json')"
   ```

2. Treat the directory containing the resolved `package.json` as the package root and open `docs/public-api/index.md` from that root.
3. Read the relevant installed documentation before using the library.
4. Prioritize documentation from the installed version over model memory, web documentation, or external examples.
5. Inspect source code only when the installed documentation is absent or demonstrably insufficient.
