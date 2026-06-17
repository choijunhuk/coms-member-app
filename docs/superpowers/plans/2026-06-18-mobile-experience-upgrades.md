# Mobile Experience Upgrades Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the mobile app clearer during polls, slow sync, offline use, and push-token registration failures.

**Architecture:** Keep API contracts unchanged and add small pure utilities for poll rows, network banner text, and push-token retry behavior. UI components consume those utilities without introducing new dependencies.

**Tech Stack:** React, Vite, TanStack Query, Capacitor, Node contract tests.

---

### Task 1: Poll Result Detail Rows

**Files:**
- Create: `src/utils/pollResults.js`
- Create: `tests/memberExperience.test.mjs`
- Modify: `src/screens/community/PollBlock.jsx`
- Modify: `src/styles.css`

- [x] **Step 1: Write the failing test**

```js
const rows = pollResultRows(block, result)
assert.deepEqual(rows.map((row) => row.percent), [75, 25])
```

- [x] **Step 2: Run test to verify it fails**

Run: `node tests/memberExperience.test.mjs`
Expected: FAIL with missing utility module.

- [x] **Step 3: Implement poll utility**

Return row labels, image URLs, counts, percents, selected state, and leading state.

- [x] **Step 4: Wire UI**

Render progress bars, selected badges, leading badges, and stable count text.

- [x] **Step 5: Verify**

Run: `node tests/memberExperience.test.mjs`.

### Task 2: Network And Push Resilience

**Files:**
- Create: `src/utils/networkStatus.js`
- Create: `src/utils/pushRegistration.js`
- Modify: `src/components/OfflineBanner.jsx`
- Modify: `src/App.jsx`
- Modify: `package.json`

- [x] **Step 1: Write the failing test**

```js
assert.equal(networkBannerMessage({ online: true, slow: true }), '동기화가 지연되고 있습니다. 현재 화면은 최근 저장된 내용일 수 있습니다.')
```

- [x] **Step 2: Run test to verify it fails**

Run: `node tests/memberExperience.test.mjs`
Expected: FAIL with missing utility module.

- [x] **Step 3: Implement utilities**

Add network banner copy and recoverable push-token registration retry.

- [x] **Step 4: Wire UI**

Pass slow dashboard sync state into `OfflineBanner` and use retry during push registration.

- [x] **Step 5: Verify**

Run: `npm test`, `npm run lint`, `npm run build`, `npm run cap:sync`.
