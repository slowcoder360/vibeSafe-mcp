import fetch from 'node-fetch';

// A more specific interface can be defined as we identify necessary fields
export interface NpmPackageMetadata {
  name: string;
  description?: string;
  versions?: Record<string, any>; // Object with version strings as keys
  time?: {
    created: string;
    modified: string;
    [version: string]: string; // e.g., "1.0.0": "2023-01-01T12:00:00.000Z"
  };
  repository?: {
    type: string;
    url: string;
  } | string; // Allow repository to be a string URL directly
  homepage?: string;
  license?: string | { type: string, url: string };
  readme?: string;
  [key: string]: any; // Allow other properties
}

interface NpmErrorResponse {
  error?: string;
  [key: string]: any;
}

const NPM_REGISTRY_URL = 'https://registry.npmjs.org';

/**
 * Fetches package metadata from the npm registry.
 * @param packageName The name of the package to fetch.
 * @returns A promise that resolves to the package metadata.
 * @throws Throws an error if the fetch fails or the package is not found.
 */
export async function fetchPackageMetadata(packageName: string): Promise<NpmPackageMetadata> {
  if (!packageName || typeof packageName !== 'string' || packageName.trim() === '') {
    throw new Error('Package name must be a non-empty string.');
  }

  const encodedPackageName = encodeURIComponent(packageName);
  const url = `${NPM_REGISTRY_URL}/${encodedPackageName}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Package "${packageName}" not found in npm registry (404).`);
      }
      throw new Error(`Failed to fetch package metadata for "${packageName}". Status: ${response.status} ${response.statusText}`);
    }

    const metadata = await response.json() as NpmPackageMetadata;
    return metadata;
  } catch (error: any) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`An unexpected error occurred while fetching metadata for "${packageName}": ${String(error)}`);
  }
}

export interface NpmDownloadData {
  downloads: number;
  start: string;
  end: string;
  package: string;
  error?: string; // To capture any error messages from the API or our handling
}

const NPM_DOWNLOADS_API_URL = 'https://api.npmjs.org/downloads/point';

/**
 * Fetches package download counts from the npm API for a given period.
 * @param packageName The name of the package.
 * @param period The period for which to fetch downloads (e.g., 'last-month').
 * @returns A promise that resolves to the download data.
 */
export async function fetchPackageDownloads(
  packageName: string,
  period: 'last-day' | 'last-week' | 'last-month' = 'last-month'
): Promise<NpmDownloadData> {
  if (!packageName || typeof packageName !== 'string' || packageName.trim() === '') {
    throw new Error('Package name must be a non-empty string for fetching downloads.');
  }
  const encodedPackageName = encodeURIComponent(packageName);
  const url = `${NPM_DOWNLOADS_API_URL}/${period}/${encodedPackageName}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        let errorMessage = `Package or download data for "${packageName}" not found for period "${period}" (404).`;
        try {
            const errorData = await response.json() as NpmErrorResponse;
            if (errorData?.error) {
                errorMessage = `Error fetching downloads for "${packageName}" (${period}): ${errorData.error} (404).`;
            }
        } catch (e) { /* Ignore parsing error, use default message */ }
        return {
          downloads: 0,
          start: '',
          end: '',
          package: packageName,
          error: errorMessage
        };
      }
      throw new Error(`Failed to fetch downloads for "${packageName}". Status: ${response.status} ${response.statusText}`);
    }

    const downloadData = await response.json() as NpmDownloadData;
    return downloadData;
  } catch (error: any) {
    if (error instanceof Error) {
      if (error.message.includes('Package name must be a non-empty string')) throw error;
      throw new Error(`An unexpected error occurred while fetching downloads for "${packageName}": ${error.message}`);
    }
    throw new Error(`An unexpected error occurred while fetching downloads for "${packageName}": ${String(error)}`);
  }
} 