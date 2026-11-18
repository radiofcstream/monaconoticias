// ==========================================
// MONACO 98.7 FM - APLICACIÓN PRINCIPAL
// Adaptada para Cloudflare Pages
// ==========================================

const $ = (selector) => document.querySelector(selector);

const audio = $("#radioAudio");
const playBtn = $("#playBtn");
const statusText = $("#playerStatus");
const equalizer = $(".equalizer");

// Rutas de Cloudflare Pages
const RADIO_URL = "/proxy";
const API_URL = "/api";

let userPaused = true;
let reconnectTimer = null;
let reconnectAttempts = 0;

function setStatus(message) {
  if (statusText) statusText.textContent = message;
}

function updatePlaying() {
  if (playBtn) {
    playBtn.textContent = "Ⅱ";
    playBtn.setAttribute("aria-label", "Pausar");
  }

  setStatus("Reproduciendo en vivo");

  if (equalizer) equalizer.classList.add("playing");
}

function updateStopped() {
  if (playBtn) {
    playBtn.textContent = "▶";
    playBtn.setAttribute("aria-label", "Reproducir");
  }

  if (equalizer) equalizer.classList.remove("playing");
}

function cancelReconnect() {
  if (reconnectTimer !== null) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function scheduleReconnect() {
  if (userPaused || reconnectTimer !== null || !audio) return;

  updateStopped();
  setStatus("Señal interrumpida. Reconectando con MONACO FM...");

  const delay = Math.min(2000 * (2 ** reconnectAttempts), 30000);
  reconnectAttempts += 1;

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;

    if (userPaused) return;

    try {
      audio.src = `${RADIO_URL}?_=${Date.now()}`;
      audio.load();
      await audio.play();
    } catch (error) {
      scheduleReconnect();
    }
  }, delay);
}

async function startRadio() {
  if (!audio) {
    setStatus("No se encontró el reproductor de audio (#radioAudio).");
    return;
  }

  userPaused = false;
  reconnectAttempts = 0;
  cancelReconnect();
  setStatus("Conectando con MONACO 98.7 FM...");

  try {
    audio.src = RADIO_URL;
    audio.load();
    await audio.play();
  } catch (error) {
    setStatus("No se pudo iniciar la transmisión. Reintentando...");
    scheduleReconnect();
  }
}

function stopRadio() {
  userPaused = true;
  cancelReconnect();

  if (audio) audio.pause();

  updateStopped();
  setStatus("Reproducción pausada");
}

if (audio) {
  audio.preload = "none";
  audio.src = RADIO_URL;

  audio.addEventListener("playing", () => {
    reconnectAttempts = 0;
    cancelReconnect();
    updatePlaying();
  });

  audio.addEventListener("error", () => {
    if (!userPaused) scheduleReconnect();
  });

  audio.addEventListener("ended", () => {
    if (!userPaused) scheduleReconnect();
  });

  audio.addEventListener("stalled", () => {
    if (!userPaused) scheduleReconnect();
  });

  audio.addEventListener("waiting", () => {
    if (!userPaused) setStatus("Esperando señal de transmisión...");
  });

  audio.addEventListener("pause", () => {
    if (userPaused) updateStopped();
  });
}

if (playBtn) {
  playBtn.addEventListener("click", () => {
    if (!audio) return;

    if (userPaused || audio.paused) {
      startRadio();
    } else {
      stopRadio();
    }
  });
} else {
  console.error("MONACO FM: no se encontró el botón #playBtn.");
}

// ==========================================
// CARGAR NOTICIAS Y PROGRAMACIÓN
// ==========================================

async function loadPublic() {
  try {
    const response = await fetch(API_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`Error HTTP ${response.status}`);

    const result = await response.json();

    renderNews(result.news || []);
    renderSchedule(result.schedule || []);
  } catch (error) {
    const newsGrid = $("#newsGrid");
    const scheduleList = $("#scheduleList");

    if (newsGrid) {
      newsGrid.innerHTML =
        '<p class="muted">No se pudieron cargar las noticias.</p>';
    }

    if (scheduleList) {
      scheduleList.innerHTML =
        '<p class="muted">No se pudo cargar la programación.</p>';
    }

    console.error("MONACO FM: error cargando contenido público:", error);
  }
}

// ==========================================
// MOSTRAR NOTICIAS
// ==========================================

function renderNews(items) {
  const element = $("#newsGrid");
  if (!element) return;

  if (!items.length) {
    element.innerHTML = '<p class="muted">Próximamente, más noticias.</p>';
    return;
  }

  element.innerHTML = items
    .slice()
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
    .map((news) => `
      <article class="news-card">
        ${news.image ? `<img src="${esc(news.image)}" alt="">` : ""}
        <div class="news-card-body">
          <h3>${esc(news.title)}</h3>
          <p>${esc(news.description)}</p>
        </div>
      </article>
    `)
    .join("");
}

// ==========================================
// MOSTRAR PROGRAMACIÓN
// ==========================================

function renderSchedule(items) {
  const element = $("#scheduleList");
  if (!element) return;

  if (!items.length) {
    element.innerHTML =
      '<p class="muted">La programación será publicada próximamente.</p>';
    return;
  }

  element.innerHTML = items
    .slice()
    .sort((a, b) => String(a.time || "").localeCompare(String(b.time || "")))
    .map((program) => `
      <div class="schedule-item">
        <time>${esc(program.time)}</time>
        <strong>${esc(program.title)}</strong>
      </div>
    `)
    .join("");
}
// ==========================================
// SEGURIDAD DE TEXTO HTML
// ==========================================

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

// ==========================================
// VENTANA DE ADMINISTRACIÓN
// ==========================================

const modal = $("#adminModal");
const adminTrigger = $("#adminTrigger");
const closeAdmin = $("#closeAdmin");

if (adminTrigger && modal) {
  adminTrigger.addEventListener("click", () => {
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
  });
}

function closeModal() {
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

if (closeAdmin) closeAdmin.addEventListener("click", closeModal);

if (modal) {
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });
}

// ==========================================
// SESIÓN DE ADMINISTRADOR
// ==========================================

let adminKey = sessionStorage.getItem("monacoAdminKey") || "";

let data = {
  news: [],
  schedule: []
};

async function api(action, payload = {}) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action,
      password: adminKey,
      ...payload
    })
  });

  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error("La API no devolvió JSON. Revisá la función /api de Cloudflare.");
  }

  if (!response.ok) {
    throw new Error(result.error || `Error HTTP ${response.status}`);
  }

  return result;
}

// ==========================================
// ACTUALIZAR PANEL ADMINISTRADOR
// ==========================================

async function refreshAdmin() {
  const result = await api("admin-list");
  data = result;
  renderAdminLists();
}

// ==========================================
// INGRESAR AL PANEL
// ==========================================

const loginForm = $("#loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const passwordInput = $("#adminPassword");
    const loginError = $("#loginError");

    adminKey = passwordInput ? passwordInput.value : "";

    try {
      await api("admin-list");
      sessionStorage.setItem("monacoAdminKey", adminKey);

      const loginView = $("#loginView");
      const panelView = $("#panelView");

      if (loginView) loginView.hidden = true;
      if (panelView) panelView.hidden = false;
      if (loginError) loginError.textContent = "";

      await refreshAdmin();
    } catch (error) {
      if (loginError) {
        loginError.textContent =
          "Contraseña incorrecta o error de conexión con /api.";
      }
      adminKey = "";
    }
  });
}

// ==========================================
// CERRAR SESIÓN
// ==========================================

const logoutBtn = $("#logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    adminKey = "";
    sessionStorage.removeItem("monacoAdminKey");

    const panelView = $("#panelView");
    const loginView = $("#loginView");
    const passwordInput = $("#adminPassword");

    if (panelView) panelView.hidden = true;
    if (loginView) loginView.hidden = false;
    if (passwordInput) passwordInput.value = "";
  });
}

// ==========================================
// PESTAÑAS DEL ADMINISTRADOR
// ==========================================

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.classList.toggle("active", tab === button);
    });

    document.querySelectorAll(".tab-panel").forEach((panel) => {
      panel.hidden = panel.id !== button.dataset.tab;
    });
  });
});

// ==========================================
// CARGAR IMÁGENES DE NOTICIAS
// ==========================================

let imageData = "";

const newsImage = $("#newsImage");

if (newsImage) {
  newsImage.addEventListener("change", (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert("La imagen debe pesar menos de 3 MB.");
      event.target.value = "";
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Seleccioná un archivo de imagen.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      imageData = String(reader.result || "");
      const preview = $("#imagePreview");

      if (preview) {
        preview.innerHTML = `<img src="${esc(imageData)}" alt="Vista previa">`;
      }
    };

    reader.readAsDataURL(file);
  });
}

// ==========================================
// LIMPIAR FORMULARIO DE NOTICIAS
// ==========================================

function resetNews() {
  const form = $("#newsForm");
  const newsId = $("#newsId");
  const preview = $("#imagePreview");

  if (form) form.reset();
  if (newsId) newsId.value = "";

  imageData = "";
  if (preview) preview.innerHTML = "";
}

const resetNewsButton = $("#resetNews");
if (resetNewsButton) resetNewsButton.addEventListener("click", resetNews);

// ==========================================
// GUARDAR NOTICIAS
// ==========================================

const newsForm = $("#newsForm");

if (newsForm) {
  newsForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const currentId = $("#newsId")?.value || "";
      const existingImage = data.news.find((item) => item.id === currentId)?.image;

      await api("save-news", {
        item: {
          id: currentId || crypto.randomUUID(),
          title: $("#newsTitle")?.value.trim() || "",
          description: $("#newsDesc")?.value.trim() || "",
          image: imageData || existingImage || "",
          createdAt: Date.now()
        }
      });

      resetNews();
      await refreshAdmin();
      await loadPublic();
      alert("Noticia guardada correctamente.");
    } catch (error) {
      alert(error.message);
    }
  });
}
// ==========================================
// GUARDAR PROGRAMACIÓN
// ==========================================

const scheduleForm = $("#scheduleForm");

if (scheduleForm) {
  scheduleForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      await api("save-schedule", {
        item: {
          id: $("#scheduleId")?.value || crypto.randomUUID(),
          time: $("#scheduleTime")?.value || "",
          title: $("#scheduleTitle")?.value.trim() || ""
        }
      });

      scheduleForm.reset();
      const scheduleId = $("#scheduleId");
      if (scheduleId) scheduleId.value = "";

      await refreshAdmin();
      await loadPublic();
      alert("Programación guardada.");
    } catch (error) {
      alert(error.message);
    }
  });
}

// ==========================================
// LIMPIAR PROGRAMACIÓN
// ==========================================

const resetSchedule = $("#resetSchedule");

if (resetSchedule) {
  resetSchedule.addEventListener("click", () => {
    if ($("#scheduleForm")) $("#scheduleForm").reset();
    if ($("#scheduleId")) $("#scheduleId").value = "";
  });
}

// ==========================================
// LISTAS DEL ADMINISTRADOR
// ==========================================

function renderAdminLists() {
  const newsList = $("#adminNewsList");
  const scheduleList = $("#adminScheduleList");

  if (newsList) {
    newsList.innerHTML = (data.news || []).map((news) => `
      <div class="admin-row">
        <span>${esc(news.title)}</span>
        <button class="edit" data-edit-news="${esc(news.id)}">EDITAR</button>
        <button class="delete" data-del-news="${esc(news.id)}">ELIMINAR</button>
      </div>
    `).join("") || '<p class="muted">Todavía no hay noticias.</p>';
  }

  if (scheduleList) {
    scheduleList.innerHTML = (data.schedule || []).map((program) => `
      <div class="admin-row">
        <span>${esc(program.time)} — ${esc(program.title)}</span>
        <button class="edit" data-edit-schedule="${esc(program.id)}">EDITAR</button>
        <button class="delete" data-del-schedule="${esc(program.id)}">ELIMINAR</button>
      </div>
    `).join("") || '<p class="muted">Todavía no hay programas.</p>';
  }
}

// ==========================================
// EDITAR Y ELIMINAR NOTICIAS Y PROGRAMAS
// ==========================================

document.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const editNewsId = target.closest("[data-edit-news]")?.dataset.editNews;
  const deleteNewsId = target.closest("[data-del-news]")?.dataset.delNews;
  const editScheduleId = target.closest("[data-edit-schedule]")?.dataset.editSchedule;
  const deleteScheduleId = target.closest("[data-del-schedule]")?.dataset.delSchedule;

  if (editNewsId) {
    const news = data.news.find((item) => item.id === editNewsId);
    if (!news) return;

    if ($("#newsId")) $("#newsId").value = news.id;
    if ($("#newsTitle")) $("#newsTitle").value = news.title || "";
    if ($("#newsDesc")) $("#newsDesc").value = news.description || "";

    imageData = news.image || "";
    if ($("#imagePreview")) {
      $("#imagePreview").innerHTML = imageData
        ? `<img src="${esc(imageData)}" alt="">`
        : "";
    }

    $("#newsAdmin")?.scrollIntoView({ behavior: "smooth" });
  }

  if (deleteNewsId && confirm("¿Eliminar esta noticia?")) {
    try {
      await api("delete-news", { id: deleteNewsId });
      await refreshAdmin();
      await loadPublic();
    } catch (error) {
      alert(error.message);
    }
  }

  if (editScheduleId) {
    const program = data.schedule.find((item) => item.id === editScheduleId);
    if (!program) return;

    if ($("#scheduleId")) $("#scheduleId").value = program.id;
    if ($("#scheduleTime")) $("#scheduleTime").value = program.time || "";
    if ($("#scheduleTitle")) $("#scheduleTitle").value = program.title || "";
  }

  if (deleteScheduleId && confirm("¿Eliminar este programa?")) {
    try {
      await api("delete-schedule", { id: deleteScheduleId });
      await refreshAdmin();
      await loadPublic();
    } catch (error) {
      alert(error.message);
    }
  }
});
// ==========================================
// COMPARTIR PÁGINA
// ==========================================

async function sharePage() {
  const info = {
    title: "MONACO 98.7 FM",
    text: "Escuchá MONACO 98.7 FM — Gral. Belgrano, Formosa",
    url: location.href
  };

  try {
    if (navigator.share) {
      await navigator.share(info);
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(location.href);
      alert("Enlace copiado.");
    } else {
      prompt("Copiá el enlace de MONACO FM:", location.href);
    }
  } catch (error) {
    // El usuario puede cancelar el menú para compartir.
  }
}

$("#shareBtn")?.addEventListener("click", sharePage);
$("#shareBtn2")?.addEventListener("click", sharePage);

// ==========================================
// CARGAR INFORMACIÓN PÚBLICA
// ==========================================

loadPublic();

// ==========================================
// RECUPERAR SESIÓN DEL ADMINISTRADOR
// ==========================================

if (adminKey) {
  api("admin-list")
    .then((result) => {
      data = result;

      if ($("#loginView")) $("#loginView").hidden = true;
      if ($("#panelView")) $("#panelView").hidden = false;

      renderAdminLists();
    })
    .catch(() => {
      adminKey = "";
      sessionStorage.removeItem("monacoAdminKey");
    });
}

// ==========================================
// INSTALACIÓN PWA
// ==========================================

let deferredPrompt = null;
const banner = $("#installBanner");

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event;
  if (banner) banner.hidden = false;
});

$("#installBtn")?.addEventListener("click", async () => {
  if (!deferredPrompt) return;

  deferredPrompt.prompt();
  await deferredPrompt.userChoice;

  deferredPrompt = null;
  if (banner) banner.hidden = true;
});

$("#dismissInstall")?.addEventListener("click", () => {
  if (banner) banner.hidden = true;
});

window.addEventListener("appinstalled", () => {
  if (banner) banner.hidden = true;
});

// ==========================================
// SERVICE WORKER
// ==========================================

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .catch((error) => {
        console.warn("No se pudo registrar el Service Worker:", error);
      });
  });
}
