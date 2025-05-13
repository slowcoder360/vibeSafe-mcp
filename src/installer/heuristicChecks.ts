import { NpmPackageMetadata } from './npmRegistryClient.js';

export interface HeuristicWarning {
  type: 'PackageAge' | 'DownloadCount' | 'ReadmePresence' | 'LicensePresence' | 'RepositoryPresence';
  message: string;
  details?: any;
  severity: 'Low' | 'Medium' | 'High';
}

const DEFAULT_MAX_PACKAGE_AGE_DAYS = 30;

/**
 * Checks if the package was published recently.
 */
export function checkPackageAge(
  metadata: NpmPackageMetadata,
  maxAgeDays: number = DEFAULT_MAX_PACKAGE_AGE_DAYS
): HeuristicWarning | null {
  if (!metadata.time?.created) {
    return null;
  }

  try {
    const createdDate = new Date(metadata.time.created);
    const currentDate = new Date();
    const ageInMillis = currentDate.getTime() - createdDate.getTime();
    const ageInDays = ageInMillis / (1000 * 60 * 60 * 24);

    if (ageInDays < 0) {
      return null;
    }

    if (ageInDays <= maxAgeDays) {
      return {
        type: 'PackageAge',
        message: `Package "${metadata.name}" was published recently (on ${createdDate.toLocaleDateString()}).`,
        details: {
          publishedDate: metadata.time.created,
          ageInDays: Math.floor(ageInDays),
          thresholdDays: maxAgeDays,
        },
        severity: 'Medium',
      };
    }
  } catch (error) {
    return null;
  }

  return null;
}

const DEFAULT_MIN_DOWNLOADS_LAST_MONTH = 50;

/**
 * Checks if the package has very low download volume.
 */
export function checkDownloadVolume(
  packageName: string,
  downloadData: { downloads: number; error?: string; start?: string; end?: string },
  minDownloads: number = DEFAULT_MIN_DOWNLOADS_LAST_MONTH
): HeuristicWarning | null {
  if (downloadData.downloads < minDownloads) {
    let message = `Package "${packageName}" has very low popularity `;
    message += `(only ${downloadData.downloads} downloads in the last period queried).`;
    
    if (downloadData.error) {
        message += ` Note: There was an issue fetching complete download data: ${downloadData.error}`;
    }

    return {
      type: 'DownloadCount',
      message: message,
      details: {
        downloads: downloadData.downloads,
        threshold: minDownloads,
        period: 'last-month',
        fetchError: downloadData.error
      },
      severity: 'Medium',
    };
  }

  return null;
}

const KNOWN_README_PLACEHOLDERS = [
  'no readme data',
  'no readme found',
  'this package does not have a readme',
  'readme not found',
  'missing readme'
];
const MIN_README_LENGTH = 50;

/**
 * Checks if the package has a non-trivial README.
 */
export function checkReadmePresence(
  metadata: NpmPackageMetadata
): HeuristicWarning | null {
  const readmeContent = metadata.readme;

  if (readmeContent === null || readmeContent === undefined) {
    return {
      type: 'ReadmePresence',
      message: `Package "${metadata.name}" is missing a README file.`,
      details: { reason: 'README field is null or undefined' },
      severity: 'Low',
    };
  }

  const trimmedReadme = String(readmeContent).trim();

  if (trimmedReadme === '') {
    return {
      type: 'ReadmePresence',
      message: `Package "${metadata.name}" has an empty README.`,
      details: { reason: 'README is an empty string after trimming' },
      severity: 'Low',
    };
  }

  const lowercasedReadme = trimmedReadme.toLowerCase();
  for (const placeholder of KNOWN_README_PLACEHOLDERS) {
    if (lowercasedReadme.includes(placeholder)) {
      return {
        type: 'ReadmePresence',
        message: `Package "${metadata.name}" has a placeholder README (e.g., "${placeholder}").`,
        details: { reason: 'README content matches known placeholder', matchedPlaceholder: placeholder },
        severity: 'Low',
      };
    }
  }

  if (trimmedReadme.length < MIN_README_LENGTH) {
    return {
      type: 'ReadmePresence',
      message: `Package "${metadata.name}" has a very short README (length: ${trimmedReadme.length} chars).`,
      details: {
        reason: 'README content is shorter than minimum threshold',
        length: trimmedReadme.length,
        threshold: MIN_README_LENGTH,
      },
      severity: 'Low',
    };
  }

  return null;
}

/**
 * Checks if the package has a license specified.
 */
export function checkLicensePresence(
  metadata: NpmPackageMetadata
): HeuristicWarning | null {
  let licenseInfo: string | { type: string; url?: string } | undefined | null = undefined;
  let foundIn = 'unknown';

  const latestVersionTag = metadata['dist-tags']?.latest;
  if (latestVersionTag && metadata.versions?.[latestVersionTag]) {
    licenseInfo = metadata.versions[latestVersionTag].license;
    foundIn = `versions['${latestVersionTag}'].license`;
  }

  if (licenseInfo === undefined && metadata.license !== undefined) {
    licenseInfo = metadata.license;
    foundIn = 'metadata.license (top-level)';
  }

  if (licenseInfo === null || licenseInfo === undefined) {
    return {
      type: 'LicensePresence',
      message: `Package "${metadata.name}" does not specify a license.`,
      details: { reason: 'License field is null or undefined', pathChecked: foundIn },
      severity: 'Low',
    };
  }

  if (typeof licenseInfo === 'string') {
    if (licenseInfo.trim() === '') {
      return {
        type: 'LicensePresence',
        message: `Package "${metadata.name}" has an empty string for its license type.`,
        details: { reason: 'License string is empty', pathChecked: foundIn, value: licenseInfo },
        severity: 'Low',
      };
    }
  } else if (typeof licenseInfo === 'object') {
    if (!licenseInfo.type || typeof licenseInfo.type !== 'string' || licenseInfo.type.trim() === '') {
      return {
        type: 'LicensePresence',
        message: `Package "${metadata.name}" has a license object without a valid type specified.`,
        details: { reason: 'License object missing or has empty type property', pathChecked: foundIn, value: licenseInfo },
        severity: 'Low',
      };
    }
  } else {
    return {
      type: 'LicensePresence',
      message: `Package "${metadata.name}" has an unexpected format for its license information.`,
      details: { reason: 'License field is not a string or recognized object', pathChecked: foundIn, value: licenseInfo },
      severity: 'Low',
    };
  }

  return null;
}

/**
 * Checks if the package has a repository or homepage URL specified.
 */
export function checkRepositoryPresence(
  metadata: NpmPackageMetadata
): HeuristicWarning | null {
  let hasValidRepositoryUrl = false;
  let hasValidHomepageUrl = false;

  const repoField = metadata.repository;
  if (repoField) {
    if (typeof repoField === 'string') {
      const trimmedRepoString = repoField.trim().toLowerCase();
      if (trimmedRepoString.startsWith('http')) {
        hasValidRepositoryUrl = true;
      }
    } else if (typeof repoField === 'object' && repoField.url) {
      const repoUrlValue = repoField.url;
      if (typeof repoUrlValue === 'string') {
        const trimmedRepoUrl = repoUrlValue.trim().toLowerCase();
        if (trimmedRepoUrl.startsWith('http')) {
          hasValidRepositoryUrl = true;
        }
      }
    }
  }

  const homepageField = metadata.homepage;
  if (typeof homepageField === 'string') {
    const trimmedHomepage = homepageField.trim().toLowerCase();
    if (trimmedHomepage.startsWith('http')) {
      hasValidHomepageUrl = true;
    }
  }

  if (!hasValidRepositoryUrl && !hasValidHomepageUrl) {
    return {
      type: 'RepositoryPresence',
      message: `Package "${metadata.name}" does not seem to have a valid repository or homepage URL specified.`,
      details: {
        reason: 'Neither repository.url nor homepage provided a valid-looking URL.',
        repositoryField: metadata.repository,
        homepageField: metadata.homepage,
      },
      severity: 'Low',
    };
  }

  return null;
} 