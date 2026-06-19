(function () {
  function fit(el, min = 180) {
    if (!el) return;
    el.style.height = `${min}px`;
    el.style.height = `${Math.max(min, el.scrollHeight)}px`;
  }

  function showToast(message, type = "success", duration = 2500) {
    const host = document.getElementById("toasts");
    if (!host) return;
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    const text = document.createElement("div");
    text.textContent = message;
    const close = document.createElement("button");
    close.type = "button";
    close.className = "close";
    close.setAttribute("aria-label", "Dismiss");
    close.textContent = "×";
    el.append(text, close);
    host.appendChild(el);

    const remove = () => {
      el.style.animation = "toast-out 0.18s ease forwards";
      el.addEventListener("animationend", () => el.remove(), { once: true });
    };
    close.addEventListener("click", remove);
    if (duration) setTimeout(remove, duration);
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-9999px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  }

  function initTextareas() {
    const input = document.getElementById("input");
    const output = document.getElementById("output");
    fit(input);
    fit(output);
    input?.addEventListener("input", () => fit(input));
    input?.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        document.getElementById("translation-form")?.requestSubmit();
      }
    });
  }

  function initShare() {
    const btn = document.getElementById("copy-share");
    const input = document.getElementById("share-url");
    if (!btn || !input) return;

    btn.addEventListener("click", async () => {
      const url = new URL(input.value, location.origin).toString();
      try {
        const ok = await copyText(url);
        showToast(ok ? "Copied — ready to share." : "Select and copy manually.", ok ? "success" : "warn");
      } catch {
        showToast("Select and copy the link manually.", "warn");
      }
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        btn.click();
      }
    });
    input.addEventListener("click", () => input.select());
  }

  document.addEventListener("DOMContentLoaded", () => {
    initTextareas();
    initShare();
  });
})();
