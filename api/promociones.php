<?php
require_once 'db.php';
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$pdo = (new Database())->getConnection();

try {
    switch ($method) {
        case 'GET':
            $stmt = $pdo->query("
                SELECT p.*, ep.nombre as estado_nombre
                FROM promociones p
                LEFT JOIN estado_promocion ep ON p.id_estado_promocion = ep.id_estado_promocion
                ORDER BY p.fecha_creacion DESC
            ");
            $promos = $stmt->fetchAll();
            
            foreach ($promos as &$promo) {
                $stmt2 = $pdo->prepare("
                    SELECT pp.*, pr.nombre as producto_nombre 
                    FROM producto_promocion pp
                    LEFT JOIN productos pr ON pp.id_producto = pr.id_producto
                    WHERE pp.id_promo = ?
                ");
                $stmt2->execute([$promo['id_promo']]);
                $promo['productos'] = $stmt2->fetchAll();
            }
            
            echo json_encode($promos);
            break;
            
        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            
            $stmt = $pdo->prepare("
                INSERT INTO promociones (nombre, descripcion, valor, tipo_descuento, fecha_inicio, fecha_fin, fecha_creacion, id_estado_promocion)
                VALUES (?, ?, ?, ?, ?, ?, CURDATE(), ?)
            ");
            $stmt->execute([
                $data['nombre'],
                $data['descripcion'] ?? '',
                $data['valor'],
                $data['tipo_descuento'],
                $data['fecha_inicio'],
                $data['fecha_fin'],
                $data['id_estado_promocion'] ?? 1
            ]);
            
            echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
            break;
            
        case 'PUT':
            $data = json_decode(file_get_contents('php://input'), true);
            
            $stmt = $pdo->prepare("
                UPDATE promociones SET nombre=?, descripcion=?, valor=?, tipo_descuento=?, 
                fecha_inicio=?, fecha_fin=?, id_estado_promocion=? WHERE id_promo=?
            ");
            $stmt->execute([
                $data['nombre'],
                $data['descripcion'] ?? '',
                $data['valor'],
                $data['tipo_descuento'],
                $data['fecha_inicio'],
                $data['fecha_fin'],
                $data['id_estado_promocion'] ?? 1,
                $data['id_promo']
            ]);
            
            echo json_encode(['success' => true]);
            break;
            
        case 'DELETE':
            $data = json_decode(file_get_contents('php://input'), true);
            $id = $data['id'] ?? null;
            
            $pdo->prepare("DELETE FROM producto_promocion WHERE id_promo = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM promociones WHERE id_promo = ?")->execute([$id]);
            
            echo json_encode(['success' => true]);
            break;
    }
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>