const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

function validateName(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return 'Name is required.';
  }

  const nameLength = value.trim().length;
  if (nameLength < 20) {
    return 'Name must be at least 20 characters.';
  }
  if (nameLength > 60) {
    return 'Name must be no more than 60 characters.';
  }

  return null;
}

function validateStoreName(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return 'Name is required.';
  }

  const nameLength = value.trim().length;
  if (nameLength < 20) {
    return 'Name must be at least 20 characters.';
  }
  if (nameLength > 60) {
    return 'Name must be no more than 60 characters.';
  }

  return null;
}

function validateEmail(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return 'Email is required.';
  }

  return EMAIL_PATTERN.test(value.trim())
    ? null
    : 'Enter a valid email address.';
}

function validateAddress(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return 'Address is required.';
  }

  return value.length <= 400
    ? null
    : 'Address must be no more than 400 characters.';
}

function validatePassword(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return 'Password is required.';
  }
  if (value.length < 8 || value.length > 16) {
    return 'Password must be 8–16 characters.';
  }
  if (!/[A-Z]/.test(value)) {
    return 'Password must include at least 1 uppercase letter.';
  }
  if (!/[^A-Za-z0-9\s]/.test(value)) {
    return 'Password must include at least 1 special character.';
  }

  return null;
}

function validateRating(value) {
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    return 'Rating must be an integer from 1 to 5.';
  }

  return null;
}

function resultFromErrors(errors, values) {
  return {
    valid: Object.keys(errors).length === 0,
    errors,
    values,
  };
}

function validateSignupPayload(payload) {
  const body = payload && typeof payload === 'object' ? payload : {};
  const errors = {};
  const values = {
    name: typeof body.name === 'string' ? body.name.trim() : '',
    email: typeof body.email === 'string' ? normalizeEmail(body.email) : '',
    address: typeof body.address === 'string' ? body.address.trim() : '',
    password: typeof body.password === 'string' ? body.password : '',
  };

  const fieldValidators = {
    name: validateName,
    email: validateEmail,
    address: validateAddress,
    password: validatePassword,
  };

  Object.entries(fieldValidators).forEach(([field, validator]) => {
    const error = validator(body[field]);
    if (error) {
      errors[field] = error;
    }
  });

  if (Object.prototype.hasOwnProperty.call(body, 'role')) {
    errors.role = 'Role cannot be supplied during public signup.';
  }

  return resultFromErrors(errors, values);
}

function validateLoginPayload(payload) {
  const body = payload && typeof payload === 'object' ? payload : {};
  const errors = {};
  const values = {
    email: typeof body.email === 'string' ? normalizeEmail(body.email) : '',
    password: typeof body.password === 'string' ? body.password : '',
  };

  const emailError = validateEmail(body.email);
  if (emailError) {
    errors.email = emailError;
  }
  if (values.password.length === 0) {
    errors.password = 'Password is required.';
  }

  return resultFromErrors(errors, values);
}

function validatePasswordChangePayload(payload) {
  const body = payload && typeof payload === 'object' ? payload : {};
  const errors = {};
  const values = {
    currentPassword: typeof body.currentPassword === 'string'
      ? body.currentPassword
      : '',
    newPassword: typeof body.newPassword === 'string' ? body.newPassword : '',
  };

  if (values.currentPassword.length === 0) {
    errors.currentPassword = 'Current password is required.';
  }

  const newPasswordError = validatePassword(values.newPassword);
  if (newPasswordError) {
    errors.newPassword = newPasswordError;
  }

  return resultFromErrors(errors, values);
}

function validateStorePayload(payload) {
  const body = payload && typeof payload === 'object' ? payload : {};
  const errors = {};
  const values = {
    name: typeof body.name === 'string' ? body.name.trim() : '',
    email: typeof body.email === 'string' ? normalizeEmail(body.email) : '',
    address: typeof body.address === 'string' ? body.address.trim() : '',
  };

  const fieldValidators = {
    name: validateStoreName,
    email: validateEmail,
    address: validateAddress,
  };

  Object.entries(fieldValidators).forEach(([field, validator]) => {
    const error = validator(body[field]);
    if (error) {
      errors[field] = error;
    }
  });

  return resultFromErrors(errors, values);
}

module.exports = {
  normalizeEmail,
  validateAddress,
  validateEmail,
  validateLoginPayload,
  validateName,
  validatePassword,
  validatePasswordChangePayload,
  validateRating,
  validateSignupPayload,
  validateStoreName,
  validateStorePayload,
};
