<?php
require_once 'db.php';
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$pdo = (new Database())->getConnection();

try {
    if ($method === 'GET') {
        $stmt = $pdo->query("
            SELECT c.*, u.nombres, u.apellidos, u.email,
                   COUNT(dc.id_detalle) as total_productos,
                   COALESCE(SUM(dc.subtotal), 0) as total_carrito
            FROM carrito c
            LEFT JOIN usuario u ON c.id_usuario = u.id_usuario
            LEFT JOIN detalle_carrito dc ON c.id_carrito = dc.id_carrito
            GROUP BY c.id_carrito
            ORDER BY c.fecha_creacion DESC
        ");
        $carritos = $stmt->fetchAll();
        
        foreach ($carritos as &$c) {
            $stmt2 = $pdo->prepare("
                SELECT dc.*, p.nombre, p.imagen_url, p.precio_venta
                FROM detalle_carrito dc
                LEFT JOIN productos p ON dc.id_producto = p.id_producto
                WHERE dc.id_carrito = ?
            ");
            $stmt2->execute([$c['id_carrito']]);
            $c['productos'] = $stmt2->fetchAll();
        }
        
        echo json_encode($carritos);
    } elseif ($method === 'DELETE') {
        $data = json_decode(file_get_contents('php://input'), true);
        $pdo->prepare("DELETE FROM detalle_carrito WHERE id_carrito = ?")->execute([$data['id']]);
        $pdo->prepare("DELETE FROM carrito WHERE id_carrito = ?")->execute([$data['id']]);
        echo json_encode(['success' => true]);
    }
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>