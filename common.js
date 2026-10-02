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
