import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { increment, decrement, addAmount, reset } from "../redux/counter";

function CounterControls() {
  const dispatch = useDispatch();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  const handleAmountChange = (event) => {
    setAmount(event.target.value);
    setError("");
  };

  const handleAdd = () => {
    const value = Number(amount);

    // Validate in the component: an invalid amount is never dispatched
    if (amount.trim() === "" || !Number.isInteger(value) || value <= 0) {
      setError("Enter a whole number above 0");
      return;
    }

    dispatch(addAmount(value));
    setAmount("");
    setError("");
  };

  return (
    <div>
      <div>
        <button id="decrementBtn" onClick={() => dispatch(decrement())}>-1</button>
        <button id="incrementBtn" onClick={() => dispatch(increment())}>+1</button>
        <button id="resetBtn" onClick={() => dispatch(reset())}>Reset</button>
      </div>

      <div>
        <input
          id="amountInput"
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={handleAmountChange}
        />
        <button id="addBtn" onClick={handleAdd}>Add</button>
        {error && <p id="amountError" className="error">{error}</p>}
      </div>
    </div>
  );
}

export default CounterControls;
