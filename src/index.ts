import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { secretScanToolSchema, secretScanToolHandler } from "./tools/secretScanTool.js";
import { secureInstallToolSchema, secureInstallToolHandler } from "./tools/secureInstallTool.js";

// MCP Protocol Version: This server aims to be compatible with a version aligning with @modelcontextprotocol/sdk usage,
// typically reflecting recent standards like "2025-03-26" or as implied by the SDK version itself.

async function main() {
  const server = new McpServer({
    name: "VibeSafeServer",
    version: "0.1.0",
    // protocolVersion: "2025-03-26", // Not a direct option in McpServer constructor based on current SDK docs, handled by SDK version.
  });

  // TODO: Register tools here
  // server.tool(...);
  server.tool(
    'secret-scan',
    "Scans a given file or directory path for secrets (API keys, high entropy strings, etc.).",
    secretScanToolSchema.shape,
    secretScanToolHandler
  );

  server.tool(
    'secure-install',
    "Securely installs an npm package after running security checks.",
    secureInstallToolSchema.shape,
    secureInstallToolHandler
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("VibeSafe MCP Server connected via stdio.");
}

main().catch(error => {
  console.error("Failed to start VibeSafe MCP Server:", error);
  process.exit(1);
}); 