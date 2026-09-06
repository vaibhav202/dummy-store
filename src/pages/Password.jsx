import { useState } from "react";
import { Link } from "react-router-dom";
import {
  changePassword,
  getErrorMessage,
  getValidationErrors,
} from "../utils/api.js";
import { validateUserField } from "../utils/validation.js";
import "../styles/password.css";

const INITIAL_VALUES = {
  currentPassword: "",
  newPassword: "",
};

function Password() {
  const [values, setValues] = useState(INITIAL_VALUES);
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validateField(field, value) {
    if (field === "currentPassword") {
      return value ? "" : "Current password is required.";
    }

    return validateUserField("password", value);
  }

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

    const fields = ["currentPassword", "newPassword"];
    const nextErrors = fields.reduce((fieldErrors, field) => {
      const fieldError = validateField(field, values[field]);

      if (fieldError) {
        fieldErrors[field] = fieldError;
      }

      return fieldErrors;
    }, {});

    setTouched(Object.fromEntries(fields.map((field) => [field, true])));
    setErrors(nextErrors);
    setMessage("");
    setFormError("");

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      await changePassword(values);
      setValues(INITIAL_VALUES);
      setTouched({});
      setErrors({});
      setMessage("Your password was changed successfully.");
    } catch (error) {
      const serverErrors = getValidationErrors(error);
      setErrors(serverErrors);
      setFormError(
        Object.keys(serverErrors).length > 0
          ? "Please correct the highlighted fields."
          : getErrorMessage(error, "Your password could not be changed."),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="password-page">
      <div className="password-card">
        <Link className="password-back-link" to="/">
          ← Back to home
        </Link>
        <p className="eyebrow">ACCOUNT SECURITY</p>
        <h1>Change your password.</h1>
        <p className="password-intro">
          Confirm your current password before setting a new one.
        </p>

        <form className="password-form" noValidate onSubmit={handleSubmit}>
          <label className={`password-field${errors.currentPassword ? " has-error" : ""}`}>
            <span>Current password</span>
            <input
              type="password"
              name="currentPassword"
              value={values.currentPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              autoComplete="current-password"
              aria-invalid={Boolean(errors.currentPassword)}
            />
            {touched.currentPassword && errors.currentPassword ? (
              <small role="alert">{errors.currentPassword}</small>
            ) : null}
          </label>
          <label className={`password-field${errors.newPassword ? " has-error" : ""}`}>
            <span>New password</span>
            <input
              type="password"
              name="newPassword"
              value={values.newPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              autoComplete="new-password"
              maxLength={16}
              aria-invalid={Boolean(errors.newPassword)}
            />
            {touched.newPassword && errors.newPassword ? (
              <small role="alert">{errors.newPassword}</small>
            ) : null}
          </label>
          <p className="password-hint">
            Use 8–16 characters with at least 1 uppercase letter and 1 special character.
          </p>
          {formError ? (
            <p className="password-form-error" role="alert">
              {formError}
            </p>
          ) : null}
          {message ? (
            <p className="password-form-status" role="status">
              {message}
            </p>
          ) : null}
          <button className="password-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Change password"}
          </button>
        </form>
      </div>
    </section>
  );
}

export default Password;
