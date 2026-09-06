import "../styles/home.css";
import ProductUI from "../components/ProductUI";

const products = [
  {
    name: "Classic Cotton Shirt",
    category: "Shirts",
    description:
      "A comfortable everyday shirt made from soft, breathable cotton.",
    price: "$34.99",
    rating: "4.8",
    reviews: 124,
  },
  {
    name: "Relaxed Fit Hoodie",
    category: "Sweatshirts",
    description:
      "A warm relaxed-fit hoodie for cool mornings and easy weekends.",
    price: "$49.99",
    rating: "4.6",
    reviews: 98,
  },
  {
    name: "Straight Leg Denim",
    category: "Jeans",
    description:
      "Classic denim with a straight-leg fit that works with everything.",
    price: "$59.99",
    rating: "4.7",
    reviews: 86,
  },
  {
    name: "Everyday Linen Trousers",
    category: "Trousers",
    description:
      "Lightweight linen trousers designed for a polished, comfortable fit.",
    price: "$44.99",
    rating: "4.5",
    reviews: 73,
  },
  {
    name: "Essential Knit Sweater",
    category: "Knitwear",
    description: "A versatile knit layer with a clean shape and a soft finish.",
    price: "$54.99",
    rating: "4.9",
    reviews: 151,
  },
  {
    name: "Daily Canvas Jacket",
    category: "Jackets",
    description:
      "A durable canvas jacket with a simple style for everyday wear.",
    price: "$69.99",
    rating: "4.4",
    reviews: 61,
  },
];

function Home() {
  return (
    <section className="home-page">
      <header className="home-header">
        <p className="eyebrow">THE EVERYDAY EDIT</p>
        <h1>Clothes that feel like you.</h1>
        <p className="home-intro">
          Simple, comfortable pieces made for every part of your day.
        </p>
      </header>

      <div className="catalogue-heading">
        <h2>Featured products</h2>
        <p>{products.length} pieces to explore</p>
      </div>

      <div className="product-grid">
        {products.map((product) => (
          <ProductUI key={product.name} product={product} />
        ))}
      </div>
    </section>
  );
}

export default Home;
export { products };
