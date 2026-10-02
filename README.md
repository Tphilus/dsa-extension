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

---

## 🧐 What does it do?

If you practice data structures and algorithms on platforms like **LeetCode**, **Codeforces**, or **HackerRank**, you know the importance of keeping a record of your solutions to build a strong portfolio. However, doing this manually—copying your code, creating a new file on GitHub, writing a summary, and committing it—is tedious and breaks your flow.

**DSA AutoPush** automates this entirely. 

Solve problems like you normally would. When your submission gets an **"Accepted"** verdict, this extension works quietly in the background to grab your code, format it, analyze its complexity, and save it directly to a dedicated GitHub repository.

---

## ✨ Features

- **Multi-Platform Support:** Works flawlessly with LeetCode, Codeforces, and HackerRank right out of the box.
- **Zero Manual Effort:** Just click "Submit". If it passes, the extension handles the rest without interrupting your focus.
- **Smart Organization:** Automatically creates neatly organized folders based on problem difficulty (`Easy`, `Medium`, `Hard`).
- **Comprehensive Documentation:** Doesn't just save code—it generates a robust `README.md` for every problem, complete with a link back to the source and the full problem description.
- **Complexity Analysis:** Automatically reads your code to estimate **Time and Space complexity** (e.g., `O(N)` or `O(1)`) and appends it to your notes.
- **Beautiful Dashboard:** Track your daily streak, view a visual map of your activity, and see your most-used programming languages directly from the extension popup.

---

## 🛠️ Built With

Designed for performance and modern UI aesthetics, this extension leverages:
- **[React](https://reactjs.org/) & [TypeScript](https://www.typescriptlang.org/)** - For a robust, type-safe user interface.
- **[TailwindCSS](https://tailwindcss.com/)** - For sleek, responsive styling.
- **[Vite](https://vitejs.dev/) & [CRXJS](https://crxjs.dev/vite-plugin)** - To seamlessly bundle modern web tech into a Chrome Extension.
- **[GitHub REST API](https://docs.github.com/en/rest)** - For secure, seamless file uploads and commits.

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
5. Open a **Pull Request**.

---

## 📄 License

This project is distributed under the MIT License. See the `LICENSE` file for more information.

<div align="center">
  <b>Happy Coding! 💻</b>
</div>