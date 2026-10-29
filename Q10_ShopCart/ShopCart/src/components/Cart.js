import React from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import {
  removeFromCart,
  orderRequest,
  orderSuccess,
  orderFailure,
  selectCartCount,
  selectCartTotal,
} from "../redux/cart";

const ORDERS_URL = "https://shop.example.com/api/orders";

function Cart() {
  const dispatch = useDispatch();
  const items = useSelector((state) => state.items);
  const order = useSelector((state) => state.order);
  const count = useSelector(selectCartCount);
  const total = useSelector(selectCartTotal);

  const lines = Object.values(items).sort((a, b) => a.id - b.id);

  const handleCheckout = async () => {
    if (order.status === "loading" || count === 0) return;

    dispatch(orderRequest());
    try {
      // POST the order: the body lists the products and quantities, plus the total
      const response = await axios.post(ORDERS_URL, {
        items: lines.map((line) => ({ id: line.id, qty: line.qty })),
        total,
      });
      dispatch(orderSuccess(response.data.id));
    } catch (err) {
      dispatch(
        orderFailure(
          err.response ? `Server error: ${err.response.status}` : `Network error: ${err.message}`
        )
      );
    }
  };

  return (
    <div>
      <h2>Cart</h2>

      {lines.length === 0 ? (
        <p id="cartEmpty" className="muted">Your cart is empty</p>
      ) : (
        <ul id="cartList">
          {lines.map((line) => (
            <li key={line.id} id={`cart-${line.id}`}>
              {`${line.name} x ${line.qty}`}{" "}
              <button id={`remove-${line.id}`} onClick={() => dispatch(removeFromCart(line.id))}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <p>
        Items in cart: <span id="cartCount">{count}</span>
      </p>
      <p>
        Total: <span id="cartTotal">{total}</span>
      </p>

      <button
        id="checkoutBtn"
        disabled={count === 0 || order.status === "loading"}
        onClick={handleCheckout}
      >
        Place Order
      </button>

      {order.status === "loading" && <p id="orderLoading">Placing order...</p>}
      {order.status === "success" && (
        <p id="orderSuccess" className="success">{`Order placed! Order id: ${order.id}`}</p>
      )}
      {order.status === "error" && <p id="orderError" className="error">{order.error}</p>}
    </div>
  );
}

export default Cart;
