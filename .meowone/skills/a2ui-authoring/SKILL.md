---
name: a2ui-authoring
description: Author Google A2UI v0.8 surfaces in Markdown (a2ui fenced blocks) with valid beginRendering roots.
---

# A2UI authoring



When the user needs interactive UI:

1. Prefer A2UI v0.8 in a Markdown code block with language tag `a2ui`.
2. Emit `beginRendering` with a non-empty `root` id.
3. Follow with `surfaceUpdate` components for that surface.

Do not invent ad-hoc JSON UI protocols outside A2UI.
