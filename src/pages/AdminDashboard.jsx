import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import AddStoreForm from "../components/AddStoreForm.jsx";
import AddUserForm from "../components/AddUserForm.jsx";
import UserListTable from "../components/UserListTable.jsx";
import { currentUser } from "../mock/currentUser.js";
import { getRoleLabel, ROLES } from "../mock/roles.js";
import {
  getAdminDashboard,
  getErrorMessage,
  getUser,
  listStores,
  listUsers,
} from "../utils/api.js";
import "../styles/admin.css";

const USER_SORTABLE_COLUMNS = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "address", label: "Address" },
  { key: "role", label: "Role" },
];
const STORE_SORTABLE_COLUMNS = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "address", label: "Address" },
  { key: "overallRating", label: "Rating" },
];

function getSortValue(columns, requestedValue, fallback) {
  return columns.some((column) => column.key === requestedValue)
    ? requestedValue
    : fallback;
}

function StoreListTable({ isLoading, onSort, order, sortBy, stores }) {
  return (
    <div className="admin-table-section">
      <div className="admin-table-toolbar">
        <p className="admin-table-description">
          Sort by any column to review the store network.
        </p>
        <p className="admin-table-count" aria-live="polite">
          {isLoading ? "Loading stores…" : `${stores.length} stores`}
        </p>
      </div>
      {isLoading ? (
        <div className="admin-empty-state" aria-live="polite">
          <p className="eyebrow">LOCATIONS</p>
          <p>Loading stores…</p>
        </div>
      ) : stores.length > 0 ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                {STORE_SORTABLE_COLUMNS.map((column) => {
                  const isActive = sortBy === column.key;
                  const sortLabel = isActive
                    ? order === "asc"
                      ? "ascending"
                      : "descending"
                    : "not sorted";

                  return (
                    <th scope="col" aria-sort={isActive ? sortLabel : "none"} key={column.key}>
                      <button
                        className="admin-sort-button"
                        type="button"
                        onClick={() => onSort(column.key)}
                        aria-label={`Sort by ${column.label}, currently ${sortLabel}`}
                      >
                        <span>{column.label}</span>
                        <span
                          className={`admin-sort-indicator${isActive ? " is-active" : ""}`}
                          aria-hidden="true"
                        >
                          {isActive ? (order === "asc" ? "↑" : "↓") : "↕"}
                        </span>
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {stores.map((store) => (
                <tr key={store.id}>
                  <th scope="row">{store.name}</th>
                  <td>{store.email}</td>
                  <td className="admin-muted-cell">{store.address}</td>
                  <td>
                    {Number(store.overallRating) > 0
                      ? `${Number(store.overallRating).toFixed(1)} / 5`
                      : "Not rated"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="admin-empty-state">
          <p className="eyebrow">NO STORES</p>
          <p>No stores have been added yet.</p>
        </div>
      )}
    </div>
  );
}

function AdminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStores: 0,
    totalRatings: 0,
  });
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const userSearch = searchParams.get("userSearch") || "";
  const userSortBy = getSortValue(
    USER_SORTABLE_COLUMNS,
    searchParams.get("userSortBy"),
    "name",
  );
  const userOrder = searchParams.get("userOrder") === "desc" ? "desc" : "asc";
  const storeSortBy = getSortValue(
    STORE_SORTABLE_COLUMNS,
    searchParams.get("storeSortBy"),
    "name",
  );
  const storeOrder = searchParams.get("storeOrder") === "desc" ? "desc" : "asc";

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;

    Promise.all([
      getAdminDashboard({ signal: controller.signal }),
      listUsers({
        search: userSearch,
        sortBy: userSortBy,
        order: userOrder,
        signal: controller.signal,
      }),
      listStores({
        sortBy: storeSortBy,
        order: storeOrder,
        signal: controller.signal,
      }),
    ])
      .then(([dashboard, userResult, storeResult]) => {
        if (!isActive) {
          return;
        }

        setStats({
          totalUsers: Number(dashboard?.totalUsers || 0),
          totalStores: Number(dashboard?.totalStores || 0),
          totalRatings: Number(dashboard?.totalRatings || 0),
        });
        setUsers(Array.isArray(userResult?.users) ? userResult.users : []);
        setStores(Array.isArray(storeResult?.stores) ? storeResult.stores : []);
      })
      .catch((requestError) => {
        if (isActive && requestError.name !== "AbortError") {
          setError(getErrorMessage(requestError, "The administrator data could not be loaded."));
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [refreshKey, storeOrder, storeSortBy, userOrder, userSearch, userSortBy]);

  function updateQuery(updates) {
    const nextParams = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value === "" || value === null || value === undefined) {
        nextParams.delete(key);
      } else {
        nextParams.set(key, value);
      }
    });

    setSearchParams(nextParams, { replace: true });
  }

  function handleUserSort(column) {
    const nextOrder = userSortBy === column && userOrder === "asc" ? "desc" : "asc";
    setIsLoading(true);
    setError("");
    updateQuery({ userSortBy: column, userOrder: nextOrder });
  }

  function handleStoreSort(column) {
    const nextOrder = storeSortBy === column && storeOrder === "asc" ? "desc" : "asc";
    setIsLoading(true);
    setError("");
    updateQuery({ storeSortBy: column, storeOrder: nextOrder });
  }

  function refreshAfterCreate() {
    setIsLoading(true);
    setError("");
    setRefreshKey((currentKey) => currentKey + 1);
  }

  return (
    <section className="admin-page">
      <header className="admin-header">
        <div>
          <p className="eyebrow">SYSTEM ADMINISTRATOR · DASHBOARD</p>
          <h1>Keep the network moving.</h1>
          <p className="admin-intro">
            Manage the people and stores that make the everyday edit possible.
          </p>
        </div>
        <div className="admin-session">
          <span>Signed in as</span>
          <span>{currentUser.email || "Administrator"}</span>
        </div>
      </header>

      {error ? (
        <div className="admin-empty-state admin-error-state" role="alert">
          <p className="eyebrow">COULD NOT LOAD DASHBOARD</p>
          <p>{error}</p>
        </div>
      ) : null}

      <div className="admin-stat-grid">
        <article className="admin-stat-card">
          <span className="admin-stat-label">Total users</span>
          <strong>{stats.totalUsers}</strong>
        </article>
        <article className="admin-stat-card">
          <span className="admin-stat-label">Total stores</span>
          <strong>{stats.totalStores}</strong>
        </article>
        <article className="admin-stat-card">
          <span className="admin-stat-label">Total ratings</span>
          <strong>{stats.totalRatings}</strong>
        </article>
      </div>

      <div className="admin-form-grid">
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <p className="eyebrow">PLATFORM ACCESS</p>
              <h2>Add a user</h2>
            </div>
            <span>Admin only</span>
          </div>
          <AddUserForm onUserAdded={refreshAfterCreate} />
        </section>
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <p className="eyebrow">STORE NETWORK</p>
              <h2>Add a store</h2>
            </div>
            <span>Admin only</span>
          </div>
          <AddStoreForm onStoreAdded={refreshAfterCreate} />
        </section>
      </div>

      <section className="admin-panel admin-data-panel">
        <div className="admin-panel-heading">
          <div>
            <p className="eyebrow">PEOPLE</p>
            <h2>User list</h2>
          </div>
          <span>Open a user for details</span>
        </div>
        <UserListTable
          isLoading={isLoading}
          onSearchChange={(value) => updateQuery({ userSearch: value })}
          onSort={handleUserSort}
          order={userOrder}
          search={userSearch}
          sortBy={userSortBy}
          users={users}
        />
      </section>

      <section className="admin-panel admin-data-panel">
        <div className="admin-panel-heading">
          <div>
            <p className="eyebrow">LOCATIONS</p>
            <h2>Store list</h2>
          </div>
          <span>Network overview</span>
        </div>
        <StoreListTable
          isLoading={isLoading}
          onSort={handleStoreSort}
          order={storeOrder}
          sortBy={storeSortBy}
          stores={stores}
        />
      </section>
    </section>
  );
}

function AdminUserDetail() {
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;

    getUser(userId, { signal: controller.signal })
      .then((result) => {
        if (isActive) {
          setUser(result?.user || null);
        }
      })
      .catch((requestError) => {
        if (isActive && requestError.name !== "AbortError") {
          setError(getErrorMessage(requestError, "This profile could not be loaded."));
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [userId]);

  return (
    <section className="admin-page">
      <div className="admin-user-detail">
        <Link className="admin-back-link" to="/admin">
          ← Back to dashboard
        </Link>
        {isLoading ? (
          <div className="admin-detail-card" aria-live="polite">
            <p className="eyebrow">USER DETAIL</p>
            <h1>Loading profile…</h1>
          </div>
        ) : error || !user ? (
          <div className="admin-detail-card" role="alert">
            <p className="eyebrow">USER NOT FOUND</p>
            <h1>{error || "This profile is no longer available."}</h1>
          </div>
        ) : (
          <article className="admin-detail-card">
            <p className="eyebrow">USER DETAIL</p>
            <h1>{user.name}</h1>
            <dl className="admin-detail-list">
              <dt>Email</dt>
              <dd>{user.email}</dd>
              <dt>Address</dt>
              <dd>{user.address}</dd>
              <dt>Role</dt>
              <dd>{getRoleLabel(user.role)}</dd>
              {user.role === ROLES.STORE_OWNER ? (
                <>
                  <dt>Average rating</dt>
                  <dd>{Number(user.averageRating || 0).toFixed(2)} / 5</dd>
                </>
              ) : null}
            </dl>
            {user.store ? (
              <div className="admin-owner-store">
                <span>Store Owner location</span>
                <strong>{user.store.name}</strong>
                <span>{user.store.address}</span>
                <span>
                  Average rating: {Number(user.store.averageRating || 0).toFixed(2)} / 5
                </span>
              </div>
            ) : null}
          </article>
        )}
      </div>
    </section>
  );
}

export { AdminUserDetail };
export default AdminDashboard;
