let carrito = [];

        function agregarAlCarrito(btn) {

            const producto = {
                id: btn.dataset.id,
                nombre: btn.dataset.nombre,
                precio: parseInt(btn.dataset.precio),
                imagen: btn.dataset.imagen,
                cantidad: 1
            };

            const existente = carrito.find(p => p.id === producto.id);

            if (existente) {
                existente.cantidad++;
            } else {
                carrito.push(producto);
            }

            actualizarCarrito();
            mostrarToast();
        }

        function actualizarCarrito() {

            const cartItems = document.getElementById("cart-items");
            const cartTotal = document.getElementById("cart-total");
            const contador = document.getElementById("contador-carrito");
            const btnCheckout = document.getElementById("btn-checkout");

            cartItems.innerHTML = "";

            if (carrito.length === 0) {

                cartItems.innerHTML = `
                    <p class="text-center text-muted mt-5">
                        Tu carrito está vacío 🐾
                    </p>
                `;

                cartTotal.textContent = "$0";
                contador.style.display = "none";
                btnCheckout.disabled = true;

                return;
            }

            let total = 0;
            let cantidadTotal = 0;

            carrito.forEach(producto => {

                total += producto.precio * producto.cantidad;
                cantidadTotal += producto.cantidad;

                cartItems.innerHTML += `
                    <div class="d-flex align-items-center mb-3 border-bottom pb-2">

                        <img src="${producto.imagen}"
                            width="60"
                            class="rounded me-3">

                        <div class="flex-grow-1">

                            <h6 class="mb-1">
                                ${producto.nombre}
                            </h6>

                            <small class="text-muted">
                                Cantidad: ${producto.cantidad}
                            </small>

                        </div>

                        <strong>
                            $${(producto.precio * producto.cantidad).toLocaleString()}
                        </strong>

                    </div>
                `;
            });

            cartTotal.textContent = `$${total.toLocaleString()}`;

            contador.style.display = "inline-block";
            contador.textContent = cantidadTotal;

            btnCheckout.disabled = false;
        }

        function mostrarToast() {

            const toast = document.getElementById("toast");

            toast.classList.add("show");

            setTimeout(() => {
                toast.classList.remove("show");
            }, 2000);
        }

        function checkout() {

            alert("Compra finalizada 🐾");
            carrito = [];
            actualizarCarrito();
        }

        function ordenarProductos() {

            const tipo = document.getElementById("ordenProductos").value;

            const grid = document.getElementById("productGrid");

            const productos = [...grid.children];

            productos.sort((a, b) => {

                const precioA = parseInt(a.dataset.precio);
                const precioB = parseInt(b.dataset.precio);

                const nombreA = a.querySelector(".product-title").textContent;
                const nombreB = b.querySelector(".product-title").textContent;

                if (tipo === "precio-asc") {
                    return precioA - precioB;
                }

                if (tipo === "precio-desc") {
                    return precioB - precioA;
                }

                if (tipo === "nombre") {
                    return nombreA.localeCompare(nombreB);
                }

                return 0;
            });

            productos.forEach(producto => {
                grid.appendChild(producto);
            });
        }

        function aplicarFiltros() {
            alert("Filtros aplicados");
        }