# FlowForge Testing Guide & Quality Checklist

FlowForge uses automated regression testing (via Vitest), typecheck validation (`tsc -b`), linting (`oxlint`), and production build auditing.

---

## 1. Running Automated Tests

Run the full automated test suite:
```bash
npm test
```

Run in watch mode during development:
```bash
npm run test:watch
```

Run linter (zero warnings policy):
```bash
npm run lint
```

Run TypeScript strict build check:
```bash
npx tsc -b
```

Run production Vite build:
```bash
npm run build
```

Verify everything in a single pre-commit command:
```bash
npm test -- --run && npm run lint && npx tsc -b && npm run build
```

---

## 2. Automated Test Suite Matrix (66 Tests)

| Test File | Tests | Focus Area |
|---|---|---|
| `packages/shared/engine/src/__tests__/engine.test.ts` | 16 | TopoSort, Kahn's cycle detection, filter, join, dedup, groupby, type coercion, null handling |
| `packages/shared/engine/src/__tests__/edge-cases.test.ts` | 13 | 100k scale stress tests, Unicode/emoji safety, all-null columns, SCD Types 0–6 |
| `src/__tests__/trigger-api.test.ts` | 5 | `/api/trigger` rate limiting (60 req/min), SHA-256 token hashing, live DAG execution |
| `src/__tests__/preview-db.test.ts` | 8 | SSRF protection (loopback, RFC1918, metadata block), read-only query enforcer |
| `src/__tests__/e2e-parity.test.ts` | 1 | 100% parity assertion between client browser runner and `/api/trigger` on 10k dataset |
| `src/utils/__tests__/file-parser.test.ts` | 8 | Quoted commas, duplicate headers (`name_2`), blank headers (`column_1`), empty files |
| `src/utils/__tests__/csv-export.test.ts` | 5 | CSV injection escaping (`=`, `+`, `-`, `@`), quote doubling, comma wrapping |
| `src/utils/__tests__/pipeline-yaml.test.ts` | 5 | 100KB YAML size limit, arbitrary code sanitization, roundtrip schema validation |
| `src/utils/__tests__/pipeline-validator.test.ts` | 5 | Pre-flight graph check: missing source, disconnected nodes, join branch count |

---

## 3. Manual Testing Checklist

| Step | Verification Procedure | Expected Result |
|---|---|---|
| **1. Cycle Detection** | Create nodes A → B → C → A on canvas and click Run | Run is blocked, alert banner shows exact cycle path (`A → B → C → A`), offending edges pulse red. |
| **2. CSV Upload** | Upload CSV with duplicate column headers (e.g. `name,age,name`) | Column headers automatically re-aliased to `name, age, name_2`; full data retained for execution. |
| **3. CSV Injection** | Export data containing formula cells like `=cmd\|' /C calc'!A0` | Exported CSV prefixes cell with `'` to prevent spreadsheet formula execution. |
| **4. YAML Import** | Import YAML containing malicious payload like `fetch('evil.com')` | Import succeeds but dangerous calls are neutralized with `/* BLOCKED: fetch */`. |
| **5. Offline Mode** | Disconnect Wi-Fi or set Network tab to Offline | Persistent amber banner notifies user: "You are currently working offline". Edits remain cached. |
| **6. Error Boundary** | Trigger an intentional render error | Graceful recovery screen displayed with error description and "Reload Workspace" button; never blank screen. |
| **7. Webhook Trigger** | Open Webhook modal, click "Send Test Webhook" | Real DAG execution returns actual latency in ms (never a static "5ms"), real execution ID, and transformed records. |
| **8. DB Preview** | Attempt database connection to `127.0.0.1` or `169.254.169.254` | Rejected immediately with `SSRF_BLOCKED` before opening any socket. |
