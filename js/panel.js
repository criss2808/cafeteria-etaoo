const productos = [
  {
    id: 1,
    nombre: "Tajadas con carne",
    descripcion: "Con repollo, chimol, salsa, queso y aderezo",
    tamanos: [
      { etiqueta: "Mediana", precio: 40 },
      { etiqueta: "Grande", precio: 70 },
    ],
    categoria: "snacks",
    icono: "🍽️",
    fondo: "#E1F5EE",
  },
  {
    id: 2,
    nombre: "Papas fritas",
    descripcion: "Con queso y aderezo/ketchup",
    tamanos: [
      { etiqueta: "Mediana", precio: 40 },
      { etiqueta: "Grande", precio: 70 },
    ],
    categoria: "snacks",
    icono: "🍽️",
    fondo: "#E1F5EE",
  },
  {
    id: 3,
    nombre: "Baleada",
    descripcion: "Frijoles, mantequilla y queso",
    tamanos: [
      { etiqueta: "Sencilla", precio: 20 },
      { etiqueta: "Con huevo", precio: 25 },
    ],
    categoria: "snacks",
    icono: "🫓",
    fondo: "#FAEEDA",
  },
  {
    id: 4,
    nombre: "Tortillas con quesillo",
    descripcion: "Con repollo, chimol, salsa y queso",
    precio: 50,
    categoria: "snacks",
    icono: "🍽️",
    fondo: "#FAEEDA",
  },
  {
    id: 5,
    nombre: "Refresco natural",
    descripcion: "Jamaica, tamarindo u horchata",
    precio: 20,
    categoria: "bebidas",
    icono: "🥤",
    fondo: "#E6F1FB",
  },
  {
    id: 6,
    nombre: "Café con leche",
    descripcion: "Café hondureño",
    precio: 15,
    categoria: "bebidas",
    icono: "☕",
    fondo: "#E6F1FB",
  },
  {
    id: 7,
    nombre: "Tacos flauta",
    descripcion: "Con repollo, chimol, salsa y queso",
    precio: 50,
    categoria: "snacks",
    icono: "🍽️",
    fondo: "#FBEAF0",
  },
  {
    id: 8,
    nombre: "Sopa de vaso",
    descripcion: "Con margarina, queso y mantequilla",
    precio: 35,
    categoria: "snacks",
    icono: "🍽️",
    fondo: "#FBEAF0",
  },
];

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

// ── CARGAR PEDIDOS DESDE SUPABASE ─────────────────────────────────
async function cargarPedidos() {
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

// ── ESCUCHAR PEDIDOS NUEVOS EN TIEMPO REAL ────────────────────────
function escucharCambios() {
  db.channel("panel-pedidos")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "pedidos",
      },
      () => {
        cargarPedidos();
      },
    )
    .subscribe();
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
      partes.length === 2 && producto.tamaños
        ? producto.tamaños[parseInt(partes[1])].precio
        : producto.precio;
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
      partes.length === 2 && producto.tamaños
        ? producto.nombre +
          " (" +
          producto.tamaños[parseInt(partes[1])].etiqueta +
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

  Object.keys(pedido.carrito).forEach((key) => {
    const qty = pedido.carrito[key];
    if (!qty) return;
    const partes = key.toString().split("-");
    const prodId = parseInt(partes[0]);
    const producto = productos.find((p) => p.id === prodId);
    if (!producto) return;
    const nombre =
      partes.length === 2 && producto.tamaños
        ? producto.nombre +
          " (" +
          producto.tamaños[parseInt(partes[1])].etiqueta +
          ")"
        : producto.nombre;
    const precio =
      partes.length === 2 && producto.tamaños
        ? producto.tamaños[parseInt(partes[1])].precio
        : producto.precio;

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

// ── INICIO ────────────────────────────────────────────────────────
mostrarFecha();
cargarPedidos();
escucharCambios();
