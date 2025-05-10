import fs from 'fs/promises';
import path from 'path';

// Define severity levels consistently (copied from original vibeSafe/src/scanners/dependencies.ts)
export type FindingSeverity = 'Info' | 'None' | 'Low' | 'Medium' | 'High' | 'Critical';

// Define types for findings (adapted from original vibeSafe/src/scanners/secrets.ts)
export interface SecretFinding {
  file: string;
  line: number;
  type: string; // e.g., 'AWS Key', 'Generic API Key', 'High Entropy String'
  value: string; // The matched secret or high-entropy string
  severity: FindingSeverity; // Using the shared severity type directly
}

// --- Entropy Calculation ---

/**
 * Calculates the Shannon entropy of a string.
 * @param str The input string.
 * @returns The Shannon entropy value (in bits per character).
 */
function calculateShannonEntropy(str: string): number {
  if (!str) {
    return 0;
  }
  const charCounts: { [key: string]: number } = {};
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    charCounts[char] = (charCounts[char] || 0) + 1;
  }

  let entropy = 0;
  const len = str.length;
  for (const char in charCounts) {
    const probability = charCounts[char] / len;
    entropy -= probability * Math.log2(probability);
  }

  return entropy;
}

// Configuration for entropy scanning
const MIN_ENTROPY_THRESHOLD = 4.0;
const MIN_STRING_LENGTH_FOR_ENTROPY = 20;
const ENTROPY_CANDIDATE_REGEX = /[a-zA-Z0-9\/+=]{20,}/g;

// --- Regex Patterns ---
const secretPatterns: Array<{ type: string; pattern: RegExp; severity: FindingSeverity }> = [
  { type: 'AWS Access Key ID', pattern: /AKIA[0-9A-Z]{16}/g, severity: 'High' },
  { type: 'AWS Secret Access Key', pattern: /(?<![A-Za-z0-9\/+=])[A-Za-z0-9\/+=]{40}(?![A-Za-z0-9\/+=])/g, severity: 'High' },
  { type: 'Generic API Key', pattern: /[aA][pP][iI]_?[kK][eE][yY]\s*[:=]\s*['"]?[a-zA-Z0-9\-_]{16,}['"]?/g, severity: 'Medium' },
  // TODO: Add more patterns: JWT, SSH keys, etc. from original VibeSafe if needed
];

/**
 * Scans a single file for secrets based on regex patterns and entropy analysis.
 * Special handling for .env files to downgrade severity to Info.
 * @param filePath The path to the file to scan.
 * @returns An array of SecretFinding objects.
 */
async function scanFileForSecrets(filePath: string): Promise<SecretFinding[]> {
  const findings: SecretFinding[] = [];
  const isEnvFile = /\.env($|\.)/.test(path.basename(filePath));

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((lineContent, index) => {
      const lineNumber = index + 1;

      secretPatterns.forEach(({ type, pattern, severity }) => {
        let match;
        pattern.lastIndex = 0; 
        while ((match = pattern.exec(lineContent)) !== null) {
          findings.push({
            file: filePath,
            line: lineNumber,
            type: isEnvFile ? 'Local Environment Secret' : type,
            value: match[0],
            severity: isEnvFile ? 'Info' : severity,
          });
        }
      });

      if (!isEnvFile) {
        let entropyMatch;
        ENTROPY_CANDIDATE_REGEX.lastIndex = 0;
        while ((entropyMatch = ENTROPY_CANDIDATE_REGEX.exec(lineContent)) !== null) {
          const candidate = entropyMatch[0];
          const alreadyFound = findings.some(f => f.line === lineNumber && f.value === candidate);
          if (alreadyFound) continue;

          if (candidate.length >= MIN_STRING_LENGTH_FOR_ENTROPY) {
            const entropy = calculateShannonEntropy(candidate);
            if (entropy >= MIN_ENTROPY_THRESHOLD) {
              findings.push({
                file: filePath,
                line: lineNumber,
                type: 'High Entropy String',
                value: candidate,
                severity: 'Low', // Entropy findings often need review
              });
            }
          }
        }
      }
    });
  } catch (error: any) {
    // For ENOENT or EACCES, we might want to log or report differently, but not crash.
    // For now, console.warn is a reasonable default for server-side, or a silent ignore.
    if (error.code === 'ENOENT') {
      console.warn(`[SecretScanner] File not found: ${filePath}`);
    } else if (error.code === 'EACCES') {
      console.warn(`[SecretScanner] Permission denied: ${filePath}`);
    } else {
      console.error(`[SecretScanner] Error reading file ${filePath}:`, error);
      // Optionally rethrow or return an error indicator if critical
    }
  }
  return findings;
}

/**
 * Recursively scans a directory for secrets.
 * @param dirPath The directory to scan.
 * @param allFindings Accumulated findings (used in recursion).
 * @returns A promise that resolves to an array of SecretFinding objects.
 */
async function walkDirectory(dirPath: string, ignorePatterns: RegExp[] = []): Promise<string[]> {
  let filesToScan: string[] = [];
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (ignorePatterns.some(pattern => pattern.test(fullPath))) {
        continue;
      }
      if (entry.isDirectory()) {
        // TODO: Add .vibesafeignore logic here or pass ignore patterns down
        if (entry.name === 'node_modules' || entry.name === '.git') continue; // Simple ignores
        filesToScan = filesToScan.concat(await walkDirectory(fullPath, ignorePatterns));
      } else if (entry.isFile()) {
        filesToScan.push(fullPath);
      }
    }
  } catch (error) {
      console.error(`[SecretScanner] Error reading directory ${dirPath}:`, error);
  }
  return filesToScan;
}

/**
 * Scans a directory for secrets, including subdirectories.
 * @param basePath The base path (directory or single file) to scan.
 * @returns An array of SecretFinding objects.
 */
export async function scanPathForSecrets(basePath: string): Promise<SecretFinding[]> {
  let allFindings: SecretFinding[] = [];
  try {
    const stats = await fs.stat(basePath);
    let filesToScan: string[] = [];

    if (stats.isFile()) {
      filesToScan.push(basePath);
    } else if (stats.isDirectory()) {
      // Basic ignore for node_modules and .git for now.
      // Full .vibesafeignore support would be more complex here.
      const ignorePatterns = [/node_modules\//, /\.git\//]; 
      filesToScan = await walkDirectory(basePath, ignorePatterns.map(p => new RegExp(p)));
    } else {
      console.warn(`[SecretScanner] Path is not a file or directory: ${basePath}`);
      return [];
    }

    for (const filePath of filesToScan) {
      const findings = await scanFileForSecrets(filePath);
      allFindings = allFindings.concat(findings);
    }
  } catch (error: any) {
      if (error.code === 'ENOENT') {
          console.warn(`[SecretScanner] Path not found: ${basePath}`);
      } else {
          console.error(`[SecretScanner] Error accessing path ${basePath}:`, error);
      }
      return []; // Return empty if base path itself is an issue
  }
  return allFindings;
} 