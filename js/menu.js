// ── ESTADO DEL CARRITO ────────────────────────────────────────────
const carrito = {};
let productos = [];

// ── DETECTAR EL AULA DESDE LA URL ────────────────────────────────
function detectarAula() {
  const params = new URLSearchParams(window.location.search);
  const aula = params.get("aula");
  const el = document.getElementById("nombre-aula");
  if (aula) {
    el.textContent = "📍 Aula: " + aula.charAt(0).toUpperCase() + aula.slice(1);
  } else {
    el.textContent = "📍 Escanea el QR de tu aula";
  }
}

// ── CARGAR PRODUCTOS DESDE SUPABASE ──────────────────────────────
async function cargarProductos() {
  const { data, error } = await db
    .from("productos")
    .select("*")
    .eq("activo", true)
    .order("orden");

  if (error) {
    console.error("Error cargando productos:", error);
    return;
  }

  productos = data;
  renderizar();
  actualizarTotales();
}

// ── RENDERIZAR PRODUCTOS ──────────────────────────────────────────
function renderizar(categoriaFiltro = "todos") {
  const contenedor = document.getElementById("lista-productos");
  contenedor.innerHTML = "";

  const nombres = {
    comidas: "Comidas del día",
    snacks: "Bocadillos",
    bebidas: "Bebidas",
    postres: "Postres",
  };

  const categorias = ["comidas", "snacks", "bebidas", "postres"];

  categorias.forEach((cat) => {
    if (categoriaFiltro !== "todos" && categoriaFiltro !== cat) return;

    const lista = productos.filter((p) => p.categoria === cat);
    if (lista.length === 0) return;

    const titulo = document.createElement("p");
    titulo.className = "seccion-titulo";
    titulo.textContent = nombres[cat] || cat;
    contenedor.appendChild(titulo);

    lista.forEach((p) => {
      const card = document.createElement("div");
      card.className = "producto-card";

      const preciosHTML = p.tamanos
        ? p.tamanos
            .map(
              (t) =>
                `<span class="precio-tag">${t.etiqueta} L ${t.precio.toFixed(2)}</span>`,
            )
            .join("")
        : `<span class="producto-precio">L ${parseFloat(p.precio).toFixed(2)}</span>`;

      card.innerHTML = `
        <div class="producto-icono" style="background:${p.fondo}">${p.icono}</div>
        <div class="producto-info">
          <p class="producto-nombre">${p.nombre}</p>
          <p class="producto-descripcion">${p.descripcion || ""}</p>
          <div class="precios-wrap">${preciosHTML}</div>
        </div>
        <div id="ctrl-${p.id}"></div>
      `;

      contenedor.appendChild(card);
      renderizarControl(p);
    });
  });
}

// ── CONTROL DE CANTIDAD ───────────────────────────────────────────
function renderizarControl(producto) {
  const el = document.getElementById("ctrl-" + producto.id);
  if (!el) return;

  if (producto.tamanos) {
    const botonesHTML = producto.tamanos
      .map((t, i) => {
        const key = producto.id + "-" + i;
        const qty = carrito[key] || 0;
        if (qty === 0) {
          return `
          <div class="tamano-fila">
            <span class="tamano-etiqueta">${t.etiqueta}</span>
            <button class="btn-agregar" onclick="agregar(${producto.id}, ${i})">+</button>
          </div>`;
        } else {
          return `
          <div class="tamano-fila">
            <span class="tamano-etiqueta">${t.etiqueta}</span>
            <div class="control-cantidad">
              <button class="btn-cantidad" onclick="quitar(${producto.id}, ${i})">−</button>
              <span class="numero-cantidad">${qty}</span>
              <button class="btn-cantidad" onclick="agregar(${producto.id}, ${i})">+</button>
            </div>
          </div>`;
        }
      })
      .join("");
    el.innerHTML = `<div class="tamanos-ctrl">${botonesHTML}</div>`;
  } else {
    const qty = carrito[producto.id] || 0;
    if (qty === 0) {
      el.innerHTML = `<button class="btn-agregar" onclick="agregar(${producto.id})">+</button>`;
    } else {
      el.innerHTML = `
        <div class="control-cantidad">
          <button class="btn-cantidad" onclick="quitar(${producto.id})">−</button>
          <span class="numero-cantidad">${qty}</span>
          <button class="btn-cantidad" onclick="agregar(${producto.id})">+</button>
        </div>`;
    }
  }
}

// ── AGREGAR AL CARRITO ────────────────────────────────────────────
function agregar(id, tamanoIdx) {
  const key = tamanoIdx !== undefined ? id + "-" + tamanoIdx : id;
  carrito[key] = (carrito[key] || 0) + 1;
  renderizarControl(productos.find((p) => p.id === id));
  actualizarTotales();
}

// ── QUITAR DEL CARRITO ────────────────────────────────────────────
function quitar(id, tamanoIdx) {
  const key = tamanoIdx !== undefined ? id + "-" + tamanoIdx : id;
  if (carrito[key] > 0) carrito[key]--;
  renderizarControl(productos.find((p) => p.id === id));
  actualizarTotales();
}

// ── ACTUALIZAR TOTALES ────────────────────────────────────────────
function actualizarTotales() {
  let total = 0;
  let cantidad = 0;

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
    cantidad += qty;
  });

  const fmt = "L " + total.toFixed(2);
  document.getElementById("total-header").textContent = fmt;
  document.getElementById("total-footer").textContent = fmt;
  document.getElementById("cantidad-carrito").textContent = cantidad;
  document.getElementById("btn-pedir").disabled = cantidad === 0;
}

// ── FILTRAR POR CATEGORÍA ─────────────────────────────────────────
function filtrar(categoria, boton) {
  document
    .querySelectorAll(".cat-btn")
    .forEach((b) => b.classList.remove("activo"));
  boton.classList.add("activo");
  renderizar(categoria);
}

// ── IR A CONFIRMAR ────────────────────────────────────────────────
function irAConfirmar() {
  const params = new URLSearchParams(window.location.search);
  const aula = params.get("aula") || "";
  const carritoStr = encodeURIComponent(JSON.stringify(carrito));
  window.location.href = `confirmar.html?aula=${aula}&carrito=${carritoStr}`;
}

// ── INICIO ────────────────────────────────────────────────────────
detectarAula();
cargarProductos();
actualizarTotales();
