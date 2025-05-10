# 🛡️ VibeSafe MCP Server 🛡️

This project implements an MCP (Model Context Protocol) server for the VibeSafe suite of security scanners.
It empowers Large Language Model (LLM) agents and AI-driven IDEs (like Cursor) to programmatically invoke security checks, bringing security directly into your development workflow!
This server is based on the original open-source VibeSafe project, which you can find at [https://github.com/slowcoder360/vibesafe](https://github.com/slowcoder360/vibesafe).

---

## 🚀 Project Structure

Here's a map of the project:

-   `src/`: 核心 The heart of the server!
    -   `index.ts`: 🏁 Main server entry point.
    -   `tools/`: 🛠️ MCP tool definitions (e.g., `secretScanTool.ts`).
    -   `scanners/`: 🔬 Core scanning logic adapted from the VibeSafe CLI.
-   `test-client.ts`: 🧪 A simple Node.js client for testing the MCP server and its tools.
-   `test-assets/`: 🧪 Contains files used for testing scanners (e.g., `dummy-secrets.txt`).
-   `vibeSafe/`: 📚 A local clone of the original VibeSafe CLI, used as a reference for scanner logic. (This directory is in `.gitignore`).
-   `.gitignore`: 🙈 Specifies intentionally untracked files by Git.
-   `package.json`: 📦 Project metadata, dependencies, and scripts.
-   `tsconfig.json`: ⚙️ TypeScript compiler configuration.
-   `README.md`: 📖 You are here! (Currently in `.gitignore` due to `*.md` rule).

---

## 🛠️ Setup & Installation

Get up and running in a few simple steps:

1.  **Clone the Repository** (if you haven't already):
    ```bash
    git clone <repository-url>
    cd vibeSafe-mcp
    ```
2.  **Install Dependencies**:
    This project uses npm to manage dependencies.
    ```bash
    npm install
    ```

---

## 🏗️ Build

Compile the TypeScript source code into JavaScript (output to `build/` directory):
```bash
npm run build
```

---

## 🖥️ Running the Server

To start the VibeSafe MCP server (it will listen for MCP messages on stdio):
```bash
npm run start
```
Alternatively, after a build, you can run:
```bash
node build/src/index.js
```

---

## ✅ Testing

We have a simple test client to verify server and tool functionality:

1.  **Ensure the server is NOT already running** (the test client spawns its own instance).
2.  **Run the Test Client**:
    This command will first build the project, then execute the test client.
    ```bash
    npm run test:client
    ```
    The client (`test-client.ts`) will:
    *   Spawn the MCP server.
    *   Connect to it.
    *   Call the `secret-scan` tool (currently configured to scan `test-assets/dummy-secrets.txt`).
    *   Print the results.
    *   Shut down the server.

---

**Note on `.gitignore`**: Currently, all `*.md` files (including this `README.md`) and the `test-assets/` directory are excluded from Git tracking. You might want to adjust these rules in the `.gitignore` file, for example, to commit this README and your test assets. 