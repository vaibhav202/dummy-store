
const SESSION_STORAGE_KEY = "roxiler-auth-session";
const USER_FIELDS = ["id", "name", "email", "address", "role"];

function readSession() {
  if (typeof window === "undefined") {
    return { user: {}, token: "" };
  }

  try {
    const storedSession = window.sessionStorage.getItem(SESSION_STORAGE_KEY);

    if (!storedSession) {
      return { user: {}, token: "" };
    }

    const parsedSession = JSON.parse(storedSession);
    const storedUser = parsedSession?.user || {};

    return {
      token: typeof parsedSession?.token === "string" ? parsedSession.token : "",
      user: USER_FIELDS.reduce((user, field) => {
        if (storedUser[field] !== undefined) {
          user[field] = storedUser[field];
        }
        return user;
      }, {}),
    };
  } catch {
    return { user: {}, token: "" };
  }
}

const storedSession = readSession();
const currentUser = { ...storedSession.user };
let authToken = storedSession.token;

function persistSession() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ user: currentUser, token: authToken }),
    );
  } catch {
    // The in-memory session still works when browser storage is unavailable.
  }
}

function setCurrentUser(user, token) {
  USER_FIELDS.forEach((field) => {
    delete currentUser[field];
  });

  USER_FIELDS.forEach((field) => {
    if (user?.[field] !== undefined) {
      currentUser[field] = user[field];
    }
  });

  if (typeof token === "string") {
    authToken = token;
  }

  persistSession();
}

function getAuthToken() {
  return authToken;
}

function isAuthenticated() {
  return Boolean(authToken && currentUser.role);
}

function clearCurrentUser() {
  USER_FIELDS.forEach((field) => {
    delete currentUser[field];
  });
  authToken = "";

  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // The in-memory session is already cleared.
    }
  }
}

export {
  clearCurrentUser,
  currentUser,
  getAuthToken,
  isAuthenticated,
  setCurrentUser,
};
export default currentUser;
