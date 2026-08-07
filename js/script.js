// ==============================================================================
// VIA CANES - LÓGICA DEL FRONTEND CONECTADA A BACKEND (PHP + MYSQL)
// ==============================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Variables globales del estado de la tienda
    let productosBD = [];
    let serviciosBD = [];
    let carrito = JSON.parse(localStorage.getItem('via_canes_cart')) || [];

    // ==============================================================================
    // CONSUMO DE API CON PHP
    // ==============================================================================
    async function cargarDatosDesdeBD() {
        try {
            // Llamada al archivo PHP (Ruta relativa desde la raíz del index.html)
            const response = await fetch('get_data.php');
            const data = await response.json();

            if (data.error) {
                console.error("Error del backend:", data.error);
                return;
            }

            // Guardamos la información obtenida de la base de datos
            productosBD = data.productos || [];
            serviciosBD = data.servicios || [];

            // Pintamos la interfaz gráfica una vez tengamos los datos reales
            renderProductos();
            renderServicios();
            actualizarCarrito();

        } catch (error) {
            // Diagnóstico avanzado anexado correctamente
            console.error("Detalle del fallo real:", error.message);
            console.error("Pila del error:", error.stack);
        }
    }

    // ==============================================================================
    // FUNCIONES DE RENDERIZADO
    // ==============================================================================

    function renderProductos() {
        const productGrid = document.getElementById('productGrid');
        if (!productGrid) return;

        if (productosBD.length === 0) {
            productGrid.innerHTML = `<p class="text-center text-muted">No hay productos disponibles en este momento 🐾</p>`;
            return;
        }

        productGrid.innerHTML = productosBD.map(prod => `
            <div class="col-md-6 col-lg-3">
                <div class="card h-100 shadow-sm border-0">
                    <img src="${prod.imagen}" class="card-img-top p-3" alt="${prod.nombre}" style="height: 180px; object-fit: contain; background: #fcfcfc;">
                    <div class="card-body d-flex flex-column text-center">
                        <h6 class="fw-bold mb-1">${prod.nombre}</h6>
                        <p class="text-muted small flex-grow-1 mb-2">${prod.descripcion}</p>
                        <h5 class="text-primary fw-bold mb-3">$${prod.precio.toLocaleString('es-CO')}</h5>
                        <button class="btn btn-primary rounded-pill w-100 btn-add-cart text-white fw-bold btn-sm" data-id="${prod.id}">
                            <i class="fa fa-shopping-cart me-1"></i> Agregar
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        productGrid.querySelectorAll('.btn-add-cart').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.getAttribute('data-id'));
                agregarAlCarrito(id);
            });
        });
    }

     function renderServicios() {
        const servicesGrid = document.getElementById('servicesGrid');
        if (!servicesGrid) return;

        if (serviciosBD.length === 0) {
            servicesGrid.innerHTML = `<p class="text-center text-muted">No hay servicios configurados en este momento.</p>`;
            return;
        }

        // Pintamos el diseño estilo imagen informativa (Estilo bloques limpios sin botones ni precios)
        servicesGrid.innerHTML = serviciosBD.map(serv => {
            // Configuración visual por defecto (Gris)
            let fondoCard = '#f8f9fa';      
            let fondoIcono = '#e9ecef';     
            let colorTextoIcono = '#495057'; 
            let iconoElegido = 'fa-paw';    

            // Asignación dinámica de colores pasteles según la categoría de tu base de datos
            switch (serv.id_categoria_servicio) {
                case 1: // Estética / Peluquería (Bloque Rosa/Lila)
                    fondoCard = '#fdf6fb';      
                    fondoIcono = '#fae7f5';     
                    colorTextoIcono = '#d63384'; 
                    iconoElegido = 'fa-scissors';
                    break;   
                case 2: // Veterinaria / Consulta Médica (Bloque Rojo/Salmón)
                    fondoCard = '#fff5f5';      
                    fondoIcono = '#ffe3e3';     
                    colorTextoIcono = '#dc3545'; 
                    iconoElegido = 'fa-stethoscope';
                    break; 
                case 3: // Hospedería / Guardería / Paseos (Bloque Verde)
                    fondoCard = '#f4fbf7';      
                    fondoIcono = '#e6f6ec';     
                    colorTextoIcono = '#198754'; 
                    iconoElegido = 'fa-campground'; // O fa-dog
                    break;
                case 4: // Baño y Spa (Bloque Azul)
                    fondoCard = '#f1f9ff';      
                    fondoIcono = '#e1f0ff';     
                    colorTextoIcono = '#0d6efd'; 
                    iconoElegido = 'fa-bath';
                    break;
            }

            return `
                <div class="col-12 col-sm-6 col-lg-3 mb-2">
                    <!-- Al dar clic en cualquier parte del bloque, lo lleva a la página detallada de servicios -->
                    <a href="html/servicios.html" class="text-decoration-none h-100 d-block card-servicio-informativa">
                        <div class="card h-100 border-0 p-4" style="background-color: ${fondoCard}; border-radius: 16px;">
                            
                            <!-- Contenedor Cuadrado del Ícono en Color Pastel -->
                            <div class="d-flex align-items-center justify-content-center mb-4" 
                                 style="width: 52px; height: 52px; background-color: ${fondoIcono}; border-radius: 14px; color: ${colorTextoIcono};">
                                <i class="fa-solid ${iconoElegido} fs-4"></i>
                            </div>
                            
                            <!-- Información de la Base de Datos -->
                            <h5 class="fw-bold fs-6 text-dark mb-2">${serv.nombre}</h5>
                            <p class="text-muted small mb-0 lh-base" style="font-size: 0.85rem;">${serv.descripcion}</p>
                            
                        </div>
                    </a>
                </div>
            `;
        }).join('');
    }
    // ==============================================================================
    // LÓGICA DEL CARRITO (Se mantiene local con los datos traídos)
    // ==============================================================================

    function agregarAlCarrito(id) {
        const producto = productosBD.find(p => p.id === id);
        if (!producto) return;

        const existe = carrito.find(item => item.id === id);

        if (existe) {
            existe.cantidad += 1;
        } else {
            carrito.push({ ...producto, cantidad: 1 });
        }

        actualizarCarrito();
        mostrarToast(`¡${producto.nombre} agregado!`);
    }

    function cambiarCantidad(id, cambio) {
        const item = carrito.find(p => p.id === id);
        if (!item) return;

        item.cantidad += cambio;

        if (item.cantidad <= 0) {
            carrito = carrito.filter(p => p.id !== id);
        }

        actualizarCarrito();
    }

    function actualizarCarrito() {
        localStorage.setItem('via_canes_cart', JSON.stringify(carrito));

        const contador = document.getElementById('contador-carrito');
        const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
        
        if (contador) {
            if (totalItems > 0) {
                contador.textContent = totalItems;
                contador.style.display = 'inline-block';
            } else {
                contador.style.display = 'none';
            }
        }

        const cartItemsContainer = document.getElementById('cart-items');
        const cartTotalContainer = document.getElementById('cart-total');
        const btnCheckout = document.getElementById('btn-checkout');

        if (!cartItemsContainer) return;

        if (carrito.length === 0) {
            cartItemsContainer.innerHTML = `<p class="text-center text-muted mt-5">Tu carrito está vacío 🐾</p>`;
            cartTotalContainer.textContent = '$0';
            if (btnCheckout) {
                btnCheckout.style.pointerEvents = 'none';
                btnCheckout.style.opacity = '0.6';
            }
            return;
        }

        cartItemsContainer.innerHTML = carrito.map(item => `
            <div class="d-flex align-items-center justify-content-between mb-3 pb-3 border-bottom">
                <img src="${item.imagen}" alt="${item.nombre}" style="width: 50px; height: 50px; object-fit: contain;" class="me-2">
                <div class="flex-grow-1">
                    <h6 class="small fw-bold mb-0">${item.nombre}</h6>
                    <small class="text-muted">$${item.precio.toLocaleString('es-CO')}</small>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <button class="btn btn-sm btn-light p-1 btn-minus" data-id="${item.id}" style="width:24px; height:24px;">-</button>
                    <span class="small fw-bold">${item.cantidad}</span>
                    <button class="btn btn-sm btn-light p-1 btn-plus" data-id="${item.id}" style="width:24px; height:24px;">+</button>
                </div>
            </div>
        `).join('');

        const totalDinero = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
        cartTotalContainer.textContent = `$${totalDinero.toLocaleString('es-CO')}`;

        if (btnCheckout) {
            btnCheckout.style.pointerEvents = 'auto';
            btnCheckout.style.opacity = '1';
        }

        // Eventos para botones de disminuir cantidad (Líneas completadas)
        cartItemsContainer.querySelectorAll('.btn-minus').forEach(b => {
            b.addEventListener('click', (e) => cambiarCantidad(parseInt(e.currentTarget.getAttribute('data-id')), -1));
        });

        // Eventos para botones de aumentar cantidad (Líneas completadas)
        cartItemsContainer.querySelectorAll('.btn-plus').forEach(b => {
            b.addEventListener('click', (e) => cambiarCantidad(parseInt(e.currentTarget.getAttribute('data-id')), 1));
        });
    }

    // ==============================================================================
    // UTILIDADES VISUALES
    // ==============================================================================
    function mostrarToast(mensaje) {
        console.log(mensaje);
    }

    // ==============================================================================
    // INICIALIZACIÓN
    // ==============================================================================
    cargarDatosDesdeBD();
});



