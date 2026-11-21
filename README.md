<!-- 📖 Acerca del Proyecto
Vía Canes es una plataforma web integral diseñada para digitalizar y optimizar las operaciones de negocios del sector pet (veterinarias, peluquerías caninas, tiendas de mascotas y guarderías). El sistema unifica la gestión de inventario, agendamiento de citas, ventas en línea y administración de clientes/mascotas en una sola interfaz intuitiva, mejorando tanto la experiencia del cliente como la eficiencia operativa del negocio.
🎯 Alcance del Proyecto
El sistema cubre cuatro pilares fundamentales:
Tienda Virtual (E-commerce): Catálogo de productos y servicios con carrito de compras, cálculo de envíos y múltiples métodos de pago.
Gestión de Citas: Sistema de agendamiento con validación de disponibilidad y notificaciones automatizadas vía WhatsApp.
Panel Administrativo: Dashboard centralizado para control de ventas, alertas de stock, gestión de proveedores, reseñas y métricas de rendimiento.
Portal del Cliente: Espacio seguro para que los usuarios gestionen sus mascotas, revisen su historial de citas y rastreen sus pedidos.
🏗️ Infraestructura y Arquitectura
El proyecto sigue una arquitectura MVC (Modelo-Vista-Controlador) desacoplada, utilizando un enfoque de API RESTful para la comunicación entre el frontend y el backend:
Frontend: Aplicación de página única (SPA) modularizada en JavaScript (ES6 Modules). Utiliza HTML5 semántico y CSS3 con Bootstrap 5.3 para un diseño 100% responsive.
Backend: PHP 8 actuando como controlador y API, manejando la lógica de negocio, validaciones y seguridad.
Base de Datos: MySQL 8.0 con diseño relacional normalizado, utilizando PDO con consultas preparadas para prevenir inyecciones SQL.
Almacenamiento: Sistema de archivos local (preparado para migración a AWS S3 o similar) para la gestión de imágenes de productos, mascotas y usuarios.
📋 Ficha Técnica del Proyecto
Nombre del proyecto: Vía Canes.
Descripción de la necesidad: Los negocios del sector pet suelen manejar sus operaciones (ventas, citas, inventario) en sistemas desconectados o de forma manual, lo que genera errores de stock, pérdida de citas y una experiencia de cliente fragmentada.
Objetivo general: Centralizar y automatizar los procesos operativos y comerciales de un negocio pet, proporcionando una herramienta escalable, segura y fácil de usar que mejore la toma de decisiones y la satisfacción del cliente.
Usuarios objetivo:
Administradores: Control total del negocio.
Personal (Veterinarios/Peluqueros): Gestión de citas y servicios.
Clientes finales: Dueños de mascotas que compran y agendan servicios.
Funcionalidades principales:
Registro y gestión de perfiles de clientes y múltiples mascotas por usuario.
Catálogo dinámico de productos y servicios con filtros por categoría/especie.
Carrito de compras con validación de stock en tiempo real y cálculo de envío gratis (> $100.000 COP).
Checkout con integración de pagos (Nequi, Daviplata, Bre-B, Efectivo) y coordinación de entrega/comprobante vía WhatsApp API.
Sistema de citas con bloqueo de fechas pasadas y selección de horarios.
Dashboard administrativo con métricas de ventas, alertas de stock bajo (≤ 5 unidades) y próximas citas.
Gestión de proveedores y registro de compras con actualización automática de inventario.
Reglas de negocio:
Los productos "eliminados" utilizan Soft Delete (cambio de estado a inactivo) para no alterar el historial de ventas.
No se permite agregar al carrito productos con stock = 0.
El envío es gratuito automáticamente si el subtotal supera los $100.000 COP.
Las contraseñas nunca se almacenan en texto plano.
Tecnologías existentes (Stack Actual):
Frontend: HTML5, CSS3, JavaScript (ES6 Modules), Bootstrap 5.3, FontAwesome 6.
Backend: PHP 8.x.
Base de Datos: MySQL 8.0 (PDO).
Servidor: XAMPP (Apache) para desarrollo local.
Control de versiones: Git / GitHub.
Integraciones necesarias (Futuras opciones):
Pasarelas de pago automatizadas (Wompi, PayU, Stripe) para evitar la validación manual de transferencias.
API de envío de correos electrónicos (SendGrid, Mailgun) para recuperaciones de contraseña y facturas.
API de SMS/WhatsApp Business oficial (Twilio o Meta Cloud API) para notificaciones automáticas de citas.
Restricciones:
Tiempo: Cronograma académico del SENA.
Infraestructura: Actualmente alojado en servidor local (XAMPP), requiere migración a hosting compartido o VPS para producción real.
Presupuesto: Limitado para adquisición de licencias de software o APIs de pago premium en la fase actual.
Requisitos de seguridad:
Protección contra Inyección SQL mediante PDO con ATTR_EMULATE_PREPARES => false.
Prevención de XSS mediante sanitización de entradas y escapado de HTML en el renderizado.
Hashing de contraseñas con PASSWORD_DEFAULT (bcrypt).
Control de Acceso Basado en Roles (RBAC) con validación de sesión en frontend (localStorage) y backend ($_SESSION).
Entorno de despliegue:
Desarrollo: Servidor Local (XAMPP / Windows).
Producción (Proyectado): Servidor en la Nube (Hostinger, AWS EC2 o DigitalOcean) con certificado SSL (HTTPS).
Estado actual: Desarrollo / Prototipo Funcional (Listo para pruebas de usuario y despliegue en entorno de staging). -->