// Shared helpers for all test pages: theme toggle with a remembered choice.
(function () {
  var KEY = "tests-theme";
  var root = document.documentElement;

  try {
    var saved = localStorage.getItem(KEY);
    if (saved) root.dataset.theme = saved;
  } catch (e) {}

  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.getElementById("themeBtn");
    if (!btn) return;
    btn.onclick = function () {
      var dark = root.dataset.theme
        ? root.dataset.theme === "dark"
        : matchMedia("(prefers-color-scheme: dark)").matches;
      root.dataset.theme = dark ? "light" : "dark";
      try { localStorage.setItem(KEY, root.dataset.theme); } catch (e) {}
    };
  });
})();

// Renders a test result to a PNG and hands it to the user:
// share sheet on phones (Save to Files / Photos), download on desktop,
// or an on-screen image to long-press when neither is available.
window.prepareResultImage = function (opts) {
  var W = 1080, PAD = 72, INNER = W - PAD * 2;
  var css = getComputedStyle(document.documentElement);
  var tok = function (v) {
    var m = /var\((--[\w-]+)\)/.exec(v);
    return m ? css.getPropertyValue(m[1]).trim() : v;
  };
  var C = {
    bg: tok("var(--bg)"), card: tok("var(--surface)"), track: tok("var(--surface-2)"),
    ink: tok("var(--ink)"), muted: tok("var(--muted)"), line: tok("var(--line)"), accent: tok("var(--accent)")
  };
  var SANS = '"Manrope", system-ui, -apple-system, "Segoe UI", sans-serif';
  var SERIF = '"Playfair Display", Georgia, serif';

  function wrap(ctx, text, maxW) {
    var words = String(text).split(" "), lines = [], cur = "";
    words.forEach(function (w) {
      var t = cur ? cur + " " + w : w;
      if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
    });
    if (cur) lines.push(cur);
    return lines;
  }

  // Single layout routine: measures when draw is false, paints when true
  function layout(ctx, draw) {
    var y = PAD;
    function text(str, font, color, x, lh, maxW) {
      ctx.font = font;
      var lines = wrap(ctx, str, maxW || INNER);
      lines.forEach(function (l) {
        if (draw) { ctx.fillStyle = color; ctx.fillText(l, x || PAD, y + lh * 0.75); }
        y += lh;
      });
    }
    // Header
    ctx.font = "700 26px " + SANS;
    if (draw) {
      ctx.fillStyle = C.accent; ctx.fillText(opts.brand.toUpperCase(), PAD, y + 22);
      ctx.fillStyle = C.muted; ctx.textAlign = "right";
      ctx.fillText(new Date().toLocaleDateString("ru-RU"), W - PAD, y + 22);
      ctx.textAlign = "left";
    }
    y += 70;
    text(opts.eyebrow, "500 30px " + SANS, C.muted, PAD, 44);
    y += 6;
    text(opts.title, "700 62px " + SERIF, C.ink, PAD, 76);
    y += 18;
    opts.descs.forEach(function (d) { text(d, "400 31px " + SANS, C.ink, PAD, 46); y += 14; });

    // Bars
    y += 26;
    if (draw) { ctx.fillStyle = C.line; ctx.fillRect(PAD, y, INNER, 2); }
    y += 50;
    text(opts.barsTitle, "700 42px " + SERIF, C.ink, PAD, 56);
    y += 16;
    opts.rows.forEach(function (r) {
      if (draw) {
        var color = tok(r.color);
        ctx.font = "700 32px " + SANS;
        ctx.fillStyle = r.lead ? color : C.ink;
        ctx.fillText(r.label, PAD, y + 30);
        var lw = ctx.measureText(r.label + "  ").width;
        ctx.font = "500 26px " + SANS; ctx.fillStyle = C.muted;
        ctx.fillText(r.sub, PAD + lw, y + 30);
        ctx.textAlign = "right";
        ctx.fillText(r.share + "%", W - PAD, y + 30);
        ctx.font = "700 32px " + SANS; ctx.fillStyle = C.ink;
        ctx.fillText(String(r.value), W - PAD - 90, y + 30);
        ctx.textAlign = "left";
        roundRect(ctx, PAD, y + 52, INNER, 22, 11, C.track);
        if (r.width > 0) roundRect(ctx, PAD, y + 52, Math.max(22, INNER * r.width / 100), 22, 11, color);
      }
      y += 112;
    });
    if (opts.note) { y += 4; text(opts.note, "400 25px " + SANS, C.muted, PAD, 36); }
    if (location.protocol.indexOf("http") === 0) {
      y += 24;
      text(location.host + location.pathname.replace(/[^/]*$/, ""), "500 24px " + SANS, C.muted, PAD, 34);
    }
    return y + PAD;
  }

  function roundRect(ctx, x, y, w, h, r, fill) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
  }

  // Render right away so the click handler can share synchronously:
  // iOS only opens the share sheet inside the user gesture.
  var out = null;
  var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  var rendering = ready.then(function () {
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");
    canvas.width = W;
    canvas.height = layout(ctx, false);
    ctx = canvas.getContext("2d");
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, canvas.height);
    layout(ctx, true);
    return new Promise(function (res) {
      canvas.toBlob(function (b) {
        var name = opts.filename + ".png", file = null;
        try { file = new File([b], name, { type: "image/png" }); } catch (e) {}
        out = { blob: b, file: file, name: name, canvas: canvas };
        res(out);
      }, "image/png");
    });
  });

  var ua = navigator.userAgent;
  var isIOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  var inApp = /Telegram|FBAN|FBAV|Instagram|VKClient|; wv\)/i.test(ua);

  function deliver(o) {
    var canShare = o.file && navigator.canShare && navigator.canShare({ files: [o.file] });
    // iPhone: share sheet has "Save to Files" and "Save Image"
    if (isIOS && canShare) {
      return navigator.share({ files: [o.file], title: opts.title }).catch(function (e) {
        if (e && e.name !== "AbortError") showImage(o.canvas);
      });
    }
    // Desktop and Android browsers: regular download
    if (!inApp && "download" in HTMLAnchorElement.prototype) {
      var a = document.createElement("a");
      a.href = URL.createObjectURL(o.blob);
      a.download = o.name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      return;
    }
    if (canShare) {
      return navigator.share({ files: [o.file], title: opts.title }).catch(function (e) {
        if (e && e.name !== "AbortError") showImage(o.canvas);
      });
    }
    showImage(o.canvas);
  }

  return {
    save: function () {
      if (out) return deliver(out);
      return rendering.then(deliver);
    }
  };

  function showImage(canvas) {
    var ov = document.createElement("div");
    ov.className = "save-overlay";
    ov.innerHTML = '<div class="save-box"><p>Нажмите на картинку и удерживайте, затем выберите «Сохранить изображение».</p>' +
      '<img alt="Результат теста"><button class="btn btn-primary btn-block" type="button">Готово</button></div>';
    ov.querySelector("img").src = canvas.toDataURL("image/png");
    ov.querySelector("button").onclick = function () { ov.remove(); };
    document.body.appendChild(ov);
  }
};
