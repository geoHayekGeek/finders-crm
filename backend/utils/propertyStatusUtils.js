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

module.exports = {
  CLOSURE_STATUS_ID_SUBQUERY,
  CLOSURE_STATUS_REQUIRED_ERROR,
  isClosureStatus,
  isClosureStatusSql,
};
