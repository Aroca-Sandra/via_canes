<?php
// productos_data.php - Producción
// 1. CONFIGURACIÓN DE ERRORES EN PRODUCCIÓN
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

// 2. CABECERAS HTTP
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *'); 
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'db.php';

try {
    if (!isset($pdo) || !($pdo instanceof PDO)) {
        throw new Exception("Error interno: Conexión a la base de datos no configurada.");
    }

    $vista = $_GET['vista'] ?? 'admin';
    
    // Captura flexible de especie
    $especieDirecta = $_GET['especie'] ?? null;
    $tipo  = trim($_GET['tipo'] ?? ($especieDirecta !== null ? 'especie' : ''));
    $valor = trim($_GET['valor'] ?? $especieDirecta ?? '');

    $pagina = max(1, (int)($_GET['pagina'] ?? 1));
    $limite = max(1, min(100, (int)($_GET['limite'] ?? 12)));
    $offset = ($pagina - 1) * $limite;

    switch ($vista) {
        case 'tienda':
            obtenerVistaTienda($pdo, $tipo, $valor, $limite, $offset, $pagina);
            break;
        case 'servicios':
            obtenerServiciosTienda($pdo);
            break;
        case 'citas':
            obtenerCitas($pdo);
            break;
        case 'promociones':
            listarPromocionesActivas($pdo);
            break;
        case 'admin':
        default:
            obtenerVistaAdmin($pdo);
            break;
    }

} catch (Exception $e) {
    error_log("Error API (productos_data.php): " . $e->getMessage());
    enviarRespuestaError("Ocurrió un error al procesar la solicitud.", 500);
}

// ==========================================
// 1. VISTA TIENDA - FILTROS DINÁMICOS
// ==========================================
function obtenerVistaTienda(PDO $pdo, string $tipo, string $valor, int $limite, int $offset, int $pagina): void {
    $params = [];
    
    $select = "SELECT p.id_producto, p.nombre, p.descripcion, p.precio_venta, 
                      p.stock, p.imagen_url, p.id_categoria, c.nombre AS categoria, 
                      GROUP_CONCAT(DISTINCT e.nombre ORDER BY e.nombre SEPARATOR ', ') AS especies,
                      GROUP_CONCAT(DISTINCT pe.id_especie SEPARATOR ',') AS ids_especies";
    
    $from   = "FROM productos p";
    $joins  = "INNER JOIN categorias_producto c ON c.id_categoria = p.id_categoria ";
    $joins .= "LEFT JOIN producto_especie pe ON pe.id_producto = p.id_producto ";
    $joins .= "LEFT JOIN especie e ON e.id_especie = pe.id_especie ";

    $whereClause = "WHERE p.id_estado_producto = 1";

    // --- FILTRO POR CATEGORÍA ---
    if (!empty($tipo) && $tipo === 'categoria' && !empty($valor)) {
        $categoriaMap = [
            'alimentos'                 => 1,
            'alimentación y nutrición' => 1,
            'accesorios'                => 2,
            'accesorios y juguetes'     => 2,
            'higiene'                   => 3, 
            'higiene y cuidado estético'=> 3,
            'salud'                     => 5,
            'cuidado y salud'           => 5
        ];

        $valorMinuscula = mb_strtolower($valor, 'UTF-8');

        if (isset($categoriaMap[$valorMinuscula])) {
            $whereClause .= " AND p.id_categoria = :cat_id";
            $params[':cat_id'] = $categoriaMap[$valorMinuscula];
        } elseif (is_numeric($valor)) {
            $whereClause .= " AND p.id_categoria = :cat_val";
            $params[':cat_val'] = (int)$valor;
        } else {
            $whereClause .= " AND c.nombre LIKE :cat_name";
            $params[':cat_name'] = '%' . $valor . '%';
        }
        
    } 
    // --- FILTRO POR ESPECIE (CORREGIDO Y ROBUSTO) ---
    elseif (!empty($tipo) && $tipo === 'especie' && !empty($valor)) {
        if (is_numeric($valor)) {
            $whereClause .= " AND pe.id_especie = :esp_id";
            $params[':esp_id'] = (int)$valor;
        } else {
            $valorMinuscula = mb_strtolower(trim($valor), 'UTF-8');

            if (in_array($valorMinuscula, ['perros', 'perro'])) {
                $whereClause .= " AND pe.id_especie = 1";
            } elseif (in_array($valorMinuscula, ['gatos', 'gato'])) {
                $whereClause .= " AND pe.id_especie = 2";
            } elseif (in_array($valorMinuscula, ['otra especie', 'otras especies', 'otra', 'otros'])) {
                // ✅ CORRECCIÓN: Busca explícitamente la especie 3, o productos que NO sean perro(1) ni gato(2)
                $whereClause .= " AND (pe.id_especie = 3 OR p.id_producto NOT IN (
                    SELECT id_producto FROM producto_especie WHERE id_especie IN (1, 2)
                ))";
            } else {
                $whereClause .= " AND e.nombre LIKE :esp_name";
                $params[':esp_name'] = '%' . $valor . '%';
            }
        }
    }

    try {
        // Conteo para paginación
        $sqlCount = "SELECT COUNT(DISTINCT p.id_producto) as total $from $joins $whereClause";
        $stmtCount = $pdo->prepare($sqlCount);
        foreach ($params as $key => $val) {
            $stmtCount->bindValue($key, $val);
        }
        $stmtCount->execute();
        $totalProductos = (int)$stmtCount->fetchColumn();
        $totalPaginas   = ($limite > 0) ? ceil($totalProductos / $limite) : 1;

        // Consulta de productos
        $sqlProductos = "$select $from $joins $whereClause 
                         GROUP BY p.id_producto
                         ORDER BY p.id_producto DESC 
                         LIMIT :limite OFFSET :offset";

        $stmt = $pdo->prepare($sqlProductos);
        foreach ($params as $key => $val) {
            $stmt->bindValue($key, $val);
        }
        $stmt->bindValue(':limite', $limite, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);

        $stmt->execute();
        $productos = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Formateo de URLs de imágenes y especies vacías
        foreach ($productos as &$prod) {
            if (empty($prod['imagen_url']) || strtolower($prod['imagen_url']) === 'null') {
                $prod['imagen_url'] = 'img/default-product.png';
            } elseif (!preg_match('/^https?:\/\//', $prod['imagen_url'])) {
                if (strpos($prod['imagen_url'], '../') === 0) {
                    $prod['imagen_url'] = substr($prod['imagen_url'], 3);
                }
            }
            if (empty($prod['especies'])) {
                $prod['especies'] = 'Sin especie asignada';
            }
        }
        unset($prod);

        enviarRespuestaExito([
            'paginacion' => [
                'total_items'     => $totalProductos,
                'total_paginas'   => $totalPaginas,
                'pagina_actual'   => $pagina,
                'por_pagina'      => $limite,
                'tiene_anterior'  => $pagina > 1,
                'tiene_siguiente' => $pagina < $totalPaginas
            ],
            'data' => $productos
        ]);

    } catch (PDOException $e) {
        error_log("Error SQL en vista tienda: " . $e->getMessage());
        enviarRespuestaError("No se pudieron consultar los productos.", 500);
    }
}

// ==========================================
// 2. VISTA SERVICIOS
// ==========================================
function obtenerServiciosTienda(PDO $pdo): void {
    try {
        $stmt = $pdo->query("
            SELECT s.id_servicio, s.nombre, s.descripcion, s.precio, s.duracion,
                   cs.nombre AS categoria
            FROM servicios s
            LEFT JOIN categoria_servicio cs ON s.id_categoria_servicio = cs.id_categoria_servicio
            WHERE s.id_estado_servicio = 1
            ORDER BY s.nombre ASC
        ");
        enviarRespuestaExito([
            'paginacion' => null,
            'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)
        ]);
    } catch (PDOException $e) {
        error_log("Error SQL en servicios: " . $e->getMessage());
        enviarRespuestaError("No se pudieron consultar los servicios.", 500);
    }
}

// ==========================================
// 3. VISTA CITAS
// ==========================================
function obtenerCitas(PDO $pdo): void {
    try {
        $sql = "SELECT c.id_cita, c.fecha_hora, c.estado, 
                       cl.nombre AS cliente, 
                       s.nombre AS servicio
                FROM citas c
                LEFT JOIN clientes cl ON c.id_cliente = cl.id_cliente
                LEFT JOIN servicios s ON c.id_servicio = s.id_servicio
                ORDER BY c.fecha_hora ASC
                LIMIT 20";
        
        $stmt = $pdo->query($sql);
        enviarRespuestaExito(['data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    } catch (PDOException $e) {
        error_log("Info Citas: " . $e->getMessage());
        enviarRespuestaExito(['data' => []]);
    }
}

// ==========================================
// 4. VISTA PROMOCIONES
// ==========================================
function listarPromocionesActivas(PDO $pdo): void {
    try {
        $sql = "
            SELECT 
                pr.id_producto, pr.nombre, pr.descripcion, pr.precio_venta,
                pr.stock, pr.imagen_url,
                p.valor AS descuento_valor, p.tipo_descuento,
                p.fecha_inicio, p.fecha_fin
            FROM promociones p
            INNER JOIN producto_promocion pp ON p.id_promo = pp.id_promo
            INNER JOIN productos pr ON pp.id_producto = pr.id_producto
            WHERE p.id_estado_promocion = 1 
              AND (p.fecha_fin IS NULL OR p.fecha_fin >= CURDATE())
              AND (p.fecha_inicio IS NULL OR p.fecha_inicio <= CURDATE())
            ORDER BY p.fecha_creacion DESC, pr.nombre ASC
        ";
        
        $stmt = $pdo->query($sql);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($data as &$item) {
            if (empty($item['imagen_url']) || strtolower($item['imagen_url']) === 'null') {
                $item['imagen_url'] = 'img/default-product.png';
            } elseif (!preg_match('/^https?:\/\//', $item['imagen_url'])) {
                if (strpos($item['imagen_url'], '../') === 0) {
                    $item['imagen_url'] = substr($item['imagen_url'], 3);
                }
            }
        }
        unset($item);
        
        enviarRespuestaExito(['data' => $data]);
    } catch (PDOException $e) {
        error_log("Error Promociones: " . $e->getMessage());
        enviarRespuestaExito(['data' => []]);
    }
}

// ==========================================
// 5. VISTA ADMIN
// ==========================================
function obtenerVistaAdmin(PDO $pdo): void {
    try {
        $sqlProductos = "
            SELECT 
                p.id_producto, p.nombre, p.descripcion, p.precio_venta,
                p.costo_compra, p.stock, p.imagen_url, p.codigo_barras,
                p.id_proveedor, p.id_estado_producto, p.id_categoria,
                c.nombre AS categoria,
                GROUP_CONCAT(DISTINCT e.nombre ORDER BY e.nombre SEPARATOR ', ') AS especies,
                GROUP_CONCAT(DISTINCT pe.id_especie SEPARATOR ',') AS ids_especies
            FROM productos p
            INNER JOIN categorias_producto c ON c.id_categoria = p.id_categoria
            LEFT JOIN producto_especie pe ON pe.id_producto = p.id_producto
            LEFT JOIN especie e ON e.id_especie = pe.id_especie
            WHERE p.id_estado_producto = 1
            GROUP BY p.id_producto
            ORDER BY p.id_producto DESC
        ";
        $data = [];
        $stmtProd = $pdo->query($sqlProductos);
        $data['productos'] = $stmtProd->fetchAll(PDO::FETCH_ASSOC);
        $data['categorias'] = $pdo->query("SELECT id_categoria, nombre FROM categorias_producto ORDER BY nombre ASC")->fetchAll(PDO::FETCH_ASSOC);
        $data['proveedores'] = $pdo->query("SELECT id_proveedor, nombre_empresa FROM proveedores ORDER BY nombre_empresa ASC")->fetchAll(PDO::FETCH_ASSOC);
        $data['estados'] = $pdo->query("SELECT id_estado_producto, nombre FROM estados_producto ORDER BY id_estado_producto")->fetchAll(PDO::FETCH_ASSOC);
        $data['especies'] = $pdo->query("SELECT id_especie, nombre FROM especie ORDER BY nombre ASC")->fetchAll(PDO::FETCH_ASSOC);
        
        enviarRespuestaExito($data);
    } catch (PDOException $e) {
        error_log("Error Vista Admin: " . $e->getMessage());
        enviarRespuestaError("No se pudieron recuperar los datos de administración.", 500);
    }
}

// ==========================================
// HELPERS
// ==========================================
function enviarRespuestaExito(array $datos): void {
    $respuesta = array_merge(['ok' => true, 'success' => true], $datos);
    echo json_encode($respuesta, JSON_UNESCAPED_UNICODE);
    exit;
}

function enviarRespuestaError(string $mensaje, int $codigoHttp = 500): void {
    http_response_code($codigoHttp);
    echo json_encode([
        'ok'      => false,
        'success' => false,
        'error'   => $mensaje
    ], JSON_UNESCAPED_UNICODE);
    exit;
}