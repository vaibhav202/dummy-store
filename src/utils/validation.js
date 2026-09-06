const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function validateUserField(field, value) {
  switch (field) {
    case "name": {
      const nameLength = value.trim().length;
      if (nameLength === 0) {
        return "Name is required.";
      }
      if (nameLength < 20) {
        return "Name must be at least 20 characters.";
      }
      if (nameLength > 60) {
        return "Name must be no more than 60 characters.";
      }
      return "";
    }
    case "email":
      if (!value.trim()) {
        return "Email is required.";
      }
      return EMAIL_PATTERN.test(value.trim()) ? "" : "Enter a valid email address.";
    case "address":
      if (!value.trim()) {
        return "Address is required.";
      }
      return value.length <= 400 ? "" : "Address must be no more than 400 characters.";
    case "password":
      if (!value) {
        return "Password is required.";
      }
      if (value.length < 8 || value.length > 16) {
        return "Password must be 8–16 characters.";
      }
      if (!/[A-Z]/.test(value)) {
        return "Password must include at least 1 uppercase letter.";
      }
      return /[^A-Za-z0-9\s]/.test(value)
        ? ""
        : "Password must include at least 1 special character.";
    default:
      return "";
  }
}

function validateStoreField(field, value) {
  switch (field) {
    case "name": {
      if (!value.trim()) {
        return "Name is required.";
      }
      const nameLength = value.trim().length;
      if (nameLength < 20) {
        return "Name must be at least 20 characters.";
      }
      return nameLength <= 60 ? "" : "Name must be no more than 60 characters.";
    }
    case "email":
      if (!value.trim()) {
        return "Email is required.";
      }
      return EMAIL_PATTERN.test(value.trim()) ? "" : "Enter a valid email address.";
    case "address":
      if (!value.trim()) {
        return "Address is required.";
      }
      return value.length <= 400 ? "" : "Address must be no more than 400 characters.";
    default:
      return "";
  }
}

export { normalizeEmail, validateStoreField, validateUserField };
