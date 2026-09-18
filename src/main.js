import { getCurrentWindow } from '@tauri-apps/api/window';

const appWindow = getCurrentWindow();

// URL Konfigurasi
const URL_API = "https://smansrono.sch.id/link_ujian/proses_hukuman.php";
const URL_GET_LINK = "https://smansrono.sch.id/link_ujian/get_sat.php";
const API_KEY = "SMANSRONO_SECRET_2026";

// Elemen DOM
const layoutRegistrasi = document.getElementById('layout-registrasi');
const layoutPeringatan = document.getElementById('layout-peringatan');
const layoutBlokir = document.getElementById('layout-blokir');
const teksTimer = document.getElementById('teks-timer');
const inputNama = document.getElementById('input-nama');
const inputNIS = document.getElementById('input-nis');
const btnSimpan = document.getElementById('btn-simpan');
const btnMengerti = document.getElementById('btn-mengerti');
const webViewFrame = document.getElementById('webview-frame');

// State Aplikasi
let deviceID = localStorage.getItem("device_id") || "WIN-" + Math.random().toString(36).substring(2, 12);
localStorage.setItem("device_id", deviceID);

let linkUjianDariDatabase = "";
let sudahMulaiUjian = false;
let sedangTerblokir = false;
let timerHukuman = null;

// 1. Dapatkan Link Ujian Terbaru dari Database
async function ambilLinkTerbaru() {
  try {
    const response = await fetch(URL_GET_LINK);
    const data = await response.json();
    linkUjianDariDatabase = data.link_sat;
  } catch (err) {
    alert("Gagal koneksi server ujian!");
  }
}

// 2. Hubungi Server Ujian (Cek Status / Tambah Hukuman / Registrasi)
async function hubungiServer(aksi, extraData = {}) {
  const formData = new FormData();
  formData.append("device_id", deviceID);
  formData.append("aksi", aksi);
  formData.append("api_key", API_KEY);
  
  for (const key in extraData) {
    formData.append(key, extraData[key]);
  }

  try {
    const res = await fetch(URL_API, { method: "POST", body: formData });
    const textRes = (await res.text()).trim();

    if (textRes === "berhasil") {
      hubungiServer("cek");
      return;
    }

    const part = textRes.split("|");
    const sisaHukuman = parseInt(part[1] || "0", 10);

    if (sisaHukuman > 0) {
      sedangTerblokir = true;
      layoutPeringatan.classList.add('hidden');
      layoutRegistrasi.classList.add('hidden');
      mulaiLayarBlokir(sisaHukuman);
    } else {
      if (sedangTerblokir) {
        sedangTerblokir = false;
        layoutBlokir.classList.add('hidden');
        if (timerHukuman) clearInterval(timerHukuman);
        if (sudahMulaiUjian) webViewFrame.src = linkUjianDariDatabase;
      }

      if (!sudahMulaiUjian) {
        if (part[0] === "BELUM_REGIS") {
          layoutRegistrasi.classList.remove('hidden');
          layoutPeringatan.classList.add('hidden');
        } else {
          layoutRegistrasi.classList.add('hidden');
          layoutPeringatan.classList.remove('hidden');
        }
      }
    }
  } catch (err) {
    console.error("Gagal terhubung ke API:", err);
  }
}

// 3. Layar Blokir (Timer Hukuman)
function mulaiLayarBlokir(durasiMs) {
  layoutBlokir.classList.remove('hidden');
  let sisaDetik = Math.floor(durasiMs / 1000);

  if (timerHukuman) clearInterval(timerHukuman);
  
  teksTimer.innerText = `AKSES DIKUNCI\n\n${sisaDetik} detik`;

  timerHukuman = setInterval(() => {
    sisaDetik--;
    teksTimer.innerText = `AKSES DIKUNCI\n\n${sisaDetik} detik`;
    if (sisaDetik <= 0) {
      clearInterval(timerHukuman);
      hubungiServer("cek");
    }
  }, 1000);
}

// 4. Deteksi Kehilangan Fokus (Siswa Mencoba Alt+Tab / Buka Aplikasi Lain)
window.addEventListener('blur', () => {
  if (sudahMulaiUjian && !sedangTerblokir) {
    hubungiServer("tambah");
  }
});

// 5. Shortcut Keluar Kustom: Shift + S + X
window.addEventListener('keydown', (e) => {
  if (e.shiftKey && (e.key === 'S' || e.key === 's')) {
    const handleNextKey = (nextEvent) => {
      if (nextEvent.key === 'X' || nextEvent.key === 'x') {
        if (confirm("Apakah Anda yakin ingin keluar dari Exambrowser?")) {
          appWindow.close();
        }
      }
      window.removeEventListener('keydown', handleNextKey);
    };
    window.addEventListener('keydown', handleNextKey);
  }
});

// 6. Event Button Handlers
btnSimpan.addEventListener('click', () => {
  const nama = inputNama.value.trim();
  const nis = inputNIS.value.trim();
  if (nama && nis) {
    hubungiServer("registrasi", { nama, nis });
  } else {
    alert("Isi Nama dan NIS!");
  }
});

btnMengerti.addEventListener('click', () => {
  if (!linkUjianDariDatabase) {
    ambilLinkTerbaru();
    alert("Menghubungkan ke server...");
    return;
  }
  layoutPeringatan.classList.add('hidden');
  webViewFrame.classList.remove('hidden');
  webViewFrame.src = linkUjianDariDatabase;
  sudahMulaiUjian = true;
});

// Inisialisasi
ambilLinkTerbaru();
hubungiServer("cek");