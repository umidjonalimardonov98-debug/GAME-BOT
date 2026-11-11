import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { installGlobalClickSound } from "./lib/sound";

installGlobalClickSound();

createRoot(document.getElementById("root")!).render(<App />);
