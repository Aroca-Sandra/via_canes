-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 19-08-2026 a las 22:59:12
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `via_canes`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `carrito`
--

CREATE TABLE `carrito` (
  `id_carrito` int(11) NOT NULL,
  `id_usuario` int(11) DEFAULT NULL,
  `fecha_creacion` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `categorias_producto`
--

CREATE TABLE `categorias_producto` (
  `id_categoria` int(11) NOT NULL,
  `nombre` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `categorias_producto`
--

INSERT INTO `categorias_producto` (`id_categoria`, `nombre`) VALUES
(1, 'Alimentación y Nutrición'),
(2, 'Accesorios y Juguetes'),
(3, 'Higiene y Cuidado Estético'),
(4, 'Productos para Mascotas Especiales'),
(5, 'Cuidado y salud ');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `categoria_servicio`
--

CREATE TABLE `categoria_servicio` (
  `id_categoria_servicio` int(11) NOT NULL,
  `nombre` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `categoria_servicio`
--

INSERT INTO `categoria_servicio` (`id_categoria_servicio`, `nombre`) VALUES
(1, 'Higiene'),
(2, 'Salud'),
(3, 'Cuidado');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `citas`
--

CREATE TABLE `citas` (
  `id_cita` int(11) NOT NULL,
  `fecha_cita` date DEFAULT NULL,
  `hora_cita` time DEFAULT NULL,
  `id_usuario` int(11) DEFAULT NULL,
  `id_mascota` int(11) DEFAULT NULL,
  `id_servicio` int(11) DEFAULT NULL,
  `id_estado_cita` int(11) DEFAULT NULL,
  `notas` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `compras_proveedor`
--

CREATE TABLE `compras_proveedor` (
  `id_compra` int(11) NOT NULL,
  `id_proveedor` int(11) DEFAULT NULL,
  `numero_factura` varchar(100) DEFAULT NULL,
  `id_producto` int(11) DEFAULT NULL,
  `cantidad` int(11) DEFAULT NULL,
  `costo_unitario` int(11) DEFAULT NULL,
  `fecha` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `compras_proveedor`
--

INSERT INTO `compras_proveedor` (`id_compra`, `id_proveedor`, `numero_factura`, `id_producto`, `cantidad`, `costo_unitario`, `fecha`) VALUES
(1, 2, NULL, 1, 1, 15000, '2026-04-01 00:00:00'),
(2, 6, 'FA0002', 9, 6, 25000, '2026-07-16 00:00:00'),
(3, 4, NULL, 2, 8, 50000, '2026-07-16 00:00:00'),
(5, 5, 'FA0000', 8, 2, 159000, '2026-07-18 00:00:00'),
(6, 2, 'FA001', 9, 1, 25000, '2026-07-19 00:00:00'),
(7, 6, 'FA0003', 3, 3, 22000, '2026-07-19 00:00:00'),
(8, 1, 'FA0004', 3, 2, 22000, '2026-07-20 00:00:00');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalle_carrito`
--

CREATE TABLE `detalle_carrito` (
  `id_detalle` int(11) NOT NULL,
  `id_carrito` int(11) DEFAULT NULL,
  `id_producto` int(11) DEFAULT NULL,
  `cantidad` int(11) DEFAULT NULL,
  `precio_unitario` decimal(10,2) DEFAULT NULL,
  `subtotal` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalle_pedido`
--

CREATE TABLE `detalle_pedido` (
  `id_detalle` int(11) NOT NULL,
  `id_pedido` int(11) DEFAULT NULL,
  `id_producto` int(11) DEFAULT NULL,
  `cantidad` int(11) DEFAULT NULL,
  `precio_unitario` decimal(10,2) DEFAULT NULL,
  `subtotal` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `especie`
--

CREATE TABLE `especie` (
  `id_especie` int(11) NOT NULL,
  `nombre` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `especie`
--

INSERT INTO `especie` (`id_especie`, `nombre`) VALUES
(1, 'Perro'),
(2, 'Gato'),
(3, 'Otra especie');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `estados_producto`
--

CREATE TABLE `estados_producto` (
  `id_estado_producto` int(11) NOT NULL,
  `nombre` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `estados_producto`
--

INSERT INTO `estados_producto` (`id_estado_producto`, `nombre`) VALUES
(1, 'disponible'),
(2, 'inactivo'),
(3, 'agotado');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `estado_cita`
--

CREATE TABLE `estado_cita` (
  `id_estado_cita` int(11) NOT NULL,
  `nombre` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `estado_cita`
--

INSERT INTO `estado_cita` (`id_estado_cita`, `nombre`) VALUES
(1, 'Pendiente'),
(2, 'Confirmada'),
(3, 'Cancelada'),
(4, 'Completada');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `estado_pago`
--

CREATE TABLE `estado_pago` (
  `id_estado_pago` int(11) NOT NULL,
  `nombre` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `estado_pago`
--

INSERT INTO `estado_pago` (`id_estado_pago`, `nombre`) VALUES
(1, 'Aprobado'),
(2, 'Rechazado'),
(3, 'Pendiente');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `estado_pedido`
--

CREATE TABLE `estado_pedido` (
  `id_estado_pedido` int(11) NOT NULL,
  `nombre` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `estado_pedido`
--

INSERT INTO `estado_pedido` (`id_estado_pedido`, `nombre`) VALUES
(1, 'Pendiente'),
(2, 'Pagado'),
(3, 'Enviado'),
(4, 'Cancelado'),
(5, 'Entregado');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `estado_promocion`
--

CREATE TABLE `estado_promocion` (
  `id_estado_promocion` int(11) NOT NULL,
  `nombre` varchar(100) DEFAULT NULL,
  `descripcion` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `estado_promocion`
--

INSERT INTO `estado_promocion` (`id_estado_promocion`, `nombre`, `descripcion`) VALUES
(1, 'activo', 'La promoción se aplica en el checkout.'),
(2, 'inactivo', 'La promoción ha expirado o está pausada'),
(3, 'Programada', 'Iniciará automáticamente en la fecha pactada.');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `estado_servicio`
--

CREATE TABLE `estado_servicio` (
  `id_estado_servicio` int(11) NOT NULL,
  `nombre` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `estado_servicio`
--

INSERT INTO `estado_servicio` (`id_estado_servicio`, `nombre`) VALUES
(1, 'activo'),
(2, 'inactivo');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `localidad`
--

CREATE TABLE `localidad` (
  `id_localidad` int(11) NOT NULL,
  `nombre_localidad` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `localidad`
--

INSERT INTO `localidad` (`id_localidad`, `nombre_localidad`) VALUES
(1, 'Usaquén'),
(2, 'Chapinero'),
(3, 'Santa Fe'),
(4, 'San Cristóbal'),
(5, 'Usme'),
(6, 'Tunjuelito'),
(7, 'Bosa'),
(8, 'Kennedy'),
(9, 'Fontibón'),
(10, 'Engativá'),
(12, 'Barrios Unidos'),
(13, 'Teusaquillo'),
(14, 'Los Mártires'),
(15, 'Antonio Nariño'),
(16, 'Puente Aranda'),
(17, 'La Calendaria'),
(18, 'Rafael Uribe Uribe'),
(19, 'Ciudad Bolívar'),
(20, 'Sumapaz');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `mascota`
--

CREATE TABLE `mascota` (
  `id_mascota` int(11) NOT NULL,
  `id_usuario` int(11) DEFAULT NULL,
  `foto_mascota` varchar(255) DEFAULT NULL,
  `nombre_mascota` varchar(100) DEFAULT NULL,
  `id_especie` int(11) DEFAULT NULL,
  `especie_detalle` varchar(20) DEFAULT NULL,
  `id_raza` int(11) DEFAULT NULL,
  `raza_detalle` varchar(50) CHARACTER SET utf16 COLLATE utf16_general_ci DEFAULT NULL,
  `id_sexoMascota` int(11) DEFAULT NULL,
  `edad_mascota` varchar(50) DEFAULT NULL,
  `color_mascota` varchar(50) DEFAULT NULL,
  `peso_mascota` decimal(5,2) DEFAULT NULL,
  `observaciones_mascota` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `mascota`
--

INSERT INTO `mascota` (`id_mascota`, `id_usuario`, `foto_mascota`, `nombre_mascota`, `id_especie`, `especie_detalle`, `id_raza`, `raza_detalle`, `id_sexoMascota`, `edad_mascota`, `color_mascota`, `peso_mascota`, `observaciones_mascota`) VALUES
(1, 2, '../img/mascotas/mascota_2_1783746226_8198.jpg', 'michi', 2, NULL, 27, 'criollo gris', 1, '3 años', 'gris y blancoblancas', 7.00, 'nervioso'),
(2, 6, '../img/mascotas/mascota_6_1784527890.png', 'Bella', 3, 'conejo', 28, 'Conejo enano holandés', 2, '2 años y un mes', 'chocolate', 5.00, 'nerviosa al cortar las uñas'),
(3, 4, '../img/mascotas/mascota_4_1784516750.png', 'Luna', 2, '', 20, '', 2, '6 meses', 'chocolate', 5.00, 'nerviosa'),
(4, 8, '../img/mascotas/mascota_8_1784516714.png', 'tito', 1, '', 5, '', 1, '4 años', 'gris blanco', 6.00, ''),
(5, 5, '../img/mascotas/mascota_5_1783666394_3900.jpg', 'Toby', 1, NULL, 26, 'coker ingles', 1, '7 años', 'dorado', 15.00, ''),
(6, 2, '../img/mascotas/mascota_2_1786737493_2610.jpg', 'Neron', 1, NULL, 26, 'coker ingles', 1, '12 años', 'dorado y pecas blancas', 16.00, ''),
(7, 7, '../img/mascotas/mascota_7_1784528217.png', 'Oliver', 1, '', 7, '', 1, '6 años', 'beige', 6.00, 'es alergico al shampo insectisida'),
(8, 9, '../img/mascotas/mascota_9_1784531247_3871.png', 'kira', 1, NULL, 3, NULL, 2, '6 años', 'beige y pintas negras', 7.00, ''),
(9, 7, '../img/mascotas/mascota_7_1784532981_9451.png', 'nala', 1, NULL, 7, NULL, 2, '6años', 'beige', 6.00, ''),
(10, 10, '../img/mascotas/mascota_10_1784669410_4413.png', 'Bruno', 1, NULL, 4, NULL, 1, '7 años', 'Negro y dorado', 10.00, ''),
(11, 11, '../img/mascotas/mascota_11_1784671457_1777.png', 'Loki', 1, NULL, 26, 'schnauzer', 1, '6 años', 'negro y mechones blancos', 6.00, ''),
(12, 12, '../img/mascotas/mascota_12_1784676452_6157.png', 'Thor', 2, NULL, 20, NULL, 1, '6 meses', 'chocolate claro', 5.00, ''),
(13, 12, '../img/mascotas/mascota_12_1784677243_1089.png', 'Lola', 2, NULL, 20, NULL, 2, '6años', 'chocolate claro', 5.00, '');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `metodos_catalogo`
--

CREATE TABLE `metodos_catalogo` (
  `id_metodo` int(11) NOT NULL,
  `nombre` varchar(50) DEFAULT NULL,
  `descripcion` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `metodos_catalogo`
--

INSERT INTO `metodos_catalogo` (`id_metodo`, `nombre`, `descripcion`) VALUES
(1, 'Nequi', 'Transferencia digital'),
(2, 'Daviplata', 'Transferencia digital'),
(3, 'Efectivo', 'Pago contra entrega o en punto físico.'),
(4, 'Tarjeta', 'Crédito o débito'),
(5, 'PSE', 'Débito bancario directo.');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pagos`
--

CREATE TABLE `pagos` (
  `id_pago` int(11) NOT NULL,
  `id_pedido` int(11) DEFAULT NULL,
  `total` decimal(10,2) DEFAULT NULL,
  `fecha_pago` datetime DEFAULT NULL,
  `id_metodo` int(11) DEFAULT NULL,
  `id_estado_pago` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pedido`
--

CREATE TABLE `pedido` (
  `id_pedido` int(11) NOT NULL,
  `id_usuario` int(11) DEFAULT NULL,
  `fecha` datetime DEFAULT NULL,
  `total` decimal(10,2) DEFAULT NULL,
  `id_estado_pedido` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `productos`
--

CREATE TABLE `productos` (
  `id_producto` int(11) NOT NULL,
  `id_categoria` int(11) DEFAULT NULL,
  `id_proveedor` int(11) DEFAULT NULL,
  `nombre` varchar(150) DEFAULT NULL,
  `descripcion` text DEFAULT NULL,
  `stock` int(11) DEFAULT NULL,
  `costo_compra` decimal(10,2) DEFAULT NULL,
  `precio_venta` decimal(10,2) DEFAULT NULL,
  `imagen_url` text DEFAULT NULL,
  `id_estado_producto` int(11) DEFAULT NULL,
  `codigo_barras` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `productos`
--

INSERT INTO `productos` (`id_producto`, `id_categoria`, `id_proveedor`, `nombre`, `descripcion`, `stock`, `costo_compra`, `precio_venta`, `imagen_url`, `id_estado_producto`, `codigo_barras`) VALUES
(1, 1, 2, 'Perro Adulto Doble Proteina Sabor Salmon y Carne a La Plancha 2Kg', 'Alimento premium para perros adultos con doble proteína', 12, 18000.00, 21000.00, '../img/img.productosperros/prod_1783481276_6643.png', 1, '7702018001001'),
(2, 5, 1, 'Nexgard Spectra (15 - 30 Kg Caja X 1Tab. ) Antiparasitario Antipulgas Y Garrapatas Perro', 'Masticable mensual NexGard Spectra (15-30 kg) Caja X 1Tab. Ofrece protección integral contra parásitos internos y externos de fácil administración. Elimina pulgas y garrapatas en solo 6-8 horas, con un efecto duradero de hasta 5 semanas.', 18, 56000.00, 66000.00, '../img/img.productosperros/prod_1783727243_2433.jpg', 1, '3661103049129'),
(3, 3, 1, 'Shampoo Petys de 235 ml -Limpieza y Suavidad-para  Perros y Gatos', 'Limpieza profunda con ingredientes naturales, suavidad garantizada', 10, 22000.00, 25000.00, '../img/img.higiene/Shampoo Petys de 235 ml -Limpieza y Suavidad-para  Perros y Gatos.png\r\n', 1, '7702018001003'),
(4, 2, NULL, 'Pelota de Goma Resistente', '', 10, 11000.00, 15000.00, '../img/img.productosperros/prod_1783481237_2770.png', 2, '2551382'),
(5, 3, 1, 'Canamor -Jabón Insecticida Barra x 90 Gr', 'Elimina pulgas, garrapatas y piojos con efecto residual duradero. Su fórmula de PH neutro garantiza una limpieza segura y protege la piel de tu perro', 5, 8000.00, 10000.00, '../img/img.productosperros/prod_1783480953_1305.png', 1, '3551393'),
(6, 4, 1, 'Kit Comedero y bebedero para pájaros', 'Set completo de alimentación para aves pequeñas', 2, 50000.00, 58500.00, '../img/img.otros-animales/kit-comedero-bebedero-pajaros.png', 1, '7702018001004'),
(7, 1, 2, 'Max Cat -Alimento para Gatos Adultos Sabor Pollo y Arroz 10.1 Kg', '', 7, 175000.00, 190000.00, '../img/img.productosperros/prod_1784181615_4708.jpg', 1, '000000000000'),
(8, 1, 5, 'Chunky Cordero, Arroz y Salmón 12 Kg Perros Adultos', 'Perros Adultos', 16, 159000.00, 179000.00, '../img/img.productosperros/prod_1784185436_6475.png', 1, '00000111'),
(9, 1, 6, 'PURINA® DOG CHOW® Salud Visible Cachorros Minis y Pequeños  2 Kg', 'Nutrición a la medida que mejora la calidad de vida de tu cachorro de adentro hacia afuera. Enriquecido con la mezcla especial de antioxidantes ExtraLife®, maximiza su bienestar diario y asegura un crecimiento óptimo. También es ideal para hembras gestantes y lactantes.', 13, 25000.00, 29000.00, '../img/img.productosperros/prod_1784346887_8357.png', 1, '7702521012984');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `producto_especie`
--

CREATE TABLE `producto_especie` (
  `id_producto` int(11) NOT NULL,
  `id_especie` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `producto_especie`
--

INSERT INTO `producto_especie` (`id_producto`, `id_especie`) VALUES
(1, 1),
(2, 1),
(3, 1),
(3, 2),
(4, 1),
(5, 1),
(5, 2),
(6, 3),
(7, 2),
(8, 1),
(9, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `producto_promocion`
--

CREATE TABLE `producto_promocion` (
  `id_producto_promocion` int(11) NOT NULL,
  `id_producto` int(11) DEFAULT NULL,
  `id_promo` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `producto_promocion`
--

INSERT INTO `producto_promocion` (`id_producto_promocion`, `id_producto`, `id_promo`) VALUES
(1, 1, 1),
(2, 2, 2),
(3, 3, 2);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `promociones`
--

CREATE TABLE `promociones` (
  `id_promo` int(11) NOT NULL,
  `nombre` varchar(100) DEFAULT NULL,
  `descripcion` text DEFAULT NULL,
  `valor` decimal(10,2) DEFAULT NULL,
  `tipo_descuento` varchar(20) DEFAULT NULL,
  `fecha_inicio` date DEFAULT NULL,
  `fecha_fin` date DEFAULT NULL,
  `fecha_creacion` date DEFAULT NULL,
  `id_estado_promocion` int(11) DEFAULT NULL,
  `foto_url` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `promociones`
--

INSERT INTO `promociones` (`id_promo`, `nombre`, `descripcion`, `valor`, `tipo_descuento`, `fecha_inicio`, `fecha_fin`, `fecha_creacion`, `id_estado_promocion`, `foto_url`) VALUES
(1, 'Cuidado e Higiene', 'Desparasitantes', 15.00, 'porcentaje', '2026-08-15', '2026-08-30', '2026-04-30', 1, NULL),
(2, 'Mes del Cachorro', 'Descuento en alimento perro y gato', 2000.00, 'valor', '2026-04-20', '2026-04-20', '2026-04-20', 1, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `proveedores`
--

CREATE TABLE `proveedores` (
  `id_proveedor` int(11) NOT NULL,
  `nombre_empresa` varchar(100) DEFAULT NULL,
  `nit_cedula` varchar(20) DEFAULT NULL,
  `contacto_nombre` varchar(100) DEFAULT NULL,
  `telefono` varchar(50) DEFAULT NULL,
  `correo` varchar(100) DEFAULT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `marcas` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `proveedores`
--

INSERT INTO `proveedores` (`id_proveedor`, `nombre_empresa`, `nit_cedula`, `contacto_nombre`, `telefono`, `correo`, `direccion`, `marcas`) VALUES
(1, 'Distribuidora Pets S.A', '900123456', 'Carlos Gomez', '3101234567', 'ventas@pets.com', NULL, NULL),
(2, 'Alimentos Polar Colombia S.A.S', '8300067353', 'Adriana Gomez', '601 6511777 / 018000515551', 'contactanos@empresas-polar.com', '', 'perros'),
(3, 'Gabrica S.A.S', '800.164.767-6', 'Eduard Rios', '317 310 0715 /(601) 519 0040', 'servicioalcliente@gabrica.com.co', NULL, NULL),
(4, 'Vibe Andina S.A.S.-Animal Homepg web', '900.860.961-7', 'Carrera 80 # 2-51, Corabastos, Bodega 16, Local 4, Bogotá', '311 876 7205', 'gerenciavibeandina@gmail.com', NULL, NULL),
(5, 'chunky', '1111111', '222222222', '000000', 'notiene@gmail.com', NULL, NULL),
(6, 'Nestlé Purina PetCare de Colombia S.A.', '830.050.346-8', 'Paola', '01 8000 515566 / Bogotá: (+57 1) 348 9583', 'servicio.consumidor@co.nestle.com', 'Kilómetro 18 Vía Occidente, Mosquera, Cundinamarca, Colombia.', 'Perros Pro Plan Dog Chow Excellent Purina ONE Puppy Chow Beneful Alpo DentaLife Beggin\' Busy Bone🐱 Gatos Cat Chow Pro Plan Cat Excellent Gatos Fancy Feast Felix Friskies Purina ONE Cat');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `raza`
--

CREATE TABLE `raza` (
  `id_raza` int(11) NOT NULL,
  `nombre` varchar(100) DEFAULT NULL,
  `id_especie` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `raza`
--

INSERT INTO `raza` (`id_raza`, `nombre`, `id_especie`) VALUES
(1, 'Labrador', 1),
(2, 'Siamés', 2),
(3, 'Shih Tzu', 1),
(4, 'Yorkshire Terrier', 1),
(5, 'Schnauzer Miniatura', 1),
(6, 'Bichón Maltés', 1),
(7, 'Pomerania', 1),
(8, 'Pug', 1),
(9, 'Bulldog Francés', 1),
(10, 'Cocker Spaniel', 1),
(11, 'Beagle', 1),
(12, 'Mestizo (Peludo mediano)', 1),
(13, 'Golden Retriever', 1),
(14, 'Labrador Retriever', 1),
(15, 'Pastor Alemán', 1),
(16, 'Border Collie', 1),
(17, 'Persa', 2),
(18, 'Criollo (Mestizo)', 2),
(19, 'Angora Turco', 2),
(20, 'Siamés', 2),
(21, 'Maine Coon', 2),
(22, 'Himalayo', 2),
(23, 'Ragdoll', 2),
(24, 'Bengala (Bengalí)', 2),
(25, 'Azul Ruso', 2),
(26, 'Otra Raza (Perro)', 1),
(27, 'Otra raza (Gato)', 2),
(28, 'Otra raza (Otra especie)', 3);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `recuperar_clave`
--

CREATE TABLE `recuperar_clave` (
  `id_token` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `token` varchar(255) NOT NULL,
  `fecha_creacion` datetime DEFAULT current_timestamp(),
  `fecha_expiracion` datetime NOT NULL,
  `usado` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `recuperar_clave`
--

INSERT INTO `recuperar_clave` (`id_token`, `id_usuario`, `token`, `fecha_creacion`, `fecha_expiracion`, `usado`) VALUES
(1, 1, '421945', '2026-07-09 23:22:59', '2026-07-10 06:37:59', 1),
(2, 1, '798237', '2026-07-09 23:23:48', '2026-07-10 06:38:48', 1),
(3, 1, '668464', '2026-07-09 23:24:46', '2026-07-10 06:39:46', 1),
(4, 1, '552326', '2026-07-09 23:27:08', '2026-07-10 06:42:08', 1),
(5, 1, '526903', '2026-07-09 23:28:31', '2026-07-10 06:43:30', 1),
(6, 1, '282421', '2026-07-09 23:29:18', '2026-07-10 06:44:18', 1),
(7, 1, '983998', '2026-07-09 23:30:37', '2026-07-10 06:45:37', 1),
(8, 1, '351101', '2026-07-09 23:31:08', '2026-07-10 06:46:08', 1),
(9, 1, '853814', '2026-07-09 23:56:27', '2026-07-10 07:11:27', 1),
(10, 1, '477496', '2026-07-10 00:13:05', '2026-07-10 07:28:05', 1),
(11, 1, '139516', '2026-07-10 00:14:42', '2026-07-10 07:29:42', 1),
(12, 1, '677033', '2026-07-10 00:20:19', '2026-07-10 07:35:19', 1),
(13, 1, '760428', '2026-07-10 00:22:54', '2026-07-10 07:37:54', 1),
(14, 1, '432255', '2026-07-10 00:26:11', '2026-07-10 07:41:11', 1),
(15, 1, '160221', '2026-07-10 00:47:38', '2026-07-10 08:02:38', 1),
(16, 1, '819434', '2026-07-10 00:50:54', '2026-07-10 08:05:54', 1),
(17, 1, '311167', '2026-07-10 00:52:06', '2026-07-10 08:07:06', 1),
(18, 1, '124012', '2026-07-10 00:52:54', '2026-07-10 08:07:54', 1),
(19, 1, '630466', '2026-07-10 01:04:47', '2026-07-10 08:19:47', 1),
(20, 1, '605350', '2026-07-10 01:12:00', '2026-07-10 08:27:00', 1),
(21, 1, '135212', '2026-07-10 01:22:03', '2026-07-10 08:37:03', 1),
(22, 1, '906223', '2026-07-10 01:35:50', '2026-07-10 08:50:50', 1),
(24, 7, '754250', '2026-07-20 02:25:50', '2026-07-20 09:40:50', 1),
(25, 12, '701092', '2026-07-21 18:01:39', '2026-07-22 01:16:39', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `reseñas_productos`
--

CREATE TABLE `reseñas_productos` (
  `id_reseña` int(11) NOT NULL,
  `id_producto` int(11) DEFAULT NULL,
  `id_usuario` int(11) DEFAULT NULL,
  `estrellas` int(11) DEFAULT NULL,
  `comentario` text DEFAULT NULL,
  `fecha` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `reseñas_productos`
--

INSERT INTO `reseñas_productos` (`id_reseña`, `id_producto`, `id_usuario`, `estrellas`, `comentario`, `fecha`) VALUES
(1, 1, 1, 5, 'Excelente shampoo, huele muy bien', '2026-07-11 00:00:00');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rol`
--

CREATE TABLE `rol` (
  `id_rol` int(11) NOT NULL,
  `nombre_rol` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `rol`
--

INSERT INTO `rol` (`id_rol`, `nombre_rol`) VALUES
(1, 'ADMINISTRADOR'),
(2, 'CLIENTE'),
(3, 'VENDEDOR');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `servicios`
--

CREATE TABLE `servicios` (
  `id_servicio` int(11) NOT NULL,
  `nombre` varchar(100) DEFAULT NULL,
  `descripcion` text DEFAULT NULL,
  `precio` decimal(10,2) DEFAULT NULL,
  `duracion` int(11) DEFAULT NULL,
  `id_estado_servicio` int(11) DEFAULT NULL,
  `id_categoria_servicio` int(11) DEFAULT NULL,
  `imagen_url` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `servicios`
--

INSERT INTO `servicios` (`id_servicio`, `nombre`, `descripcion`, `precio`, `duracion`, `id_estado_servicio`, `id_categoria_servicio`, `imagen_url`) VALUES
(1, 'Servicio de Estética Canina y Felina Integral', 'Renovación total y cuidado experto para tu mascota. Incluye baño profundo, corte de pelo especializado según su raza, limpieza de oídos y corte de uñas higiénico. Nota: La tarifa final se calcula automáticamente en el carrito según el tamaño y tipo de pelaje de tu mejor amigo.', 45000.00, 120, 1, 1, NULL),
(2, 'Servicio de Baño Profundo, Hidratación y Cepillado', 'Cuidado dermatológico y brillo máximo para el manto de tu mascota. Incluye baño profundo con shampoo especializado (medicado o de alta hidratación), secado profesional y cepillado eliminador de pelo muerto. Nota: La tarifa final se ajusta en el selector de abajo según el tamaño de tu mejor amigo', 30000.00, 60, 1, 1, NULL),
(3, 'Plan Cero Bichos: Desparasitación Completa', 'Protege a tu mascota por dentro y por fuera contra pulgas, garrapatas y parásitos intestinales en un solo clic.', 35000.00, 15, 1, 2, NULL),
(4, 'Servicio de Vacunación e Inmunización Preventiva', 'Protege la vida de tu mejor amigo contra las enfermedades más comunes y peligrosas. Incluye valoración médica previa, aplicación de biológicos de alta calidad, registro en carné de vacunación y recordatorio automático de próximas dosis. ', 30000.00, 20, 1, 2, NULL),
(5, 'Guardería Canina: Diversión, Socialización y Cuidado Diario', 'El lugar perfecto para que tu perro juegue, se ejercite y socialice de forma segura mientras tú trabajas o viajas. Incluye supervisión profesional constante, actividades recreativas guiadas, áreas de descanso climatizadas y reportes con fotos/videos de su día.', 25000.00, 60, 1, 3, NULL),
(6, 'Consulta Veterinaria General', 'Prioriza la salud de tu mascota con una atención médica experta y oportuna. Incluye examen físico completo (revisión de ojos, oídos, boca, piel, corazón y pulmones), control de peso, diagnóstico preliminar, receta médica detallada y orientación profesional para su cuidado diario.', 50000.00, 40, 2, 2, NULL),
(7, 'Servicio de Paseos: Energía, Socialización y Libertad', 'Dale a tu perro el ejercicio y la distracción que necesita para mantenerse equilibrado y feliz. Incluye paseadores calificados, rutas seguras y controladas, dinámicas de socialización, hidratación constante y reportes en tiempo real con su ubicación y fotos.', 8000.00, 60, 1, 3, NULL),
(8, 'Corte unas canino y felino', 'Corte de Uñas Seguro para Perros y Gatos 🐶🐱Evita molestias, dolores y lesiones en sus patitas. Nuestro equipo profesional realiza un corte preciso, rápido y sin estrés, cuidando la salud de tu mascota.📅 ¡Agenda tu cita hoy mismo!', 200.00, 120, 1, 1, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `sexo_mascotas`
--

CREATE TABLE `sexo_mascotas` (
  `id_sexoMascota` int(11) NOT NULL,
  `sexo_mascota` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `sexo_mascotas`
--

INSERT INTO `sexo_mascotas` (`id_sexoMascota`, `sexo_mascota`) VALUES
(1, 'Macho'),
(2, 'Hembra');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tipo_identificacion`
--

CREATE TABLE `tipo_identificacion` (
  `id_tipo_id` int(11) NOT NULL,
  `sigla` varchar(10) DEFAULT NULL,
  `nombre` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `tipo_identificacion`
--

INSERT INTO `tipo_identificacion` (`id_tipo_id`, `sigla`, `nombre`) VALUES
(1, 'CC', 'Cedula de Ciudadania'),
(2, 'TI', 'Tarjeta de Identidad'),
(3, 'RC', 'Registro Civil'),
(4, 'NUID', 'Numero Unico de Identificacion Personal'),
(5, 'CE', 'Cedula de Extranjeria'),
(6, 'PP', 'Pasaporte'),
(7, 'PEP', 'Permiso Especial'),
(8, 'PPT', 'Permiso Temporal de Permanencia'),
(9, 'NIT', 'Numero de Identificacion Tributaria');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuario`
--

CREATE TABLE `usuario` (
  `id_usuario` int(11) NOT NULL,
  `id_rol` int(11) DEFAULT NULL,
  `foto_usuario` varchar(255) DEFAULT NULL,
  `id_tipo_id` int(11) DEFAULT NULL,
  `numero_documento` varchar(20) DEFAULT NULL,
  `nombres` varchar(100) DEFAULT NULL,
  `apellidos` varchar(100) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `celular` varchar(20) DEFAULT NULL,
  `nueva_contrasena` varchar(255) DEFAULT NULL,
  `fecha_registro` datetime DEFAULT current_timestamp(),
  `id_localidad` int(11) DEFAULT NULL,
  `direccion` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `usuario`
--

INSERT INTO `usuario` (`id_usuario`, `id_rol`, `foto_usuario`, `id_tipo_id`, `numero_documento`, `nombres`, `apellidos`, `email`, `celular`, `nueva_contrasena`, `fecha_registro`, `id_localidad`, `direccion`) VALUES
(1, 1, '../img/usuarios/user_1784227112_7242.png', 1, '51719852', 'Sandra', 'Aroca', 'admin@viacanes.com', '3016540536', '$2y$10$MeBtfoxJ1St1i.kz//5r9eLyyavVGYRTIXSPW2zAhoNABW9QoDQc6', '2026-04-18 16:15:41', 16, 'carrera 51 3 62'),
(2, 2, '../img/usuarios/user_1784529705_1069.png', 1, '1000456963', 'Luisa', 'Martinez', 'lmartinez@gmail.com', '3016540576', '$2y$10$p9CAjx8YyBcbAP22.6ckGe.OdVLkEkq0b1ZAECg2dawfa4enZRXsC', '2026-06-19 20:28:43', 16, 'carrera 52 3 60'),
(3, 3, '../img/usuarios/user_1784685679_9435.png', 1, '1014188603', 'Natalia', 'Camargo', 'vendedor1@viacanes.com', '3107668293', '$2y$10$GiFgcC.S0MQ/f.AOJyzAiuZgPwRKT0aCLLPDg6BgAdEje0yfWhU.O', '2026-06-23 17:09:45', 16, ''),
(4, 2, '../img/usuarios/user_1784685703_4773.png', 1, '1212101010', 'Javier', 'Vivas', 'jvivas@gmail.com', '3002587945', '$2y$10$f7JeubK6yfJiRzp4Cd5cAO65P/Tf9XVgi4v1Zf4vtSYoFb6E8HuA2', '2026-06-23 18:29:18', 12, ''),
(5, 2, '../img/usuarios/user_1784685795_5754.png', 1, '1010200000', 'Patricia', 'Bernal', 'bernals@gmail.com', '3143227489', '$2y$10$Xjl/.QozdJ9cgwAjoes8me5Lw7S/gfsP2s2KSKRBgpORU86XOXx2m', '2026-07-02 01:49:18', 16, 'Carrera 53F # 5c-99'),
(6, 2, '../img/usuarios/user_1784686066_4000.png', 1, '1014211311', 'Anderson', 'Ruiz', 'aruiz@gmail.com', '3000000000', '$2y$10$jqmLxp1YheK7inA8CG9rEO6QC6Kdzxix7jvQsGG17.Iayu334KNJm', '2026-07-07 20:32:07', 12, 'calle 63 24 67'),
(7, 2, '../img/usuarios/user_1784687604_4366.png', 1, '52879621', 'Maria', 'Salgado', 'salgadom@gmail.com', '3210000009', '$2y$10$azco8zStTRBxQsQIUY22.O747Mf2.sJulJGaa/gVJxodnYQz1JS/S', '2026-07-08 00:15:57', 16, 'carrera 58  8 64'),
(8, 2, '../img/usuarios/user_1784687633_3417.png', 1, '1010023100', 'Karla', 'Gonzalez', 'kgonz@gmail.com', '31100884115', '$2y$10$s2IvN0orc43PKeheHDNd2O1SIGe1hPOU7EgrfB9ESPnfQDzkDfGH.', '2026-07-08 00:47:56', 10, 'calle 120 67 09'),
(9, 2, '../img/usuarios/user_1784687745_3171.png', 1, '10000101010', 'Sandra', 'Aroca', 'arocasandra8@gmail.com', '3001001010', '$2y$10$OF6nW1/jRghKyrYCdwE0E.q.rWkOUMYxnyG1.NxianBpC2crXLeoO', '2026-07-20 02:05:29', 16, 'calle 53 13 16'),
(10, 2, '../img/usuarios/user_1784687815_1294.png', 1, '1000000101010', 'Laura', 'Sandoval', 'lsandoval@gmail.com', '31000100101', '$2y$10$0td7I8W8/Z/UC3QBaXaBMOGCXvoo2B3TLDu7Oj9L4z3UoIjtOlWuK', '2026-07-21 16:21:01', 7, ''),
(11, 2, '../img/usuarios/user_11_1784674625.png', 1, '00000000000', 'Eric', 'Garcia', 'Mgarcia@gmail.com', '3010001010', '$2y$10$0qi5cE/dKbJqxP5CKUnnT.sWNCJ8ixfLpGiB3jJSWuTTyeUC.NwAq', '2026-07-21 17:00:34', 1, 'Calle 39B No. 19 - 30'),
(12, 2, '../img/usuarios/user_1784687890_9494.png', 1, '10101000000', 'Santiago', 'Lopez', 'ssopez@gmail.com', '3000001010', '$2y$10$7vTbzwsdFSsCu8yu8C/n0O.2Wha73rE.ad9ucgQiHqeNRm6SVN0b2', '2026-07-21 18:00:49', 9, 'calle 100 67 16'),
(13, 2, NULL, 1, '10010001010', 'Carolina', 'Bello', 'cbello@gmail.com', '3000000000', '$2y$10$oRJpjUw7ifZOqWSvNce8BOFm0Rcqqh3mkxNL.xPxhf5oWvy/dGb5a', '2026-07-28 21:45:07', 16, '');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `carrito`
--
ALTER TABLE `carrito`
  ADD PRIMARY KEY (`id_carrito`),
  ADD KEY `carrito_ibfk_1` (`id_usuario`);

--
-- Indices de la tabla `categorias_producto`
--
ALTER TABLE `categorias_producto`
  ADD PRIMARY KEY (`id_categoria`);

--
-- Indices de la tabla `categoria_servicio`
--
ALTER TABLE `categoria_servicio`
  ADD PRIMARY KEY (`id_categoria_servicio`);

--
-- Indices de la tabla `citas`
--
ALTER TABLE `citas`
  ADD PRIMARY KEY (`id_cita`),
  ADD KEY `id_mascota` (`id_mascota`),
  ADD KEY `id_servicio` (`id_servicio`),
  ADD KEY `id_estado_cita` (`id_estado_cita`),
  ADD KEY `citas_ibfk_1` (`id_usuario`);

--
-- Indices de la tabla `compras_proveedor`
--
ALTER TABLE `compras_proveedor`
  ADD PRIMARY KEY (`id_compra`),
  ADD KEY `id_proveedor` (`id_proveedor`),
  ADD KEY `id_producto` (`id_producto`);

--
-- Indices de la tabla `detalle_carrito`
--
ALTER TABLE `detalle_carrito`
  ADD PRIMARY KEY (`id_detalle`),
  ADD KEY `id_producto` (`id_producto`),
  ADD KEY `detalle_carrito_ibfk_1` (`id_carrito`);

--
-- Indices de la tabla `detalle_pedido`
--
ALTER TABLE `detalle_pedido`
  ADD PRIMARY KEY (`id_detalle`),
  ADD KEY `id_producto` (`id_producto`),
  ADD KEY `detalle_pedido_ibfk_1` (`id_pedido`);

--
-- Indices de la tabla `especie`
--
ALTER TABLE `especie`
  ADD PRIMARY KEY (`id_especie`);

--
-- Indices de la tabla `estados_producto`
--
ALTER TABLE `estados_producto`
  ADD PRIMARY KEY (`id_estado_producto`);

--
-- Indices de la tabla `estado_cita`
--
ALTER TABLE `estado_cita`
  ADD PRIMARY KEY (`id_estado_cita`);

--
-- Indices de la tabla `estado_pago`
--
ALTER TABLE `estado_pago`
  ADD PRIMARY KEY (`id_estado_pago`);

--
-- Indices de la tabla `estado_pedido`
--
ALTER TABLE `estado_pedido`
  ADD PRIMARY KEY (`id_estado_pedido`);

--
-- Indices de la tabla `estado_promocion`
--
ALTER TABLE `estado_promocion`
  ADD PRIMARY KEY (`id_estado_promocion`);

--
-- Indices de la tabla `estado_servicio`
--
ALTER TABLE `estado_servicio`
  ADD PRIMARY KEY (`id_estado_servicio`);

--
-- Indices de la tabla `localidad`
--
ALTER TABLE `localidad`
  ADD PRIMARY KEY (`id_localidad`);

--
-- Indices de la tabla `mascota`
--
ALTER TABLE `mascota`
  ADD PRIMARY KEY (`id_mascota`),
  ADD KEY `id_especie` (`id_especie`),
  ADD KEY `id_raza` (`id_raza`),
  ADD KEY `id_sexoMascota` (`id_sexoMascota`) USING BTREE,
  ADD KEY `mascota_ibfk_1` (`id_usuario`);

--
-- Indices de la tabla `metodos_catalogo`
--
ALTER TABLE `metodos_catalogo`
  ADD PRIMARY KEY (`id_metodo`);

--
-- Indices de la tabla `pagos`
--
ALTER TABLE `pagos`
  ADD PRIMARY KEY (`id_pago`),
  ADD KEY `id_metodo` (`id_metodo`),
  ADD KEY `id_estado_pago` (`id_estado_pago`),
  ADD KEY `pagos_ibfk_1` (`id_pedido`);

--
-- Indices de la tabla `pedido`
--
ALTER TABLE `pedido`
  ADD PRIMARY KEY (`id_pedido`),
  ADD KEY `id_estado_pedido` (`id_estado_pedido`),
  ADD KEY `pedido_ibfk_1` (`id_usuario`);

--
-- Indices de la tabla `productos`
--
ALTER TABLE `productos`
  ADD PRIMARY KEY (`id_producto`),
  ADD UNIQUE KEY `codigo_barras` (`codigo_barras`),
  ADD KEY `id_categoria` (`id_categoria`),
  ADD KEY `id_proveedor` (`id_proveedor`),
  ADD KEY `id_estado_producto` (`id_estado_producto`);

--
-- Indices de la tabla `producto_especie`
--
ALTER TABLE `producto_especie`
  ADD PRIMARY KEY (`id_producto`,`id_especie`),
  ADD KEY `id_especie` (`id_especie`) USING BTREE;

--
-- Indices de la tabla `producto_promocion`
--
ALTER TABLE `producto_promocion`
  ADD PRIMARY KEY (`id_producto_promocion`),
  ADD KEY `id_producto` (`id_producto`),
  ADD KEY `id_promo` (`id_promo`);

--
-- Indices de la tabla `promociones`
--
ALTER TABLE `promociones`
  ADD PRIMARY KEY (`id_promo`),
  ADD KEY `id_estado_promocion` (`id_estado_promocion`);

--
-- Indices de la tabla `proveedores`
--
ALTER TABLE `proveedores`
  ADD PRIMARY KEY (`id_proveedor`),
  ADD UNIQUE KEY `nit_cedula` (`nit_cedula`);

--
-- Indices de la tabla `raza`
--
ALTER TABLE `raza`
  ADD PRIMARY KEY (`id_raza`),
  ADD KEY `id_especie` (`id_especie`);

--
-- Indices de la tabla `recuperar_clave`
--
ALTER TABLE `recuperar_clave`
  ADD PRIMARY KEY (`id_token`),
  ADD KEY `id_usuario` (`id_usuario`);

--
-- Indices de la tabla `reseñas_productos`
--
ALTER TABLE `reseñas_productos`
  ADD PRIMARY KEY (`id_reseña`),
  ADD KEY `id_producto` (`id_producto`),
  ADD KEY `id_usuario` (`id_usuario`);

--
-- Indices de la tabla `rol`
--
ALTER TABLE `rol`
  ADD PRIMARY KEY (`id_rol`),
  ADD UNIQUE KEY `nombre_rol` (`nombre_rol`);

--
-- Indices de la tabla `servicios`
--
ALTER TABLE `servicios`
  ADD PRIMARY KEY (`id_servicio`),
  ADD KEY `id_estado_servicio` (`id_estado_servicio`),
  ADD KEY `id_categoria_servicio` (`id_categoria_servicio`);

--
-- Indices de la tabla `sexo_mascotas`
--
ALTER TABLE `sexo_mascotas`
  ADD PRIMARY KEY (`id_sexoMascota`);

--
-- Indices de la tabla `tipo_identificacion`
--
ALTER TABLE `tipo_identificacion`
  ADD PRIMARY KEY (`id_tipo_id`),
  ADD UNIQUE KEY `sigla` (`sigla`);

--
-- Indices de la tabla `usuario`
--
ALTER TABLE `usuario`
  ADD PRIMARY KEY (`id_usuario`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `numero_documento` (`numero_documento`) USING BTREE,
  ADD KEY `id_tipo_id` (`id_tipo_id`),
  ADD KEY `id_rol` (`id_rol`),
  ADD KEY `id_localidad` (`id_localidad`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `carrito`
--
ALTER TABLE `carrito`
  MODIFY `id_carrito` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `categorias_producto`
--
ALTER TABLE `categorias_producto`
  MODIFY `id_categoria` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `categoria_servicio`
--
ALTER TABLE `categoria_servicio`
  MODIFY `id_categoria_servicio` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `citas`
--
ALTER TABLE `citas`
  MODIFY `id_cita` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `compras_proveedor`
--
ALTER TABLE `compras_proveedor`
  MODIFY `id_compra` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de la tabla `detalle_carrito`
--
ALTER TABLE `detalle_carrito`
  MODIFY `id_detalle` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `detalle_pedido`
--
ALTER TABLE `detalle_pedido`
  MODIFY `id_detalle` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `especie`
--
ALTER TABLE `especie`
  MODIFY `id_especie` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `estados_producto`
--
ALTER TABLE `estados_producto`
  MODIFY `id_estado_producto` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `estado_cita`
--
ALTER TABLE `estado_cita`
  MODIFY `id_estado_cita` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `estado_pago`
--
ALTER TABLE `estado_pago`
  MODIFY `id_estado_pago` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `estado_pedido`
--
ALTER TABLE `estado_pedido`
  MODIFY `id_estado_pedido` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `estado_promocion`
--
ALTER TABLE `estado_promocion`
  MODIFY `id_estado_promocion` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `estado_servicio`
--
ALTER TABLE `estado_servicio`
  MODIFY `id_estado_servicio` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `localidad`
--
ALTER TABLE `localidad`
  MODIFY `id_localidad` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT de la tabla `mascota`
--
ALTER TABLE `mascota`
  MODIFY `id_mascota` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT de la tabla `metodos_catalogo`
--
ALTER TABLE `metodos_catalogo`
  MODIFY `id_metodo` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de la tabla `pagos`
--
ALTER TABLE `pagos`
  MODIFY `id_pago` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `productos`
--
ALTER TABLE `productos`
  MODIFY `id_producto` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT de la tabla `producto_promocion`
--
ALTER TABLE `producto_promocion`
  MODIFY `id_producto_promocion` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `promociones`
--
ALTER TABLE `promociones`
  MODIFY `id_promo` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `proveedores`
--
ALTER TABLE `proveedores`
  MODIFY `id_proveedor` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de la tabla `raza`
--
ALTER TABLE `raza`
  MODIFY `id_raza` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- AUTO_INCREMENT de la tabla `recuperar_clave`
--
ALTER TABLE `recuperar_clave`
  MODIFY `id_token` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT de la tabla `reseñas_productos`
--
ALTER TABLE `reseñas_productos`
  MODIFY `id_reseña` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `rol`
--
ALTER TABLE `rol`
  MODIFY `id_rol` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `servicios`
--
ALTER TABLE `servicios`
  MODIFY `id_servicio` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de la tabla `sexo_mascotas`
--
ALTER TABLE `sexo_mascotas`
  MODIFY `id_sexoMascota` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `tipo_identificacion`
--
ALTER TABLE `tipo_identificacion`
  MODIFY `id_tipo_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT de la tabla `usuario`
--
ALTER TABLE `usuario`
  MODIFY `id_usuario` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `carrito`
--
ALTER TABLE `carrito`
  ADD CONSTRAINT `carrito_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE;

--
-- Filtros para la tabla `citas`
--
ALTER TABLE `citas`
  ADD CONSTRAINT `citas_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE,
  ADD CONSTRAINT `citas_ibfk_2` FOREIGN KEY (`id_mascota`) REFERENCES `mascota` (`id_mascota`),
  ADD CONSTRAINT `citas_ibfk_3` FOREIGN KEY (`id_servicio`) REFERENCES `servicios` (`id_servicio`),
  ADD CONSTRAINT `citas_ibfk_4` FOREIGN KEY (`id_estado_cita`) REFERENCES `estado_cita` (`id_estado_cita`);

--
-- Filtros para la tabla `compras_proveedor`
--
ALTER TABLE `compras_proveedor`
  ADD CONSTRAINT `compras_proveedor_ibfk_1` FOREIGN KEY (`id_proveedor`) REFERENCES `proveedores` (`id_proveedor`),
  ADD CONSTRAINT `compras_proveedor_ibfk_2` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`);

--
-- Filtros para la tabla `detalle_carrito`
--
ALTER TABLE `detalle_carrito`
  ADD CONSTRAINT `detalle_carrito_ibfk_1` FOREIGN KEY (`id_carrito`) REFERENCES `carrito` (`id_carrito`) ON DELETE CASCADE,
  ADD CONSTRAINT `detalle_carrito_ibfk_2` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`);

--
-- Filtros para la tabla `detalle_pedido`
--
ALTER TABLE `detalle_pedido`
  ADD CONSTRAINT `detalle_pedido_ibfk_1` FOREIGN KEY (`id_pedido`) REFERENCES `pedido` (`id_pedido`) ON DELETE CASCADE,
  ADD CONSTRAINT `detalle_pedido_ibfk_2` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`);

--
-- Filtros para la tabla `mascota`
--
ALTER TABLE `mascota`
  ADD CONSTRAINT `fk_sexo_mascota` FOREIGN KEY (`id_sexoMascota`) REFERENCES `sexo_mascotas` (`id_sexoMascota`),
  ADD CONSTRAINT `mascota_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE,
  ADD CONSTRAINT `mascota_ibfk_2` FOREIGN KEY (`id_especie`) REFERENCES `especie` (`id_especie`),
  ADD CONSTRAINT `mascota_ibfk_3` FOREIGN KEY (`id_raza`) REFERENCES `raza` (`id_raza`);

--
-- Filtros para la tabla `pagos`
--
ALTER TABLE `pagos`
  ADD CONSTRAINT `pagos_ibfk_1` FOREIGN KEY (`id_pedido`) REFERENCES `pedido` (`id_pedido`) ON DELETE CASCADE,
  ADD CONSTRAINT `pagos_ibfk_2` FOREIGN KEY (`id_metodo`) REFERENCES `metodos_catalogo` (`id_metodo`),
  ADD CONSTRAINT `pagos_ibfk_3` FOREIGN KEY (`id_estado_pago`) REFERENCES `estado_pago` (`id_estado_pago`);

--
-- Filtros para la tabla `pedido`
--
ALTER TABLE `pedido`
  ADD CONSTRAINT `pedido_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE,
  ADD CONSTRAINT `pedido_ibfk_2` FOREIGN KEY (`id_estado_pedido`) REFERENCES `estado_pedido` (`id_estado_pedido`);

--
-- Filtros para la tabla `productos`
--
ALTER TABLE `productos`
  ADD CONSTRAINT `productos_ibfk_1` FOREIGN KEY (`id_categoria`) REFERENCES `categorias_producto` (`id_categoria`),
  ADD CONSTRAINT `productos_ibfk_2` FOREIGN KEY (`id_proveedor`) REFERENCES `proveedores` (`id_proveedor`),
  ADD CONSTRAINT `productos_ibfk_3` FOREIGN KEY (`id_estado_producto`) REFERENCES `estados_producto` (`id_estado_producto`);

--
-- Filtros para la tabla `producto_especie`
--
ALTER TABLE `producto_especie`
  ADD CONSTRAINT `fk_especie` FOREIGN KEY (`id_especie`) REFERENCES `especie` (`id_especie`),
  ADD CONSTRAINT `fk_producto` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`),
  ADD CONSTRAINT `fk_producto_especie_producto` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`);

--
-- Filtros para la tabla `producto_promocion`
--
ALTER TABLE `producto_promocion`
  ADD CONSTRAINT `producto_promocion_ibfk_1` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`),
  ADD CONSTRAINT `producto_promocion_ibfk_2` FOREIGN KEY (`id_promo`) REFERENCES `promociones` (`id_promo`);

--
-- Filtros para la tabla `promociones`
--
ALTER TABLE `promociones`
  ADD CONSTRAINT `promociones_ibfk_1` FOREIGN KEY (`id_estado_promocion`) REFERENCES `estado_promocion` (`id_estado_promocion`);

--
-- Filtros para la tabla `raza`
--
ALTER TABLE `raza`
  ADD CONSTRAINT `raza_ibfk_1` FOREIGN KEY (`id_especie`) REFERENCES `especie` (`id_especie`);

--
-- Filtros para la tabla `recuperar_clave`
--
ALTER TABLE `recuperar_clave`
  ADD CONSTRAINT `recuperar_clave_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE;

--
-- Filtros para la tabla `reseñas_productos`
--
ALTER TABLE `reseñas_productos`
  ADD CONSTRAINT `reseñas_productos_ibfk_1` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`),
  ADD CONSTRAINT `reseñas_productos_ibfk_2` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`);

--
-- Filtros para la tabla `servicios`
--
ALTER TABLE `servicios`
  ADD CONSTRAINT `servicios_ibfk_1` FOREIGN KEY (`id_estado_servicio`) REFERENCES `estado_servicio` (`id_estado_servicio`),
  ADD CONSTRAINT `servicios_ibfk_2` FOREIGN KEY (`id_categoria_servicio`) REFERENCES `categoria_servicio` (`id_categoria_servicio`);

--
-- Filtros para la tabla `usuario`
--
ALTER TABLE `usuario`
  ADD CONSTRAINT `usuario_ibfk_1` FOREIGN KEY (`id_tipo_id`) REFERENCES `tipo_identificacion` (`id_tipo_id`),
  ADD CONSTRAINT `usuario_ibfk_2` FOREIGN KEY (`id_rol`) REFERENCES `rol` (`id_rol`),
  ADD CONSTRAINT `usuario_ibfk_3` FOREIGN KEY (`id_localidad`) REFERENCES `localidad` (`id_localidad`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
