const { normalizeRole } = require('./roleUtils');

const REDACTED_PROPERTY_REFERRAL_FIELDS = [
  'reference_number',
  'location',
  'property_type',
  'price',
  'status_id',
  'status_name',
  'status_color',
  'main_image',
  'category_name',
  'category_code',
  'building_name'
];

const REDACTED_LEAD_REFERRAL_FIELDS = [
  'customer_name',
  'phone_number',
  'notes'
];

function isRecipientAwaitingApproval(referral, viewerId, viewerRole) {
  if (!referral || viewerId == null) {
    return false;
  }

  if (normalizeRole(viewerRole) === 'admin') {
    return false;
  }

  const recipientId = referral.referred_to_agent_id ?? referral.referred_to_user_id ?? null;
  if (recipientId == null) {
    return false;
  }

  const adminStatus = referral.admin_status || 'approved';
  return Number(recipientId) === Number(viewerId) && adminStatus !== 'approved';
}

function buildVisibilityState(referral, viewerId, viewerRole) {
  if (isRecipientAwaitingApproval(referral, viewerId, viewerRole)) {
    return 'awaiting_admin_approval';
  }

  if ((referral.admin_status || 'approved') === 'rejected') {
    return 'declined_by_admin';
  }

  return 'visible';
}

function redactReferral(referral, fieldsToHide, viewerId, viewerRole) {
  const visibilityState = buildVisibilityState(referral, viewerId, viewerRole);
  const isRedacted = visibilityState === 'awaiting_admin_approval';

  if (!isRedacted) {
    return {
      ...referral,
      admin_status: referral.admin_status || 'approved',
      visibility_state: visibilityState,
      is_redacted_for_admin_approval: false
    };
  }

  const redacted = { ...referral };
  fieldsToHide.forEach((field) => {
    if (field in redacted) {
      redacted[field] = null;
    }
  });

  return {
    ...redacted,
    admin_status: referral.admin_status || 'approved',
    visibility_state: visibilityState,
    is_redacted_for_admin_approval: true
  };
}

function sanitizePropertyReferralsForViewer(referrals = [], viewerId, viewerRole) {
  return (Array.isArray(referrals) ? referrals : []).map((referral) =>
    redactReferral(referral, REDACTED_PROPERTY_REFERRAL_FIELDS, viewerId, viewerRole)
  );
}

function sanitizeLeadReferralsForViewer(referrals = [], viewerId, viewerRole) {
  return (Array.isArray(referrals) ? referrals : []).map((referral) =>
    redactReferral(referral, REDACTED_LEAD_REFERRAL_FIELDS, viewerId, viewerRole)
  );
}

module.exports = {
  buildVisibilityState,
  isRecipientAwaitingApproval,
  sanitizeLeadReferralsForViewer,
  sanitizePropertyReferralsForViewer
};
