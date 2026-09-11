const grid = document.getElementById('productGrid');
const IMG_DEFAULT = '../img/producto-default.jpg';
let listaProductosMapeados = [];

export function procesarYRenderizar(datos) {
    
    // Procesamos los datos crudos a un formato limpio para el frontend
    listaProductosMapeados = datos.map(p => procesarProducto(p));
    
    // Generamos el HTML
    const htmlCards = listaProductosMapeados.map(p => crearCard(p)).join('');
    grid.innerHTML = htmlCards;

    // IMPORTANTE: Reinicializamos los listeners para el carrito
    //configurarBotonesCarrito();
}

export function procesarProducto(p) {
    // 1. Lógica de Precios
    // IMAGEN POR DEFECTO: Asegúrate de que esta ruta exista 
    const valorDescuento = Number(p.valor_descuento || p.valor || 0);
    const tipoDescuento = (p.tipo_descuento || 'fijo').toString().toLowerCase();
    const precioOriginal = Number(p.precio_venta || p.precio || 0);
    
    let precioFinal = precioOriginal;
    let porcentajeVisual = 0;
    //alert(p.id_promo);
    if(p.id_promo){
        
        if (tipoDescuento === 'porcentaje') {
            porcentajeVisual = valorDescuento;
            precioFinal = precioOriginal * (1 - (valorDescuento / 100));
        } else {
            // Descuento fijo
            precioFinal = Math.max(0, precioOriginal - valorDescuento);
            if(precioOriginal > 0) {
                porcentajeVisual = Math.round(((valorDescuento / precioOriginal) * 100));
            }
        }
    }

    // 2. CORRECCIÓN CRÍTICA DE RUTA DE IMAGEN
    let imgUrl = p.imagen_url || p.foto_url || '';
    
    if (imgUrl && imgUrl.trim() !== '') {
        // Limpiamos posibles '../' repetidos al inicio
        imgUrl = imgUrl.replace(/^(\.\.\/)+/, ''); 
        
        // Si no empieza con http (absoluta) ni con / (raíz), asumimos relativa y añadimos '../'
        if (!imgUrl.startsWith('http') && !imgUrl.startsWith('/')) {
            imgUrl = imgUrl.replace('../', '');
        }
    } else {
        imgUrl = IMG_DEFAULT;
    }

    // Sanitización básica para evitar romper el HTML
    const nombreSeguro = String(p.nombre || 'Producto sin nombre').replace(/"/g, '&quot;');

    return {
        id: Number(p.id_producto || p.id || 0),
        nombreSeguro: nombreSeguro,
        precioOriginal: precioOriginal,
        precioFinal: Math.round(precioFinal),
        porcentajeVisual: porcentajeVisual,
        img: imgUrl,
        id_promo: p.id_promo || "", 
        stock: p.stock || 0,
        // Añadimos tipo explícito para ayudar a la visibilidad en lógica externa
        tipo: 'producto' 
    };
}

export function crearCard(p) {
    // Badge de descuento solo si es mayor a 0
    const badgeDescuento = p.porcentajeVisual > 0 
        ? `<div class="position-absolute top-0 end-0 m-3" style="z-index: 10;">
                <span class="badge bg-danger rounded-pill px-3 py-2 fw-bold shadow-sm">-${p.porcentajeVisual}% OFF</span>
            </div>` 
        : '';

    // Precio tachado solo si hay diferencia
    const precioTachado = p.precioOriginal > p.precioFinal 
        ? `<span class="text-decoration-line-through text-muted small">$${p.precioOriginal.toLocaleString('es-CO')}</span>` 
        : '';

    return `
    <div class="col-12 col-sm-6 col-lg-3 mb-4 fade-in">
        <div class="card h-100 border-0 shadow-sm product-card position-relative overflow-hidden" style="border-radius: 16px; transition: transform 0.2s;">
            
            ${badgeDescuento}

            <div class="position-relative" style="height: 250px; background-color: #f8f9fa; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                <!-- onerror asegura que si la imagen falla, se vea la default -->
                <img src="${p.img}" 
                        alt="${p.nombreSeguro}" 
                        class="img-fluid" 
                        style="max-height: 100%; max-width: 100%; object-fit: contain;" 
                        onerror="this.onerror=null; this.src='${IMG_DEFAULT}';">
            </div>

            <div class="card-body d-flex flex-column p-3 text-center">
                <h5 class="card-title fw-bold mb-2 text-dark" style="font-size: 1rem; min-height: 2.4em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                    ${p.nombreSeguro}${p.id_promo ? ` (${p.id_promo})` : ''}
                </h5>
                
                <div class="mt-auto pt-2">
                    <div class="d-flex justify-content-center align-items-center gap-2 mb-2 flex-wrap">
                        <span class="fw-bold fs-5 text-primary">$${p.precioFinal.toLocaleString('es-CO')}</span>
                        ${precioTachado}
                    </div>
                    
                    <!-- BOTÓN CORREGIDO -->
                    <!-- Se agregan data-tipo y data-stock para compatibilidad con main.js -->
                    <button class="btn btn-primary w-100 rounded-pill py-2 fw-bold btn-agregar-carrito"
                        data-id="${p.id}"
                        data-nombre="${p.nombreSeguro}"
                        data-precio="${p.precioFinal}"
                        data-imagen="${p.img}" 
                        data-stock="${p.stock}"
                        data-tipo="producto">
                        <i class="fa fa-shopping-cart me-2"></i> Agregar
                    </button>
                </div>
            </div>
        </div>
    </div>`;
}