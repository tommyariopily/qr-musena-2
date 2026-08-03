// ===== Service Worker: Absensi QR — SMP Muhammadiyah 9 Nagreg =====
// Naikkan angka versi ini setiap kali index.html diubah, supaya
// pengguna otomatis mendapat versi terbaru saat online.
const VERSI_CACHE = 'absensi-qr-v1';

const ASET_INTI = [
  './absensi-qr-smp.html',
  './manifest-absensi.json',
  'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js',
  'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js'
];

// Jangan pernah cache panggilan ke API Google Apps Script — data absensi
// harus selalu ambil yang terbaru dari server, bukan dari cache lama.
const HOST_API = 'script.google.com';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSI_CACHE).then((cache) => {
      return Promise.all(
        ASET_INTI.map((url) =>
          cache.add(url).catch((err) => {
            // Jika satu aset CDN gagal diambil (mis. offline saat install),
            // jangan gagalkan instalasi SW secara keseluruhan.
            console.warn('SW: gagal precache', url, err);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((namaCache) =>
      Promise.all(
        namaCache
          .filter((nama) => nama !== VERSI_CACHE)
          .map((nama) => caches.delete(nama))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Hanya tangani GET; biarkan POST/PUT dst langsung ke network.
  if (req.method !== 'GET') return;

  // API absensi: selalu ambil dari network (tidak pernah dari cache).
  if (url.hostname === HOST_API) {
    event.respondWith(
      fetch(req).catch(() =>
        new Response(
          JSON.stringify({ ok: false, pesan: 'Tidak ada koneksi internet.' }),
          { headers: { 'Content-Type': 'application/json' } }
        )
      )
    );
    return;
  }

  // Aset lain (app shell & CDN): cache-first, lalu perbarui cache di latar belakang.
  event.respondWith(
    caches.match(req).then((cached) => {
      const jaringan = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const salinan = res.clone();
            caches.open(VERSI_CACHE).then((cache) => cache.put(req, salinan));
          }
          return res;
        })
        .catch(() => cached);
      return cached || jaringan;
    })
  );
});
