// ================================================================
// BUSCADOR.JS - Búsqueda con autocompletado (MULTI-PÁGINA)
// ================================================================

export class SearchAutocomplete {
    constructor(options = {}) {
        this.input = document.getElementById(options.inputId || 'buscadorProductos');
        this.dropdown = document.getElementById(options.dropdownId || 'sugerenciasBusqueda');
        this.btnLimpiar = document.getElementById(options.clearId || 'btnLimpiarBusqueda');

        if (!this.input || !this.dropdown) {
            console.warn('🔍 Buscador: Elementos no encontrados');
            return;
        }

        this.debounceMs = options.debounce || 300;
        this.maxResults = options.maxResults || 8;
        this.minChars = options.minChars || 2;

        // ✅ FIX CRÍTICO: Detectar ubicación y calcular prefijos dinámicos
        const path = window.location.pathname;
        this.enCarpetaHtml = path.includes('/html/') || path.includes('\\html\\');

        // Prefijo para API (desde /html/ → ../api/, desde raíz → api/)
        this.rutaApi = this.enCarpetaHtml ? '../api/' : 'api/';

        // Prefijo para imágenes (desde /html/ → ../img/, desde raíz → img/)
        this.imgPrefix = this.enCarpetaHtml ? '../img/' : 'img/';
        this.imgDefault = this.imgPrefix + 'default-product.png';

        // ✅ Prefijo para navegar entre páginas (desde /html/ → ../, desde raíz → vacío)
        this.pagePrefix = this.enCarpetaHtml ? '../' : '';

        // Permitir sobreescribir rutaApi si viene en options (por compatibilidad)
        if (options.rutaApi && !this.enCarpetaHtml) {
            this.rutaApi = options.rutaApi;
        }

        this.productos = [];
        this.servicios = [];
        this.categorias = this._getCategoriaConfig();
        this.indiceActivo = -1;
        this.debounceTimer = null;
        this.estaAbierto = false;

        this._bindEvents();
        this._cargarDatos();
    }

    // ✅ ACTUALIZADO: URLs dinámicas con this.pagePrefix
    _getCategoriaConfig() {
        const p = this.pagePrefix;
        return [
            // Especies Principales
            { nombre: 'Perros', tipo: 'especie', icono: 'fa-dog', url: `${p}index.html?tipo=especie&valor=Perros` },
            { nombre: 'Gatos', tipo: 'especie', icono: 'fa-cat', url: `${p}index.html?tipo=especie&valor=Gatos` },
            { nombre: 'Otra Especie', tipo: 'especie', icono: 'fa-paw', url: `${p}index.html?tipo=especie&valor=Otra%20Especie` },

            // Subcategorías de Productos
            { nombre: 'Alimentación y Nutrición', tipo: 'categoria', icono: 'fa-bowl-food', url: `${p}index.html?tipo=categoria&valor=Alimentacion` },
            { nombre: 'Accesorios y Juguetes', tipo: 'categoria', icono: 'fa-baseball', url: `${p}index.html?tipo=categoria&valor=Accesorios` },
            { nombre: 'Higiene y Cuidado Estético', tipo: 'categoria', icono: 'fa-shower', url: `${p}index.html?tipo=categoria&valor=Higiene` },
            { nombre: 'Mascotas Especiales', tipo: 'categoria', icono: 'fa-otter', url: `${p}index.html?tipo=categoria&valor=Especiales` },
            { nombre: 'Cuidado y Salud', tipo: 'categoria', icono: 'fa-heart-pulse', url: `${p}index.html?tipo=categoria&valor=Salud` },

            // Servicios y Promociones
            { nombre: 'Servicios', tipo: 'categoria', icono: 'fa-concierge-bell', url: `${p}index.html?tipo=categoria&valor=Servicios` },
            { nombre: 'Promociones', tipo: 'categoria', icono: 'fa-tags', url: `${p}html/promociones.html` }
        ];
    }

    _normalizarRutaImagen(url) {
        if (!url || url === 'null' || String(url).trim() === '') return this.imgDefault;

        let imgUrl = String(url).trim();
        imgUrl = imgUrl.replace(/^(\.\.\/)+/, '');

        if (imgUrl.startsWith('http') || imgUrl.startsWith('/')) return imgUrl;

        if (imgUrl.startsWith('img/')) imgUrl = imgUrl.substring(4);

        return this.imgPrefix + imgUrl;
    }

    async _cargarDatos() {
        try {
            const [productosRes, serviciosRes] = await Promise.all([
                fetch(`${this.rutaApi}productos_data.php?vista=tienda`),
                fetch(`${this.rutaApi}productos_data.php?vista=servicios`)
            ]);

            const productosData = await productosRes.json();
            const serviciosData = await serviciosRes.json();

            if (productosData.ok || productosData.success) {
                this.productos = (productosData.data || []).map(p => ({
                    id: p.id_producto || p.id,
                    nombre: p.nombre || '',
                    nombreNormalizado: this._normalizar(p.nombre || ''),
                    precio: Number(p.precio_venta || p.precio || 0),
                    imagen: this._normalizarRutaImagen(p.imagen_url || p.foto_url),
                    tipo: 'producto'
                }));
            }

            if (serviciosData.ok || serviciosData.success) {
                this.servicios = (serviciosData.data || []).map(s => ({
                    id: s.id_servicio || s.id,
                    nombre: s.nombre || '',
                    nombreNormalizado: this._normalizar(s.nombre || ''),
                    precio: Number(s.precio || 0),
                    imagen: this._normalizarRutaImagen(s.imagen_url || s.foto_url),
                    tipo: 'servicio'
                }));
            }

            console.log(`🔍 Buscador: ${this.productos.length} productos y ${this.servicios.length} servicios cargados (ubicación: ${this.enCarpetaHtml ? '/html/' : 'raíz'})`);
        } catch (error) {
            console.error('❌ Buscador: Error al cargar datos', error);
        }
    }

    _normalizar(texto) {
        return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    }

    _buscar(query) {
        if (!query || query.length < this.minChars) return [];

        const q = this._normalizar(query);
        const resultados = [];
        const p = this.pagePrefix;

        this.categorias.forEach(cat => {
            if (this._normalizar(cat.nombre).includes(q)) {
                resultados.push({
                    tipo: 'categoria',
                    nombre: cat.nombre,
                    icono: cat.icono,
                    url: cat.url,
                    relevancia: 100
                });
            }
        });

        this.productos.forEach(prod => {
            if (prod.nombreNormalizado.includes(q)) {
                const empiezaCon = prod.nombreNormalizado.startsWith(q);
                resultados.push({
                    tipo: 'producto',
                    id: prod.id,
                    nombre: prod.nombre,
                    precio: prod.precio,
                    imagen: prod.imagen,
                    url: `${p}html/detalle.html?id=${prod.id}`,
                    relevancia: empiezaCon ? 50 : 30
                });
            }
        });

        this.servicios.forEach(s => {
            if (s.nombreNormalizado.includes(q)) {
                const empiezaCon = s.nombreNormalizado.startsWith(q);
                resultados.push({
                    tipo: 'servicio',
                    id: s.id,
                    nombre: s.nombre,
                    precio: s.precio,
                    imagen: s.imagen,
                    url: `${p}html/detalle.html?id=${s.id}`,
                    relevancia: empiezaCon ? 45 : 25
                });
            }
        });

        return resultados
            .sort((a, b) => b.relevancia - a.relevancia)
            .slice(0, this.maxResults);
    }

    _renderizar(resultados, query) {
        if (resultados.length === 0) {
            this.dropdown.innerHTML = `
                <div class="sugerencia-vacio">
                    <i class="fa fa-search"></i>
                    No encontramos "<strong>${this._escapeHtml(query)}</strong>"
                </div>
            `;
            this._abrir();
            return;
        }

        const grupos = {};
        resultados.forEach(r => {
            if (!grupos[r.tipo]) grupos[r.tipo] = [];
            grupos[r.tipo].push(r);
        });

        const ordenGrupos = ['categoria', 'producto', 'servicio'];
        const etiquetas = { categoria: 'Categorías', producto: 'Productos', servicio: 'Servicios' };

        let html = '';
        ordenGrupos.forEach(tipo => {
            if (grupos[tipo] && grupos[tipo].length > 0) {
                html += `<div class="sugerencia-grupo">${etiquetas[tipo]}</div>`;
                html += grupos[tipo].map(item => this._renderItem(item, query)).join('');
            }
        });

        this.dropdown.innerHTML = html;
        this._abrir();
    }

    _renderItem(item, query) {
        const esCategoria = item.tipo === 'categoria';

        const iconoHtml = esCategoria
            ? `<div class="sugerencia-icono"><i class="fa ${item.icono}"></i></div>`
            : `<img src="${item.imagen}" class="sugerencia-img" alt="" onerror="this.onerror=null; this.src='${this.imgDefault}'">`;

        const precioHtml = item.precio > 0
            ? `<span class="sugerencia-precio">$${item.precio.toLocaleString('es-CO')}</span>`
            : '';

        return `
            <a href="${item.url}" 
               class="sugerencia-item" 
               role="option" 
               id="sugerencia-${item.id || item.nombre}"
               data-tipo="${item.tipo}"
               aria-selected="false">
                ${iconoHtml}
                <div class="sugerencia-contenido">
                    <span class="sugerencia-nombre">${this._resaltar(item.nombre, query)}</span>
                    <span class="sugerencia-tipo">${item.tipo}</span>
                </div>
                ${precioHtml}
            </a>
        `;
    }

    _resaltar(texto, query) {
        if (!query) return this._escapeHtml(texto);
        const regex = new RegExp(`(${this._escapeRegex(query)})`, 'gi');
        return this._escapeHtml(texto).replace(regex, '<mark>$1</mark>');
    }

    _escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    _escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    _abrir() {
        this.dropdown.style.display = 'block';
        this.estaAbierto = true;
        this.input.setAttribute('aria-expanded', 'true');
    }

    _cerrar() {
        this.dropdown.style.display = 'none';
        this.estaAbierto = false;
        this.indiceActivo = -1;
        this.input.setAttribute('aria-expanded', 'false');
        this.input.setAttribute('aria-activedescendant', '');
    }

    _actualizarHighlight() {
        const items = this.dropdown.querySelectorAll('.sugerencia-item');
        items.forEach((item, idx) => {
            item.setAttribute('aria-selected', idx === this.indiceActivo ? 'true' : 'false');
            if (idx === this.indiceActivo) {
                item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                this.input.setAttribute('aria-activedescendant', item.id);
            }
        });
    }

    _bindEvents() {
        this.input.addEventListener('input', () => {
            const valor = this.input.value.trim();

            if (this.btnLimpiar) {
                this.btnLimpiar.style.display = valor ? 'block' : 'none';
            }

            clearTimeout(this.debounceTimer);

            if (!valor || valor.length < this.minChars) {
                this._cerrar();
                return;
            }

            this.debounceTimer = setTimeout(() => {
                const resultados = this._buscar(valor);
                this._renderizar(resultados, valor);
            }, this.debounceMs);
        });

        this.input.addEventListener('keydown', (e) => {
            if (!this.estaAbierto) return;

            const items = this.dropdown.querySelectorAll('.sugerencia-item');

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.indiceActivo = Math.min(this.indiceActivo + 1, items.length - 1);
                this._actualizarHighlight();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.indiceActivo = Math.max(this.indiceActivo - 1, 0);
                this._actualizarHighlight();
            } else if (e.key === 'Enter') {
                if (this.indiceActivo >= 0 && items[this.indiceActivo]) {
                    e.preventDefault();
                    items[this.indiceActivo].click();
                }
            } else if (e.key === 'Escape') {
                this._cerrar();
            }
        });

        if (this.btnLimpiar) {
            this.btnLimpiar.addEventListener('click', () => {
                this.input.value = '';
                this.btnLimpiar.style.display = 'none';
                this._cerrar();
                this.input.focus();
            });
        }

        document.addEventListener('click', (e) => {
            if (!this.input.contains(e.target) && !this.dropdown.contains(e.target)) {
                this._cerrar();
            }
        });

        window.addEventListener('scroll', () => {
            if (this.estaAbierto) this._cerrar();
        }, { passive: true });
    }
}