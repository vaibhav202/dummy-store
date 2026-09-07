import { Link } from "react-router-dom";
import { getRoleLabel } from "../mock/roles.js";

const SORTABLE_COLUMNS = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "address", label: "Address" },
  { key: "role", label: "Role" },
];

function SortableHeader({ column, onSort, order, sortBy }) {
  const isActive = sortBy === column.key;
  const sortLabel = isActive
    ? order === "asc"
      ? "ascending"
      : "descending"
    : "not sorted";

  return (
    <th scope="col" aria-sort={isActive ? sortLabel : "none"}>
      <button
        className="admin-sort-button"
        type="button"
        onClick={() => onSort(column.key)}
        aria-label={`Sort by ${column.label}, currently ${sortLabel}`}
      >
        <span>{column.label}</span>
        <span className={`admin-sort-indicator${isActive ? " is-active" : ""}`} aria-hidden="true">
          {isActive ? (order === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </th>
  );
}

function UserListTable({
  isLoading,
  onSearchChange,
  onSort,
  order,
  search,
  sortBy,
  users,
}) {
  return (
    <div className="admin-table-section">
      <div className="admin-table-toolbar">
        <div className="admin-search">
          <input
            id="admin-user-search"
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder=" "
          />
          <label htmlFor="admin-user-search">Filter users</label>
        </div>
        <p className="admin-table-count" aria-live="polite">
          {isLoading ? "Loading users…" : `${users.length} users`}
        </p>
      </div>

      {isLoading ? (
        <div className="admin-empty-state" aria-live="polite">
          <p className="eyebrow">PEOPLE</p>
          <p>Loading users…</p>
        </div>
      ) : users.length > 0 ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                {SORTABLE_COLUMNS.map((column) => (
                  <SortableHeader
                    column={column}
                    key={column.key}
                    onSort={onSort}
                    order={order}
                    sortBy={sortBy}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <th scope="row">
                    <Link className="admin-user-link" to={`/admin/users/${user.id}`}>
                      {user.name}
                    </Link>
                  </th>
                  <td>{user.email}</td>
                  <td className="admin-muted-cell">{user.address}</td>
                  <td>
                    <span className="admin-role-badge">{getRoleLabel(user.role)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="admin-empty-state">
          <p className="eyebrow">NO MATCHES</p>
          <p>No users match this filter.</p>
        </div>
      )}
    </div>
  );
}

export default UserListTable;
