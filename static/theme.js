(function () {
  const key = "syncpundit-translate-theme";
  const system = window.matchMedia("(prefers-color-scheme: light)");
  let saved;
  try { saved = localStorage.getItem(key); } catch { saved = null; }

  function setTheme(value, remember) {
    document.documentElement.dataset.theme = value;
    document.documentElement.style.colorScheme = value;
    const toggle = document.getElementById("theme-toggle");
    if (toggle) {
      const next = value === "dark" ? "light" : "dark";
      toggle.setAttribute("aria-label", `Switch to ${next} mode`);
      toggle.title = `Switch to ${next} mode`;
      toggle.setAttribute("aria-pressed", String(value === "dark"));
    }
    if (remember) {
      saved = value;
      try { localStorage.setItem(key, value); } catch { /* The choice still works for this page. */ }
    }
  }

  setTheme(saved === "light" || saved === "dark" ? saved : system.matches ? "light" : "dark", false);
  system.addEventListener("change", (event) => {
    if (!saved) setTheme(event.matches ? "light" : "dark", false);
  });
  document.addEventListener("DOMContentLoaded", () => {
    setTheme(document.documentElement.dataset.theme, false);
    document.getElementById("theme-toggle").addEventListener("click", () => {
      setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark", true);
    });
  });
})();
