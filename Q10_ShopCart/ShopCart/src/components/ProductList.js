import React, { useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { addToCart } from "../redux/cart";

const PRODUCTS_URL = "https://shop.example.com/api/products";

// Provided in the starter code. Products stay in local state: only the cart is shared.
function ProductList() {
  const dispatch = useDispatch();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(PRODUCTS_URL);
      if (!response.ok) {
        setError(`Failed to load products (status ${response.status})`);
        return;
      }
      setProducts(await response.json());
    } catch (err) {
      setError(`Network error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  return (
    <div>
      <h2>Products</h2>
      {loading && <p id="productsLoading">Loading products...</p>}
      {error && (
        <div>
          <p id="productsError" className="error">{error}</p>
          <button id="productsRetryBtn" onClick={loadProducts}>Retry</button>
        </div>
      )}
      {!loading && !error && (
        <ul id="productList">
          {products.map((product) => (
            <li key={product.id} id={`product-${product.id}`}>
              {`${product.name} - Price: ${product.price}`}{" "}
              <button id={`add-${product.id}`} onClick={() => dispatch(addToCart(product))}>
                Add to cart
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ProductList;
