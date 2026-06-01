const productos = [
  {
    id: 1,
    nombre: "Tajadas con carne",
    descripcion: "Con repollo, chimol, salsa, queso y aderezo",
    tamaños: [
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
    tamaños: [
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
    tamaños: [
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
    nombre: "Sopa de baso",
    descripcion: "Con margarina, queso y mantequilla",
    precio: 35,
    categoria: "snacks",
    icono: "🍽️",
    fondo: "#FBEAF0",
  },
];

// El carrito guarda entradas como:
// "3-0": 2  (producto id 3, tamaño índice 0, cantidad 2)
// "1":   1  (producto id 1, sin tamaños, cantidad 1)
const carrito = {};

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

function renderizar(categoriaFiltro = "todos") {
  const contenedor = document.getElementById("lista-productos");
  contenedor.innerHTML = "";

  const nombres = {
    comidas: "Comidas del día",
    snacks: "Bocadillos",
    bebidas: "Bebidas",
    postres: "Postres",
  };

  ["comidas", "snacks", "bebidas", "postres"].forEach((cat) => {
    if (categoriaFiltro !== "todos" && categoriaFiltro !== cat) return;

    const lista = productos.filter((p) => p.categoria === cat);

    const titulo = document.createElement("p");
    titulo.className = "seccion-titulo";
    titulo.textContent = nombres[cat];
    contenedor.appendChild(titulo);

    lista.forEach((p) => {
      const card = document.createElement("div");
      card.className = "producto-card";

      // Si tiene tamaños, muestra los precios de cada uno
      const preciosHTML = p.tamaños
        ? p.tamaños
            .map(
              (t) =>
                `<span class="precio-tag">${t.etiqueta} L ${t.precio.toFixed(2)}</span>`,
            )
            .join("")
        : `<span class="producto-precio">L ${p.precio.toFixed(2)}</span>`;

      card.innerHTML = `
        <div class="producto-icono" style="background:${p.fondo}">${p.icono}</div>
        <div class="producto-info">
          <p class="producto-nombre">${p.nombre}</p>
          <p class="producto-descripcion">${p.descripcion}</p>
          <div class="precios-wrap">${preciosHTML}</div>
        </div>
        <div id="ctrl-${p.id}"></div>
      `;

      contenedor.appendChild(card);
      renderizarControl(p);
    });
  });
}

function renderizarControl(producto) {
  const el = document.getElementById("ctrl-" + producto.id);
  if (!el) return;

  // Producto con tamaños: muestra un botón + por cada tamaño
  if (producto.tamaños) {
    const botonesHTML = producto.tamaños
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
    // Producto sin tamaños: comportamiento normal
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

function agregar(id, tamanoIdx) {
  const key = tamanoIdx !== undefined ? id + "-" + tamanoIdx : id;
  carrito[key] = (carrito[key] || 0) + 1;
  renderizarControl(productos.find((p) => p.id === id));
  actualizarTotales();
}

function quitar(id, tamanoIdx) {
  const key = tamanoIdx !== undefined ? id + "-" + tamanoIdx : id;
  if (carrito[key] > 0) carrito[key]--;
  renderizarControl(productos.find((p) => p.id === id));
  actualizarTotales();
}

function actualizarTotales() {
  let total = 0;
  let cantidad = 0;

  Object.keys(carrito).forEach((key) => {
    const qty = carrito[key];
    if (qty === 0) return;

    // key puede ser "3-0" (con tamaño) o "1" (sin tamaño)
    const partes = key.toString().split("-");
    const id = parseInt(partes[0]);
    const producto = productos.find((p) => p.id === id);

    let precio;
    if (partes.length === 2) {
      precio = producto.tamaños[parseInt(partes[1])].precio;
    } else {
      precio = producto.precio;
    }

    total += precio * qty;
    cantidad += qty;
  });

  const fmt = "L " + total.toFixed(2);
  document.getElementById("total-header").textContent = fmt;
  document.getElementById("total-footer").textContent = fmt;
  document.getElementById("cantidad-carrito").textContent = cantidad;
  document.getElementById("btn-pedir").disabled = cantidad === 0;
}

function filtrar(categoria, boton) {
  document
    .querySelectorAll(".cat-btn")
    .forEach((b) => b.classList.remove("activo"));
  boton.classList.add("activo");
  renderizar(categoria);
}

function irAConfirmar() {
  const params = new URLSearchParams(window.location.search);
  const aula = params.get("aula") || "";
  const carritoStr = encodeURIComponent(JSON.stringify(carrito));
  window.location.href = `confirmar.html?aula=${aula}&carrito=${carritoStr}`;
}

detectarAula();
renderizar();
actualizarTotales();
