const CLOSURE_STATUS_REQUIRED_ERROR =
  'Properties with a closure status must have a closed_date set. Please provide a closed_date.';

const CLOSURE_STATUS_ID_SUBQUERY =
  'SELECT id FROM statuses WHERE COALESCE(is_closure_status, FALSE) = TRUE';

function isClosureStatus(status) {
  return status?.is_closure_status === true;
}

function isClosureStatusSql(alias = 'statuses') {
  return `COALESCE(${alias}.is_closure_status, FALSE) = TRUE`;
}

function getDefaultStatusFromRows(statuses = []) {
  if (!Array.isArray(statuses) || statuses.length === 0) {
    return null;
  }

  return (
    statuses.find((status) => status?.is_default_status === true && status?.is_active !== false) ||
    null
  );
}

function getDefaultStatusIdFromRows(statuses = []) {
  return getDefaultStatusFromRows(statuses)?.id ?? null;
}

module.exports = {
  CLOSURE_STATUS_ID_SUBQUERY,
  CLOSURE_STATUS_REQUIRED_ERROR,
  getDefaultStatusFromRows,
  getDefaultStatusIdFromRows,
  isClosureStatus,
  isClosureStatusSql,
};
