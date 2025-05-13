# VibeSafe MCP Server

Part of the **VibeSafe OSS Stack**, this MCP (Model Context Protocol) server allows AI agents and LLM-powered IDEs like **Cursor** to run real-time security scans on your codebase.

Built using the official [Model Context Protocol SDK](https://modelcontextprotocol.io), this server exposes VibeSafe's security tools as callable functions LLMs can invoke — automatically or at the user's direction.

## ✨ Features

The following tools are available or planned:

- 🔐 `secret-scan` – Detects hardcoded secrets like AWS keys, JWTs, SSH keys, and .env leaks
- 🛡️ `secure-install` – Prevents slopsquatting/typosquatting by analyzing npm packages before install
- 📦 `vuln-scan` – Checks dependencies against the [OSV.dev](https://osv.dev) vulnerability database (Coming Soon)
- ⚙️ `config-scan` – Detects insecure flags like `DEBUG=true` or permissive CORS in JSON/YAML configs (Coming Soon)
- 🌐 `http-timeout-scan` – Warns on missing timeouts in axios, fetch, got, etc. (Coming Soon)
- 📤 `upload-scan` – Validates file upload handlers for size/type checks (Multer, Formidable, etc.) (Coming Soon)
- 🔎 `endpoint-scan` – Flags exposed routes like `/admin`, `/debug`, `/metrics` (Coming Soon)
- 🚫 `rate-limit-check` – Heuristically checks for missing API rate limits (Coming Soon)
- 🪵 `logging-scan` – Warns on improper or sensitive logging (e.g., full error stacks, credentials) (Coming Soon)

## ⚙️ Install

```bash
git clone https://github.com/slowcoder360/vibeSafe-mcp.git
cd vibeSafe-mcp
npm install
```
## ▶️ Run Locally
To run as an MCP server with standard I/O:

```bash
npm run start
```
If you're using Cursor, add the following to your .cursor/config.json:

```json
{
  "mcpServers": {
    "vibesafe": {
      "command": "npm",
      "args": ["run", "start"],
      "cwd": "/absolute/path/to/vibeSafe-mcp"
    }
  }
}
```
## 🧠 AI IDE Support
This server works with any IDE or client that supports Model Context Protocol, including:

- Cursor
- Claude Desktop (Anthropic)
- Open-source LLM agents with MCP support

## 📦 Part of the VibeSafe OSS Stack
VibeSafe is an open-source devtool focused on AI-safe coding and automated security analysis. Other tools in the stack include:

- vibesafe (npm CLI)
- vibesafe-py (Python CLI)
- VS Code extension (coming soon)
- MCP server (this repo)

## License
MIT License

## Contributing
Open an issue or pull request if you have a new tool idea, fix, or feedback!

"Ship fast. Stay safe." – The VibeSafe OSS Stack 