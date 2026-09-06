const ROLES = Object.freeze({
  NORMAL_USER: "NORMAL_USER",
  STORE_OWNER: "STORE_OWNER",
  SYSTEM_ADMINISTRATOR: "SYSTEM_ADMINISTRATOR",
});

const ROLE_LABELS = Object.freeze({
  [ROLES.NORMAL_USER]: "Normal User",
  [ROLES.STORE_OWNER]: "Store Owner",
  [ROLES.SYSTEM_ADMINISTRATOR]: "System Administrator",
});

function getRoleLabel(role) {
  return ROLE_LABELS[role] || role;
}

export { getRoleLabel, ROLE_LABELS, ROLES };
