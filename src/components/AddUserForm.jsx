import { useState } from "react";
import { createUser, getErrorMessage, getValidationErrors } from "../utils/api.js";
import { ROLES } from "../mock/roles.js";
import { normalizeEmail, validateUserField } from "../utils/validation.js";

const INITIAL_VALUES = {
  name: "",
  email: "",
  password: "",
  address: "",
  role: ROLES.NORMAL_USER,
};

const ROLE_OPTIONS = [
  { value: ROLES.NORMAL_USER, label: "Normal User" },
  { value: ROLES.STORE_OWNER, label: "Store Owner" },
  { value: ROLES.SYSTEM_ADMINISTRATOR, label: "System Administrator" },
];

function validateField(field, value) {
  if (field === "role") {
    return value ? "" : "Role is required.";
  }

  return validateUserField(field, value);
}

function AdminField({
  autoComplete,
  error,
  id,
  label,
  maxLength,
  name,
  onBlur,
  onChange,
  type = "text",
  value,
}) {
  const errorId = `${id}-error`;
  const sharedProps = {
    "aria-describedby": error ? errorId : undefined,
    "aria-invalid": Boolean(error),
    autoComplete,
    id,
    maxLength,
    name,
    onBlur,
    onChange,
    value,
  };

  return (
    <div className={`admin-field${error ? " has-error" : ""}`}>
      {type === "textarea" ? (
        <textarea {...sharedProps} rows="4" />
      ) : (
        <input {...sharedProps} type={type} />
      )}
      <label htmlFor={id}>{label}</label>
      {error ? (
        <p className="admin-field-error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function AddUserForm({ onUserAdded }) {
  const [values, setValues] = useState(INITIAL_VALUES);
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }));
    setMessage("");
    setFormError("");
    setErrors((currentErrors) => ({
      ...currentErrors,
      [name]: touched[name] ? validateField(name, value) : "",
    }));
  }

  function handleBlur(event) {
    const { name, value } = event.target;

    setTouched((currentTouched) => ({
      ...currentTouched,
      [name]: true,
    }));
    setErrors((currentErrors) => ({
      ...currentErrors,
      [name]: validateField(name, value),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const fields = ["name", "email", "password", "address", "role"];
    const nextErrors = fields.reduce((fieldErrors, field) => {
      const fieldError = validateField(field, values[field]);

      if (fieldError) {
        fieldErrors[field] = fieldError;
      }

      return fieldErrors;
    }, {});

    setTouched(Object.fromEntries(fields.map((field) => [field, true])));
    setErrors(nextErrors);
    setFormError("");
    setMessage("");

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createUser({
        name: values.name.trim(),
        email: normalizeEmail(values.email),
        password: values.password,
        address: values.address.trim(),
        role: values.role,
      });

      onUserAdded?.(result.user);
      setValues(INITIAL_VALUES);
      setTouched({});
      setErrors({});
      setMessage("User added to the platform.");
    } catch (error) {
      const serverErrors = getValidationErrors(error);
      setErrors(serverErrors);
      setFormError(
        Object.keys(serverErrors).length > 0
          ? "Please correct the highlighted fields."
          : getErrorMessage(error, "The user could not be added."),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="admin-form" noValidate onSubmit={handleSubmit}>
      <AdminField
        autoComplete="name"
        error={touched.name ? errors.name : ""}
        id="admin-user-name"
        label="Name"
        maxLength={60}
        name="name"
        onBlur={handleBlur}
        onChange={handleChange}
        value={values.name}
      />
      <AdminField
        autoComplete="email"
        error={touched.email ? errors.email : ""}
        id="admin-user-email"
        label="Email"
        name="email"
        onBlur={handleBlur}
        onChange={handleChange}
        type="email"
        value={values.email}
      />
      <AdminField
        autoComplete="new-password"
        error={touched.password ? errors.password : ""}
        id="admin-user-password"
        label="Password"
        maxLength={16}
        name="password"
        onBlur={handleBlur}
        onChange={handleChange}
        type="password"
        value={values.password}
      />
      <AdminField
        autoComplete="street-address"
        error={touched.address ? errors.address : ""}
        id="admin-user-address"
        label="Address"
        maxLength={400}
        name="address"
        onBlur={handleBlur}
        onChange={handleChange}
        type="textarea"
        value={values.address}
      />
      <div className={`admin-field${touched.role && errors.role ? " has-error" : ""}`}>
        <label htmlFor="admin-user-role">Role</label>
        <select
          aria-describedby={touched.role && errors.role ? "admin-user-role-error" : undefined}
          aria-invalid={Boolean(touched.role && errors.role)}
          id="admin-user-role"
          name="role"
          onBlur={handleBlur}
          onChange={handleChange}
          value={values.role}
        >
          {ROLE_OPTIONS.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
        {touched.role && errors.role ? (
          <p className="admin-field-error" id="admin-user-role-error" role="alert">
            {errors.role}
          </p>
        ) : null}
      </div>
      {formError ? (
        <p className="admin-form-error" role="alert">
          {formError}
        </p>
      ) : null}
      {message ? (
        <p className="admin-form-status" role="status">
          {message}
        </p>
      ) : null}
      <button className="admin-submit" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Adding user…" : "Add user"}
      </button>
    </form>
  );
}

export default AddUserForm;
