<?php
// ✅ Desactivar warnings/notices que rompen el JSON
error_reporting(E_ERROR | E_PARSE);
ini_set('display_errors', 0);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'db.php';

try {
    if (!isset($pdo)) {
        throw new Exception("Variable de conexión \$pdo no definida.");
    }

    // Captura de parámetros
    $vista = $_GET['vista'] ?? 'admin';
    $tipo  = $_GET['tipo']  ?? '';
    $valor = $_GET['valor'] ?? '';

    // Parámetros de paginación
    $pagina = max(1, (int)($_GET['pagina'] ?? 1));
    $limite = max(1, min(50, (int)($_GET['limite'] ?? 12)));
    $offset = ($pagina - 1) * $limite;

    // Enrutamiento
    if ($vista === 'tienda') {
        obtenerVistaTienda($pdo, $tipo, $valor, $limite, $offset, $pagina);
    } elseif ($vista === 'servicios') {
        obtenerServiciosTienda($pdo);
    } else {
        obtenerVistaAdmin($pdo);
    }

} catch (Exception $e) {
    error_log("Error API: " . $e->getMessage());
    enviarRespuestaError($e->getMessage());
}

// ==========================================
// 1. VISTA TIENDA (PRODUCTOS) - CORREGIDO
// ==========================================
function obtenerVistaTienda(PDO $pdo, string $tipo, string $valor, int $limite, int $offset, int $pagina): void {
    $params = [];

    // Base de la consulta
    $whereClause = " WHERE p.id_estado_producto = 1";
    
    // Siempre necesitamos la categoría
    $joins = "INNER JOIN categorias_producto c ON c.id_categoria = p.id_categoria ";

    // Aplicar filtros
    if (!empty($tipo) && !empty($valor)) {
        if ($tipo === 'especie') {
            // Mapeo de valores URL a nombres en BD
            $especieMap = [
                'Perros'       => 'Perro',
                'Gatos'        => 'Gato',
                'Otra Especie' => 'Otra especie'
            ];
            $especieNombre = $especieMap[$valor] ?? $valor;

            // INNER JOIN para FILTRAR
            $joins .= "INNER JOIN producto_especie pe ON pe.id_producto = p.id_producto ";
            $joins .= "INNER JOIN especie e ON e.id_especie = pe.id_especie ";

            $whereClause .= " AND e.nombre = :especie_nombre";
            $params[':especie_nombre'] = $especieNombre;

        } elseif ($tipo === 'categoria') {
            // Mapeo de valores URL a IDs de categorías
            $categoriaMap = [
                'Higiene' => 3,
                'Salud'   => 5
            ];

            if (isset($categoriaMap[$valor])) {
                $whereClause .= " AND p.id_categoria = :categoria_id";
                $params[':categoria_id'] = $categoriaMap[$valor];
            }

            // LEFT JOIN para traer todas las especies del producto
            $joins .= "LEFT JOIN producto_especie pe ON pe.id_producto = p.id_producto ";
            $joins .= "LEFT JOIN especie e ON e.id_especie = pe.id_especie ";
        }
    } else {
        // Sin filtros: LEFT JOIN para mostrar todas las especies del producto
        $joins .= "LEFT JOIN producto_especie pe ON pe.id_producto = p.id_producto ";
        $joins .= "LEFT JOIN especie e ON e.id_especie = pe.id_especie ";
    }

    // ✅ CONTAR TOTAL DE PRODUCTOS
    try {
        $sqlCount = "SELECT COUNT(DISTINCT p.id_producto) 
                     FROM productos p 
                     $joins
                     $whereClause";

        $stmtCount = $pdo->prepare($sqlCount);
        foreach ($params as $key => $val) {
            $stmtCount->bindValue($key, $val);
        }
        $stmtCount->execute();
        $totalProductos = (int)$stmtCount->fetchColumn();
        $totalPaginas   = ($limite > 0) ? ceil($totalProductos / $limite) : 1;
    } catch (PDOException $e) {
        error_log("Error en COUNT: " . $e->getMessage());
        throw new Exception("Error al contar productos: " . $e->getMessage());
    }

    // ✅ OBTENER PRODUCTOS CON PAGINACIÓN (CORREGIDO GROUP BY)
    try {
        $sqlProductos = "SELECT p.id_producto, p.nombre, p.descripcion, p.precio_venta, 
                                p.stock, p.imagen_url, p.id_categoria, c.nombre AS categoria, 
                                GROUP_CONCAT(DISTINCT e.nombre SEPARATOR ', ') AS especies 
                         FROM productos p 
                         $joins
                         $whereClause 
                         GROUP BY p.id_producto, p.nombre, p.descripcion, p.precio_venta, 
                                  p.stock, p.imagen_url, p.id_categoria, c.nombre
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
    } catch (PDOException $e) {
        error_log("Error en SELECT productos: " . $e->getMessage());
        error_log("SQL: " . $sqlProductos);
        throw new Exception("Error al obtener productos: " . $e->getMessage());
    }

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
}

// ==========================================
// 2. VISTA TIENDA (SERVICIOS)
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
        $servicios = $stmt->fetchAll(PDO::FETCH_ASSOC);
        enviarRespuestaExito(['data' => $servicios]);
    } catch (PDOException $e) {
        error_log("Error en servicios: " . $e->getMessage());
        throw new Exception("Error al obtener servicios: " . $e->getMessage());
    }
}

// ==========================================
// 3. VISTA ADMIN
// ==========================================
function obtenerVistaAdmin(PDO $pdo): void {
    $data = [];

    try {
        $data['productos'] = $pdo->query("
            SELECT p.*, c.nombre AS nombre_categoria, pr.nombre_empresa AS nombre_proveedor, e.nombre AS nombre_estado 
            FROM productos p 
            LEFT JOIN categorias_producto c ON p.id_categoria = c.id_categoria 
            LEFT JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor 
            LEFT JOIN estados_producto e ON p.id_estado_producto = e.id_estado_producto 
            ORDER BY p.id_producto DESC
        ")->fetchAll(PDO::FETCH_ASSOC);

        $data['categorias']  = $pdo->query("SELECT id_categoria, nombre FROM categorias_producto ORDER BY id_categoria")->fetchAll(PDO::FETCH_ASSOC);
        $data['proveedores'] = $pdo->query("SELECT id_proveedor, nombre_empresa FROM proveedores ORDER BY id_proveedor")->fetchAll(PDO::FETCH_ASSOC);
        $data['estados']     = $pdo->query("SELECT id_estado_producto, nombre FROM estados_producto ORDER BY id_estado_producto")->fetchAll(PDO::FETCH_ASSOC);

        enviarRespuestaExito($data);
    } catch (PDOException $e) {
        error_log("Error en admin: " . $e->getMessage());
        throw new Exception("Error al obtener datos de admin: " . $e->getMessage());
    }
}

// ==========================================
// 4. HELPERS DE RESPUESTA JSON
// ==========================================
function enviarRespuestaExito(array $datos): void {
    $respuesta = array_merge(['ok' => true], $datos);
    echo json_encode($respuesta, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

function enviarRespuestaError(string $mensaje, int $codigoHttp = 500): void {
    http_response_code($codigoHttp);
    echo json_encode([
        'ok'    => false,
        'error' => "Error al cargar datos: {$mensaje}"
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}