import { products } from "../pages/Home.jsx";

function ProductUI({ product }) {
  return (
    <article className="product-card">
      <div className="product-mark" aria-hidden="true">
        {product.category}
      </div>
      <div className="product-card-content">
        <p className="product-category">{product.category}</p>
        <h3>{product.name}</h3>
        <p className="product-description">{product.description}</p>
        <div className="product-footer">
          <strong>{product.price}</strong>
          <span
            className="product-rating"
            aria-label={`${product.rating} out of 5 stars`}
          >
            ★ {product.rating} <small>({product.reviews})</small>
          </span>
        </div>
      </div>
    </article>
  );
}

export default ProductUI;
