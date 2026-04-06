export function createHomePage(): HTMLElement {
  const page = document.createElement("div");
  page.className = "page";
  page.dataset.page = "home";
  page.innerHTML = `
    <div class="page-content">
      <div class="accent-line" style="background: var(--accent-home)"></div>
      <h1>Welcome to<br>Compiz Web</h1>
      <p>
        A website with shader-driven page transitions inspired by the
        Compiz window manager. Every navigation triggers a WebGL shader that reads
        both pages as textures and composites them through the selected effect.
      </p>
      <p>
        Built with the <a href="https://developer.chrome.com/blog/html-in-canvas" target="_blank" rel="noopener"><strong>HTML-in-Canvas</strong></a> API.
        Click any link and watch the pixels burn.
      </p>
      <p style="margin-top: 32px;">
        <a href="/about" style="color: var(--accent-about); text-decoration: underline;">See in action &rarr;</a>
      </p>
    </div>
    <footer class="page-footer">
      Made by <a href="https://x.com/MaxLeiter" target="_blank" rel="noopener">MaxLeiter</a>
    </footer>
  `;
  return page;
}
