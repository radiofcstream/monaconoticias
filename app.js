
// ==========================================
// MONACO 98.7 FM - APLICACIÓN PRINCIPAL
// ==========================================

const $ = s => document.querySelector(s);

const audio = $("#radioAudio");
const playBtn = $("#playBtn");
const statusText = $("#playerStatus");

// ==========================================
// REPRODUCTOR DE RADIO EN VIVO
// ==========================================

const RADIO_URL = "/proxy";

let userPaused = true;
let reconnectTimer = null;
let reconnectAttempts = 0;

audio.src = RADIO_URL;
audio.preload = "none";

function updatePlaying() {
  playBtn.textContent = "Ⅱ";
  playBtn.setAttribute("aria-label", "Pausar");
  statusText.textContent = "Reproduciendo en vivo";
  $(".equalizer").classList.add("playing");
}

function updateStopped() {
  playBtn.textContent = "▶";
  playBtn.setAttribute("aria-label", "Reproducir");
  $(".equalizer").classList.remove("playing");
}

function cancelReconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function reconnectRadio() {
  if (userPaused || reconnectTimer) return;

  updateStopped();
  statusText.textContent = "Reconectando con MONACO FM...";

  const delay = Math.min(
    3000 * Math.pow(2, reconnectAttempts),
    30000
  );

  reconnectAttempts++;

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;

    if (userPaused) return;

    try {
      audio.load();
      await audio.play();
    } catch (error) {
      reconnectRadio();
    }
  }, delay);
}

playBtn.addEventListener("click", async () => {
  if (audio.paused) {
    userPaused = false;
    reconnectAttempts = 0;
    cancelReconnect();

    statusText.textContent = "Conectando con MONACO FM...";

    try {
      await audio.play();
    } catch (error) {
      statusText.textContent = "No se pudo conectar. Reintentando...";
      reconnectRadio();
    }

  } else {
    userPaused = true;
    cancelReconnect();

    audio.pause();
    updateStopped();

    statusText.textContent = "Reproducción pausada";
  }
});

audio.addEventListener("playing", () => {
  reconnectAttempts = 0;
  cancelReconnect();
  updatePlaying();
});

audio.addEventListener("error", () => {
  updateStopped();
  reconnectRadio();
});

audio.addEventListener("ended", () => {
  reconnectRadio();
});

audio.addEventListener("stalled", () => {
  reconnectRadio();
});

audio.addEventListener("waiting", () => {
  if (!userPaused) {
    statusText.textContent = "Esperando señal de transmisión...";
  }
});

audio.addEventListener("pause", () => {
  if (userPaused) updateStopped();
});

// ==========================================
// CARGAR NOTICIAS Y PROGRAMACIÓN
// ==========================================

async function loadPublic() {
  try {
    const r = await fetch("/.netlify/functions/api");
    if (!r.ok) throw new Error("Error al cargar");

    const d = await r.json();

    renderNews(d.news || []);
    renderSchedule(d.schedule || []);

  } catch (e) {
    $("#newsGrid").innerHTML =
      '<p class="muted">No se pudieron cargar las noticias.</p>';

    $("#scheduleList").innerHTML =
      '<p class="muted">No se pudo cargar la programación.</p>';
  }
}

// ==========================================
// MOSTRAR NOTICIAS
// ==========================================

function renderNews(items) {
  const el = $("#newsGrid");

  if (!items.length) {
    el.innerHTML =
      '<p class="muted">Próximamente, más noticias.</p>';
    return;
  }

  el.innerHTML = items
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(n => `
      <article class="news-card">
        ${n.image ? `<img src="${esc(n.image)}" alt="">` : ""}
        <div class="news-card-body">
          <h3>${esc(n.title)}</h3>
          <p>${esc(n.description)}</p>
        </div>
      </article>
    `).join("");
}

// ==========================================
// MOSTRAR PROGRAMACIÓN
// ==========================================

function renderSchedule(items) {
  const el = $("#scheduleList");

  if (!items.length) {
    el.innerHTML =
      '<p class="muted">La programación será publicada próximamente.</p>';
    return;
  }

  el.innerHTML = items
    .slice()
    .sort((a, b) => a.time.localeCompare(b.time))
    .map(p => `
      <div class="schedule-item">
        <time>${esc(p.time)}</time>
        <strong>${esc(p.title)}</strong>
      </div>
    `).join("");
}

// ==========================================
// SEGURIDAD DE TEXTO HTML
// ==========================================

function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

// ==========================================
// VENTANA DE ADMINISTRACIÓN
// ==========================================

const modal = $("#adminModal");

$("#adminTrigger").onclick = () => {
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
};

function closeModal() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

$("#closeAdmin").onclick = closeModal;

modal.addEventListener("click", e => {
  if (e.target === modal) closeModal();
});

// ==========================================
// SESIÓN DE ADMINISTRADOR
// ==========================================

let adminKey = sessionStorage.getItem("monacoAdminKey") || "";

let data = {
  news: [],
  schedule: []
};

async function api(action, payload = {}) {
  const r = await fetch("/.netlify/functions/api", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      action,
      password: adminKey,
      ...payload
    })
  });

  const d = await r.json();

  if (!r.ok) {
    throw new Error(d.error || "Error");
  }

  return d;
}

// ==========================================
// ACTUALIZAR PANEL ADMINISTRADOR
// ==========================================

async function refreshAdmin() {
  const d = await api("admin-list");

  data = d;

  renderAdminLists();
}

// ==========================================
// INGRESAR AL PANEL
// ==========================================

$("#loginForm").onsubmit = async e => {
  e.preventDefault();

  adminKey = $("#adminPassword").value;

  try {
    await api("admin-list");

    sessionStorage.setItem("monacoAdminKey", adminKey);

    $("#loginView").hidden = true;
    $("#panelView").hidden = false;
    $("#loginError").textContent = "";

    await refreshAdmin();

  } catch (err) {
    $("#loginError").textContent =
      "Contraseña incorrecta o error de conexión.";

    adminKey = "";
  }
};

// ==========================================
// CERRAR SESIÓN
// ==========================================

$("#logoutBtn").onclick = () => {
  adminKey = "";

  sessionStorage.removeItem("monacoAdminKey");

  $("#panelView").hidden = true;
  $("#loginView").hidden = false;

  $("#adminPassword").value = "";
};

// ==========================================
// PESTAÑAS DEL ADMINISTRADOR
// ==========================================

document.querySelectorAll(".tab").forEach(b => {
  b.onclick = () => {
    document.querySelectorAll(".tab").forEach(x => {
      x.classList.toggle("active", x === b);
    });

    document.querySelectorAll(".tab-panel").forEach(x => {
      x.hidden = x.id !== b.dataset.tab;
    });
  };
});

// ==========================================
// CARGAR IMÁGENES DE NOTICIAS
// ==========================================

let imageData = "";

$("#newsImage").onchange = e => {
  const f = e.target.files[0];

  if (!f) return;

  if (f.size > 3 * 1024 * 1024) {
    alert("La imagen debe pesar menos de 3 MB.");
    e.target.value = "";
    return;
  }

  if (!f.type.startsWith("image/")) {
    alert("Seleccioná un archivo de imagen.");
    e.target.value = "";
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    imageData = reader.result;

    $("#imagePreview").innerHTML =
      `<img src="${imageData}" alt="Vista previa">`;
  };

  reader.readAsDataURL(f);
};

// ==========================================
// LIMPIAR FORMULARIO DE NOTICIAS
// ==========================================

function resetNews() {
  $("#newsForm").reset();

  $("#newsId").value = "";
  imageData = "";

  $("#imagePreview").innerHTML = "";
}

$("#resetNews").onclick = resetNews;

// ==========================================
// GUARDAR NOTICIAS
// ==========================================

$("#newsForm").onsubmit = async e => {
  e.preventDefault();

  try {
    await api("save-news", {
      item: {
        id: $("#newsId").value || crypto.randomUUID(),

        title: $("#newsTitle").value.trim(),

        description: $("#newsDesc").value.trim(),

        image:
          imageData ||
          data.news.find(
            x => x.id === $("#newsId").value
          )?.image || "",

        createdAt: Date.now()
      }
    });

    resetNews();

    await refreshAdmin();

    loadPublic();

    alert("Noticia guardada correctamente.");

  } catch (err) {
    alert(err.message);
  }
};

// ==========================================
// GUARDAR PROGRAMACIÓN
// ==========================================

$("#scheduleForm").onsubmit = async e => {
  e.preventDefault();

  try {
    await api("save-schedule", {
      item: {
        id: $("#scheduleId").value || crypto.randomUUID(),

        time: $("#scheduleTime").value,

        title: $("#scheduleTitle").value.trim()
      }
    });

    $("#scheduleForm").reset();
    $("#scheduleId").value = "";

    await refreshAdmin();

    loadPublic();

    alert("Programación guardada.");

  } catch (err) {
    alert(err.message);
  }
};

// ==========================================
// LIMPIAR PROGRAMACIÓN
// ==========================================

$("#resetSchedule").onclick = () => {
  $("#scheduleForm").reset();
  $("#scheduleId").value = "";
};

// ==========================================
// LISTAS DEL ADMINISTRADOR
// ==========================================

function renderAdminLists() {

  $("#adminNewsList").innerHTML =
    (data.news || []).map(n => `
      <div class="admin-row">
        <span>${esc(n.title)}</span>

        <button class="edit" data-edit-news="${esc(n.id)}">
          EDITAR
        </button>

        <button class="delete" data-del-news="${esc(n.id)}">
          ELIMINAR
        </button>
      </div>
    `).join("") ||
    '<p class="muted">Todavía no hay noticias.</p>';

  $("#adminScheduleList").innerHTML =
    (data.schedule || []).map(p => `
      <div class="admin-row">
        <span>${esc(p.time)} — ${esc(p.title)}</span>

        <button class="edit" data-edit-schedule="${esc(p.id)}">
          EDITAR
        </button>

        <button class="delete" data-del-schedule="${esc(p.id)}">
          ELIMINAR
        </button>
      </div>
    `).join("") ||
    '<p class="muted">Todavía no hay programas.</p>';
}

// ==========================================
// EDITAR Y ELIMINAR NOTICIAS Y PROGRAMAS
// ==========================================

document.addEventListener("click", async e => {
  const t = e.target;

  if (!(t instanceof Element)) return;

  if (t.dataset.editNews) {
    const n = data.news.find(
      x => x.id === t.dataset.editNews
    );

    if (!n) return;

    $("#newsId").value = n.id;
    $("#newsTitle").value = n.title;
    $("#newsDesc").value = n.description;

    imageData = n.image || "";

    $("#imagePreview").innerHTML = imageData
      ? `<img src="${esc(imageData)}" alt="">`
      : "";

    $("#newsAdmin").scrollIntoView({
      behavior: "smooth"
    });
  }

  if (t.dataset.delNews &&
      confirm("¿Eliminar esta noticia?")) {

    try {
      await api("delete-news", {
        id: t.dataset.delNews
      });

      await refreshAdmin();
      loadPublic();

    } catch (x) {
      alert(x.message);
    }
  }

  if (t.dataset.editSchedule) {
    const p = data.schedule.find(
      x => x.id === t.dataset.editSchedule
    );

    if (!p) return;

    $("#scheduleId").value = p.id;
    $("#scheduleTime").value = p.time;
    $("#scheduleTitle").value = p.title;
  }

  if (t.dataset.delSchedule &&
      confirm("¿Eliminar este programa?")) {

    try {
      await api("delete-schedule", {
        id: t.dataset.delSchedule
      });

      await refreshAdmin();
      loadPublic();

    } catch (x) {
      alert(x.message);
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

    } else {
      await navigator.clipboard.writeText(location.href);

      alert("Enlace copiado.");
    }

  } catch (e) {
    // El usuario puede cancelar el menú de compartir.
  }
}

$("#shareBtn").onclick = sharePage;
$("#shareBtn2").onclick = sharePage;

// ==========================================
// CARGAR INFORMACIÓN PÚBLICA
// ==========================================

loadPublic();

// ==========================================
// RECUPERAR SESIÓN DEL ADMINISTRADOR
// ==========================================

if (adminKey) {
  api("admin-list")
    .then(d => {
      data = d;

      $("#loginView").hidden = true;
      $("#panelView").hidden = false;

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

window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();

  deferredPrompt = e;

  banner.hidden = false;
});

$("#installBtn").onclick = async () => {
  if (!deferredPrompt) return;

  deferredPrompt.prompt();

  await deferredPrompt.userChoice;

  deferredPrompt = null;

  banner.hidden = true;
};

$("#dismissInstall").onclick = () => {
  banner.hidden = true;
};

window.addEventListener("appinstalled", () => {
  banner.hidden = true;
});

// ==========================================
// SERVICE WORKER
// ==========================================

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .catch(() => {});
  });
}
