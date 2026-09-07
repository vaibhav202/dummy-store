import { useState } from "react";
import { createStore, getErrorMessage, getValidationErrors } from "../utils/api.js";
import { normalizeEmail, validateStoreField } from "../utils/validation.js";

const INITIAL_VALUES = {
  name: "",
  email: "",
  address: "",
};

function AdminStoreField({
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

function AddStoreForm({ onStoreAdded }) {
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
      [name]: touched[name] ? validateStoreField(name, value) : "",
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
      [name]: validateStoreField(name, value),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const fields = ["name", "email", "address"];
    const nextErrors = fields.reduce((fieldErrors, field) => {
      const fieldError = validateStoreField(field, values[field]);

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
      const result = await createStore({
        name: values.name.trim(),
        email: normalizeEmail(values.email),
        address: values.address.trim(),
      });

      onStoreAdded?.(result.store);
      setValues(INITIAL_VALUES);
      setTouched({});
      setErrors({});
      setMessage("Store added to the platform.");
    } catch (error) {
      const serverErrors = getValidationErrors(error);
      setErrors(serverErrors);
      setFormError(
        Object.keys(serverErrors).length > 0
          ? "Please correct the highlighted fields."
          : getErrorMessage(error, "The store could not be added."),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="admin-form" noValidate onSubmit={handleSubmit}>
      <AdminStoreField
        autoComplete="organization"
        error={touched.name ? errors.name : ""}
        id="admin-store-name"
        label="Name"
        maxLength={60}
        name="name"
        onBlur={handleBlur}
        onChange={handleChange}
        value={values.name}
      />
      <AdminStoreField
        autoComplete="email"
        error={touched.email ? errors.email : ""}
        id="admin-store-email"
        label="Email"
        name="email"
        onBlur={handleBlur}
        onChange={handleChange}
        type="email"
        value={values.email}
      />
      <AdminStoreField
        autoComplete="street-address"
        error={touched.address ? errors.address : ""}
        id="admin-store-address"
        label="Address"
        maxLength={400}
        name="address"
        onBlur={handleBlur}
        onChange={handleChange}
        type="textarea"
        value={values.address}
      />
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
        {isSubmitting ? "Adding store…" : "Add store"}
      </button>
    </form>
  );
}

export default AddStoreForm;
