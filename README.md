<div align="center">
  <img src="src/assets/Logo_option_B.png" alt="DSA AutoPush Logo" width="150" />
  <h1>🚀 DSA AutoPush Extension</h1>
  <p><strong>A sleek Chrome extension that automatically synchronizes your competitive programming solutions to GitHub.</strong></p>

  <p>
    <a href="https://github.com/yourusername/dsa-extension/blob/main/LICENSE">
      <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" />
    </a>
    <a href="https://reactjs.org/">
      <img src="https://img.shields.io/badge/React-18.x-61dafb.svg?logo=react" alt="React" />
    </a>
    <a href="https://www.typescriptlang.org/">
      <img src="https://img.shields.io/badge/TypeScript-5.x-3178c6.svg?logo=typescript" alt="TypeScript" />
    </a>
  </p>
</div>

<br />

<div align="center">
  <img src="https://github.com/user-attachments/assets/9a2c8c00-d023-41a4-ba2a-528517fe30a8" width="100%" alt="Screenshot 1" />
</div>
<br />
<div align="center">
  <img src="https://github.com/user-attachments/assets/e0608662-65fd-44e1-8cef-7dd13cff32be" width="100%" alt="Screenshot 2" />
</div>
<br />
<div align="center">
  <img src="https://github.com/user-attachments/assets/7c3af20a-e4b6-48ee-9e7d-8a4b82f25932" width="23%" alt="Screenshot 3" />
  &nbsp;
  <img src="https://github.com/user-attachments/assets/c4b7ad45-d5d8-43fa-9c0b-300e707f4f15" width="23%" alt="Screenshot 4" />
  &nbsp;
  <img src="https://github.com/user-attachments/assets/19bf0352-e16e-4c51-88f5-dca2c0a3445a" width="23%" alt="Screenshot 5" />
  &nbsp;
  <img src="https://github.com/user-attachments/assets/9163998e-443e-4c84-84a9-d4d3bda60159" width="23%" alt="Screenshot 6" />
</div>

---

## 🧐 What does it do?

If you practice data structures and algorithms on platforms like **LeetCode**, **Codeforces**, or **HackerRank**, you know the importance of keeping a record of your solutions to build a strong portfolio. However, doing this manually copying your code, creating a new file on GitHub, writing a summary, and committing it is tedious and breaks your flow.
 
**DSA AutoPush** automates this entirely. 

Solve problems like you normally would. When your submission gets an **"Accepted"** verdict, this extension works quietly in the background to grab your code, format it, analyze its complexity, and save it directly to a dedicated GitHub repository.

---

## ✨ Features

- **Multi-Platform Support:** Works flawlessly with LeetCode, Codeforces, and HackerRank right out of the box.
- **Zero Manual Effort:** Just click "Submit". If it passes, the extension handles the rest without interrupting your focus.
- **Smart Organization:** Automatically creates neatly organized folders based on problem difficulty (`Easy`, `Medium`, `Hard`).
- **Comprehensive Documentation:** Doesn't just save code—it generates a robust `README.md` for every problem, complete with a link back to the source and the full problem description.
- **Offline & Rate-Limit Resiliency:** Never lose a submission. If you drop offline or hit GitHub's API rate limits, the extension intelligently queues your code and automatically resumes the exact second the block is lifted or connection restores.
- **Smart Alerts:** Proactively warns you exactly when your GitHub Token is about to expire, and notifies you if a platform changes their layout.
- **Complexity Analysis:** Automatically reads your code to estimate **Time and Space complexity** (e.g., `O(N)` or `O(1)`) and appends it to your notes.
- **Beautiful Dashboard:** Track your daily streak, view a visual map of your activity, and see your most-used programming languages directly from the extension popup.

---

## 📂 Repository Structure

When you submit a passing solution, the extension automatically organizes it in your GitHub repository using the following structure:
`[Platform] / [Difficulty] / [Problem Name]`

- **Platform:** The top-level folder is the platform you solved the problem on (e.g., `leetcode`, `hackerrank`, `codeforces`).
- **Difficulty Bucket:** The extension parses the difficulty rating from the platform to place it into one of three buckets: `Easy`, `Medium`, or `Hard`.
  - *Codeforces* uses a numeric rating system: Rating ≤ 1100 → `Easy`, Rating 1101 to 1900 → `Medium`, Rating > 1900 → `Hard`.
- **Problem Name:** It creates a specific folder for the problem itself. For LeetCode/HackerRank, it turns the title into a clean URL slug (e.g., "Two Sum" becomes `two-sum`). For Codeforces, it uses the contest ID and index (e.g., `158A-Next-Round`).

Inside each problem folder, it saves two files: your actual code (e.g., `solution.py`) and a generated `README.md` containing the full problem description and complexity analysis.

---

## 🛠️ Built With

This project is built with modern, developer-friendly web technologies. We chose these tools to ensure the extension is fast, reliable, and easy for anyone in the open-source community to jump in and contribute to:

- **[React](https://reactjs.org/) & [TypeScript](https://www.typescriptlang.org/):** We use React to build the interactive user interface (like the popup dashboard), and TypeScript to catch bugs early by ensuring our code is strictly typed.
- **[TailwindCSS](https://tailwindcss.com/):** A utility-first CSS framework that allows us to rapidly style the extension and keep the design sleek and responsive without writing custom CSS files.
- **[TanStack Query (React Query)](https://tanstack.com/query/latest):** Manages all of our asynchronous data fetching, GitHub API caching, and local storage synchronization seamlessly.
- **[Vite](https://vitejs.dev/) & [CRXJS](https://crxjs.dev/vite-plugin):** Vite is an incredibly fast build tool, and CRXJS is a Vite plugin that makes building Chrome Extensions as easy as building a standard web app.
- **[GitHub REST API](https://docs.github.com/en/rest):** This is the engine that allows the extension to securely authenticate and push your code files directly to your GitHub repository behind the scenes.

---

## 🚀 Getting Started

Since this is an open-source project, you can load it directly into your browser by following these steps:

### 1️⃣ Download & Build
1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/dsa-extension.git
   cd dsa-extension
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Build the extension:**
   ```bash
   npm run build
   ```

### 2️⃣ Add to Chrome
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **"Developer mode"** using the toggle switch in the top right corner.
3. Click the **"Load unpacked"** button in the top left.
4. Select the newly generated `dist` folder inside your project directory.
5. *🎉 The extension is now installed! Don't forget to pin it to your browser toolbar for easy access.*

### 3️⃣ Connect Your GitHub
1. Click the **DSA AutoPush** extension icon in your toolbar to open the dashboard.
2. Navigate to the **Settings** tab.
3. Paste a **GitHub Personal Access Token**. 
   > *Need one? Generate it in your [GitHub Developer Settings](https://github.com/settings/tokens) (ensure it has the `repo` scope).*
4. Enter the name of the repository where you want your code saved (e.g., `dsa-solutions`).
5. Click **Connect**, and you're ready to automate your coding journey!

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. **Fork** the project.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a **Pull Request** targeting the `develop` branch.

---

## 📄 License

This project is distributed under the MIT License. See the `LICENSE` file for more information.

<div align="center">
  <b>Happy Coding! 💻</b>
</div>
