const LEAD_ROLE_VALUES = new Set(['buyer', 'seller', 'both']);

function normalizeLeadRole(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.toLowerCase().trim();
  return LEAD_ROLE_VALUES.has(normalized) ? normalized : null;
}

function isTruthyLeadRole(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function getLeadRoleFromFlags(isBuyer, isSeller) {
  const buyer = isTruthyLeadRole(isBuyer);
  const seller = isTruthyLeadRole(isSeller);

  if (buyer && seller) return 'both';
  if (buyer) return 'buyer';
  if (seller) return 'seller';
  return null;
}

function buildLeadRoleWhereClause(role, tableAlias = 'l') {
  const normalizedRole = normalizeLeadRole(role);

  if (!normalizedRole) {
    return '';
  }

  if (normalizedRole === 'buyer') {
    return ` AND ${tableAlias}.is_buyer = TRUE`;
  }

  if (normalizedRole === 'seller') {
    return ` AND ${tableAlias}.is_seller = TRUE`;
  }

  return ` AND ${tableAlias}.is_buyer = TRUE AND ${tableAlias}.is_seller = TRUE`;
}

module.exports = {
  buildLeadRoleWhereClause,
  getLeadRoleFromFlags,
  isTruthyLeadRole,
  normalizeLeadRole,
};
