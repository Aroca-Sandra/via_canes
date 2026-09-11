// ================================================================
// MÓDULO: PROMOCIONES — Página pública de ofertas (CORREGIDO)
// ================================================================
(() => {
    document.addEventListener('DOMContentLoaded', () => {
        const contenedor = document.getElementById('productGrid');
        if (!contenedor) return;

        // Ajusta esta ruta según tu estructura real de API
        const API_URL = '../api/promociones_data.php'; 
        
        // IMAGEN POR DEFECTO: Asegúrate de que esta ruta exista
        const IMG_DEFAULT = '../img/producto-default.jpg'; 

        let listaProductosMapeados = [];

        async function cargarPromociones() {
            try {
                // Mostrar spinner
                contenedor.innerHTML = `
                <div class="col-12 text-center py-5">
                    <div class="spinner-border text-primary" role="status"></div>
                    <p class="mt-2 text-muted">Cargando las mejores ofertas...</p>
                </div>`;

                const res = await fetch(`${API_URL}?accion=listar_activas`);
                if (!res.ok) throw new Error(`Error del servidor: ${res.status}`);

                const json = await res.json();
                
                // Manejo flexible de la respuesta (data o promociones)
                const data = json.data || json.promociones || [];
                
                if (!Array.isArray(data) || data.length === 0) {
                    contenedor.innerHTML = `
                        <div class="col-12 text-center py-5">
                            <i class="fa fa-tags fa-3x text-muted mb-3"></i>
                            <h4>No hay promociones activas en este momento</h4>
                            <p class="text-muted">Vuelve pronto para ver nuestras ofertas especiales.</p>
                        </div>`;
                    return;
                }

                procesarYRenderizar(data);

            } catch (err) {
                console.error('❌ Error crítico cargando promociones:', err);
                contenedor.innerHTML = '<div class="col-12 text-center text-danger"><p>Error al conectar con el servidor. Intenta recargar.</p></div>';
            }
        }

        function procesarYRenderizar(datos) {
            // Procesamos los datos crudos a un formato limpio para el frontend
            listaProductosMapeados = datos.map(p => procesarProducto(p));
            
            // Generamos el HTML
            const htmlCards = listaProductosMapeados.map(p => crearCard(p)).join('');
            contenedor.innerHTML = htmlCards;

            // IMPORTANTE: Reinicializamos los listeners para el carrito
            configurarBotonesCarrito();
        }

        function procesarProducto(p) {
            // 1. Lógica de Precios
            const valorDescuento = Number(p.valor_descuento || p.valor || 0);
            const tipoDescuento = (p.tipo_descuento || 'fijo').toString().toLowerCase();
            const precioOriginal = Number(p.precio_venta || p.precio || 0);
            
            let precioFinal = precioOriginal;
            let porcentajeVisual = 0;

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

            // 2. CORRECCIÓN CRÍTICA DE RUTA DE IMAGEN
            let imgUrl = p.imagen_url || p.foto_url || '';
            
            if (imgUrl && imgUrl.trim() !== '') {
                // Limpiamos posibles '../' repetidos al inicio
                imgUrl = imgUrl.replace(/^(\.\.\/)+/, ''); 
                
                // Si no empieza con http (absoluta) ni con / (raíz), asumimos relativa y añadimos '../'
                if (!imgUrl.startsWith('http') && !imgUrl.startsWith('/')) {
                    imgUrl = '../' + imgUrl; 
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
                stock: p.stock || 0,
                // Añadimos tipo explícito para ayudar a la visibilidad en lógica externa
                tipo: 'producto' 
            };
        }

        function crearCard(p) {
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
                            ${p.nombreSeguro}
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

        function configurarBotonesCarrito() {
            const botones = document.querySelectorAll('.btn-agregar-carrito');
            
            botones.forEach(boton => {
                // Removemos listeners previos para evitar duplicados si se re-renderiza
                boton.replaceWith(boton.cloneNode(true));
            });

            // Volvemos a seleccionar los botones limpios
            const botonesLimpios = document.querySelectorAll('.btn-agregar-carrito');

            botonesLimpios.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const clickedBtn = e.currentTarget;
                    
                    // Construimos el objeto producto exactamente como lo espera el carrito global
                    const producto = {
                        id: Number(clickedBtn.getAttribute('data-id')),
                        nombre: clickedBtn.getAttribute('data-nombre'),
                        precio: Number(clickedBtn.getAttribute('data-precio')),
                        imagen: clickedBtn.getAttribute('data-imagen'), // Ahora contiene la URL corregida
                        cantidad: 1,
                        stock: Number(clickedBtn.getAttribute('data-stock')),
                        tipo: clickedBtn.getAttribute('data-tipo') || 'producto'
                    };

                    console.log("Intentando agregar:", producto); // Debug

                    if (typeof window.agregarAlCarrito === 'function') {
                        try {
                            window.agregarAlCarrito(producto);
                            
                            // Feedback visual de éxito
                            const originalHTML = btn.innerHTML;
                            clickedBtn.innerHTML = '<i class="fa fa-check"></i> Agregado';
                            clickedBtn.classList.remove('btn-primary');
                            clickedBtn.classList.add('btn-success');
                            
                            setTimeout(() => {
                                clickedBtn.innerHTML = '<i class="fa fa-shopping-cart me-2"></i> Agregar';
                                clickedBtn.classList.remove('btn-success');
                                clickedBtn.classList.add('btn-primary');
                            }, 2000);

                        } catch (error) {
                            console.error("Error al ejecutar agregarAlCarrito:", error);
                            alert("Hubo un error al agregar el producto.");
                        }
                    } else {
                        console.error("❌ Error: La función 'agregarAlCarrito' no está disponible en window. Verifica que main.js cargue antes.");
                    }
                });
            });
        }

        // Iniciar carga
        cargarPromociones();
    });
})();