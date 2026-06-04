let productos = [];
let pedidos = [];
let tabActual = "pendientes";
let pedidoSeleccionado = null;

// ── FECHA ─────────────────────────────────────────────────────────
function mostrarFecha() {
  const hoy = new Date();
  const texto = hoy.toLocaleDateString("es-HN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  document.getElementById("fecha-hoy").textContent =
    texto.charAt(0).toUpperCase() + texto.slice(1);
}

// ── CARGAR PRODUCTOS ──────────────────────────────────────────────
async function cargarProductosPanel() {
  const { data } = await db.from("productos").select("*");
  if (data) productos = data;
}

// ── CARGAR PEDIDOS DESDE SUPABASE ─────────────────────────────────
async function cargarPedidos() {
  await cargarProductosPanel();

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const { data, error } = await db
    .from("pedidos")
    .select("*")
    .gte("created_at", hoy.toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error cargando pedidos:", error);
    return;
  }

  pedidos = data;
  renderizar();
}

// ── ESCUCHAR CAMBIOS EN TIEMPO REAL ───────────────────────────────
function escucharCambios() {
  db.channel("panel-pedidos")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "pedidos" },
      (payload) => {
        // Solo sonar cuando llega un pedido NUEVO (INSERT)
        if (payload.eventType === "INSERT") {
          sonarNuevoPedido();
        }
        cargarPedidos();
      },
    )
    .subscribe();
}

function sonarNuevoPedido() {
  const ctx = new AudioContext();

  // Suena 3 veces seguidas
  [0, 0.6, 1.2].forEach((offset) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(880, ctx.currentTime + offset);
    osc.frequency.setValueAtTime(660, ctx.currentTime + offset + 0.15);
    osc.frequency.setValueAtTime(880, ctx.currentTime + offset + 0.3);

    gain.gain.setValueAtTime(0.8, ctx.currentTime + offset);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      ctx.currentTime + offset + 0.5,
    );

    osc.start(ctx.currentTime + offset);
    osc.stop(ctx.currentTime + offset + 0.5);
  });
}

// ── CALCULAR TOTAL ────────────────────────────────────────────────
function calcularTotal(carrito) {
  let total = 0;
  Object.keys(carrito).forEach((key) => {
    const qty = carrito[key];
    if (!qty) return;
    const partes = key.toString().split("-");
    const id = parseInt(partes[0]);
    const producto = productos.find((p) => p.id === id);
    if (!producto) return;
    const precio =
      partes.length === 2 && producto.tamanos
        ? producto.tamanos[parseInt(partes[1])].precio
        : parseFloat(producto.precio);
    total += precio * qty;
  });
  return total;
}

// ── PREVIEW DE ÍTEMS ──────────────────────────────────────────────
function previewItems(carrito) {
  const nombres = [];
  Object.keys(carrito).forEach((key) => {
    const qty = carrito[key];
    if (!qty) return;
    const partes = key.toString().split("-");
    const id = parseInt(partes[0]);
    const producto = productos.find((p) => p.id === id);
    if (!producto) return;
    const nombre =
      partes.length === 2 && producto.tamanos
        ? producto.nombre +
          " (" +
          producto.tamanos[parseInt(partes[1])].etiqueta +
          ")"
        : producto.nombre;
    nombres.push(nombre + " x" + qty);
  });
  return nombres.join(", ");
}

// ── RENDERIZAR LISTA ──────────────────────────────────────────────
function renderizar() {
  const lista = document.getElementById("lista-pedidos");
  lista.innerHTML = "";

  const filtrados = pedidos.filter((p) =>
    tabActual === "pendientes"
      ? p.estado === "pendiente"
      : p.estado === "listo",
  );

  document.getElementById("stat-pendientes").textContent = pedidos.filter(
    (p) => p.estado === "pendiente",
  ).length;
  document.getElementById("stat-listos").textContent = pedidos.filter(
    (p) => p.estado === "listo",
  ).length;

  if (filtrados.length === 0) {
    lista.innerHTML = `
      <div class="estado-vacio">
        <div class="estado-vacio-icono">${tabActual === "pendientes" ? "🎉" : "📋"}</div>
        <p class="estado-vacio-texto">${
          tabActual === "pendientes"
            ? "No hay pedidos pendientes"
            : "Ningún pedido marcado como listo aún"
        }</p>
      </div>`;
    return;
  }

  filtrados.forEach((pedido) => {
    const total = calcularTotal(pedido.carrito);
    const hora = new Date(pedido.created_at).toLocaleTimeString("es-HN", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const card = document.createElement("div");
    card.className = "pedido-card";
    card.onclick = () => abrirModal(pedido.id);

    card.innerHTML = `
      <div class="pedido-numero-badge ${pedido.estado === "listo" ? "listo" : ""}">
        ${pedido.id}
      </div>
      <div class="pedido-info">
        <p class="pedido-nombre">${pedido.nombre}</p>
        <p class="pedido-aula">📍 ${pedido.aula}</p>
        <p class="pedido-items-preview">${previewItems(pedido.carrito)}</p>
      </div>
      <div class="pedido-derecha">
        <p class="pedido-total">L ${total.toFixed(2)}</p>
        <p class="pedido-hora">${hora}</p>
        ${pedido.estado === "listo" ? '<p class="pedido-estado-listo">✓ Listo</p>' : ""}
      </div>
    `;

    lista.appendChild(card);
  });
}

// ── ABRIR MODAL ───────────────────────────────────────────────────
function abrirModal(id) {
  pedidoSeleccionado = pedidos.find((p) => p.id === id);
  const pedido = pedidoSeleccionado;
  if (!pedido) return;

  const total = calcularTotal(pedido.carrito);
  const hora = new Date(pedido.created_at).toLocaleTimeString("es-HN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  document.getElementById("modal-numero").textContent = "Pedido #" + pedido.id;
  document.getElementById("modal-meta").textContent =
    pedido.nombre + " · " + pedido.aula + " · " + hora;
  document.getElementById("modal-total").textContent = "L " + total.toFixed(2);

  const contenedor = document.getElementById("modal-items");
  contenedor.innerHTML = "";

  // Mostrar notas si existen
  const notasEl = document.getElementById("modal-notas");
  if (pedido.notas) {
    notasEl.textContent = "📝 " + pedido.notas;
    notasEl.style.display = "block";
  } else {
    notasEl.style.display = "none";
  }

  Object.keys(pedido.carrito).forEach((key) => {
    const qty = pedido.carrito[key];
    if (!qty) return;
    const partes = key.toString().split("-");
    const prodId = parseInt(partes[0]);
    const producto = productos.find((p) => p.id === prodId);
    if (!producto) return;
    const nombre =
      partes.length === 2 && producto.tamanos
        ? producto.nombre +
          " (" +
          producto.tamanos[parseInt(partes[1])].etiqueta +
          ")"
        : producto.nombre;
    const precio =
      partes.length === 2 && producto.tamanos
        ? producto.tamanos[parseInt(partes[1])].precio
        : parseFloat(producto.precio);

    const fila = document.createElement("div");
    fila.className = "modal-item-fila";
    fila.innerHTML = `
      <span class="modal-item-nombre">
        ${nombre} <span class="modal-item-qty">x${qty}</span>
      </span>
      <span class="modal-item-precio">L ${(precio * qty).toFixed(2)}</span>
    `;
    contenedor.appendChild(fila);
  });

  const btn = document.getElementById("btn-listo");
  if (pedido.estado === "listo") {
    btn.textContent = "✓ Ya marcado como listo";
    btn.classList.add("ya-listo");
    btn.disabled = true;
  } else {
    btn.textContent = "Marcar como listo ✓";
    btn.classList.remove("ya-listo");
    btn.disabled = false;
  }

  document.getElementById("modal-overlay").classList.remove("oculto");
}

// ── CERRAR MODAL ──────────────────────────────────────────────────
function cerrarModal() {
  document.getElementById("modal-overlay").classList.add("oculto");
  pedidoSeleccionado = null;
}

// ── MARCAR COMO LISTO EN SUPABASE ────────────────────────────────
async function marcarListo() {
  if (!pedidoSeleccionado) return;

  const btn = document.getElementById("btn-listo");
  btn.disabled = true;
  btn.textContent = "Guardando...";

  const { error } = await db
    .from("pedidos")
    .update({ estado: "listo" })
    .eq("id", pedidoSeleccionado.id);

  if (error) {
    alert("Error al actualizar. Intenta de nuevo.");
    btn.disabled = false;
    btn.textContent = "Marcar como listo ✓";
    return;
  }

  cerrarModal();
  cargarPedidos();
}

// ── CAMBIAR TAB ───────────────────────────────────────────────────
function cambiarTab(tab, boton) {
  tabActual = tab;
  document
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.remove("activo"));
  boton.classList.add("activo");
  renderizar();
}

// ── ESTADO DE LA CASETA ───────────────────────────────────────────
let casetaAbierta = true;

async function cargarEstadoCaseta() {
  const { data } = await db
    .from("config")
    .select("valor")
    .eq("clave", "caseta_abierta")
    .single();

  casetaAbierta = data?.valor === "true";
  actualizarBotonCaseta();
}

function actualizarBotonCaseta() {
  const btn = document.getElementById("btn-caseta");
  if (casetaAbierta) {
    btn.textContent = "🟢 Caseta abierta";
    btn.className = "btn-estado-caseta abierta";
  } else {
    btn.textContent = "🔴 Caseta cerrada";
    btn.className = "btn-estado-caseta cerrada";
  }
}

async function toggleCaseta() {
  casetaAbierta = !casetaAbierta;
  actualizarBotonCaseta();

  await db
    .from("config")
    .update({ valor: casetaAbierta ? "true" : "false" })
    .eq("clave", "caseta_abierta");
}

// ── INICIO ────────────────────────────────────────────────────────
mostrarFecha();
cargarEstadoCaseta();
cargarPedidos();
escucharCambios();
