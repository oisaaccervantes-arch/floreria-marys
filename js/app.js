document.addEventListener('DOMContentLoaded', () => {

    // NOTA SOBRE MESES EN JAVASCRIPT: Los meses van de 0 a 11 (0 = Enero, 1 = Febrero, 2 = Marzo, etc.)
    // - Para simular 13 de Febrero (San Valentín), usamos el mes index 1 -> new Date(2026, 1, 13)
    // - Para simular 13 de Marzo (Flores Amarillas), usamos el mes index 2 -> new Date(2026, 2, 13)
    let testDateOverride = new Date(2026, 4, 22); // 13 de Febrero de 2026 (Muestra San Valentín)

    window.simularFecha = function (fechaStr) {
        testDateOverride = fechaStr ? new Date(fechaStr) : null;
        console.log("Fecha simulada:", testDateOverride || "Tiempo Real");
        initOccasionSection(allProducts);
    };

    function getNow() {
        return testDateOverride ? new Date(testDateOverride.getTime()) : new Date();
    }

    // --- 1. CONFIGURACIÓN Y CATÁLOGO DINÁMICO ---
    const grid = document.getElementById('products-grid');
    const statusText = document.getElementById('catalog-status');
    let allProducts = [];
    let occasionInterval = null;

    async function loadProducts() {
        try {
            const url = "https://docs.google.com/spreadsheets/d/11N4iTwNsoNL5yS_wJGPIkq7-uLTnkSYet7q664_q_po/gviz/tq?tqx=out:json";
            const response = await fetch(url);

            if (!response.ok) throw new Error("Fallo la conexión");

            const text = await response.text();

            // Quitar el prefijo google.visualization.Query.setResponse( y el sufijo )
            const jsonString = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
            const data = JSON.parse(jsonString);

            allProducts = parseJSONData(data);
            renderProducts(allProducts);
            initPromoSection(allProducts);
            initPopularSection(allProducts);
            initOccasionSection(allProducts);
        } catch (error) {
            console.error("Error al cargar productos", error);
            statusText.textContent = "Catálogo actualizándose, contáctanos por WhatsApp";
            // Mostrar dummy para demostrar la UI de todos modos
            allProducts = dummyData;
            renderProducts(allProducts);
            initPromoSection(allProducts);
            initPopularSection(allProducts);
            initOccasionSection(allProducts);
        }
    }

    function formatPrice(val) {
        if (!val) return "$0";
        let strVal = String(val).trim();
        let numParsed = parseFloat(strVal.replace(/[^0-9.-]+/g, ""));
        if (isNaN(numParsed)) return strVal.startsWith('$') ? strVal : '$' + strVal;

        // Formatear a MXN
        let formatted = '$' + numParsed.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return formatted.endsWith('.00') ? formatted.slice(0, -3) : formatted;
    }

    function parseJSONData(data) {
        const result = [];
        if (!data.table || !data.table.rows) return result;

        data.table.rows.forEach(row => {
            if (!row.c) return;

            const getValue = (colIndex) => {
                return (row.c[colIndex] && row.c[colIndex].v !== null) ? String(row.c[colIndex].v) : "";
            };

            const obj = {
                nombre: getValue(0),
                categoria: getValue(1),
                descripcion: getValue(2),
                precio: getValue(3),
                imagen_url: getValue(4),
                disponible: getValue(5),
                popular: getValue(6)
            };

            if (obj.disponible && obj.disponible.toUpperCase().trim() === "SI") {
                result.push(obj);
            }
        });

        return result;
    }

    function renderProducts(products) {
        grid.innerHTML = "";
        statusText.style.display = "none";

        const now = getNow();
        const activeOcc = checkActiveOccasion(now);
        const activeOccCategory = activeOcc ? activeOcc.category.toLowerCase().trim() : null;

        // Filtrar productos para ocultar categorías que ya tienen su propia sección visible
        const displayedProducts = products.filter(p => {
            const cat = p.categoria ? p.categoria.toLowerCase().trim() : "";
            const isPopular = p.popular && p.popular.toUpperCase().trim() === "SI";

            // Siempre excluir "promoción del mes"
            if (cat === "promoción del mes") return false;

            // Siempre excluir productos populares
            if (isPopular) return false;

            // Excluir la categoría de la ocasión especial activa solo si se está mostrando
            if (activeOccCategory && cat === activeOccCategory) return false;

            return true;
        });

        if (displayedProducts.length === 0) {
            statusText.style.display = "block";
            
            // Si el catálogo se quedó vacío pero había productos antes de filtrar, mostramos aviso premium
            if (products.length > 0) {
                const hasPromo = products.some(p => p.categoria && p.categoria.toLowerCase().trim() === "promoción del mes");
                const hasActiveOcc = activeOccCategory && products.some(p => p.categoria && p.categoria.toLowerCase().trim() === activeOccCategory);
                const hasPopular = products.some(p => p.popular && p.popular.toUpperCase().trim() === "SI");
                
                if (hasPromo) {
                    statusText.innerHTML = `
                        <div class="special-notice-box" style="padding: 2rem; border-radius: 12px; background: #FFF8E1; border: 1px solid #FFE0B2; max-width: 550px; margin: 2rem auto; text-align: center; box-shadow: var(--shadow-soft);">
                            <i class="ph ph-tag" style="font-size: 2.5rem; color: #FF9800; margin-bottom: 1rem; display: inline-block;"></i>
                            <h3 style="font-size: 1.2rem; color: #E65100; font-weight: 600; margin-bottom: 0.5rem; font-family: 'Playfair Display', serif;">🔥 Promoción del Mes</h3>
                            <p style="font-size: 0.95rem; color: #5D4037; line-height: 1.5; margin: 0;">Estos productos se encuentran exclusivamente en la sección fija de <strong>Promoción del Mes</strong> al inicio de la página.</p>
                        </div>
                    `;
                } else if (hasActiveOcc && activeOcc) {
                    const occColor = activeOcc.color || "#F8F0FC";
                    statusText.innerHTML = `
                        <div class="special-notice-box" style="padding: 2rem; border-radius: 12px; background: ${occColor}; border: 1px solid var(--border-color); max-width: 550px; margin: 2rem auto; text-align: center; box-shadow: var(--shadow-soft);">
                            <i class="ph ph-flower-tulip" style="font-size: 2.5rem; color: var(--primary); margin-bottom: 1rem; display: inline-block;"></i>
                            <h3 style="font-size: 1.2rem; color: var(--text-dark); font-weight: 600; margin-bottom: 0.5rem; font-family: 'Playfair Display', serif;">🌸 ${activeOcc.title}</h3>
                            <p style="font-size: 0.95rem; color: var(--text-muted); line-height: 1.5; margin: 0;">Los productos de esta categoría se encuentran en la sección especial de <strong>${activeOcc.name}</strong> al inicio de la página.</p>
                        </div>
                    `;
                } else if (hasPopular) {
                    statusText.innerHTML = `
                        <div class="special-notice-box" style="padding: 2rem; border-radius: 12px; background: var(--bg-main); border: 1px solid var(--border-color); max-width: 550px; margin: 2rem auto; text-align: center; box-shadow: var(--shadow-soft);">
                            <i class="ph ph-sparkle" style="font-size: 2.5rem; color: #FFD700; margin-bottom: 1rem; display: inline-block;"></i>
                            <h3 style="font-size: 1.2rem; color: var(--text-dark); font-weight: 600; margin-bottom: 0.5rem; font-family: 'Playfair Display', serif;">⭐ Lo Más Popular</h3>
                            <p style="font-size: 0.95rem; color: var(--text-muted); line-height: 1.5; margin: 0;">Estos productos destacados se encuentran en la sección fija de <strong>Lo Más Popular</strong> arriba.</p>
                        </div>
                    `;
                } else {
                    statusText.textContent = "No hay productos disponibles por ahora.";
                }
            } else {
                statusText.textContent = "No hay productos disponibles por ahora.";
            }
            return;
        }

        displayedProducts.forEach(p => {
            const title = p.nombre || "Arreglo Floral";
            const cat = p.categoria || "N/A";
            const desc = p.descripcion || "";
            const price = formatPrice(p.precio || "0");
            const imgUrl = p.imagen_url || "https://images.unsplash.com/photo-1563241527-3004b7be0ffd?w=500";

            const card = document.createElement("div");
            card.className = "product-card";
            card.innerHTML = `
                <img src="${imgUrl}" alt="${title}" class="product-img">
                <div class="product-info">
                    <span class="product-category">${cat}</span>
                    <h3 class="product-name">${title}</h3>
                    <p class="product-desc">${desc}</p>
                    <div class="product-bottom">
                        <span class="product-price">${price}</span>
                        <button class="btn-add-cart" onclick="addToCart('${title.replace(/'/g, "\\'")}', this)">
                            <i class="ph ph-shopping-cart"></i> Agregar al carrito
                        </button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    // --- DROPDOWN DE CATEGORÍAS ---
    const categoryDropdown = document.getElementById('category-dropdown');
    const dropdownToggle = document.getElementById('dropdown-toggle');
    const dropdownLabel = document.getElementById('dropdown-label');
    const dropdownItems = document.querySelectorAll('.dropdown-item');

    if (dropdownToggle) {
        dropdownToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            categoryDropdown.classList.toggle('open');
        });
    }

    dropdownItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            const filter = item.dataset.filter;
            if (dropdownLabel) dropdownLabel.textContent = filter === 'all' ? 'Todas las categorías' : item.textContent;
            if (categoryDropdown) categoryDropdown.classList.remove('open');
            const filtered = filter === 'all' ? allProducts : allProducts.filter(p => p.categoria.toLowerCase().trim() === filter);
            renderProducts(filtered);
        });
    });

    document.addEventListener('click', () => {
        if (categoryDropdown) categoryDropdown.classList.remove('open');
    });

    // --- LÓGICA DEL CARRITO ---
    const cartBadge = document.getElementById("cart-badge");
    const cartItemsContainer = document.getElementById("cart-items");
    const cartSubtotalPrice = document.getElementById("cart-subtotal-price");

    let cart = JSON.parse(localStorage.getItem('floreria_cart') || '[]');

    function updateCartUI() {
        const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
        if (cartBadge) cartBadge.textContent = totalItems;

        if (cartItemsContainer) {
            cartItemsContainer.innerHTML = '';
            let subtotal = 0;

            if (cart.length === 0) {
                cartItemsContainer.innerHTML = '<p style="text-align:center; color: var(--text-muted); margin-top: 2rem;">Tu carrito está vacío.</p>';
            } else {
                cart.forEach((item, index) => {
                    const priceNum = parseFloat(item.precio.replace(/[^0-9.-]+/g, "")) || 0;
                    subtotal += priceNum * item.qty;

                    const cartItem = document.createElement("div");
                    cartItem.className = "cart-item";
                    cartItem.innerHTML = `
                        <img src="${item.imagen_url}" alt="${item.nombre}" class="cart-item-img">
                        <div class="cart-item-info">
                            <div class="cart-item-title">${item.nombre}</div>
                            <div class="cart-item-price">${formatPrice(item.precio)}</div>
                            <div class="cart-item-actions">
                                <button class="qty-btn" type="button" onclick="updateQty(${index}, -1)">-</button>
                                <span class="qty-display">${item.qty}</span>
                                <button class="qty-btn" type="button" onclick="updateQty(${index}, 1)">+</button>
                            </div>
                        </div>
                        <button class="remove-item" type="button" onclick="removeFromCart(${index})"><i class="ph ph-trash"></i></button>
                    `;
                    cartItemsContainer.appendChild(cartItem);
                });
            }

            if (cartSubtotalPrice) cartSubtotalPrice.textContent = formatPrice(subtotal);
        }
    }

    window.updateQty = function (index, change) {
        cart[index].qty += change;
        if (cart[index].qty <= 0) {
            cart.splice(index, 1);
        }
        saveCart();
    };

    window.removeFromCart = function (index) {
        cart.splice(index, 1);
        saveCart();
    };

    function saveCart() {
        localStorage.setItem('floreria_cart', JSON.stringify(cart));
        updateCartUI();
    }

    window.addToCart = function (productName, btnElement) {
        const product = allProducts.find(p => (p.nombre || "Arreglo Floral") === productName);
        if (!product) return;

        const existingItem = cart.find(item => item.nombre === product.nombre);
        if (existingItem) {
            existingItem.qty += 1;
        } else {
            cart.push({ ...product, qty: 1 });
        }

        saveCart();

        if (btnElement) {
            const originalText = btnElement.innerHTML;
            btnElement.classList.add('added');
            btnElement.innerHTML = '<i class="ph ph-check"></i> ¡Agregado!';
            setTimeout(() => {
                btnElement.classList.remove('added');
                btnElement.innerHTML = originalText;
            }, 1500);
        }
    }

    const cartSidebar = document.getElementById("cart-sidebar");
    const cartOverlay = document.getElementById("cart-overlay");
    const navCart = document.getElementById("nav-cart");
    const closeCartBtn = document.getElementById("close-cart");
    const proceedOrderBtn = document.getElementById("proceed-order-btn");

    function openCart() {
        if (cartSidebar) cartSidebar.classList.add("open");
        if (cartOverlay) cartOverlay.classList.add("active");
    }

    function closeCart() {
        if (cartSidebar) cartSidebar.classList.remove("open");
        if (cartOverlay) cartOverlay.classList.remove("active");
    }

    if (navCart) navCart.addEventListener("click", openCart);
    if (closeCartBtn) closeCartBtn.addEventListener("click", closeCart);
    if (cartOverlay) cartOverlay.addEventListener("click", closeCart);

    if (proceedOrderBtn) {
        proceedOrderBtn.addEventListener("click", () => {
            closeCart();
            const orderSec = document.getElementById("pedido");
            if (orderSec) orderSec.scrollIntoView({ behavior: 'smooth' });
        });
    }

    updateCartUI();

    // --- CALENDARIO PERSONALIZADO ---
    const datePicker = document.getElementById('custom-date-picker');
    const dateBar = document.getElementById('date-input-bar');
    const fechaInput = document.getElementById('fecha_entrega');
    const calDays = document.getElementById('cal-days');
    const calMonthYear = document.getElementById('cal-month-year');
    const dateDisplay = document.getElementById('date-display-text');

    if (datePicker && dateBar) {
        let currentDate = new Date();
        let selectedDate = null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

        function renderCalendar() {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            if (calMonthYear) calMonthYear.textContent = `${months[month]} ${year}`;
            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            if (calDays) {
                calDays.innerHTML = '';

                for (let i = 0; i < firstDay; i++) {
                    const empty = document.createElement('div');
                    empty.className = 'cal-day empty';
                    calDays.appendChild(empty);
                }

                for (let d = 1; d <= daysInMonth; d++) {
                    const dayBtn = document.createElement('button');
                    dayBtn.type = 'button';
                    dayBtn.className = 'cal-day';
                    dayBtn.textContent = d;
                    const thisDate = new Date(year, month, d);
                    thisDate.setHours(0, 0, 0, 0);
                    if (thisDate < today) dayBtn.classList.add('disabled');
                    if (thisDate.toDateString() === today.toDateString()) dayBtn.classList.add('today');
                    if (selectedDate && thisDate.toDateString() === selectedDate.toDateString()) dayBtn.classList.add('selected');

                    dayBtn.addEventListener('click', () => {
                        if (thisDate < today) return;
                        selectedDate = thisDate;
                        const dd = String(d).padStart(2, '0');
                        const mm = String(month + 1).padStart(2, '0');
                        if (dateDisplay) dateDisplay.textContent = `${dd}/${mm}/${year}`;
                        if (fechaInput) fechaInput.value = `${dd}/${mm}/${year}`;
                        dateBar.classList.add('has-date');
                        datePicker.classList.remove('open');
                        renderCalendar();
                    });
                    calDays.appendChild(dayBtn);
                }
            }
        }

        dateBar.addEventListener('click', (e) => {
            e.stopPropagation();
            datePicker.classList.toggle('open');
            renderCalendar();
        });

        const prevCal = document.getElementById('cal-prev');
        if (prevCal) {
            prevCal.addEventListener('click', (e) => {
                e.stopPropagation();
                currentDate.setMonth(currentDate.getMonth() - 1);
                renderCalendar();
            });
        }

        const nextCal = document.getElementById('cal-next');
        if (nextCal) {
            nextCal.addEventListener('click', (e) => {
                e.stopPropagation();
                currentDate.setMonth(currentDate.getMonth() + 1);
                renderCalendar();
            });
        }

        document.addEventListener('click', (e) => {
            if (!datePicker.contains(e.target)) {
                datePicker.classList.remove('open');
            }
        });

        renderCalendar();
    }

    // --- FLECHAS DE CATEGORÍAS ---
    const filterBar = document.getElementById('category-filter-bar');
    const arrowLeft = document.getElementById('cat-arrow-left');
    const arrowRight = document.getElementById('cat-arrow-right');
    const filterWrapper = filterBar?.closest('.category-filter-wrapper');

    function updateArrows() {
        if (!filterBar || !filterWrapper) return;
        const atStart = filterBar.scrollLeft <= 5;
        const atEnd = filterBar.scrollLeft + filterBar.clientWidth >= filterBar.scrollWidth - 5;
        if (arrowLeft) arrowLeft.disabled = atStart;
        if (arrowRight) arrowRight.disabled = atEnd;
        filterWrapper.classList.toggle('hide-left', atStart);
        filterWrapper.classList.toggle('hide-right', atEnd);
    }

    if (arrowLeft && arrowRight && filterBar) {
        arrowLeft.addEventListener('click', () => {
            filterBar.scrollBy({ left: -200, behavior: 'smooth' });
        });
        arrowRight.addEventListener('click', () => {
            filterBar.scrollBy({ left: 200, behavior: 'smooth' });
        });
        filterBar.addEventListener('scroll', updateArrows);
        updateArrows();
    }

    loadProducts();

    // --- 2. FORMULARIO WEBHOOK ---
    const orderForm = document.getElementById("order-form");
    const formSuccess = document.getElementById("form-success");

    // --- FORMATO AUTOMÁTICO TELÉFONO ---
    const inpWhatsapp = document.getElementById('whatsapp');
    if (inpWhatsapp) {
        inpWhatsapp.addEventListener('input', (e) => {
            let digits = e.target.value.replace(/\D/g, '').slice(0, 10);
            let formatted = '';
            if (digits.length <= 3) {
                formatted = digits.length ? '(' + digits : '';
            } else if (digits.length <= 6) {
                formatted = '(' + digits.slice(0, 3) + ') ' + digits.slice(3);
            } else {
                formatted = '(' + digits.slice(0, 3) + ') ' + digits.slice(3, 6) + ' ' + digits.slice(6);
            }
            e.target.value = formatted;
        });
    }

    // --- LÓGICA TOGGLE TARJETAS ---
    const toggleTarjeta = document.getElementById("toggle_tarjeta");
    const cardsSectionContainer = document.getElementById("cards_section_container");
    const cardRows = document.querySelectorAll(".card-row");

    if (toggleTarjeta && cardsSectionContainer) {
        toggleTarjeta.addEventListener("change", (e) => {
            if (e.target.checked) {
                cardsSectionContainer.style.display = "block";
            } else {
                cardsSectionContainer.style.display = "none";
                const msgTarjeta = document.getElementById("mensaje_tarjeta");
                if (msgTarjeta) msgTarjeta.value = "";
                const radios = document.querySelectorAll('input[name="tipo_tarjeta"]');
                radios.forEach(r => r.checked = false);
                cardRows.forEach(row => row.classList.remove("selected"));
            }
        });
    }

    // --- SELECCIONAR TARJETA VISUALMENTE ---
    cardRows.forEach(row => {
        row.addEventListener("click", () => {
            cardRows.forEach(r => r.classList.remove("selected"));
            row.classList.add("selected");
            const radio = row.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;
        });
    });

    // --- LÓGICA DE DOMICILIO ---
    const metodoSelect = document.getElementById("metodo_entrega");
    const camposDomicilio = document.getElementById("campos_domicilio");
    const requiredDomicilio = ["ciudad", "colonia", "calle_numero"].map(id => document.getElementById(id));

    if (metodoSelect && camposDomicilio) {
        metodoSelect.addEventListener("change", (e) => {
            if (e.target.value === "domicilio") {
                camposDomicilio.style.display = "block";
                requiredDomicilio.forEach(el => el && el.setAttribute("required", "required"));
            } else {
                camposDomicilio.style.display = "none";
                requiredDomicilio.forEach(el => el && el.removeAttribute("required"));
            }
        });
    }

    const tipoDomicilioSelect = document.getElementById("tipo_domicilio");
    const grupoNombreInstitucion = document.getElementById("grupo_nombre_institucion");
    const inputNombreInstitucion = document.getElementById("nombre_institucion");
    const grupoNombreNegocio = document.getElementById("grupo_nombre_negocio");
    const inputNombreNegocio = document.getElementById("nombre_negocio");

    if (tipoDomicilioSelect) {
        tipoDomicilioSelect.addEventListener("change", (e) => {
            const val = e.target.value;
            if (grupoNombreInstitucion && inputNombreInstitucion) {
                if (val === "Institución") {
                    grupoNombreInstitucion.style.display = "block";
                    inputNombreInstitucion.setAttribute("required", "required");
                } else {
                    grupoNombreInstitucion.style.display = "none";
                    inputNombreInstitucion.removeAttribute("required");
                    inputNombreInstitucion.value = "";
                }
            }
            if (grupoNombreNegocio && inputNombreNegocio) {
                if (val === "Negocio") {
                    grupoNombreNegocio.style.display = "block";
                    inputNombreNegocio.setAttribute("required", "required");
                } else {
                    grupoNombreNegocio.style.display = "none";
                    inputNombreNegocio.removeAttribute("required");
                    inputNombreNegocio.value = "";
                }
            }
        });
    }

    if (orderForm) {
        orderForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            if (cart.length === 0) {
                alert("No tienes productos en el carrito. Agrega algo del catálogo primero.");
                return;
            }

            const btnSubmit = document.getElementById("submit-btn");
            if (btnSubmit) {
                btnSubmit.textContent = "Enviando...";
                btnSubmit.disabled = true;
            }

            const formData = new FormData(orderForm);
            const data = Object.fromEntries(formData.entries());

            let totalOrden = 0;
            data.productos = cart.map(item => {
                const pNum = parseFloat(item.precio.replace(/[^0-9.-]+/g, "")) || 0;
                totalOrden += pNum * item.qty;
                return {
                    nombre: item.nombre,
                    precio: item.precio,
                    cantidad: item.qty
                };
            });
            data.total = `$${totalOrden.toFixed(2)}`;

            const metodoTxt = data.metodo_entrega === "domicilio" ? "Envío a Domicilio" : "Recoger en Tienda";
            let resumen = `*RESUMEN DE TU PEDIDO*\n`;

            resumen += `• PRODUCTOS:\n`;
            cart.forEach(item => {
                resumen += `  - ${item.qty}x ${item.nombre} (${item.precio})\n`;
            });
            resumen += `  *Total:* $${totalOrden.toFixed(2)}\n`;

            resumen += `• Fecha: ${data.fecha_entrega}\n`;
            resumen += `• Modalidad: ${metodoTxt}\n`;
            if (data.metodo_entrega === "domicilio") {
                resumen += `  - Ciudad: ${data.ciudad}\n`;
                resumen += `  - Colonia: ${data.colonia}\n`;
                let tipoTxt = data.tipo_domicilio;
                if (data.tipo_domicilio === "Institución" && data.nombre_institucion) {
                    tipoTxt += ` - ${data.nombre_institucion}`;
                } else if (data.tipo_domicilio === "Negocio" && data.nombre_negocio) {
                    tipoTxt += ` - ${data.nombre_negocio}`;
                }
                resumen += `  - Dirección: ${data.calle_numero} (${tipoTxt})\n`;
                if (data.referencias) resumen += `  - Ref: ${data.referencias}\n`;
            }
            if (data.tipo_tarjeta) resumen += `• Tarjeta: ${data.tipo_tarjeta}\n`;
            if (data.mensaje_tarjeta) resumen += `• Mensaje: "${data.mensaje_tarjeta}"\n`;
            if (data.notas) resumen += `• Notas adicionales: ${data.notas}\n`;
            resumen += `\nPara confirmar tu pedido, realiza tu pago en un plazo de 24 horas. Puedes hacerlo por transferencia bancaria, CoDi o en efectivo en nuestra tienda. Una vez confirmado tu pago, comenzaremos a preparar tu arreglo con mucho cariño. Si tienes alguna duda, con gusto te ayudamos. ¡Gracias por elegir Florería Mary's! 🌸`;

            data.mensaje_whatsapp = resumen;

            console.log("Datos del pedido:", data);

            try {
                const response = await fetch(CONFIG.WEBHOOK_URL, {
                    method: "POST",
                    mode: "no-cors",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(data)
                });

                if (formSuccess) formSuccess.classList.remove("hidden");
                orderForm.reset();
                cart = [];
                saveCart();
                updateCartUI();
            } catch (error) {
                console.error("Error al enviar", error);
                if (formSuccess) formSuccess.classList.remove("hidden");
                orderForm.reset();
                cart = [];
                saveCart();
                updateCartUI();
            } finally {
                if (btnSubmit) {
                    btnSubmit.textContent = "Enviar Pedido";
                    btnSubmit.disabled = false;
                }
            }
        });
    }



    // --- 4. SECCIÓN DE OCASIONES DINÁMICAS ---
    const OCCASIONS = [
        {
            id: 'san_valentin',
            name: 'San Valentín',
            badge: '❤️ Temporada de Amor',
            title: 'Especial de San Valentín',
            subtitle: 'Detalles hermosos para celebrar el amor y la amistad',
            category: 'día del amor',
            color: '#FFF0F2',
            decoration: '❤️',
            startMonth: 0, startDate: 15, // 15 de Enero
            endMonth: 1, endDate: 15,      // 15 de Febrero
            eventMonth: 1, eventDate: 14   // 14 de Febrero (Día del Evento)
        },
        {
            id: 'dia_madres',
            name: 'Día de las Madres',
            badge: '🌸 Para Mamá',
            title: 'Regalos para el Día de las Madres',
            subtitle: 'Haz sonreír a la mujer más especial de tu vida',
            category: 'día de las madres',
            color: '#F8F0FC',
            decoration: '🌸',
            startMonth: 3, startDate: 10,  // 10 de Abril
            endMonth: 4, endDate: 10,      // 10 de Mayo
            eventMonth: 4, eventDate: 10   // 10 de Mayo (Día del Evento)
        },
        {
            id: 'flores_amarillas_primavera',
            name: 'Flores Amarillas (Primavera)',
            badge: '💛 Tradición de Primavera',
            title: 'Flores Amarillas de Primavera',
            subtitle: 'Regala luz y alegría con flores amarillas tradicionales',
            category: 'flores amarillas',
            color: '#FFFDF0',
            decoration: '🌻',
            startMonth: 1, startDate: 21,  // 21 de Febrero
            endMonth: 2, endDate: 22,      // 22 de Marzo
            eventMonth: 2, eventDate: 21   // 21 de Marzo (Día del Evento)
        },
        {
            id: 'flores_amarillas_otono',
            name: 'Flores Amarillas (Otoño)',
            badge: '💛 Tradición de Otoño',
            title: 'Flores Amarillas de Otoño',
            subtitle: 'Celebra la llegada del otoño con flores amarillas',
            category: 'flores amarillas',
            color: '#FFFDF0',
            decoration: '🌻',
            startMonth: 7, startDate: 21,  // 21 de Agosto
            endMonth: 8, endDate: 22,      // 22 de Septiembre
            eventMonth: 8, eventDate: 21   // 21 de Septiembre (Día del Evento)
        },
        {
            id: 'temporada_navidena',
            name: 'Temporada Navideña',
            badge: '✨ Felices Fiestas',
            title: 'Temporada Navideña',
            subtitle: 'Comparte la magia de las fiestas de fin de año',
            category: 'regalos',
            color: '#EBF7F2',
            decoration: '❄️',
            startMonth: 10, startDate: 20, // 20 de Noviembre
            endMonth: 0, endDate: 6,       // 6 de Enero
            eventMonth: 11, eventDate: 24  // 24 de Diciembre (Día del Evento)
        },
        {
            id: 'ano_nuevo',
            name: 'Año Nuevo',
            badge: '✨ Feliz Año Nuevo',
            title: 'Propósitos y Flores',
            subtitle: 'Comienza el año con luz, alegría y los mejores deseos',
            category: 'regalos',
            color: '#EBF7F2',
            decoration: '✨',
            startMonth: 0, startDate: 1,
            endMonth: 0, endDate: 1,
            eventMonth: 0, eventDate: 1    // 1 de Enero (Día del Evento)
        }
    ];

    function checkActiveOccasion(now) {
        const year = now.getFullYear();
        for (const occ of OCCASIONS) {
            // Comprobar si la campaña cruza el fin de año (ej: Noviembre a Enero)
            const crossesYear = occ.startMonth > occ.endMonth || 
                               (occ.startMonth === occ.endMonth && occ.startDate > occ.endDate);
            
            if (crossesYear) {
                // Rango A: Desde la fecha de inicio hasta el 31 de Diciembre
                const start1 = new Date(year, occ.startMonth, occ.startDate, 0, 0, 0, 0);
                const end1 = new Date(year, 11, 31, 23, 59, 59, 999);
                
                // Rango B: Desde el 1 de Enero hasta la fecha de término
                const start2 = new Date(year, 0, 1, 0, 0, 0, 0);
                const end2 = new Date(year, occ.endMonth, occ.endDate, 23, 59, 59, 999);
                
                if ((now >= start1 && now <= end1) || (now >= start2 && now <= end2)) {
                    return occ;
                }
            } else {
                // Rango normal dentro del mismo año natural
                const start = new Date(year, occ.startMonth, occ.startDate, 0, 0, 0, 0);
                const end = new Date(year, occ.endMonth, occ.endDate, 23, 59, 59, 999);
                
                if (now >= start && now <= end) {
                    return occ;
                }
            }
        }
        return null;
    }

    function initOccasionSection(products) {
        if (occasionInterval) {
            clearInterval(occasionInterval);
            occasionInterval = null;
        }
        const countdownEl = document.getElementById("occasion-countdown");
        if (countdownEl) countdownEl.innerHTML = "";

        const section = document.getElementById("occasion-section");
        if (!section) return;

        const now = getNow();
        const activeOcc = checkActiveOccasion(now);

        if (!activeOcc) {
            section.style.display = "none";
            return;
        }

        // Filtrar productos por categoría
        let filtered = products.filter(p => p.categoria.toLowerCase().trim() === activeOcc.category.toLowerCase().trim());

        // Si no hay productos en el catálogo cargado, usamos los de respaldo (dummyData) para asegurar visibilidad en pruebas
        if (filtered.length === 0) {
            filtered = dummyData.filter(p => p.categoria.toLowerCase().trim() === activeOcc.category.toLowerCase().trim());
        }

        if (filtered.length === 0) {
            section.style.display = "none";
            return;
        }

        const badgeEl = document.getElementById("occasion-badge");
        const titleEl = document.getElementById("occasion-title");
        const subtitleEl = document.getElementById("occasion-subtitle");
        
        if (badgeEl) badgeEl.textContent = activeOcc.badge;
        if (titleEl) titleEl.textContent = activeOcc.title;
        if (subtitleEl) subtitleEl.textContent = activeOcc.subtitle;
        section.style.backgroundColor = activeOcc.color;

        // Configurar mini countdown dinámico
        if (countdownEl) {
            const currentYear = now.getFullYear();
            let targetYear = currentYear;
            if (activeOcc.startMonth > activeOcc.endMonth) {
                // Cruza el año (ej: de Noviembre a Enero)
                // Si la fecha actual (now) está en la segunda parte de la temporada (ej: Enero),
                // el evento navideño (24 de diciembre) ocurrió el año anterior.
                if (now.getMonth() <= activeOcc.endMonth) {
                    targetYear = currentYear - 1;
                }
            }
            const targetDate = new Date(targetYear, activeOcc.eventMonth, activeOcc.eventDate, 0, 0, 0, 0);

            function updateOccasionCountdown(isTick = false) {
                if (isTick && testDateOverride) {
                    // Avanzar el tiempo simulado en 1 segundo en cada tick del intervalo
                    testDateOverride.setSeconds(testDateOverride.getSeconds() + 1);
                }
                const currentTime = getNow();
                let distance = targetDate.getTime() - currentTime.getTime();

                if (distance <= 0) {
                    if (occasionInterval) {
                        clearInterval(occasionInterval);
                        occasionInterval = null;
                    }
                    countdownEl.style.display = "none";
                    return;
                }

                // Asegurar que el contador sea visible
                countdownEl.style.display = "inline-flex";

                const d = Math.floor(distance / (1000 * 60 * 60 * 24));
                const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const s = Math.floor((distance % (1000 * 60)) / 1000);

                countdownEl.innerHTML = `
                    <div class="countdown-item">
                        <span class="countdown-num">${d.toString().padStart(2, '0')}</span>
                        <span class="countdown-lbl">días</span>
                    </div>
                    <div class="countdown-item">
                        <span class="countdown-num">${h.toString().padStart(2, '0')}</span>
                        <span class="countdown-lbl">horas</span>
                    </div>
                    <div class="countdown-item">
                        <span class="countdown-num">${m.toString().padStart(2, '0')}</span>
                        <span class="countdown-lbl">min</span>
                    </div>
                    <div class="countdown-item">
                        <span class="countdown-num">${s.toString().padStart(2, '0')}</span>
                        <span class="countdown-lbl">seg</span>
                    </div>
                `;
            }

            // Comprobación inicial inmediata antes de arrancar el intervalo
            const initialDistance = targetDate.getTime() - getNow().getTime();
            if (initialDistance <= 0) {
                countdownEl.style.display = "none";
            } else {
                updateOccasionCountdown(false);
                occasionInterval = setInterval(() => updateOccasionCountdown(true), 1000);
            }
        }

        const decorContainer = document.getElementById("occasion-deco");
        if (decorContainer) {
            decorContainer.innerHTML = "";
            for (let i = 0; i < 8; i++) {
                const particle = document.createElement("span");
                particle.className = "floating-decor";
                particle.textContent = activeOcc.decoration;
                particle.style.left = `${Math.random() * 90 + 5}%`;
                particle.style.top = `${Math.random() * 80 + 10}%`;
                particle.style.animationDelay = `${Math.random() * 5}s`;
                particle.style.fontSize = `${Math.random() * 1.5 + 1}rem`;
                decorContainer.appendChild(particle);
            }
        }

        const carousel = document.getElementById("occasion-carousel");
        if (carousel) {
            carousel.innerHTML = "";

            filtered.forEach(p => {
                const title = p.nombre || "Arreglo Floral";
                const cat = p.categoria || "N/A";
                const desc = p.descripcion || "";
                const price = formatPrice(p.precio || "0");
                const imgUrl = p.imagen_url || "https://images.unsplash.com/photo-1563241527-3004b7be0ffd?w=500";

                const card = document.createElement("div");
                card.className = "product-card";
                card.innerHTML = `
                    <img src="${imgUrl}" alt="${title}" class="product-img">
                    <div class="product-info">
                        <span class="product-category">${cat}</span>
                        <h3 class="product-name">${title}</h3>
                        <p class="product-desc">${desc}</p>
                        <div class="product-bottom">
                            <span class="product-price">${price}</span>
                            <button class="btn-add-cart" onclick="addToCart('${title.replace(/'/g, "\\'")}', this)">
                                <i class="ph ph-shopping-cart"></i> Agregar al carrito
                            </button>
                        </div>
                    </div>
                `;
                carousel.appendChild(card);
            });

            section.style.display = "block";

            const prevBtn = document.getElementById("occ-arrow-left");
            const nextBtn = document.getElementById("occ-arrow-right");

            if (prevBtn && nextBtn) {
                prevBtn.onclick = () => {
                    carousel.scrollBy({ left: -300, behavior: "smooth" });
                };
                nextBtn.onclick = () => {
                    carousel.scrollBy({ left: 300, behavior: "smooth" });
                };

                const updateCarouselArrows = () => {
                    const atStart = carousel.scrollLeft <= 5;
                    const atEnd = carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth - 5;
                    prevBtn.disabled = atStart;
                    nextBtn.disabled = atEnd;
                };

                carousel.onscroll = updateCarouselArrows;
                setTimeout(updateCarouselArrows, 100);
            }
        }
    }

    function initPromoSection(products) {
        const section = document.getElementById("promo-section");
        if (!section) return;

        // Filtrar productos del catálogo donde categoria === "promoción del mes"
        let filtered = products.filter(p => p.categoria && p.categoria.toLowerCase().trim() === "promoción del mes");

        // Fallback a dummyData para pruebas locales
        if (filtered.length === 0) {
            filtered = dummyData.filter(p => p.categoria && p.categoria.toLowerCase().trim() === "promoción del mes");
        }

        if (filtered.length === 0) {
            section.style.display = "none";
            return;
        }

        // Color de fondo: color de la ocasión actual o un color cálido tipo #FFF8E1
        const now = getNow();
        const activeOcc = checkActiveOccasion(now);
        if (activeOcc && activeOcc.color) {
            section.style.backgroundColor = activeOcc.color;
        } else {
            section.style.backgroundColor = "#FFF8E1";
        }

        const carousel = document.getElementById("promo-carousel");
        if (carousel) {
            carousel.innerHTML = "";

            filtered.forEach(p => {
                const title = p.nombre || "Arreglo Floral";
                const cat = p.categoria || "N/A";
                const desc = p.descripcion || "";
                const price = formatPrice(p.precio || "0");
                const imgUrl = p.imagen_url || "https://images.unsplash.com/photo-1563241527-3004b7be0ffd?w=500";

                const card = document.createElement("div");
                card.className = "product-card";
                card.innerHTML = `
                    <img src="${imgUrl}" alt="${title}" class="product-img">
                    <div class="product-info">
                        <span class="product-category">${cat}</span>
                        <h3 class="product-name">${title}</h3>
                        <p class="product-desc">${desc}</p>
                        <div class="product-bottom">
                            <span class="product-price">${price}</span>
                            <button class="btn-add-cart" onclick="addToCart('${title.replace(/'/g, "\\'")}', this)">
                                <i class="ph ph-shopping-cart"></i> Agregar al carrito
                            </button>
                        </div>
                    </div>
                `;
                carousel.appendChild(card);
            });

            section.style.display = "block";

            const prevBtn = document.getElementById("promo-arrow-left");
            const nextBtn = document.getElementById("promo-arrow-right");

            if (prevBtn && nextBtn) {
                prevBtn.onclick = () => {
                    carousel.scrollBy({ left: -300, behavior: "smooth" });
                };
                nextBtn.onclick = () => {
                    carousel.scrollBy({ left: 300, behavior: "smooth" });
                };

                const updateCarouselArrows = () => {
                    const atStart = carousel.scrollLeft <= 5;
                    const atEnd = carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth - 5;
                    prevBtn.disabled = atStart;
                    nextBtn.disabled = atEnd;
                };

                carousel.onscroll = updateCarouselArrows;
                setTimeout(updateCarouselArrows, 100);
            }
        }
    }

    function initPopularSection(products) {
        const section = document.getElementById("popular-section");
        if (!section) return;

        // Filtrar productos donde popular === "SI"
        let filtered = products.filter(p => p.popular && p.popular.toUpperCase().trim() === "SI");

        // Fallback a dummyData para pruebas locales
        if (filtered.length === 0) {
            filtered = dummyData.filter(p => p.popular && p.popular.toUpperCase().trim() === "SI");
        }

        if (filtered.length === 0) {
            section.style.display = "none";
            return;
        }

        const carousel = document.getElementById("popular-carousel");
        if (carousel) {
            carousel.innerHTML = "";

            filtered.forEach(p => {
                const title = p.nombre || "Arreglo Floral";
                const cat = p.categoria || "N/A";
                const desc = p.descripcion || "";
                const price = formatPrice(p.precio || "0");
                const imgUrl = p.imagen_url || "https://images.unsplash.com/photo-1563241527-3004b7be0ffd?w=500";

                const card = document.createElement("div");
                card.className = "product-card";
                card.innerHTML = `
                    <img src="${imgUrl}" alt="${title}" class="product-img">
                    <div class="product-info">
                        <span class="product-category">${cat}</span>
                        <h3 class="product-name">${title}</h3>
                        <p class="product-desc">${desc}</p>
                        <div class="product-bottom">
                            <span class="product-price">${price}</span>
                            <button class="btn-add-cart" onclick="addToCart('${title.replace(/'/g, "\\'")}', this)">
                                <i class="ph ph-shopping-cart"></i> Agregar al carrito
                            </button>
                        </div>
                    </div>
                `;
                carousel.appendChild(card);
            });

            section.style.display = "block";

            const prevBtn = document.getElementById("popular-arrow-left");
            const nextBtn = document.getElementById("popular-arrow-right");

            if (prevBtn && nextBtn) {
                prevBtn.onclick = () => {
                    carousel.scrollBy({ left: -300, behavior: "smooth" });
                };
                nextBtn.onclick = () => {
                    carousel.scrollBy({ left: 300, behavior: "smooth" });
                };

                const updateCarouselArrows = () => {
                    const atStart = carousel.scrollLeft <= 5;
                    const atEnd = carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth - 5;
                    prevBtn.disabled = atStart;
                    nextBtn.disabled = atEnd;
                };

                carousel.onscroll = updateCarouselArrows;
                setTimeout(updateCarouselArrows, 100);
            }
        }
    }

    const dummyData = [
        {
            nombre: "Rosas Clásicas Elegantes",
            categoria: "día de las madres",
            descripcion: "Arreglo de rosas clásicas seleccionadas con follaje fino.",
            precio: "580",
            imagen_url: "https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=500",
            disponible: "SI",
            popular: "SI"
        },
        {
            nombre: "Detalle Primavera Amarilla",
            categoria: "flores amarillas",
            descripcion: "Hermosos girasoles y flores de estación amarillas para alegrar el día.",
            precio: "420",
            imagen_url: "https://images.unsplash.com/photo-1596436889106-be35e843f974?w=500",
            disponible: "SI",
            popular: "SI"
        },
        {
            nombre: "Corazón Romántico Rosas",
            categoria: "día del amor",
            descripcion: "La máxima expresión del amor en un delicado diseño en forma de corazón.",
            precio: "850",
            imagen_url: "https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?w=500",
            disponible: "SI",
            popular: "NO"
        },
        {
            nombre: "Canasta Festiva de Regalos",
            categoria: "regalos",
            descripcion: "Una fabulosa combinación de peluche, chocolates y globos festivos.",
            precio: "650",
            imagen_url: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=500",
            disponible: "SI",
            popular: "NO"
        },
        {
            nombre: "Ramos Exclusivos de Tulipanes",
            categoria: "promoción del mes",
            descripcion: "Tulipanes frescos importados con envoltura premium en oferta especial.",
            precio: "390",
            imagen_url: "https://images.unsplash.com/photo-1520763185298-1b434c919102?w=500",
            disponible: "SI",
            popular: "SI"
        }
    ];

});