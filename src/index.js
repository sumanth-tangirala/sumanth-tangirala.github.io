import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";

// Mark the page while the last input was a finger, so hover styles (see the
// `hover` mixin) don't stick after a tap. Keyed off pointerType rather than
// (hover: none): an iPad with a trackpad or Pencil reports hover.
const setTouchInput = (event) => {
  document.documentElement.classList.toggle(
    "touch-input",
    event.pointerType === "touch",
  );
};
window.addEventListener("pointerdown", setTouchInput, { passive: true });
window.addEventListener("pointermove", setTouchInput, { passive: true });

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
