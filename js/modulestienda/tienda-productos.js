// ================================================================
// TIENDA PÚBLICA - VÍA CANES (tienda-productos.js)
// ================================================================

// Definir correctamente la URL de la API
const API_TIENDA = '../api/productos_data.php?vista=tienda'; 

let productosTienda = [];

async function cargarTienda() {
    try {
        // 1. Leer los parámetros de la URL (ej: ?tipo=especie&valor=Otra%20Especie)
        const params = new URLSearchParams(window.location.search);
        const tipo = params.get('tipo') || '';
        const valor = params.get('valor') || '';

        // 2. Construir la URL con los filtros si existen
        let urlFetch = API_TIENDA;
        if (tipo && valor) {
            urlFetch += `&tipo=${encodeURIComponent(tipo)}&valor=${encodeURIComponent(valor)}`;
        }

        // 3. Hacer la petición
        const res = await fetch(urlFetch);
        const data = await res.json();

        if (data.ok || data.success) {
            // Filtrar únicamente productos Activos y con stock > 0
            // Nota: El backend ya filtra por especie/categoría, pero esto es una doble validación de seguridad
            productosTienda = (data.data || []).filter(p => 
                parseInt(p.id_estado_producto) === 1 && parseInt(p.stock) > 0
            );
            renderizarCatalogo();
        } else {
            console.warn('No se encontraron productos o error en la API:', data);
            productosTienda = [];
            renderizarCatalogo();
        }
    } catch (err) {
        console.error('❌ Error al sincronizar productos en la tienda:', err);
        const contenedor = document.getElementById('catalogoProductos');
        if(contenedor) contenedor.innerHTML = '<div class="col-12 text-center py-5 text-danger">Error al cargar el catálogo.</div>';
    }
}

function renderizarCatalogo() {
    const contenedor = document.getElementById('catalogoProductos');
    if (!contenedor) return;

    if (!productosTienda.length) {
        contenedor.innerHTML = '<div class="col-12 text-center py-5"><p class="text-muted">No hay productos disponibles en esta categoría por el momento.</p></div>';
        return;
    }

    contenedor.innerHTML = productosTienda.map(p => {
        const tienePromo = parseFloat(p.descuento || 0) > 0;
        const precioOriginal = parseFloat(p.precio_venta || 0);
        const precioFinal = tienePromo ? precioOriginal * (1 - p.descuento / 100) : precioOriginal;

        return `
        <div class="col-md-4 col-lg-3 mb-4">
            <div class="card h-100 shadow-sm border-0 rounded-3 overflow-hidden position-relative">
                ${tienePromo ? `<span class="position-absolute top-0 end-0 bg-danger text-white px-2 py-1 m-2 rounded-pill fw-bold small">-${p.descuento}% OFF</span>` : ''}
                
                <img src="${p.imagen_url || 'img/placeholder.png'}" class="card-img-top" alt="${p.nombre}" style="height:180px; object-fit:cover;" onerror="this.src='img/placeholder.png'">
                
                <div class="card-body d-flex flex-column">
                    <span class="text-uppercase text-muted small fw-bold mb-1">${p.categoria || 'General'}</span>
                    <h6 class="card-title fw-bold text-dark mb-2">${p.nombre}</h6>
                    <p class="card-text text-muted small flex-grow-1">${(p.descripcion || '').substring(0, 60)}...</p>
                    
                    <div class="mt-2 pt-2 border-top d-flex align-items-center justify-content-between">
                        <div>
                            ${tienePromo ? `<del class="text-muted small">$${precioOriginal.toLocaleString('es-CO')}</del><br>` : ''}
                            <span class="fs-5 fw-bold text-primary">$${precioFinal.toLocaleString('es-CO')}</span>
                        </div>
                        <button class="btn btn-sm btn-dark fw-bold rounded-2" onclick="agregarAlCarrito(${p.id_producto})">
                            <i class="fa fa-cart-plus me-1"></i> Agregar
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    //cargarTienda();
});