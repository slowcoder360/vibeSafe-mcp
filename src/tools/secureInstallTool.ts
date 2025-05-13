import { z } from 'zod';
import { spawn } from 'child_process';
import { 
  checkPackageAge, 
  checkDownloadVolume, 
  checkReadmePresence, 
  checkLicensePresence, 
  checkRepositoryPresence,
  HeuristicWarning 
} from '../installer/heuristicChecks.js';
import { 
  fetchPackageMetadata, 
  fetchPackageDownloads 
} from '../installer/npmRegistryClient.js';

// Input schema - just needs package name
export const secureInstallToolSchema = z.object({
  packageName: z.string().describe('Name of the npm package to install'),
  yes: z.boolean().optional().describe('If true, automatically answer yes to prompts and proceed with installation despite warnings. Agent should set this after user confirmation.'),
});

// Format warnings into a clear markdown report
function formatWarnings(warnings: HeuristicWarning[], packageName: string): string {
  if (warnings.length === 0) {
    // This message might need to be split or handled differently now, as installation happens conditionally.
    return `✅ Package "${packageName}" passed all security checks.`; 
  }

  let report = `## ⚠️ Security Warnings for "${packageName}":\n\n`;
  warnings.forEach(warning => {
    report += `*   **${warning.type}** (${warning.severity}): ${warning.message}\n`;
  });
  // Instruct the agent on how to confirm if the user agrees
  report += `\n❓ To proceed with the installation of "${packageName}" despite these warnings, call this tool again with the parameter yes: true.`;
  return report;
}

// Main tool handler
export async function secureInstallToolHandler(
  inputs: z.infer<typeof secureInstallToolSchema>
): Promise<{ content: { type: 'text'; text: string }[] }> {
  const { packageName, yes } = inputs; 
  let outputText = '';
  // let installOutputStatus = ''; // We can manage output more directly

  try {
    console.log(`[SecureInstallTool] Analyzing package: ${packageName}, yes: ${yes}`);
    
    const metadata = await fetchPackageMetadata(packageName);
    const downloadData = await fetchPackageDownloads(packageName);

    const warnings: HeuristicWarning[] = [
      checkPackageAge(metadata),
      checkDownloadVolume(packageName, downloadData),
      checkReadmePresence(metadata),
      checkLicensePresence(metadata),
      checkRepositoryPresence(metadata)
    ].filter((warning): warning is HeuristicWarning => warning !== null);

    if (warnings.length === 0) {
      // No warnings, proceed to install directly
      outputText = `✅ Package "${packageName}" passed all security checks.\n`;
      try {
        const installMessage = await installPackage(packageName);
        outputText += `\n${installMessage}`;
      } catch (installError: any) {
        outputText += `\n❌ Error during installation: ${installError.message}`;
      }
    } else {
      // Warnings are present
      if (yes) {
        outputText = `⚠️ Warnings were previously noted for "${packageName}", but proceeding with installation as requested (yes: true).\n\nOriginal Warnings:\n`;
        warnings.forEach(warning => {
          outputText += `*   **${warning.type}** (${warning.severity}): ${warning.message}\n`;
        });
        outputText += '\n'; // Add a newline before installation attempt message
        try {
          const installMessage = await installPackage(packageName);
          outputText += `\n${installMessage}`;
        } catch (installError: any) {
          outputText += `\n❌ Error during installation: ${installError.message}`;
        }
      } else {
        // Warnings present, and no confirmation (yes flag is not true). Display warnings and instruct agent.
        outputText = formatWarnings(warnings, packageName); 
      }
    }
  } catch (error: any) {
    console.error(`[SecureInstallTool] Error processing package ${packageName}:`, error);
    outputText = `❌ Error processing package "${packageName}": ${error.message}`;
  }

  return {
    content: [{ type: 'text', text: outputText }],
  };
}

// Helper function to run npm install
async function installPackage(packageName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log(`[SecureInstallTool] Attempting to install package: ${packageName}`);
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm'; // Handle Windows
    const child = spawn(npmCmd, ['install', packageName], { stdio: 'pipe' });

    let stdoutData = '';
    let stderrData = '';

    if (child.stdout) {
      child.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });
    }
    if (child.stderr) {
      child.stderr.on('data', (data) => {
        stderrData += data.toString();
      });
    }

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`[SecureInstallTool] Successfully installed package: ${packageName}`);
        resolve(`Successfully installed "${packageName}".\nOutput:\n${stdoutData}`);
      } else {
        console.error(`[SecureInstallTool] Failed to install package: ${packageName}. Exit code: ${code}`);
        reject(new Error(`npm install failed with code ${code}.\nStderr:\n${stderrData}\nStdout:\n${stdoutData}`));
      }
    });

    child.on('error', (error) => {
      console.error(`[SecureInstallTool] Error spawning npm process for package: ${packageName}`, error);
      reject(new Error(`Failed to start npm install process: ${error.message}`));
    });
  });
} 