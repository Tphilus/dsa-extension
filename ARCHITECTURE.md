# 🏛️ Codebase Architecture & Tour

Welcome to the **DSA AutoPush** codebase! If you are a new contributor looking to understand how this extension works under the hood, this document is for you.

This extension follows standard **Manifest V3** architecture. We use **React + TypeScript + TailwindCSS**, bundled using **Vite** and the **CRXJS** plugin.

Here is a step-by-step tour of how the codebase is structured and how data flows through the application.

---

## 1. High-Level Data Flow

When a user submits a solution on a platform (like LeetCode), here is exactly what happens:

1. **Content Script (`src/content/`)**: A script injected into the webpage detects the "Accepted" state, scrapes the code and metadata from the DOM, and fires a `SUBMISSION_CAPTURED` message.
2. **Background Worker (`src/background/`)**: The background service worker intercepts this message, estimates the time/space complexity, formats a README, and pushes the files to GitHub via the REST API.
3. **Chrome Storage (`src/utils/storage.ts`)**: The background worker saves a record of this successful push into `chrome.storage.local`.
4. **Popup UI (`src/popup/`)**: The user clicks the extension icon. The React application reads `chrome.storage`, sees the new submission, and updates the local streaks and dashboard charts.

---

## 2. Directory Breakdown

### 🖥️ `src/popup/` (The User Interface)
This folder holds the entire visual frontend of the extension. It acts like a standard single-page React application.
- **`main.tsx`**: The entry point. It mounts the React tree and sets up the `QueryClientProvider` for TanStack Query.
- **`App.tsx`**: The primary layout and dashboard. It handles two modes: the small 380px extension popup, and the full-page dashboard (triggered by clicking the expand icon). It relies heavily on `Recharts` for the analytics graphs.
- **`index.css`**: Configures TailwindCSS and custom scrollbars.

### 🧩 `src/components/` (UI Components)
This folder contains reusable React components to keep `App.tsx` clean and maintainable.
- **`AuthCard.tsx`**: The connection UI handling GitHub Personal Access Tokens and the connected/disconnected states.
- **`SubmissionRow.tsx`**: The UI mapping for rendering individual problem submissions in the recent history list.
- **`Field.tsx`**: A reusable UI wrapper for labeled form inputs.

### 🪝 `src/hooks/` (Data Fetching & State)
We use **TanStack Query (React Query)** to handle all asynchronous state and caching.
- **`useGithub.ts`**: Contains all queries and mutations for talking to the GitHub API (e.g., fetching the user's avatar, listing repositories, creating new repos).
- **`useStorage.ts`**: Bridges `chrome.storage` with React. It uses `onStorageChanged` listeners so that if the background worker saves a new submission, the React UI updates instantly without needing a manual refresh.

### ⚙️ `src/background/` (The Brain)
- **`background.ts`**: This is the service worker that runs invisibly in the browser. 
  - It listens for `chrome.runtime.onMessage` events.
  - It implements a **Deduplication Cache** (cleared every 30 seconds) to ensure that if a user accidentally spams the submit button, we don't push the code twice.
  - It maintains an **Offline Retry Queue** (`chrome.storage.local`) and uses `chrome.alarms` to automatically re-attempt pushes if the user hits a GitHub rate limit (`429`) or loses internet connection (`Failed to fetch`).
  - It uploads the source code file and the auto-generated `README.md` to GitHub sequentially to prevent API conflicts.

### 🕵️ `src/content/` (Platform Scrapers)
These scripts are injected directly into third-party websites. Because these websites are SPAs (Single Page Applications) and don't reload, the scripts usually use `MutationObserver` or poll the DOM to detect when a submission finishes.
- **`leetcode.ts`**: Scrapes problem titles, difficulty, and accepted code from LeetCode.
- **`hackerrank.ts`**: Scrapes data from HackerRank.
- **`codeforces.ts`**: Scrapes data from Codeforces.
> *Note: Content scripts are brittle. If LeetCode changes their CSS classes, these scripts must be updated to match!*

### 🛠️ `src/utils/` (Core Utilities)
- **`github.ts`**: A robust wrapper around the GitHub REST API. It includes a unified `githubFetch` function that automatically handles authentication, pagination (via `Link` headers), and throws specific `RateLimitError`s if GitHub returns a 429 status.
- **`complexity.ts`**: Contains the heuristic engine that statically analyzes a user's code to guess its Big-O Time and Space complexity (e.g., counting nested `for` loops).
- **`storage.ts`**: Strongly-typed wrappers for reading and writing to `chrome.storage.sync` (for the PAT token) and `chrome.storage.local` (for submission history).
- **`helpers.ts`**: Shared pure functions (like `normalizeLanguage`, `getLangIcon`, and platform labels) that are used across the background scripts and the React UI.
- **`constants.ts`**: Holds mapping configurations (e.g., turning a language string like "python3" into the correct file extension ".py").

---

## 3. Key Architectural Decisions

1. **No Backend**: This extension operates 100% locally. The user's Personal Access Token is saved in `chrome.storage.sync` and all API calls are made directly from the user's browser to GitHub. We have no servers, ensuring maximum privacy.
2. **Sequential GitHub Pushing**: The GitHub API (`/contents` endpoint) is used to push files. To prevent 409 API conflicts, we push the `solution` file and the `README.md` sequentially.
3. **Base64 Encoding**: GitHub requires files to be base64 encoded before pushing. We use a chunked byte-array technique in `github.ts` to encode large files extremely fast without blocking the browser's main thread.
4. **Resiliency & Auto-Resume**: Because network states fluctuate and GitHub imposes rate limits, we built an automatic retry mechanism. If a push fails with a `429 Too Many Requests`, we read the `X-RateLimit-Reset` header and schedule a precise `chrome.alarm` to wake the background script and flush the queue the exact second the ban is lifted.

## 4. Contributing Checklist

If you are adding support for a **new platform** (like GeeksForGeeks or CodeChef):
1. Create a new scraper file in `src/content/<platform>.ts`.
2. Add the URL matches to the `content_scripts` array in `manifest.json`.
3. Update the `Platform` type union in `src/utils/types.ts`.
4. Update the `PLATFORM_LABELS` dictionary in `src/utils/helpers.ts`.

Happy hacking! 🚀
