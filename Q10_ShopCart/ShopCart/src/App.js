import React from "react";
import ProductList from "./components/ProductList";
import Cart from "./components/Cart";

function App() {
  return (
    <div className="app">
      <h1 id="title">Shop Cart</h1>
      <ProductList />
      <Cart />
    </div>
  );
}

export default App;
