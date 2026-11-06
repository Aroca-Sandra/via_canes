// ================================================================
// MÓDULO: PROMOCIONES — Página pública de ofertas tienda-promocione.js
// ================================================================
(() => {
  document.addEventListener('DOMContentLoaded', () => {
    const contenedor = document.getElementById('productGrid'); // Asegúrate que el ID en tu HTML sea 'productGrid' o cámbialo aquí si es 'promoGrid'
    
    // Si no hay contenedor, intentamos buscar por clase común si el ID falla, o salimos
    if (!contenedor) return;

    // 1. INYECTAR ESTILOS PARA EL EFECTO VERDE GLOBAL
    if (!document.getElementById('style-promociones-verde')) {
      const style = document.createElement('style');
      style.id = 'style-promociones-verde';
      style.innerHTML = `
        .card-verde-activo {
          border: 2px solid #198754 !important;
          background-color: #f0fff4 !important;
          box-shadow: 0 0 20px rgba(25, 135, 84, 0.4) !important;
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
          z-index: 10;
        }
        .card-verde-activo:hover {
          transform: translateY(-8px) scale(1.02) !important; 
          box-shadow: 0 12px 25px rgba(25, 135, 84, 0.5) !important;
        }
      `;
      document.head.appendChild(style);
    }

    const API_URL = '../api/promociones_data.php';
    const IMG_DEFAULT = '../img/producto-default.jpg';

    async function cargarPromociones() {
      try {
        // Mostrar spinner inicial
        contenedor.innerHTML = `
          <div class="col-12 text-center py-5">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="mt-2 text-muted">Cargando las mejores ofertas...</p>
          </div>`;

        const res = await fetch(`${API_URL}?accion=listar_activas`);
        if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);

        const json = await res.json();
        if (json.error) throw new Error(json.error);

        // Adaptabilidad a diferentes respuestas de API
        const data = json.data || json.promociones || json.result || [];

        if (!Array.isArray(data) || data.length === 0) {
          contenedor.innerHTML = `
            <div class="col-12 text-center py-5">
              <i class="fa fa-tags fa-3x text-muted mb-3"></i>
              <h4>No hay promociones activas</h4>
              <p class="text-muted">Vuelve pronto para ver nuestras ofertas especiales.</p>
            </div>`;
          return;
        }

        procesarYRenderizar(data);
      } catch (err) {
        console.error('❌ Error cargando promociones:', err);
        // No borramos el grid completo si hay error, solo mostramos alerta discreta o log
        contenedor.innerHTML = `<div class="col-12 text-danger text-center">No se pudieron cargar las ofertas.</div>`;
      }
    }

    function procesarYRenderizar(datos) {
      const listaProductosMapeados = datos.map(p => procesarProducto(p));
      contenedor.innerHTML = listaProductosMapeados.map(p => crearCard(p)).join('');
      
      // Nota: No necesitamos configurarBotonesCarrito() aquí porque main.js usa delegación de eventos (document.addEventListener)
    }

    function procesarProducto(p) {
      const valorDescuento = Number(p.valor_descuento || p.valor || 0);
      const tipoDescuento = (p.tipo_descuento || 'fijo').toString().toLowerCase();
      const precioOriginal = Number(p.precio_venta || p.precio || 0);

      let precioFinal = precioOriginal;
      let porcentajeVisual = 0;

      if (tipoDescuento === 'porcentaje') {
        porcentajeVisual = valorDescuento;
        precioFinal = precioOriginal * (1 - (valorDescuento / 100));
      } else {
        precioFinal = Math.max(0, precioOriginal - valorDescuento);
        if (precioOriginal > 0) {
          porcentajeVisual = Math.round(((valorDescuento / precioOriginal) * 100));
        }
      }

      // Normalización de imagen
      let imgUrl = p.imagen_url || p.foto_url || p.imagen || p.url_imagen || '';
      if (imgUrl && imgUrl.trim() !== '') {
        imgUrl = imgUrl.trim();
        if (!imgUrl.startsWith('http://') && !imgUrl.startsWith('https://')) {
           // Ajuste de ruta relativa
           imgUrl = imgUrl.replace(/^(\.|\/)+/i, ''); 
           if(!imgUrl.startsWith('img/')) imgUrl = 'img/' + imgUrl;
           // Como estamos en una subcarpeta probablemente, ajustamos para el src del HTML
           // Si este script corre en raiz: '../img/'
           // Si corre en carpeta: '../../img/' -> Asumiremos estructura estándar
           imgUrl = '../' + imgUrl; 
        }
      } else {
        imgUrl = IMG_DEFAULT;
      }

      const nombreSeguro = String(p.nombre || 'Producto sin nombre').replace(/"/g, '&quot;');

      return {
        id: Number(p.id_producto || p.id || 0),
        nombreSeguro: nombreSeguro,
        precioOriginal: precioOriginal, // IMPORTANTE: Guardamos el original
        precioFinal: Math.round(precioFinal),
        porcentajeVisual: porcentajeVisual,
        img: imgUrl,
        stock: p.stock || 0,
        tipo: 'producto'
      };
    }

    function crearCard(p) {
      const badgeDescuento = p.porcentajeVisual > 0
        ? `<div class="position-absolute top-0 end-0 m-3" style="z-index: 10;">
             <span class="badge bg-danger rounded-pill px-3 py-2 fw-bold shadow-sm">-${p.porcentajeVisual}% OFF</span>
           </div>`
        : '';

      const precioTachado = p.precioOriginal > p.precioFinal
        ? `<span class="text-decoration-line-through text-muted small">$${p.precioOriginal.toLocaleString('es-CO')}</span>`
        : '';

      // Normalizamos ruta para el atributo data-imagen (quitamos ../ si es necesario para la lógica interna, o lo dejamos según tu backend)
      // Para consistency con main.js, enviaremos la ruta tal cual la usamos en src
      
      return `
        <div class="col-12 col-sm-6 col-lg-3 mb-4 fade-in">
          <div class="card h-100 border-0 shadow-sm product-card position-relative overflow-hidden card-producto-individual">
            ${badgeDescuento}
            <div class="position-relative" style="height: 250px; background-color: #f8fafc; display: flex; align-items: center; justify-content: center; overflow: hidden;">
              <img src="${p.img}"
                   alt="${p.nombreSeguro}"
                   class="img-fluid"
                   style="max-height: 85%; max-width: 85%; object-fit: contain; transition: transform 0.3s ease;"
                   onerror="this.onerror=null; this.src='${IMG_DEFAULT}';">
            </div>
            <div class="card-body d-flex flex-column p-3 text-center">
              <h5 class="card-title fw-bold mb-2 text-dark" style="font-size: 1rem; min-height: 2.4em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                ${p.nombreSeguro}
              </h5>

              <div class="mt-auto pt-2">
                <div class="d-flex justify-content-center align-items-center gap-2 mb-2 flex-wrap">
                  <span class="fw-bold fs-5 text-dark">$${p.precioFinal.toLocaleString('es-CO')}</span>
                  ${precioTachado}
                </div>

                <!-- CORRECCIÓN PRINCIPAL: Agregado data-precio-original -->
                <button class="btn btn-add w-100 fw-bold btn-agregar-carrito"
                        data-id="${p.id}"
                        data-nombre="${p.nombreSeguro}"
                        data-precio="${p.precioFinal}"
                        data-precio-original="${p.precioOriginal}" 
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

    // Iniciar carga
    cargarPromociones();
  });
})();