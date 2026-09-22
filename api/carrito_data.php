<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

session_start();

// 1. CONEXIÓN A LA BASE DE DATOS (Ajusta usuario y contraseña si es diferente)
try {
    $pdo = new PDO('mysql:host=127.0.0.1;dbname=via_canes;charset=utf8mb4', 'root', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Error de conexión a la BD']);
    exit;
}

$action = $_GET['action'] ?? '';
$user_id = $_SESSION['id_usuario'] ?? null; // Asumiendo que guardas el ID así en el login
$guest_token = $_COOKIE['guest_cart_token'] ?? null;

// Si no hay usuario ni token, creamos uno para el visitante
if (!$user_id && !$guest_token) {
    $guest_token = bin2hex(random_bytes(16));
    setcookie('guest_cart_token', $guest_token, time() + (30 * 24 * 60 * 60), '/');
}

$response = ['success' => false];

try {
    switch ($action) {
        case 'obtener':
            // Obtenemos o creamos el id_carrito
            $id_carrito = obtenerOCrearCarrito($pdo, $user_id, $guest_token);
            
            $stmt = $pdo->prepare("
                SELECT dc.id_detalle, dc.id_producto, dc.cantidad, dc.precio_unitario, dc.subtotal,
                       p.nombre, p.imagen_url, p.stock, p.id_estado_producto
                FROM detalle_carrito dc
                INNER JOIN productos p ON dc.id_producto = p.id_producto
                WHERE dc.id_carrito = :id_carrito
            ");
            $stmt->execute([':id_carrito' => $id_carrito]);
            
            $items = [];
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                // Validar que el producto siga disponible y haya stock
                $cantidadReal = min((int)$row['cantidad'], (int)$row['stock']);
                
                $items[] = [
                    'id_detalle'      => (int)$row['id_detalle'],
                    'id'              => (int)$row['id_producto'],
                    'nombre'          => $row['nombre'] ?? 'Producto',
                    'precio_unitario' => (float)$row['precio_unitario'],
                    'cantidad'        => $cantidadReal,
                    'subtotal'        => (float)$row['precio_unitario'] * $cantidadReal,
                    'imagen_url'      => $row['imagen_url'] ?? '',
                    'stock'           => (int)$row['stock']
                ];
            }
            
            $response = [
                'success' => true,
                'id_carrito' => $id_carrito,
                'items' => $items
            ];
            break;

        case 'agregar':
            $data = json_decode(file_get_contents('php://input'), true);
            $id_producto = (int)($data['id'] ?? 0);
            $cantidad = max(1, (int)($data['cantidad'] ?? 1));
            
            if ($id_producto <= 0) throw new Exception('ID de producto inválido');
            
            $id_carrito = obtenerOCrearCarrito($pdo, $user_id, $guest_token);
            
            // Verificar si ya existe en el detalle
            $stmt = $pdo->prepare("SELECT id_detalle, cantidad, precio_unitario FROM detalle_carrito WHERE id_carrito = :id_carrito AND id_producto = :id_producto");
            $stmt->execute([':id_carrito' => $id_carrito, ':id_producto' => $id_producto]);
            $existente = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($existente) {
                $nuevaCantidad = $existente['cantidad'] + $cantidad;
                $nuevoSubtotal = $nuevaCantidad * (float)$existente['precio_unitario'];
                
                $stmt = $pdo->prepare("UPDATE detalle_carrito SET cantidad = :cantidad, subtotal = :subtotal WHERE id_detalle = :id_detalle");
                $stmt->execute([
                    ':cantidad' => $nuevaCantidad,
                    ':subtotal' => $nuevoSubtotal,
                    ':id_detalle' => $existente['id_detalle']
                ]);
            } else {
                // Obtener precio y stock actual del producto
                $stmtProd = $pdo->prepare("SELECT precio_venta, stock FROM productos WHERE id_producto = :id_producto");
                $stmtProd->execute([':id_producto' => $id_producto]);
                $prod = $stmtProd->fetch(PDO::FETCH_ASSOC);
                
                if (!$prod) throw new Exception('Producto no encontrado');
                
                $precioUnitario = (float)$prod['precio_venta'];
                $subtotal = $cantidad * $precioUnitario;
                
                $stmt = $pdo->prepare("INSERT INTO detalle_carrito (id_carrito, id_producto, cantidad, precio_unitario, subtotal) VALUES (:id_carrito, :id_producto, :cantidad, :precio_unitario, :subtotal)");
                $stmt->execute([
                    ':id_carrito' => $id_carrito,
                    ':id_producto' => $id_producto,
                    ':cantidad' => $cantidad,
                    ':precio_unitario' => $precioUnitario,
                    ':subtotal' => $subtotal
                ]);
            }
            
            $response = ['success' => true, 'message' => 'Producto agregado'];
            break;

        case 'actualizar':
            $data = json_decode(file_get_contents('php://input'), true);
            $id_detalle = (int)($data['id_detalle'] ?? 0);
            $cantidad = max(1, (int)($data['cantidad'] ?? 1));
            
            // Recalcular subtotal basado en el precio unitario ya guardado
            $stmt = $pdo->prepare("
                UPDATE detalle_carrito dc
                INNER JOIN carrito c ON dc.id_carrito = c.id_carrito
                SET dc.cantidad = :cantidad, 
                    dc.subtotal = dc.cantidad * dc.precio_unitario
                WHERE dc.id_detalle = :id_detalle 
                  AND (c.id_usuario = :uid OR c.guest_token = :gtok)
            ");
            $stmt->execute([
                ':cantidad' => $cantidad,
                ':id_detalle' => $id_detalle,
                ':uid' => $user_id,
                ':gtok' => $guest_token
            ]);
            
            $response = ['success' => true, 'message' => 'Cantidad actualizada'];
            break;

        case 'eliminar':
            $data = json_decode(file_get_contents('php://input'), true);
            $id_detalle = (int)($data['id_detalle'] ?? 0);
            
            $stmt = $pdo->prepare("
                DELETE dc FROM detalle_carrito dc
                INNER JOIN carrito c ON dc.id_carrito = c.id_carrito
                WHERE dc.id_detalle = :id_detalle 
                  AND (c.id_usuario = :uid OR c.guest_token = :gtok)
            ");
            $stmt->execute([':id_detalle' => $id_detalle, ':uid' => $user_id, ':gtok' => $guest_token]);
            
            $response = ['success' => true, 'message' => 'Producto eliminado'];
            break;

        case 'vaciar':
            $id_carrito = obtenerOCrearCarrito($pdo, $user_id, $guest_token);
            $stmt = $pdo->prepare("DELETE FROM detalle_carrito WHERE id_carrito = :id_carrito");
            $stmt->execute([':id_carrito' => $id_carrito]);
            
            $response = ['success' => true, 'message' => 'Carrito vaciado'];
            break;

        default:
            throw new Exception('Acción no válida');
    }
} catch (Exception $e) {
    $response = ['success' => false, 'message' => $e->getMessage()];
    http_response_code(400);
}

echo json_encode($response, JSON_UNESCAPED_UNICODE);

// ==================== FUNCIÓN AUXILIAR ====================
function obtenerOCrearCarrito($pdo, $user_id, $guest_token) {
    if ($user_id) {
        $stmt = $pdo->prepare("SELECT id_carrito FROM carrito WHERE id_usuario = :uid LIMIT 1");
        $stmt->execute([':uid' => $user_id]);
        $carrito = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($carrito) return $carrito['id_carrito'];
        
        // Crear nuevo carrito para usuario logueado
        $stmt = $pdo->prepare("INSERT INTO carrito (id_usuario, fecha_creacion) VALUES (:uid, NOW())");
        $stmt->execute([':uid' => $user_id]);
        return $pdo->lastInsertId();
    } else {
        $stmt = $pdo->prepare("SELECT id_carrito FROM carrito WHERE guest_token = :gtok LIMIT 1");
        $stmt->execute([':gtok' => $guest_token]);
        $carrito = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($carrito) return $carrito['id_carrito'];
        
        // Crear nuevo carrito para invitado
        $stmt = $pdo->prepare("INSERT INTO carrito (guest_token, fecha_creacion) VALUES (:gtok, NOW())");
        $stmt->execute([':gtok' => $guest_token]);
        return $pdo->lastInsertId();
    }
}
?>