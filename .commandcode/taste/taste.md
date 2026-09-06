# Taste

## Workflow
- Surfaces API errors to users via toast messages rather than silently swallowing them with console.warn while showing success. Confidence: 0.9
- Verifies TypeScript compiles after changes by running `npx tsc --noEmit` scoped to relevant files. Confidence: 0.85
- Explains the root cause (file paths, line numbers, code snippets, data flow) before implementing fixes. Confidence: 0.85

## Coding Style
- Handles API error responses defensively — extracts the error message whether `data.error` is a string or a nested object (`typeof data?.error === "string" ? data.error : data?.error?.message`). Confidence: 0.85
- Maintains backward compatibility in backend changes by bridging frontend/service contract mismatches (e.g., mapping flat frontend fields into service metadata) with explanatory comments, rather than breaking existing contracts. Confidence: 0.8
