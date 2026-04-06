import "./style.css";
import "./pages/styles/pages.css";

import { TransitionEngine } from "./transitions/TransitionEngine.ts";
import { Router } from "./router/Router.ts";
import { dissolveEffect } from "./transitions/transitions/dissolve.ts";
import { burnEffect } from "./transitions/transitions/burn.ts";
import { cubeEffect } from "./transitions/transitions/cube.ts";
import { wobblyEffect } from "./transitions/transitions/wobbly.ts";
import { genieEffect } from "./transitions/transitions/genie.ts";
import { magneticEffect } from "./transitions/transitions/magnetic.ts";

import { createHomePage } from "./pages/home.ts";
import { createAboutPage } from "./pages/about.ts";


// Boot
const canvas = document.getElementById("scene") as HTMLCanvasElement;
const engine = new TransitionEngine(canvas);

// Register transition effects
engine.registerEffect(dissolveEffect);
engine.registerEffect(burnEffect);
engine.registerEffect(cubeEffect);
engine.registerEffect(wobblyEffect);
engine.registerEffect(genieEffect);
engine.registerEffect(magneticEffect);

// Wire up the effect picker
const picker = document.getElementById(
  "transition-select"
) as HTMLSelectElement;
picker.value = engine.getSelectedEffect();
picker.addEventListener("change", () => {
  engine.setSelectedEffect(picker.value);
  localStorage.setItem("compiz-effect", picker.value);
});

// Restore saved preference
const saved = localStorage.getItem("compiz-effect");
if (saved) {
  engine.setSelectedEffect(saved);
  picker.value = saved;
}

// Set up routes
const router = new Router(engine);
router
  .addRoute("/", createHomePage)
  .addRoute("/about", createAboutPage);

router.start();
