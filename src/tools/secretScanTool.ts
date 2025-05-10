import { z } from 'zod';
import { scanPathForSecrets, SecretFinding } from '../scanners/secretScanner';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'; // Needed for McpServer.Tool type if used explicitly

// Define the input schema for the secret-scan tool
export const secretScanToolSchema = z.object({
  path: z.string().optional().describe('Optional directory or file path to scan. Defaults to current working directory.'),
});

// Utility function to format findings into Markdown
function formatSecretFindings(findings: SecretFinding[], targetPath: string): string {
  if (findings.length === 0) {
    return `✅ No secrets found in ${targetPath}.`;
  }

  let report = `## Secrets found in ${targetPath}:\\n\\n`;
  findings.forEach(finding => {
    report += `*   **File:** \`${finding.file}\` (Line: ${finding.line})\\n`;
    report += `    *   **Type:** ${finding.type}\\n`;
    report += `    *   **Severity:** ${finding.severity}\\n`;
    report += `    *   **Value:** \`\`\`${finding.value}\`\`\`\\n\\n`;
  });
  return report;
}

// Define the tool handler function
export async function secretScanToolHandler(
  inputs: z.infer<typeof secretScanToolSchema>
): Promise<{ content: { type: 'text'; text: string }[] }>
{
  const targetPath = inputs.path ?? process.cwd();
  let outputText = '';

  try {
    console.log(`[SecretScanTool] Starting scan for path: ${targetPath}`);
    const findings = await scanPathForSecrets(targetPath);
    outputText = formatSecretFindings(findings, targetPath);
    console.log(`[SecretScanTool] Scan completed. Found ${findings.length} potential secrets.`);
  } catch (error: any) {
    console.error(`[SecretScanTool] Error during secret scan for ${targetPath}:`, error);
    outputText = `Error during secret scan for ${targetPath}: ${error.message}`;
    return {
      content: [{ type: 'text', text: outputText }],
      // Consider adding an isError flag or specific error content type if MCP supports it
    };
  }

  return {
    content: [{ type: 'text', text: outputText }],
  };
}

// Example of how it might be registered (actual registration in src/index.ts)
/*
export const registerSecretScanTool = (server: McpServer) => {
  server.tool(
    'secret-scan',
    secretScanToolSchema,
    secretScanToolHandler
  );
};
*/

// Placeholder for secret scan MCP tool
// export {}; // Removing this line as the file now has actual exports. 