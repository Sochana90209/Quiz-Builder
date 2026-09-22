/* Quiz Builder — shared UI helpers used by every page. */
(function (global) {
  "use strict";

  /* Resolve sibling folders relative to the current page so the app works from
   * any folder (file://, localhost, or a sub-path on a host). */
  var ROOT = (function () {
    var path = global.location.pathname;
    var i = path.lastIndexOf("/");
    var dir = i >= 0 ? path.slice(0, i) : "";
    var j = dir.lastIndexOf("/");
    return j >= 0 ? dir.slice(0, j) : "";
  })();

  var PATHS = {
    login: ROOT + "/Authentication/index.html",
    signup: ROOT + "/Authentication/signup.html",
    dashboard: ROOT + "/Admin/dashboard.html",
    create: ROOT + "/Admin/create.html",
    join: ROOT + "/User/join.html",
    play: ROOT + "/User/play.html",
    result: ROOT + "/User/result.html"
  };

  function $(sel, scope) { return (scope || document).querySelector(sel); }
  function $$(sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      if (k === "class") node.className = attrs[k];
      else if (k === "text") node.textContent = attrs[k];
      else if (k === "html") node.innerHTML = attrs[k];
      else if (k.indexOf("on") === 0 && typeof attrs[k] === "function") node.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== null && attrs[k] !== undefined && attrs[k] !== false) node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) {
      if (c === null || c === undefined) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  function go(path, params) {
    var url = path;
    if (params) {
      var q = Object.keys(params).map(function (k) {
        return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]);
      }).join("&");
      if (q) url += "?" + q;
    }
    global.location.href = url;
  }

  function query(name) {
    return new URLSearchParams(global.location.search).get(name);
  }

  /* ---------- toast ---------- */
  function toastWrap() {
    var wrap = $(".toast-wrap");
    if (!wrap) {
      wrap = el("div", { class: "toast-wrap", role: "status", "aria-live": "polite" });
      document.body.appendChild(wrap);
    }
    return wrap;
  }

  function toast(message, kind) {
    var node = el("div", { class: "toast" + (kind === "error" ? " is-error" : ""), text: message });
    toastWrap().appendChild(node);
    setTimeout(function () {
      node.style.opacity = "0";
      setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 260);
    }, 2600);
  }

  /* ---------- chrome ---------- */
  function renderTopbar(options) {
    options = options || {};
    var host = $("[data-topbar]");
    if (!host) return;
    var session = global.QBStorage.getSession();

    var actions = el("div", { class: "nav-actions" });
    if (session) {
      actions.appendChild(el("span", { class: "user-chip", text: session.name }));
      actions.appendChild(el("a", { class: "btn btn-ghost btn-sm", href: PATHS.dashboard, text: "Dashboard" }));
      actions.appendChild(el("button", {
        class: "btn btn-secondary btn-sm", type: "button", text: "Log out",
        onclick: function () { global.QBStorage.logout(); go(PATHS.login); }
      }));
    } else {
      actions.appendChild(el("a", { class: "btn btn-ghost btn-sm", href: PATHS.join, text: "Join a quiz" }));
      actions.appendChild(el("a", { class: "btn btn-primary btn-sm", href: PATHS.login, text: "Log in" }));
    }

    host.innerHTML = "";
    host.appendChild(el("div", { class: "topbar-inner" }, [
      el("a", { class: "brand", href: session ? PATHS.dashboard : PATHS.login }, [
        el("span", { class: "brand-mark", "aria-hidden": "true", text: "Q" }),
        el("span", { text: "Quiz Builder" })
      ]),
      actions
    ]));
  }

  function requireSession() {
    var session = global.QBStorage.getSession();
    if (!session) { go(PATHS.login); return null; }
    return session;
  }

  /* ---------- image handling ---------- */
  function readAndResizeImage(file, maxSize, quality) {
    maxSize = maxSize || 900;
    quality = quality || 0.72;
    return new Promise(function (resolve, reject) {
      if (!file) return reject(new Error("No file selected."));
      if (!/^image\//.test(file.type)) return reject(new Error("Please choose an image file."));
      if (file.size > 8 * 1024 * 1024) return reject(new Error("Image must be smaller than 8 MB."));
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error("Could not read that image.")); };
      reader.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(new Error("That image could not be loaded.")); };
        img.onload = function () {
          var w = img.width, h = img.height;
          var scale = Math.min(1, maxSize / Math.max(w, h));
          var canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(w * scale));
          canvas.height = Math.max(1, Math.round(h * scale));
          var ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          try {
            resolve(canvas.toDataURL("image/jpeg", quality));
          } catch (e) {
            resolve(String(reader.result));
          }
        };
        img.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      try {
        var ta = el("textarea", { value: text, "aria-hidden": "true" });
        ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        resolve();
      } catch (e) { reject(e); }
    });
  }

  function formatTime(seconds) {
    seconds = Math.max(0, Math.round(seconds));
    var m = Math.floor(seconds / 60), s = seconds % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function prefersReducedMotion() {
    return global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  global.QB = {
    PATHS: PATHS,
    $: $, $$: $$, el: el, go: go, query: query,
    toast: toast,
    renderTopbar: renderTopbar,
    requireSession: requireSession,
    readAndResizeImage: readAndResizeImage,
    copyText: copyText,
    formatTime: formatTime,
    prefersReducedMotion: prefersReducedMotion
  };
})(window);
