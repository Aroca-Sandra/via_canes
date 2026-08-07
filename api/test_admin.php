<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/db.php'; // O el nombre de tu archivo de conexión

try {
    if (!isset($pdo)) throw new Exception("No hay conexión PDO");
    
    // Prueba 1: Conexión BD
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM productos");
    $total = $stmt->fetch()['total'];
    
    // Prueba 2: Listar productos
    $stmt = $pdo->query("SELECT id_producto, nombre FROM productos LIMIT 3");
    $productos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'ok' => true,
        'mensaje' => 'PHP funciona correctamente',
        'total_productos' => $total,
        'productos_prueba' => $productos
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
?>