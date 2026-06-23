function sanitizeFilenamePart(value, fallback = 'Report') {
  const raw = String(value ?? fallback);
  const ascii = raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  return ascii || fallback;
}

function buildAttachmentFilename(prefix, parts, extension) {
  const safeParts = (Array.isArray(parts) ? parts : [parts])
    .filter(part => part !== undefined && part !== null && String(part).trim() !== '')
    .map(part => sanitizeFilenamePart(part));

  const safePrefix = sanitizeFilenamePart(prefix, 'Report');
  const safeExtension = String(extension || '').replace(/[^a-zA-Z0-9]/g, '');
  const body = [safePrefix, ...safeParts].join('_') || 'Report';
  return safeExtension ? `${body}.${safeExtension}` : body;
}

module.exports = {
  buildAttachmentFilename,
  sanitizeFilenamePart
};
