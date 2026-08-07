<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Manejar preflight OPTIONS request (CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'db.php';

try {
    if (!isset($pdo)) {
        throw new Exception("Variable de conexión \$pdo no definida en db.php");
    }

    // Detectar si la petición viene por 'action' (desde el JS) o 'vista'
    $action = $_GET['action'] ?? $_POST['action'] ?? '';
    $vista  = $_GET['vista'] ?? 'admin';

    // =========================================================
    // 1. LISTAR SERVICIOS (Para el JS: apiFetch('listar_servicios'))
    // =========================================================
    if ($action === 'listar_servicios') {
        $stmt = $pdo->query("
            SELECT s.*, 
                   c.nombre AS categoria, 
                   e.nombre AS estado
            FROM servicios s
            LEFT JOIN categoria_servicio c ON s.id_categoria_servicio = c.id_categoria_servicio
            LEFT JOIN estado_servicio e ON s.id_estado_servicio = e.id_estado_servicio
            ORDER BY s.id_servicio DESC
        ");
        echo json_encode([
            'success' => true, // ✅ CAMBIO CLAVE: de 'ok' a 'success'
            'data'    => $stmt->fetchAll(PDO::FETCH_ASSOC)
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // =========================================================
    // 2. LISTAR CATEGORÍAS DE SERVICIO (Para el JS)
    // =========================================================
    if ($action === 'listar_categorias_servicio') {
        $stmt = $pdo->query("SELECT id_categoria_servicio, nombre FROM categoria_servicio ORDER BY id_categoria_servicio ASC");
        echo json_encode([
            'success' => true,
            'data'    => $stmt->fetchAll(PDO::FETCH_ASSOC)
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

     // =========================================================
    // 3. VISTA TIENDA (Si se llama directamente con ?vista=tienda)
    // =========================================================
    if ($vista === 'tienda' || $action === 'tienda_servicios') {
        $stmt = $pdo->query("
            SELECT 
                s.id_servicio,
                s.nombre,
                s.descripcion,
                s.duracion,
                s.imagen_url,
                s.id_categoria_servicio,
                c.nombre AS categoria
                /* ✅ ELIMINADO: s.precio ya no se envía a la tienda */
            FROM servicios s
            INNER JOIN categoria_servicio c 
                ON c.id_categoria_servicio = s.id_categoria_servicio
            WHERE s.id_estado_servicio = 1
            ORDER BY s.id_servicio ASC
        ");
        echo json_encode([
            'success' => true,
            'data'    => $stmt->fetchAll(PDO::FETCH_ASSOC)
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // =========================================================
    // 4. GUARDAR SERVICIO (INSERT / UPDATE)
    // =========================================================
    if ($action === 'guardar_servicio') {
        $id_servicio = $_POST['id_servicio'] ?? null;
        $nombre = trim($_POST['nombre'] ?? '');
        $id_categoria_servicio = $_POST['id_categoria_servicio'] ?? null;
        $precio = $_POST['precio'] ?? 0;
        $duracion = $_POST['duracion'] ?? 0;
        $id_estado_servicio = $_POST['id_estado_servicio'] ?? 1;
        $descripcion = trim($_POST['descripcion'] ?? '');

        if ($id_servicio) {
            $stmt = $pdo->prepare("UPDATE servicios SET nombre=?, id_categoria_servicio=?, precio=?, duracion=?, id_estado_servicio=?, descripcion=? WHERE id_servicio=?");
            $stmt->execute([$nombre, $id_categoria_servicio, $precio, $duracion, $id_estado_servicio, $descripcion, $id_servicio]);
            echo json_encode(['success' => true, 'message' => 'Servicio actualizado correctamente']);
        } else {
            $stmt = $pdo->prepare("INSERT INTO servicios (nombre, id_categoria_servicio, precio, duracion, id_estado_servicio, descripcion) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([$nombre, $id_categoria_servicio, $precio, $duracion, $id_estado_servicio, $descripcion]);
            echo json_encode(['success' => true, 'message' => 'Servicio guardado correctamente']);
        }
        exit;
    }
    // =========================================================
    // 5. CAMBIAR ESTADO DEL SERVICIO (ACTIVAR / INACTIVAR RÁPIDO)
    // =========================================================
    if ($action === 'cambiar_estado_servicio') {
        $id_servicio = $_POST['id_servicio'] ?? null;
        $nuevo_estado = $_POST['id_estado_servicio'] ?? 1; // 1 = activo, 2 = inactivo
        
        if (!$id_servicio) throw new Exception("ID de servicio no proporcionado");
        
        $stmt = $pdo->prepare("UPDATE servicios SET id_estado_servicio = ? WHERE id_servicio = ?");
        $stmt->execute([$nuevo_estado, $id_servicio]);
        
        $mensaje = $nuevo_estado == 1 ? 'Servicio activado correctamente' : 'Servicio inactivado correctamente';
        echo json_encode(['success' => true, 'message' => $mensaje]);
        exit;
    }
    // =========================================================
    // 6. ELIMINAR SERVICIO
    // =========================================================
    if ($action === 'eliminar_servicio') {
        $id_servicio = $_POST['id_servicio'] ?? $_GET['id_servicio'] ?? null;
        if (!$id_servicio) throw new Exception("ID de servicio no proporcionado");
        
        $stmt = $pdo->prepare("DELETE FROM servicios WHERE id_servicio = ?");
        $stmt->execute([$id_servicio]);
        echo json_encode(['success' => true, 'message' => 'Servicio eliminado correctamente']);
        exit;
    }

    throw new Exception("Acción o vista no reconocida: " . ($action ?: $vista));

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false, // ✅ CAMBIO CLAVE: de 'ok' a 'success'
        'error'   => $e->getMessage()
    ]);
}
?>