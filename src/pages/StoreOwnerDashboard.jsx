import { useEffect, useState } from "react";
import {
  getErrorMessage,
  getStoreOwnerDashboard,
} from "../utils/api.js";
import "../styles/owner.css";

function formatRatedAt(dateString) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString));
}

function StoreOwnerDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;

    getStoreOwnerDashboard({ signal: controller.signal })
      .then((result) => {
        if (isActive) {
          setDashboard(result);
        }
      })
      .catch((requestError) => {
        if (isActive && requestError.name !== "AbortError") {
          setError(getErrorMessage(requestError, "The store dashboard could not be loaded."));
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
  }, []);

  if (isLoading) {
    return (
      <section className="owner-page">
        <div className="owner-status" aria-live="polite">
          <p className="eyebrow">STORE OWNER · DASHBOARD</p>
          <h1>Loading your store…</h1>
        </div>
      </section>
    );
  }

  if (error || !dashboard?.store) {
    return (
      <section className="owner-page">
        <div className="owner-status" role="alert">
          <p className="eyebrow">STORE OWNER · DASHBOARD</p>
          <h1>{error || "No store is assigned to this account."}</h1>
        </div>
      </section>
    );
  }

  const raters = Array.isArray(dashboard.raters) ? dashboard.raters : [];
  const averageRating = Number(dashboard.averageRating || 0);
  const store = dashboard.store;

  return (
    <section className="owner-page">
      <header className="owner-header">
        <div>
          <p className="eyebrow">STORE OWNER · DASHBOARD</p>
          <h1>{store.name}</h1>
          <p className="owner-intro">
            See who has rated your store and how the experience is landing with the network.
          </p>
        </div>
        <div className="owner-store-meta">
          <span>{store.email}</span>
          <span>{store.address}</span>
        </div>
      </header>

      <div className="owner-content">
        <article className="owner-average-card">
          <p className="eyebrow">YOUR STORE</p>
          <span className="owner-average-label">Average rating</span>
          <strong>{averageRating.toFixed(1)}</strong>
          <span className="owner-average-scale">out of 5</span>
          <p className="owner-rating-count">
            Based on {raters.length} {raters.length === 1 ? "rating" : "ratings"}
          </p>
        </article>

        <section className="owner-raters-panel">
          <div className="owner-panel-heading">
            <div>
              <p className="eyebrow">RECENT FEEDBACK</p>
              <h2>People who rated your store</h2>
            </div>
            <span>{raters.length} raters</span>
          </div>

          {raters.length > 0 ? (
            <div className="owner-table-wrap">
              <table className="owner-table">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Rating</th>
                    <th scope="col">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {raters.map((rater) => (
                    <tr key={`${rater.userId}-${rater.ratedAt}`}>
                      <th scope="row">{rater.name}</th>
                      <td>
                        <strong>{rater.rating}</strong>
                        <span className="owner-rating-scale"> / 5</span>
                      </td>
                      <td>
                        <time dateTime={rater.ratedAt}>{formatRatedAt(rater.ratedAt)}</time>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="owner-empty-state">
              <p>No ratings have been submitted for this store yet.</p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

export default StoreOwnerDashboard;
