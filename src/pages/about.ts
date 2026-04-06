export function createAboutPage(): HTMLElement {
  const page = document.createElement("div");
  page.className = "page";
  page.dataset.page = "about";
  page.innerHTML = `
    <div class="page-content">
      <div class="accent-line" style="background: var(--accent-about)"></div>
      <h1>About This<br>Experiment</h1>
      <p>
        Compiz was a compositing window manager for Linux that turned every
        desktop interaction into a visual treat (or headache-inducing animation, your call).
      </p>
      <p>
        This project brings those ideas to the web. The
        <code>texElementImage2D()</code> API from the
        <a href="https://developer.chrome.com/blog/html-in-canvas" target="_blank" rel="noopener">HTML-in-Canvas</a>
        proposal renders live HTML directly into WebGL textures, letting
        fragment shaders read and distort every pixel in real time.
      </p>
      <p>
        The result: page navigations that feel like magic. Two pages exist
        simultaneously as shader textures, composited through fire simulations,
        cube geometry, and displacement fields.
      </p>
    </div>
    <footer class="page-footer">
      Made by <a href="https://x.com/MaxLeiter" target="_blank" rel="noopener">MaxLeiter</a>
    </footer>
  `;
  return page;
}
