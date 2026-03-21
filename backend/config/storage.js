/**
 * Centralized storage paths for user-generated files (Railway volume at /data by default).
 * Public URL paths (/assets/..., /uploads/...) stay the same; only filesystem roots change.
 */
const path = require('path');
const fs = require('fs');

const DATA_ROOT = path.resolve(
  process.env.DATA_DIR || process.env.STORAGE_ROOT || '/data'
);

/** Legacy build-time public folder (for migration fallbacks when deleting old files) */
const LEGACY_PUBLIC_ROOT = path.join(__dirname, '..', 'public');

const paths = {
  /** Root for persisted uploads (volume mount target) */
  dataRoot: DATA_ROOT,
  /** Property main + gallery images → URL prefix /assets/properties/ */
  assetsProperties: path.join(DATA_ROOT, 'assets', 'properties'),
  /** All uploads under /uploads (Express static) */
  uploadsRoot: path.join(DATA_ROOT, 'uploads'),
  /** Logo / favicon → URL prefix /uploads/branding/ */
  uploadsBranding: path.join(DATA_ROOT, 'uploads', 'branding'),
  /** HR user documents (not publicly static-served; API download only) */
  documentsUsers: path.join(DATA_ROOT, 'documents', 'users'),
};

const DIRS_TO_ENSURE = [
  paths.assetsProperties,
  paths.uploadsBranding,
  paths.documentsUsers,
];

function ensureStorageDirs() {
  for (const dir of DIRS_TO_ENSURE) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

/**
 * Map a web path stored in DB (e.g. /uploads/branding/logo.png) to the file on disk under DATA_ROOT.
 */
function resolveUrlPathToFilesystem(webPath) {
  if (!webPath || typeof webPath !== 'string') return null;
  const trimmed = webPath.trim().replace(/^\/+/, '');
  if (!trimmed) return null;
  return path.join(DATA_ROOT, ...trimmed.split(/[/\\]+/).filter(Boolean));
}

/**
 * Resolve a stored URL path for deletion: try volume path first, then legacy public/ copy.
 * Returns absolute path to delete, or null if nothing to remove.
 */
function resolveFilePathForDeletion(webPath) {
  const primary = resolveUrlPathToFilesystem(webPath);
  if (primary && fs.existsSync(primary)) return primary;
  const legacy = path.join(LEGACY_PUBLIC_ROOT, ...String(webPath).trim().replace(/^\/+/, '').split(/[/\\]+/).filter(Boolean));
  if (legacy && fs.existsSync(legacy)) return legacy;
  return null;
}

module.exports = {
  DATA_ROOT,
  LEGACY_PUBLIC_ROOT,
  paths,
  ensureStorageDirs,
  resolveUrlPathToFilesystem,
  resolveFilePathForDeletion,
};
