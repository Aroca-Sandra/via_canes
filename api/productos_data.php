<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'db.php';

try {
    if (!isset($pdo)) {
        throw new Exception("Variable de conexión \$pdo no definida.");
    }

    // Captura y sanitización de parámetros de control
    $vista = $_GET['vista'] ?? 'admin';
    $especie = $_GET['especie'] ?? ''; // Puede ser el ID o nombre según tu BD
    
    // Parámetros de paginación con valores por defecto
    $pagina = max(1, (int)($_GET['pagina'] ?? 1));
    $limite = max(1, min(50, (int)($_GET['limite'] ?? 12))); // Máximo 50 productos por página
    $offset = ($pagina - 1) * $limite;

    // Enrutador según la vista solicitada
    if ($vista === 'tienda') {
        obtenerVistaTienda($pdo, $especie, $limite, $offset, $pagina);
    } else {
        obtenerVistaAdmin($pdo); // El admin usualmente lista todo o maneja otra lógica
    }

} catch (Exception $e) {
    enviarRespuestaError($e->getMessage());
}

/* Maneja la lógica de datos para la tienda pública con paginación */
function obtenerVistaTienda(PDO $pdo, string $especie, int $limite, int $offset, int $pagina): void {
    $params = [];
    
    // 1. Base de las consultas
    $whereClause = " WHERE p.id_estado_producto = 1";
    
    if (!empty($especie)) {
        $whereClause .= " AND pe.id_especie = :especie";
        $params[':especie'] = $especie;
    }

    // 2. Contar el TOTAL de productos bajo estos filtros (para saber cuántas páginas hay)
    $sqlCount = "SELECT COUNT(DISTINCT p.id_producto) 
                 FROM productos p 
                 LEFT JOIN producto_especie pe ON pe.id_producto = p.id_producto 
                 $whereClause";
                 
    $stmtCount = $pdo->prepare($sqlCount);
    $stmtCount->execute($params);
    $totalProductos = (int)$stmtCount->fetchColumn();
    $totalPaginas = ceil($totalProductos / $limite);

    // 3. Obtener los productos de la página actual
    $sqlProductos = "SELECT p.id_producto, p.nombre, p.descripcion, p.precio_venta, 
                            p.stock, p.imagen_url, p.id_categoria, c.nombre AS categoria, 
                            GROUP_CONCAT(e.nombre SEPARATOR ', ') AS especies 
                     FROM productos p 
                     INNER JOIN categorias_producto c ON c.id_categoria = p.id_categoria 
                     LEFT JOIN producto_especie pe ON pe.id_producto = p.id_producto 
                     LEFT JOIN especie e ON e.id_especie = pe.id_especie 
                     $whereClause 
                     GROUP BY p.id_producto 
                     ORDER BY p.id_producto DESC 
                     LIMIT :limite OFFSET :offset";

    $stmt = $pdo->prepare($sqlProductos);
    
    // Enlazar parámetros de filtros
    foreach ($params as $key => $val) {
        $stmt->bindValue($key, $val);
    }
    // Enlazar paginación de forma explícita como enteros (necesario para LIMIT/OFFSET en PDO)
    $stmt->bindValue(':limite', $limite, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    
    $stmt->execute();
    $productos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 4. Respuesta estructurada con metadatos de paginación
    enviarRespuestaExito([
        'paginacion' => [
            'total_items'    => $totalProductos,
            'total_paginas'  => $totalPaginas,
            'pagina_actual'  => $pagina,
            'por_pagina'     => $limite,
            'tiene_anterior' => $pagina > 1,
            'tiene_siguiente'=> $pagina < $totalPaginas
        ],
        'data' => $productos
    ]);
}

/* Maneja la lógica de datos para el panel de administración */
function obtenerVistaAdmin(PDO $pdo): void {
    $data = [];

    $data['productos'] = $pdo->query("
        SELECT p.*, c.nombre AS nombre_categoria, pr.nombre_empresa AS nombre_proveedor, e.nombre AS nombre_estado 
        FROM productos p 
        LEFT JOIN categorias_producto c ON p.id_categoria = c.id_categoria 
        LEFT JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor 
        LEFT JOIN estados_producto e ON p.id_estado_producto = e.id_estado_producto 
        ORDER BY p.id_producto DESC
    ")->fetchAll(PDO::FETCH_ASSOC);

    $data['categorias'] = $pdo->query("SELECT id_categoria, nombre FROM categorias_producto ORDER BY id_categoria")->fetchAll(PDO::FETCH_ASSOC);
    $data['proveedores'] = $pdo->query("SELECT id_proveedor, nombre_empresa FROM proveedores ORDER BY id_proveedor")->fetchAll(PDO::FETCH_ASSOC);
    $data['estados']     = $pdo->query("SELECT id_estado_producto, nombre FROM estados_producto ORDER BY id_estado_producto")->fetchAll(PDO::FETCH_ASSOC);

    enviarRespuestaExito($data);
}

/* Helpers para estandarizar las respuestas JSON */
function enviarRespuestaExito(array $datos): void {
    $respuesta = array_merge(['ok' => true], $datos);
    echo json_encode($respuesta, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

function enviarRespuestaError(string $mensaje, int $codigoHttp = 500): void {
    http_response_code($codigoHttp);
    echo json_encode([
        'ok' => false,
        'error' => "Error al cargar datos de productos: {$mensaje}"
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}
