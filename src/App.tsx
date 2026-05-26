import "./index.css";

import logo from "./logo.svg";
import reactLogo from "./react.svg";

export function App() {
  return (
    <div className="app">
      <div className="logo-container">
        <img src={logo} alt="Bun Logo" className="logo bun-logo" />
        <img src={reactLogo} alt="React Logo" className="logo react-logo" />
      </div>

      <h1>Air Strafer</h1>
      <p>
        Bun-powered React frontend. Edit <code>src/App.tsx</code> and save to
        test HMR.
      </p>
    </div>
  );
}

export default App;
