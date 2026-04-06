export function createContactPage(): HTMLElement {
  const page = document.createElement("div");
  page.className = "page";
  page.dataset.page = "contact";
  page.innerHTML = `
    <div class="page-content">
      <div class="accent-line" style="background: var(--accent-contact)"></div>
      <h1>Get In<br>Touch</h1>
      <p>Interactive form elements work through the canvas — focus, type, tab between fields.</p>
      <form class="contact-form" onsubmit="return false;">
        <div class="form-group">
          <label for="name">Name</label>
          <input type="text" id="name" placeholder="Your name" autocomplete="off" />
        </div>
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" placeholder="you@example.com" autocomplete="off" />
        </div>
        <div class="form-group">
          <label for="message">Message</label>
          <textarea id="message" rows="4" placeholder="What's on your mind?"></textarea>
        </div>
        <button type="submit">Send Message</button>
      </form>
    </div>
  `;
  return page;
}
