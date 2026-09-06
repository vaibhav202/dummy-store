import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getErrorMessage,
  listStores,
  submitRating,
} from "../utils/api.js";
import "../styles/stores.css";

const RATING_OPTIONS = [1, 2, 3, 4, 5];
const SORTABLE_COLUMNS = [
  { key: "name", label: "Store name" },
  { key: "address", label: "Address" },
  { key: "overallRating", label: "Overall rating" },
  { key: "userRating", label: "Your rating" },
];
const DEFAULT_SORT = "name";

function SortableHeader({ column, sortBy, order, onSort }) {
  const isActive = sortBy === column.key;
  const sortLabel = isActive
    ? order === "asc"
      ? "ascending"
      : "descending"
    : "not sorted";

  return (
    <th scope="col" aria-sort={isActive ? sortLabel : "none"}>
      <button
        className="sort-button"
        type="button"
        onClick={() => onSort(column.key)}
        aria-label={`Sort by ${column.label}, currently ${sortLabel}`}
      >
        <span>{column.label}</span>
        <span className={`sort-indicator${isActive ? " is-active" : ""}`} aria-hidden="true">
          {isActive ? (order === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </th>
  );
}

function RatingControl({
  isSaving,
  message,
  onRatingChange,
  onSubmit,
  rating,
  store,
}) {
  const hasPendingRating = rating !== null && rating !== store.userRating;
  const actionLabel = store.userRating === null ? "Submit rating" : "Update rating";
  const idleLabel = store.userRating === null ? "Choose 1–5" : "Saved";

  return (
    <form className="store-rating" onSubmit={(event) => onSubmit(event, store.id)}>
      <p className="rating-caption">
        {store.userRating === null
          ? "Not rated yet"
          : `Current: ${store.userRating} out of 5`}
      </p>
      <div className="rating-stars" role="group" aria-label={`Choose your rating for ${store.name}`}>
        {RATING_OPTIONS.map((option) => (
          <button
            className={`rating-star${rating !== null && option <= rating ? " is-selected" : ""}`}
            key={option}
            type="button"
            onClick={() => onRatingChange(store.id, option)}
            aria-label={`${option} out of 5`}
            aria-pressed={rating === option}
            title={`${option} out of 5`}
            disabled={isSaving}
          >
            ★
          </button>
        ))}
      </div>
      <button
        className="rating-submit"
        type="submit"
        disabled={!hasPendingRating || isSaving}
      >
        {isSaving ? "Saving…" : hasPendingRating ? actionLabel : idleLabel}
      </button>
      {message ? (
        <p className="rating-message" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}

function Stores() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [storeRows, setStoreRows] = useState([]);
  const [ratingDrafts, setRatingDrafts] = useState({});
  const [ratingMessages, setRatingMessages] = useState({});
  const [savingRatings, setSavingRatings] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const search = searchParams.get("search") || "";
  const requestedSort = searchParams.get("sortBy");
  const sortBy = SORTABLE_COLUMNS.some((column) => column.key === requestedSort)
    ? requestedSort
    : DEFAULT_SORT;
  const order = searchParams.get("order") === "desc" ? "desc" : "asc";

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;

    listStores({
      search,
      sortBy,
      order,
      signal: controller.signal,
    })
      .then((result) => {
        if (!isActive) {
          return;
        }

        const stores = Array.isArray(result?.stores) ? result.stores : [];
        setStoreRows(stores);
        setRatingDrafts(
          Object.fromEntries(stores.map((store) => [store.id, store.userRating])),
        );
      })
      .catch((requestError) => {
        if (isActive && requestError.name !== "AbortError") {
          setError(getErrorMessage(requestError, "Stores could not be loaded."));
          setStoreRows([]);
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
  }, [order, search, sortBy]);

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

  function handleSearchChange(event) {
    setIsLoading(true);
    setError("");
    updateQuery({ search: event.target.value });
  }

  function handleSort(column) {
    const nextOrder = sortBy === column && order === "asc" ? "desc" : "asc";
    setIsLoading(true);
    setError("");
    updateQuery({ sortBy: column, order: nextOrder });
  }

  function handleRatingChange(storeId, rating) {
    setRatingDrafts((currentRatings) => ({
      ...currentRatings,
      [storeId]: rating,
    }));
    setRatingMessages((currentMessages) => ({
      ...currentMessages,
      [storeId]: "",
    }));
  }

  async function handleRatingSubmit(event, storeId) {
    event.preventDefault();
    const rating = ratingDrafts[storeId];

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return;
    }

    const store = storeRows.find((storeRow) => storeRow.id === storeId);

    if (!store) {
      return;
    }

    setSavingRatings((currentSaving) => ({
      ...currentSaving,
      [storeId]: true,
    }));

    try {
      const result = await submitRating({ storeId, rating });
      const savedRating = result?.rating?.rating ?? rating;

      setStoreRows((currentStores) => currentStores.map((storeRow) => (
        storeRow.id === storeId
          ? { ...storeRow, userRating: savedRating }
          : storeRow
      )));
      setRatingDrafts((currentRatings) => ({
        ...currentRatings,
        [storeId]: savedRating,
      }));
      setRatingMessages((currentMessages) => ({
        ...currentMessages,
        [storeId]: store.userRating === null
          ? "Your rating was submitted."
          : "Your rating was updated.",
      }));

      try {
        const refreshedResult = await listStores({ search, sortBy, order });
        const refreshedStores = Array.isArray(refreshedResult?.stores)
          ? refreshedResult.stores
          : [];
        setStoreRows(refreshedStores);
        setRatingDrafts(
          Object.fromEntries(refreshedStores.map((row) => [row.id, row.userRating])),
        );
      } catch {
        // The saved rating remains visible if refreshing the computed totals fails.
      }
    } catch (requestError) {
      setRatingMessages((currentMessages) => ({
        ...currentMessages,
        [storeId]: getErrorMessage(requestError, "Your rating could not be saved."),
      }));
    } finally {
      setSavingRatings((currentSaving) => ({
        ...currentSaving,
        [storeId]: false,
      }));
    }
  }

  const activeSortLabel =
    SORTABLE_COLUMNS.find((column) => column.key === sortBy)?.label || "Store name";

  return (
    <section className="stores-page">
      <header className="stores-header">
        <div>
          <p className="eyebrow">NORMAL USER · STORE DIRECTORY</p>
          <h1>Find a store that feels like you.</h1>
          <p className="stores-intro">
            Browse the stores in the network, then leave one simple rating for each place
            you visit.
          </p>
        </div>
        <div className="store-count" aria-live="polite">
          <strong>{storeRows.length}</strong>
          <span>stores shown</span>
        </div>
      </header>

      <div className="store-toolbar">
        <label className="store-search" htmlFor="store-search-input">
          <span>Search stores</span>
          <input
            id="store-search-input"
            type="search"
            value={search}
            onChange={handleSearchChange}
            placeholder="Search by name or address"
          />
        </label>
        <div className="store-toolbar-meta">
          <p className="stores-results" aria-live="polite">
            {isLoading
              ? "Loading stores…"
              : storeRows.length === 0
                ? "No stores match your search"
                : `${storeRows.length} ${storeRows.length === 1 ? "store" : "stores"}`}
          </p>
          <p className="sort-summary">
            Sorted by {activeSortLabel} · {order === "asc" ? "ascending" : "descending"}
          </p>
        </div>
      </div>

      {error ? (
        <div className="stores-empty-state" role="alert">
          <p className="eyebrow">COULD NOT LOAD STORES</p>
          <h2>Something went wrong.</h2>
          <p>{error}</p>
        </div>
      ) : isLoading ? (
        <div className="stores-empty-state" aria-live="polite">
          <p className="eyebrow">STORE DIRECTORY</p>
          <h2>Loading stores…</h2>
        </div>
      ) : storeRows.length > 0 ? (
        <div className="stores-table-wrap">
          <table className="stores-table">
            <thead>
              <tr>
                {SORTABLE_COLUMNS.map((column) => (
                  <SortableHeader
                    column={column}
                    key={column.key}
                    onSort={handleSort}
                    order={order}
                    sortBy={sortBy}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {storeRows.map((store) => (
                <tr key={store.id}>
                  <th className="store-name-cell" scope="row">
                    <span className="store-name">{store.name}</span>
                    <span className="store-id">
                      Store {String(store.id).replace("store-", "#")}
                    </span>
                  </th>
                  <td className="store-address">{store.address}</td>
                  <td>
                    <div className="overall-rating">
                      <strong>{Number(store.overallRating).toFixed(1)}</strong>
                      <span>out of 5</span>
                    </div>
                  </td>
                  <td>
                    <RatingControl
                      isSaving={Boolean(savingRatings[store.id])}
                      message={ratingMessages[store.id]}
                      onRatingChange={handleRatingChange}
                      onSubmit={handleRatingSubmit}
                      rating={ratingDrafts[store.id] ?? null}
                      store={store}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="stores-empty-state">
          <p className="eyebrow">NO MATCHES</p>
          <h2>Try a different search.</h2>
          <p>Search the store name or address to find another part of the network.</p>
          <button
            className="clear-search-button"
            type="button"
            onClick={() => updateQuery({ search: "" })}
          >
            Clear search
          </button>
        </div>
      )}
    </section>
  );
}

export default Stores;
