export function createWorkPage(): HTMLElement {
  const page = document.createElement("div");
  page.className = "page";
  page.dataset.page = "work";

  const projects = [
    { title: "Burn Transition", desc: "FBM fire consumes one page to reveal the next. Five compositing zones: heat distortion, ember line, char, clean reveal, smoke.", color: "#ef4444" },
    { title: "Desktop Cube", desc: "3D cube rotation between pages. Old content on the departing face, new content on the arriving face. Perspective projection.", color: "#f59e0b" },
    { title: "Wobbly Dissolve", desc: "Spring-physics wave ripples outward from the click point. Chromatic aberration at the wavefront as new content bleeds through.", color: "#6366f1" },
    { title: "Genie Warp", desc: "Page squeezes into a point like the classic Compiz minimize effect, while the new page expands out.", color: "#10b981" },
    { title: "Magnetic Scatter", desc: "Pixels scatter toward the click point with Gaussian falloff, then reassemble as the new page. RGB channel splitting.", color: "#ec4899" },
    { title: "Noise Dissolve", desc: "Simplex noise threshold sweep with a glowing edge at the boundary between old and new content.", color: "#8b5cf6" },
  ];

  page.innerHTML = `
    <div class="page-content" style="max-width: 960px;">
      <div class="accent-line" style="background: var(--accent-work)"></div>
      <h1>Transition<br>Effects</h1>
      <p>Each effect is a self-contained fragment shader that reads two textures and a progress value.</p>
      <div class="work-grid">
        ${projects
          .map(
            (p) => `
          <div class="work-card" style="border-color: ${p.color}22;">
            <div class="work-card-dot" style="background: ${p.color};"></div>
            <h3>${p.title}</h3>
            <p>${p.desc}</p>
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  `;
  return page;
}
