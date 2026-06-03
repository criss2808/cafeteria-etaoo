// ── LEER EL CARRITO DESDE LA URL ──────────────────────────────────
const params = new URLSearchParams(window.location.search);
const aula = params.get("aula") || "Sin aula";
const carritoRaw = params.get("carrito");
const carrito = carritoRaw ? JSON.parse(decodeURIComponent(carritoRaw)) : {};

let productos = [];
let total = 0;

// ── MOSTRAR EL AULA ────────────────────────────────────────────────
document.getElementById("header-aula").textContent =
  "📍 Aula: " + aula.charAt(0).toUpperCase() + aula.slice(1);

// ── CARGAR PRODUCTOS DESDE SUPABASE ──────────────────────────────
async function cargarProductos() {
  const { data, error } = await db
    .from("productos")
    .select("*")
    .eq("activo", true);

  if (error) {
    console.error("Error cargando productos:", error);
    return;
  }

  productos = data;
  construirResumen();

  // Si hay pedido activo en la URL restaurar estado
  const pedidoActivo = params.get("pedido");
  if (pedidoActivo) {
    const nombreGuardado = params.get("nombre") || "—";
    const totalGuardado = parseFloat(params.get("total")) || 0;
    const notasGuardadas = params.get("notas") || "";
    llenarDatos(pedidoActivo, nombreGuardado, totalGuardado, notasGuardadas);

    db.from("pedidos")
      .select("estado")
      .eq("id", pedidoActivo)
      .single()
      .then(({ data }) => {
        if (data && data.estado === "listo") {
          document.getElementById("header-titulo").textContent =
            "¡Listo para recoger!";
          mostrarPaso("paso3");
        } else {
          mostrarPaso("paso2");
          escucharPedido(pedidoActivo);
        }
      });
  }
}

// ── CONSTRUIR EL RESUMEN ───────────────────────────────────────────
function construirResumen() {
  const contenedor = document.getElementById("resumen-items");
  contenedor.innerHTML = "";
  total = 0;

  Object.keys(carrito).forEach((key) => {
    const qty = carrito[key];
    if (qty === 0) return;

    const partes = key.toString().split("-");
    const id = parseInt(partes[0]);
    const producto = productos.find((p) => p.id === id);
    if (!producto) return;

    let nombre, precio;
    if (partes.length === 2 && producto.tamanos) {
      const tam = producto.tamanos[parseInt(partes[1])];
      nombre = producto.nombre + " (" + tam.etiqueta + ")";
      precio = tam.precio;
    } else {
      nombre = producto.nombre;
      precio = parseFloat(producto.precio);
    }

    const subtotal = precio * qty;
    total += subtotal;

    const fila = document.createElement("div");
    fila.className = "resumen-item";
    fila.innerHTML = `
      <span class="resumen-item-nombre">
        ${nombre} <span class="resumen-item-qty">x${qty}</span>
      </span>
      <span class="resumen-item-precio">L ${subtotal.toFixed(2)}</span>
    `;
    contenedor.appendChild(fila);
  });

  const fmt = "L " + total.toFixed(2);
  document.getElementById("resumen-total").textContent = fmt;
  document.getElementById("footer-total").textContent = fmt;
}

// ── VERIFICAR NOMBRE ───────────────────────────────────────────────
function verificarNombre() {
  const nombre = document.getElementById("input-nombre").value.trim();
  document.getElementById("btn-enviar").disabled = nombre.length < 2;
}

// ── SUSCRIBIRSE A CAMBIOS EN TIEMPO REAL ──────────────────────────
function escucharPedido(numero) {
  db.channel("pedido-" + numero)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "pedidos",
        filter: "id=eq." + numero,
      },
      (payload) => {
        if (payload.new.estado === "listo") {
          document.getElementById("header-titulo").textContent =
            "¡Listo para recoger!";
          mostrarPaso("paso3");
        }
      },
    )
    .subscribe();
}

// ── LLENAR DATOS DE CONFIRMACIÓN ──────────────────────────────────
function llenarDatos(numero, nombre, totalAmt, notas) {
  const aulaFmt = aula.charAt(0).toUpperCase() + aula.slice(1);
  const totalFmt = "L " + parseFloat(totalAmt).toFixed(2);

  document.getElementById("numero-pedido").textContent = numero;
  document.getElementById("conf-nombre").textContent = nombre;
  document.getElementById("conf-aula").textContent = aulaFmt;
  document.getElementById("conf-total").textContent = totalFmt;
  document.getElementById("numero-listo").textContent = "#" + numero;
  document.getElementById("listo-nombre").textContent = nombre;
  document.getElementById("listo-aula").textContent = aulaFmt;
  document.getElementById("listo-total").textContent = totalFmt;
  document.getElementById("header-titulo").textContent = "Pedido #" + numero;

  // Mostrar notas si existen
  if (notas && notas.trim()) {
    document.getElementById("conf-notas").textContent = notas;
    document.getElementById("fila-notas").style.display = "flex";
  }
}

// ── ENVIAR PEDIDO ──────────────────────────────────────────────────
async function enviarPedido() {
  const nombre = document.getElementById("input-nombre").value.trim();
  const notas = document.getElementById("input-notas").value.trim();

  const btn = document.getElementById("btn-enviar");
  btn.disabled = true;
  btn.textContent = "Enviando...";

  // Calcular total
  let totalEnvio = 0;
  Object.keys(carrito).forEach((key) => {
    const qty = carrito[key];
    if (qty === 0) return;
    const partes = key.toString().split("-");
    const id = parseInt(partes[0]);
    const producto = productos.find((p) => p.id === id);
    if (!producto) return;
    const precio =
      partes.length === 2 && producto.tamanos
        ? producto.tamanos[parseInt(partes[1])].precio
        : parseFloat(producto.precio);
    totalEnvio += precio * qty;
  });

  // Guardar en Supabase
  const { data, error } = await db
    .from("pedidos")
    .insert({
      nombre: nombre,
      aula: aula,
      carrito: carrito,
      total: totalEnvio,
      estado: "pendiente",
      notas: notas || null,
    })
    .select()
    .single();

  if (error) {
    alert("Hubo un error al enviar el pedido. Intenta de nuevo.");
    btn.disabled = false;
    btn.textContent = "Enviar pedido";
    return;
  }

  const numero = data.id;

  // Guardar en la URL para sobrevivir refrescos
  const nuevaURL =
    window.location.pathname +
    "?aula=" +
    encodeURIComponent(aula) +
    "&carrito=" +
    encodeURIComponent(carritoRaw || "{}") +
    "&pedido=" +
    numero +
    "&nombre=" +
    encodeURIComponent(nombre) +
    "&total=" +
    totalEnvio +
    "&notas=" +
    encodeURIComponent(notas);
  window.history.replaceState({}, "", nuevaURL);

  llenarDatos(numero, nombre, totalEnvio, notas);
  mostrarPaso("paso2");
  escucharPedido(numero);
}

// ── CAMBIAR DE PASO ────────────────────────────────────────────────
function mostrarPaso(id) {
  document.querySelectorAll(".paso").forEach((p) => p.classList.add("oculto"));
  document.getElementById(id).classList.remove("oculto");
}

function nuevoPedido() {
  const aulaParam =
    aula !== "Sin aula" ? "?aula=" + encodeURIComponent(aula) : "";
  window.location.href = "index.html" + aulaParam;
}

// ── INICIO ─────────────────────────────────────────────────────────
cargarProductos();
