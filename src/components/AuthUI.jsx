import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  checkEmail,
  getErrorMessage,
  getValidationErrors,
  login,
  signup,
} from "../utils/api.js";
import { setCurrentUser } from "../mock/currentUser.js";
import { ROLES } from "../mock/roles.js";
import { normalizeEmail, validateUserField } from "../utils/validation.js";

const INITIAL_VALUES = {
  name: "",
  email: "",
  address: "",
  password: "",
};

function getLandingPath(role) {
  if (role === ROLES.SYSTEM_ADMINISTRATOR) {
    return "/admin";
  }
  if (role === ROLES.STORE_OWNER) {
    return "/owner";
  }
  return "/stores";
}

function AuthField({
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
    placeholder: " ",
    value,
  };

  return (
    <div className={`auth-field${error ? " has-error" : ""}`}>
      {type === "textarea" ? (
        <textarea {...sharedProps} rows="4" />
      ) : (
        <input {...sharedProps} type={type} />
      )}
      <label htmlFor={id}>{label}</label>
      {error ? (
        <p className="field-error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function AuthUI() {
  const navigate = useNavigate();
  const [values, setValues] = useState(INITIAL_VALUES);
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [identifierState, setIdentifierState] = useState("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const normalizedEmail = normalizeEmail(values.email);
    const emailError = validateUserField("email", values.email);

    if (!normalizedEmail || emailError) {
      return undefined;
    }

    let isActive = true;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      checkEmail(normalizedEmail, { signal: controller.signal })
        .then((result) => {
          if (isActive) {
            setIdentifierState(result?.exists ? "existing" : "new");
          }
        })
        .catch((error) => {
          if (isActive && error.name !== "AbortError") {
            setIdentifierState("new");
            setFormError(getErrorMessage(error));
          }
        });
    }, 350);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [values.email]);

  const isLogin = identifierState === "existing";
  const isCheckingIdentifier = identifierState === "checking"
    && !validateUserField("email", values.email);
  const buttonLabel = isLogin ? "Log in" : "Create account";
  const branchLabel = isLogin ? "Existing account" : "Normal User account";
  const branchDescription = isLogin
    ? "We found your account. Enter your password to log in."
    : "New accounts are for Normal Users only. Administrator and Store Owner accounts are created by an admin.";

  function handleChange(event) {
    const { name, value } = event.target;

    setValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }));
    setFormError("");
    setErrors((currentErrors) => ({
      ...currentErrors,
      [name]: touched[name] ? validateUserField(name, value) : "",
    }));

    if (name === "email") {
      setIdentifierState(value.trim() ? "checking" : "idle");
    }
  }

  function handleBlur(event) {
    const { name, value } = event.target;

    setTouched((currentTouched) => ({
      ...currentTouched,
      [name]: true,
    }));
    setErrors((currentErrors) => ({
      ...currentErrors,
      [name]: validateUserField(name, value),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const fieldsToValidate = isLogin
      ? ["email", "password"]
      : ["name", "email", "address", "password"];
    const nextErrors = fieldsToValidate.reduce((fieldErrors, field) => {
      const fieldError = validateUserField(field, values[field]);

      if (fieldError) {
        fieldErrors[field] = fieldError;
      }

      return fieldErrors;
    }, {});

    setTouched((currentTouched) => ({
      ...currentTouched,
      ...Object.fromEntries(fieldsToValidate.map((field) => [field, true])),
    }));
    setErrors(nextErrors);
    setFormError("");

    if (Object.keys(nextErrors).length > 0 || isCheckingIdentifier) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = isLogin
        ? await login({
          email: normalizeEmail(values.email),
          password: values.password,
        })
        : await signup({
          name: values.name.trim(),
          email: normalizeEmail(values.email),
          address: values.address.trim(),
          password: values.password,
        });

      setCurrentUser(result.user, result.token);
      navigate(getLandingPath(result.user.role), { replace: true });
    } catch (error) {
      const serverErrors = getValidationErrors(error);
      setErrors(serverErrors);
      setFormError(
        Object.keys(serverErrors).length > 0
          ? "Please correct the highlighted fields."
          : getErrorMessage(error),
      );

      if (!isLogin && error.status === 409) {
        setIdentifierState("existing");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-ui">
      <header className="auth-header">
        <p className="eyebrow">ACCOUNT ACCESS</p>
        <h1>Login or Sign Up</h1>
        <p className="auth-intro">One account for the whole store network.</p>
      </header>

      <div className="auth-branch" aria-live="polite">
        <span className="auth-branch-label">{branchLabel}</span>
        <p>{branchDescription}</p>
        {isCheckingIdentifier ? <small>Checking email…</small> : null}
      </div>

      <form className="auth-form" noValidate onSubmit={handleSubmit}>
        {!isLogin ? (
          <div className="auth-signup-fields">
            <AuthField
              autoComplete="name"
              error={touched.name ? errors.name : ""}
              id="name"
              label="Name"
              maxLength={60}
              name="name"
              onBlur={handleBlur}
              onChange={handleChange}
              value={values.name}
            />
            <AuthField
              autoComplete="street-address"
              error={touched.address ? errors.address : ""}
              id="address"
              label="Address"
              maxLength={400}
              name="address"
              onBlur={handleBlur}
              onChange={handleChange}
              type="textarea"
              value={values.address}
            />
          </div>
        ) : null}

        <AuthField
          autoComplete="email"
          error={touched.email ? errors.email : ""}
          id="email"
          label="Email"
          name="email"
          onBlur={handleBlur}
          onChange={handleChange}
          type="email"
          value={values.email}
        />
        <AuthField
          autoComplete={isLogin ? "current-password" : "new-password"}
          error={touched.password ? errors.password : ""}
          id="password"
          label="Password"
          maxLength={16}
          name="password"
          onBlur={handleBlur}
          onChange={handleChange}
          type="password"
          value={values.password}
        />

        {!isLogin ? (
          <p className="auth-form-note">
            Password: 8–16 characters, at least 1 uppercase letter, and at least 1 special
            character.
          </p>
        ) : null}

        {formError ? (
          <p className="auth-form-error" role="alert">
            {formError}
          </p>
        ) : null}

        <button
          className="auth-submit"
          type="submit"
          disabled={isCheckingIdentifier || isSubmitting}
        >
          {buttonLabel}
        </button>
      </form>
    </section>
  );
}

export default AuthUI;
