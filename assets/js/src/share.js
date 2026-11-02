// ══ SHARE / QR ══
import { toast } from './modals.js';
import { openModal } from './modals.js';
import { copyText } from './state.js';
import { fileURL } from './files.js';

let _shareTarget = "";
export function shareFile(name) {
  _shareTarget = name;
  document.getElementById("share-result").style.display = "none";
  document.getElementById("share-limit").value = "0";
  document.getElementById("share-expire").value = "0";
  openModal("share-modal");
}
export function generateShareLink() {
  const limit = document.getElementById("share-limit").value;
  const expire = parseInt(document.getElementById("share-expire").value) || 60;
  const expireSeconds = expire * 60;

  // Build the URL with the URL API: pasting the raw path onto the host
  // produced an invalid URL for names without a leading slash and a
  // non-canonical URL (double slash) for the ones with it.
  const url = fileURL(_shareTarget);
  url.search = `share&expires=${expireSeconds}`;
  if (parseInt(limit) > 0) {
    url.search += `&limit=${encodeURIComponent(limit)}`;
  } else {
    url.search += "&limit=-1";
  }

  fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  })
    .then((r) => r.json())
    .then((d) => {
      const res = document.getElementById("share-result");
      res.style.whiteSpace = "pre";
      res.style.display = "block";
      res.textContent = d.urls.join("\n");

      const qr = document.getElementById("share-result-qr");
      qr.style.display = "block";
      new QRious({
        element: document.getElementById("share-qr-canvas"),
        value: d.urls[0],
        size: 200,
      });
    })
    .catch(() => toast("Share failed", "error"));
}
export function showQR(path) {
  const link = fileURL(path).toString();

  // Generate QR code on canvas
  new QRious({
    element: document.getElementById("qr-canvas"),
    value: link,
    size: 200,
  });

  document.getElementById("qr-url").textContent = link;
  openModal("qr-modal");
}

// ══ SHARED LINKS PANEL ══
export function initSharedLinks() {
  // Build URLs and relative times for each card
  const base = location.protocol + "//" + window.location.host;
  document.querySelectorAll(".share-card").forEach((card) => {
    const id = card.id.replace("share-card-", "");
    const urlEl = document.getElementById("share-url-" + id);
    if (urlEl) {
      const path = card.querySelector(".share-card-path").textContent.trim();
      urlEl.textContent = `${base}${path}?token=${id}`;
    }
  });
  updateShareExpiries();
  setInterval(updateShareExpiries, 30000);
}

function updateShareExpiries() {
  const now = Math.floor(Date.now() / 1000);
  document.querySelectorAll(".share-expiry-rel").forEach((el) => {
    const exp = parseInt(el.dataset.expires, 10);
    const diff = exp - now;
    if (diff <= 0) {
      el.textContent = "expired";
      el.style.color = "var(--danger)";
    } else if (diff < 60) {
      el.textContent = `in ${diff}s`;
      el.style.color = "var(--warn)";
    } else if (diff < 3600) {
      el.textContent = `in ${Math.floor(diff / 60)}m`;
      el.style.color = "var(--warn)";
    } else if (diff < 86400) {
      el.textContent = `in ${Math.floor(diff / 3600)}h`;
      el.style.color = "var(--text1)";
    } else {
      el.textContent = `in ${Math.floor(diff / 86400)}d`;
      el.style.color = "var(--text1)";
    }
  });
}

export function showShareQR(token) {
  const urlEl = document.getElementById("share-url-" + token);
  if (!urlEl) return;
  const url = urlEl.textContent.trim();
  new QRious({
    element: document.getElementById("qr-canvas"),
    value: url,
    size: 200,
  });
  document.getElementById("qr-url").textContent = url;
  openModal("qr-modal");
}

export function copyShareUrl(token) {
  const urlEl = document.getElementById("share-url-" + token);
  if (!urlEl) return;
  copyText(urlEl.textContent.trim())
    .then(() => toast("URL copied", "success"))
    .catch(() => toast("Copy failed", "error"));
}

export function deleteShareLink(token, path) {
  if (!confirm("Do you really want to delete the shared link?")) return;

  const proto = location.protocol === "https:" ? "https://" : "http://";
  const url = proto + window.location.host + "/?token=" + token;
  const csrf = document.querySelector('meta[name="csrf-token"]')?.content || "";

  fetch(url, { method: "DELETE", headers: { "X-CSRF-Token": csrf } })
    .then(() => {
      sessionStorage.setItem("activeTab", "nav-share");
      location.reload();
    })
    .catch(() => toast("Delete failed", "error"));
}
