# Mobile Community Trust Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make deleted-post transparency available in the standalone mobile member app without turning the app into an admin console.

**Architecture:** Reuse the new COMS website member-safe deletion APIs from the mobile client, expose the records in `ProfileTab`, and map deletion notifications to the profile surface. Keep the app inside its member-facing scope.

**Tech Stack:** React 19, Vite, Capacitor 8, Node tests.

---

### Task 1: Mobile API and Routing Contract

**Files:**
- Modify: `src/services/communityApi.js`
- Modify: `src/utils/mobileRoutes.js`
- Test: `tests/mobileRoutes.test.mjs`
- Test: `tests/communityTrust.test.mjs`

- [ ] Write failing tests for deletion notification routing and restore-appeal API calls.
- [ ] Add `listMyDeletedCommunityPosts` and `appealDeletedCommunityPost`.
- [ ] Route `COMMUNITY_POST_DELETED` to the profile tab and keep restored-post notifications opening restored posts.

### Task 2: Mobile Profile UI

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/screens/ProfileTab.jsx`
- Modify: `src/styles.css`

- [ ] Load deleted records after login and pass them to `ProfileTab`.
- [ ] Render a compact “삭제된 내 글” section with deletion reason, moderator, restored state, and restore request action.
- [ ] Run `npm test`, `npm run lint`, `npm run build`, and `npm run cap:sync`.

