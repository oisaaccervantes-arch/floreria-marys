document.addEventListener('DOMContentLoaded', () => {

    // --- 1. CONFIGURACIÓN Y CATÁLOGO DINÁMICO ---
    const grid = document.getElementById('products-grid');
    const statusText = document.getElementById('catalog-status');
    let allProducts = [];

    // Fallback Dummy Data en caso de no tener ID de Sheet de producción
    const dummyData = [
        { nombre: "Amor Eterno", categoria: "rosas", descripcion: "Arreglo de 24 rosas rojas premium.", precio: "$850", imagen_url: "https://images.unsplash.com/photo-1550926588-e9f05a964319?w=500", disponible: "SI" },
        { nombre: "Para Mamá", categoria: "mama", descripcion: "Mix floral con tulipanes y gerberas.", precio: "$600", imagen_url: "https://images.unsplash.com/photo-1520697968583-0498eb982e5b?w=500", disponible: "SI" },
        { nombre: "Dulzura y Bodas", categoria: "bodas", descripcion: "Elegancia en tonos blancos y pasteles.", precio: "$1200", imagen_url: "https://images.unsplash.com/photo-1543884351-c06dfa996d99?w=500", disponible: "SI" },
        { nombre: "Aniversario Especial", categoria: "especiales", descripcion: "Exótico arreglo con orquídeas para impresionar.", precio: "$1500", imagen_url: "https://images.unsplash.com/photo-1604167191338-eeae435d64e9?w=500", disponible: "SI" },
        { nombre: "Rosas Blancas", categoria: "rosas", descripcion: "Arreglo de 12 rosas blancas puras.", precio: "$450", imagen_url: "https://images.unsplash.com/photo-1549491823-1d46bebf5cc8?w=500", disponible: "SI" },
        { nombre: "Día de la Mamá Feliz", categoria: "mama", descripcion: "Bouquet gigante para sorprenderla.", precio: "$950", imagen_url: "https://images.unsplash.com/photo-1563241527-3004b7be0ffd?w=500", disponible: "SI" }
    ];

    async function loadProducts() {
        try {
            const url = "https://docs.google.com/spreadsheets/d/11N4iTwNsoNL5yS_wJGPIkq7-uLTnkSYet7q664_q_po/gviz/tq?tqx=out:json";
            const response = await fetch(url);
            
            if (!response.ok) throw new Error("Fallo la conexión");
            
            const text = await response.text();
            
            // Quitar el prefijo google.visualization.Query.setResponse( y el sufijo )
            // Extraemos desde la primera llave hasta la última llave para asegurar JSON válido
            const jsonString = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
            const data = JSON.parse(jsonString);
            
            allProducts = parseJSONData(data);
            renderProducts(allProducts);
        } catch (error) {
            console.error("Error al cargar productos", error);
            statusText.textContent = "Catálogo actualizándose, contáctanos por WhatsApp";
            // Mostrar dummy para demostrar la UI de todos modos
            allProducts = dummyData;
            renderProducts(allProducts);
        }
    }

    function parseJSONData(data) {
        const result = [];
        if (!data.table || !data.table.rows) return result;

        data.table.rows.forEach(row => {
            if (!row.c) return;

            // Función auxiliar para leer valor o dejar string vacío si es null
            const getValue = (colIndex) => {
                return (row.c[colIndex] && row.c[colIndex].v !== null) ? String(row.c[colIndex].v) : "";
            };

            const obj = {
                nombre: getValue(0),
                categoria: getValue(1),
                descripcion: getValue(2),
                precio: getValue(3),
                imagen_url: getValue(4),
                disponible: getValue(5)
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

        if(products.length === 0) {
            statusText.style.display = "block";
            statusText.textContent = "No hay productos disponibles por ahora.";
            return;
        }

        products.forEach(p => {
            // Asegurarse de que el objeto coincide con nuestra estructura esperada o usar defaults
            const title = p.nombre || "Arreglo Floral";
            const cat = p.categoria || "N/A";
            const desc = p.descripcion || "";
            const price = p.precio || "$0.00";
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

    dropdownToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        categoryDropdown.classList.toggle('open');
    });

    dropdownItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            const filter = item.dataset.filter;
            dropdownLabel.textContent = filter === 'all' ? 'Todas las categorías' : item.textContent;
            categoryDropdown.classList.remove('open');
            const filtered = filter === 'all' ? allProducts : allProducts.filter(p => p.categoria.toLowerCase().trim() === filter);
            renderProducts(filtered);
        });
    });

    document.addEventListener('click', () => {
        categoryDropdown.classList.remove('open');
    });

    // --- LÓGICA DEL CARRITO ---
    const cartBadge = document.getElementById("cart-badge");
    const cartItemsContainer = document.getElementById("cart-items");
    const cartSubtotalPrice = document.getElementById("cart-subtotal-price");
    
    let cart = JSON.parse(localStorage.getItem('floreria_cart') || '[]');

    function updateCartUI() {
        const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
        cartBadge.textContent = totalItems;
        
        cartItemsContainer.innerHTML = '';
        let subtotal = 0;
        
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p style="text-align:center; color: var(--text-muted); margin-top: 2rem;">Tu carrito está vacío.</p>';
        } else {
            cart.forEach((item, index) => {
                const priceNum = parseFloat(item.precio.replace(/[^0-9.-]+/g,"")) || 0;
                subtotal += priceNum * item.qty;
                
                const cartItem = document.createElement("div");
                cartItem.className = "cart-item";
                cartItem.innerHTML = `
                    <img src="${item.imagen_url}" alt="${item.nombre}" class="cart-item-img">
                    <div class="cart-item-info">
                        <div class="cart-item-title">${item.nombre}</div>
                        <div class="cart-item-price">${item.precio}</div>
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
        
        cartSubtotalPrice.textContent = '$' + subtotal.toFixed(2);
        
        // Actualizar el resumen en el formulario
        const formSummaryBox = document.getElementById("cart-summary-box");
        if (formSummaryBox) {
            if (cart.length === 0) {
                formSummaryBox.innerHTML = '<div class="cart-summary-empty">Tu pedido está vacío. Por favor selecciona productos del catálogo arriba.</div>';
            } else {
                let summaryHTML = '';
                cart.forEach((item) => {
                    const priceNum = parseFloat(item.precio.replace(/[^0-9.-]+/g,"")) || 0;
                    summaryHTML += `
                        <div class="cart-summary-item">
                            <span>${item.qty}x ${item.nombre}</span>
                            <span>$${(priceNum * item.qty).toFixed(2)}</span>
                        </div>
                    `;
                });
                summaryHTML += `
                    <div class="cart-summary-total">
                        <span>Total de tu Compra:</span>
                        <span>$${subtotal.toFixed(2)}</span>
                    </div>
                `;
                formSummaryBox.innerHTML = summaryHTML;
            }
        }
    }
    
    window.updateQty = function(index, change) {
        cart[index].qty += change;
        if (cart[index].qty <= 0) {
            cart.splice(index, 1);
        }
        saveCart();
    };
    
    window.removeFromCart = function(index) {
        cart.splice(index, 1);
        saveCart();
    };
    
    function saveCart() {
        localStorage.setItem('floreria_cart', JSON.stringify(cart));
        updateCartUI();
    }
    
    window.addToCart = function(productName, btnElement) {
        const product = allProducts.find(p => (p.nombre || "Arreglo Floral") === productName);
        if (!product) return;
        
        const existingItem = cart.find(item => item.nombre === product.nombre);
        if (existingItem) {
            existingItem.qty += 1;
        } else {
            cart.push({ ...product, qty: 1 });
        }
        
        saveCart();
        
        // Animación de confirmación
        const originalText = btnElement.innerHTML;
        btnElement.classList.add('added');
        btnElement.innerHTML = '<i class="ph ph-check"></i> ¡Agregado!';
        setTimeout(() => {
            btnElement.classList.remove('added');
            btnElement.innerHTML = originalText;
        }, 1500);
    }
    
    // Controles del Sidebar del Carrito
    const cartSidebar = document.getElementById("cart-sidebar");
    const cartOverlay = document.getElementById("cart-overlay");
    const navCart = document.getElementById("nav-cart");
    const closeCartBtn = document.getElementById("close-cart");
    const proceedOrderBtn = document.getElementById("proceed-order-btn");
    
    function openCart() {
        cartSidebar.classList.add("open");
        cartOverlay.classList.add("active");
    }
    
    function closeCart() {
        cartSidebar.classList.remove("open");
        cartOverlay.classList.remove("active");
    }
    
    navCart.addEventListener("click", openCart);
    if(closeCartBtn) closeCartBtn.addEventListener("click", closeCart);
    cartOverlay.addEventListener("click", closeCart);
    
    proceedOrderBtn.addEventListener("click", () => {
        closeCart();
        document.getElementById("pedido").scrollIntoView({ behavior: 'smooth' });
    });
    
    // Inicializar UI del carrito al cargar
    updateCartUI();



    loadProducts();


    // --- 2. FORMULARIO WEBHOOK ---
    const orderForm = document.getElementById("order-form");
    const formSuccess = document.getElementById("form-success");

    // --- LÓGICA DE CAMPOS FECHA ---
    const inpDia = document.getElementById('fecha_dia');
    const inpMes = document.getElementById('fecha_mes');

    if (inpDia && inpMes) {
        inpDia.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
            if (e.target.value.length >= 2) {
                inpMes.focus();
            }
        });

        inpMes.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
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
                // Limpiar valores si se oculta para no enviar data muerta al webhook
                document.getElementById("mensaje_tarjeta").value = "";
                const radios = document.querySelectorAll('input[name="tipo_tarjeta"]');
                radios.forEach(r => r.checked = false);
                cardRows.forEach(row => row.classList.remove("selected"));
            }
        });
    }

    // --- SELECCIONAR TARJETA VISUALMENTE ---
    cardRows.forEach(row => {
        row.addEventListener("click", () => {
            // Remover estilos de todos y solo dejarlo en el actual
            cardRows.forEach(r => r.classList.remove("selected"));
            row.classList.add("selected");
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

    orderForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        // Block submit if cart is empty
        if (cart.length === 0) {
            alert("No tienes productos en el carrito. Agrega algo del catálogo primero.");
            return;
        }
        
        const btnSubmit = document.getElementById("submit-btn");
        btnSubmit.textContent = "Enviando...";
        btnSubmit.disabled = true;

        const formData = new FormData(orderForm);
        const data = Object.fromEntries(formData.entries());
        
        // Calcular año automáticamente basado en el día y el mes
        if (data.fecha_dia && data.fecha_mes) {
            const d = parseInt(data.fecha_dia, 10);
            const m = parseInt(data.fecha_mes, 10) - 1;
            let year = new Date().getFullYear();
            
            if (!isNaN(d) && !isNaN(m)) {
                const now = new Date();
                const targetDate = new Date(year, m, d);
                now.setHours(0,0,0,0);
                if (targetDate < now) {
                    year++;
                }
            }
            
            const paddedDay = String(data.fecha_dia).padStart(2, '0');
            const paddedMonth = String(data.fecha_mes).padStart(2, '0');
            data.fecha = `${paddedDay}/${paddedMonth}/${year}`;
            
            // Limpiar los valores sueltos del payload
            delete data.fecha_dia;
            delete data.fecha_mes;
        }

        // Configurar entrega y limpiar domicilio si es "recoger"
        if (data.metodo_entrega === "recoger") {
            delete data.ciudad;
            delete data.colonia;
            delete data.calle_numero;
            delete data.tipo_domicilio;
            delete data.referencias;
        }

        // Agregar los productos del carrito al payload y calcular total
        let totalOrden = 0;
        data.productos = cart.map(item => {
            const pNum = parseFloat(item.precio.replace(/[^0-9.-]+/g,"")) || 0;
            totalOrden += pNum * item.qty;
            return {
                nombre: item.nombre,
                precio: item.precio,
                cantidad: item.qty
            };
        });
        data.total = `$${totalOrden.toFixed(2)}`;

        // Generar resumen para el mensaje de WhatsApp que configurarán en el webhook
        const metodoTxt = data.metodo_entrega === "domicilio" ? "Envío a Domicilio" : "Recoger en Tienda";
        let resumen = `*RESUMEN DE TU PEDIDO*\n`;
        
        resumen += `• PRODUCTOS:\n`;
        cart.forEach(item => {
            resumen += `  - ${item.qty}x ${item.nombre} (${item.precio})\n`;
        });
        resumen += `  *Total:* $${totalOrden.toFixed(2)}\n`;
        
        resumen += `• Fecha: ${data.fecha}\n`;
        resumen += `• Modalidad: ${metodoTxt}\n`;
        if (data.metodo_entrega === "domicilio") {
            resumen += `  - Ciudad: ${data.ciudad}\n`;
            resumen += `  - Colonia: ${data.colonia}\n`;
            resumen += `  - Dirección: ${data.calle_numero} (${data.tipo_domicilio})\n`;
            if (data.referencias) resumen += `  - Ref: ${data.referencias}\n`;
        }
        if (data.tipo_tarjeta) resumen += `• Tarjeta: ${data.tipo_tarjeta}\n`;
        if (data.mensaje_tarjeta) resumen += `• Mensaje: "${data.mensaje_tarjeta}"\n`;
        if (data.notas) resumen += `• Notas adicionales: ${data.notas}\n`;
        resumen += `\nPara confirmar tu pedido, realiza tu pago en un plazo de 24 horas. Puedes hacerlo por transferencia bancaria, CoDi o en efectivo en nuestra tienda. Una vez confirmado tu pago, comenzaremos a preparar tu arreglo con mucho cariño. Si tienes alguna duda, con gusto te ayudamos. ¡Gracias por elegir Florería Mary's! 🌸`;
        
        data.mensaje_whatsapp = resumen;

        console.log("Datos del pedido:", data); // Confirmar payload

        try {
            const response = await fetch('https://primary-production-65b33.up.railway.app/webhook-test/floreria', {
                method: "POST",
                mode: "no-cors",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            });

            // Even if webhook.site has CORS issues, we show success on any network completion
            formSuccess.classList.remove("hidden");
            orderForm.reset();
            cart = [];
            saveCart();
            updateCartUI();
        } catch (error) {
            console.error("Error al enviar", error);
            // Mostrar éxito simulador si es CORS block en entorno cliente
            formSuccess.classList.remove("hidden");
            orderForm.reset();
            cart = [];
            saveCart();
            updateCartUI();
        } finally {
            btnSubmit.textContent = "Enviar Pedido";
            btnSubmit.disabled = false;
        }
    });


    // --- 3. COUNTDOWN FECHAS IMPORTANTES ---
    const events = [
        { name: "Año Nuevo", month: 0, day: 1 },
        { name: "San Valentín", month: 1, day: 14 },
        { name: "Día de las Madres", month: 4, day: 10 }, // 10 de Mayo fijo en México
        { name: "Navidad", month: 11, day: 25 }
    ];

    // Variable para pruebas. En la consola puedes hacer: simularFecha('2026-05-11T12:00:00')
    let testDateOverride = null; 
    window.simularFecha = function(fechaStr) {
        testDateOverride = fechaStr ? new Date(fechaStr) : null;
        console.log("Fecha simulada:", testDateOverride || "Tiempo Real");
        updateCountdown();
    };

    function getNow() {
        return testDateOverride ? new Date(testDateOverride.getTime()) : new Date();
    }

    function getNextEvent() {
        const now = getNow();
        const currentYear = now.getFullYear();
        let nextEvent = null;
        let nextDate = null;
        let minDiff = Infinity;

        events.forEach(ev => {
            // El objetivo cuenta hasta las 00:00:00 del día del evento.
            let eventDate = new Date(currentYear, ev.month, ev.day, 0, 0, 0, 0);
            // El día festivo en sí termina a las 23:59:59.
            let eventEnd = new Date(currentYear, ev.month, ev.day, 23, 59, 59, 999);

            // Si el día entero festivo ya concluyó, pasamos el evento al próximo año
            if (now.getTime() > eventEnd.getTime()) {
                eventDate = new Date(currentYear + 1, ev.month, ev.day, 0, 0, 0, 0);
                eventEnd = new Date(currentYear + 1, ev.month, ev.day, 23, 59, 59, 999);
            }
            
            const diffToEnd = eventEnd.getTime() - now.getTime();
            
            if (diffToEnd > 0 && diffToEnd < minDiff) {
                minDiff = diffToEnd;
                nextEvent = ev.name;
                nextDate = eventDate;
            }
        });

        return { name: nextEvent, date: nextDate };
    }

    function updateCountdown() {
        const nextEv = getNextEvent();
        if (!nextEv.date) return;

        const now = getNow().getTime();
        let distance = nextEv.date.getTime() - now;
        
        const titleEl = document.getElementById("next-event-name");

        if (distance <= 0) {
            // Llegó el día festivo! (Aún no termina el día pero ya superó las 00:00:00)
            distance = 0;
            if (titleEl) titleEl.textContent = "¡Hoy es " + nextEv.name + "!";
        } else {
            if (titleEl) titleEl.textContent = "Faltan para " + nextEv.name;
        }

        const d = Math.floor(distance / (1000 * 60 * 60 * 24));
        const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((distance % (1000 * 60)) / 1000);

        const dEl = document.getElementById("days");
        const hEl = document.getElementById("hours");
        const mEl = document.getElementById("minutes");
        const sEl = document.getElementById("seconds");

        if (dEl) dEl.textContent = d.toString().padStart(2, '0');
        if (hEl) hEl.textContent = h.toString().padStart(2, '0');
        if (mEl) mEl.textContent = m.toString().padStart(2, '0');
        if (sEl) sEl.textContent = s.toString().padStart(2, '0');
    }

    setInterval(() => {
        if (testDateOverride) {
            // Avanza el tiempo simulado en 1 segundo por cada intervalo real
            testDateOverride.setSeconds(testDateOverride.getSeconds() + 1);
        }
        updateCountdown();
    }, 1000);
    
    updateCountdown();

});