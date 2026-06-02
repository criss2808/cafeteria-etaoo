// ── CONTRASEÑA ────────────────────────────────────────────────────
// Cámbiala por la que quieras
const CLAVE = "Samuel_2008";

let productos = [];
let productoEditando = null;

// ── LOGIN ─────────────────────────────────────────────────────────
function entrar() {
  const clave = document.getElementById("input-clave").value.trim();
  if (clave === CLAVE) {
    document.getElementById("pantalla-login").classList.add("oculto");
    document.getElementById("pantalla-admin").classList.remove("oculto");
    cargarProductos();
  } else {
    document.getElementById("login-error").classList.remove("oculto");
  }
}

// ── CARGAR PRODUCTOS ──────────────────────────────────────────────
async function cargarProductos() {
  const { data, error } = await db.from("productos").select("*").order("orden");

  if (error) {
    console.error(error);
    return;
  }
  productos = data;
  renderizarAdmin();
}

// ── RENDERIZAR ────────────────────────────────────────────────────
function renderizarAdmin() {
  const contenedor = document.getElementById("lista-admin");
  contenedor.innerHTML = "";

  const categorias = {
    comidas: "Comidas del día",
    snacks: "Bocadillos",
    bebidas: "Bebidas",
    postres: "Postres",
  };

  Object.keys(categorias).forEach((cat) => {
    const lista = productos.filter((p) => p.categoria === cat);
    if (lista.length === 0) return;

    const titulo = document.createElement("p");
    titulo.className = "seccion-cat";
    titulo.textContent = categorias[cat];
    contenedor.appendChild(titulo);

    lista.forEach((p) => {
      const precioTexto = p.tamanos
        ? p.tamanos.map((t) => `${t.etiqueta} L${t.precio}`).join(" / ")
        : `L ${parseFloat(p.precio).toFixed(2)}`;

      const card = document.createElement("div");
      card.className = "admin-card" + (p.activo ? "" : " inactivo");
      card.innerHTML = `
        <div class="admin-icono" style="background:${p.fondo}">${p.icono}</div>
        <div class="admin-info">
          <p class="admin-nombre">${p.nombre}</p>
          <p class="admin-precio">${precioTexto}</p>
        </div>
        <div class="admin-acciones">
          <button class="btn-accion" onclick="abrirModalEditar(${p.id})">✏️</button>
          <button class="btn-accion ${p.activo ? "danger" : "success"}"
            onclick="toggleActivo(${p.id}, ${p.activo})">
            ${p.activo ? "Ocultar" : "Mostrar"}
          </button>
        </div>
      `;
      contenedor.appendChild(card);
    });
  });
}

// ── TOGGLE ACTIVO ─────────────────────────────────────────────────
async function toggleActivo(id, activo) {
  await db.from("productos").update({ activo: !activo }).eq("id", id);
  cargarProductos();
}

// ── ABRIR MODAL NUEVO ─────────────────────────────────────────────
function abrirModalNuevo() {
  productoEditando = null;
  document.getElementById("modal-titulo").textContent = "Nuevo producto";
  document.getElementById("btn-guardar").textContent = "Agregar producto";
  document.getElementById("campo-nombre").value = "";
  document.getElementById("campo-descripcion").value = "";
  document.getElementById("campo-icono").value = "🍽️";
  document.getElementById("campo-precio").value = "";
  document.getElementById("campo-categoria").value = "snacks";
  document.getElementById("check-tamanos").checked = false;
  document.getElementById("campos-tamanos").classList.add("oculto");
  document.getElementById("toggle-label").textContent = "No";
  document.getElementById("tam1-nombre").value = "";
  document.getElementById("tam1-precio").value = "";
  document.getElementById("tam2-nombre").value = "";
  document.getElementById("tam2-precio").value = "";
  document.getElementById("modal-overlay").classList.remove("oculto");
}

// ── ABRIR MODAL EDITAR ────────────────────────────────────────────
function abrirModalEditar(id) {
  productoEditando = productos.find((p) => p.id === id);
  const p = productoEditando;

  document.getElementById("modal-titulo").textContent = "Editar producto";
  document.getElementById("btn-guardar").textContent = "Guardar cambios";
  document.getElementById("campo-nombre").value = p.nombre;
  document.getElementById("campo-descripcion").value = p.descripcion || "";
  document.getElementById("campo-icono").value = p.icono;
  document.getElementById("campo-categoria").value = p.categoria;

  if (p.tamanos) {
    document.getElementById("check-tamanos").checked = true;
    document.getElementById("campos-tamanos").classList.remove("oculto");
    document.getElementById("toggle-label").textContent = "Sí";
    document.getElementById("tam1-nombre").value = p.tamanos[0]?.etiqueta || "";
    document.getElementById("tam1-precio").value = p.tamanos[0]?.precio || "";
    document.getElementById("tam2-nombre").value = p.tamanos[1]?.etiqueta || "";
    document.getElementById("tam2-precio").value = p.tamanos[1]?.precio || "";
    document.getElementById("campo-precio").value = "";
  } else {
    document.getElementById("check-tamanos").checked = false;
    document.getElementById("campos-tamanos").classList.add("oculto");
    document.getElementById("toggle-label").textContent = "No";
    document.getElementById("campo-precio").value = p.precio || "";
  }

  document.getElementById("modal-overlay").classList.remove("oculto");
}

// ── TOGGLE TAMAÑOS ────────────────────────────────────────────────
function toggleTamanos() {
  const checked = document.getElementById("check-tamanos").checked;
  document
    .getElementById("campos-tamanos")
    .classList.toggle("oculto", !checked);
  document.getElementById("toggle-label").textContent = checked ? "Sí" : "No";
}

// ── GUARDAR PRODUCTO ──────────────────────────────────────────────
async function guardarProducto() {
  const nombre = document.getElementById("campo-nombre").value.trim();
  const descripcion = document.getElementById("campo-descripcion").value.trim();
  const icono = document.getElementById("campo-icono").value.trim() || "🍽️";
  const categoria = document.getElementById("campo-categoria").value;
  const tieneTamanos = document.getElementById("check-tamanos").checked;

  if (!nombre) {
    alert("El nombre es obligatorio");
    return;
  }

  let tamanos = null;
  let precio = null;

  if (tieneTamanos) {
    const t1n = document.getElementById("tam1-nombre").value.trim();
    const t1p = parseFloat(document.getElementById("tam1-precio").value);
    const t2n = document.getElementById("tam2-nombre").value.trim();
    const t2p = parseFloat(document.getElementById("tam2-precio").value);
    if (!t1n || !t1p) {
      alert("Llena los datos del primer tamaño");
      return;
    }
    tamanos = [{ etiqueta: t1n, precio: t1p }];
    if (t2n && t2p) tamanos.push({ etiqueta: t2n, precio: t2p });
  } else {
    precio = parseFloat(document.getElementById("campo-precio").value);
    if (!precio) {
      alert("El precio es obligatorio");
      return;
    }
  }

  const datos = {
    nombre,
    descripcion,
    icono,
    categoria,
    tamanos,
    precio,
    fondo:
      categoria === "bebidas"
        ? "#E6F1FB"
        : categoria === "postres"
          ? "#FBEAF0"
          : categoria === "comidas"
            ? "#E1F5EE"
            : "#FAEEDA",
    activo: true,
  };

  const btn = document.getElementById("btn-guardar");
  btn.disabled = true;
  btn.textContent = "Guardando...";

  let error;
  if (productoEditando) {
    ({ error } = await db
      .from("productos")
      .update(datos)
      .eq("id", productoEditando.id));
  } else {
    const maxOrden = productos.length
      ? Math.max(...productos.map((p) => p.orden || 0))
      : 0;
    datos.orden = maxOrden + 1;
    ({ error } = await db.from("productos").insert(datos));
  }

  btn.disabled = false;
  btn.textContent = productoEditando ? "Guardar cambios" : "Agregar producto";

  if (error) {
    alert("Error al guardar. Intenta de nuevo.");
    return;
  }

  cerrarModal();
  cargarProductos();
}

// ── CERRAR MODAL ──────────────────────────────────────────────────
function cerrarModal() {
  document.getElementById("modal-overlay").classList.add("oculto");
}
