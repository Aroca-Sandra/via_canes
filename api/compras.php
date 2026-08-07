<?php
require_once 'db.php';
header('Content-Type: application/json; charset=UTF-8');

$method = $_SERVER['REQUEST_METHOD'];
$pdo = (new Database())->getConnection();

try {
    switch ($method) {
        case 'GET':
            // 1. OBTENER COMPRAS (Formato unificado para el Frontend)
            $stmt = $pdo->query("
                SELECT cp.*, pr.nombre_empresa as proveedor, p.nombre as producto
                FROM compras_proveedor cp
                LEFT JOIN proveedores pr ON cp.id_proveedor = pr.id_proveedor
                LEFT JOIN productos p ON cp.id_producto = p.id_producto
                ORDER BY cp.fecha DESC
            ");
            $resultados = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Retornamos success: true para que el JS no se rompa al leer .data
            echo json_encode([
                'success' => true,
                'data' => $resultados
            ]);
            break;
            
        case 'POST':
            // 2. GUARDAR COMPRA (Inserta o Actualiza de forma inteligente)
            $data = json_decode(file_get_contents('php://input'), true);
            
            // Validaciones básicas de campos obligatorios
            foreach (['id_proveedor', 'id_producto', 'cantidad', 'costo_unitario', 'fecha'] as $campo) {
                if (!isset($data[$campo]) || $data[$campo] === '') {
                    echo json_encode(['success' => false, 'error' => "El campo '$campo' es obligatorio."]);
                    exit;
                }
            }

            $id_compra = !empty($data['id_compra']) ? intval($data['id_compra']) : null;
            $id_proveedor = intval($data['id_proveedor']);
            $id_producto = intval($data['id_producto']);
            $nueva_cantidad = intval($data['cantidad']);
            $costo_unitario = floatval($data['costo_unitario']);
            $fecha = $data['fecha'];

            if ($id_compra) {
                // --- MODO EDICIÓN ---
                // Obtener datos antiguos para ajustar el stock correctamente
                $stmt_ant = $pdo->prepare("SELECT id_producto, cantidad FROM compras_proveedor WHERE id_compra = ?");
                $stmt_ant->execute([$id_compra]);
                $compra_antigua = $stmt_ant->fetch(PDO::FETCH_ASSOC);

                if ($compra_antigua) {
                    $prod_antiguo = intval($compra_antigua['id_producto']);
                    $cant_antigua = intval($compra_antigua['cantidad']);

                    if ($prod_antiguo === $id_producto) {
                        // Mismo producto: restamos la cantidad vieja y sumamos la nueva
                        $diferencia = $nueva_cantidad - $cant_antigua;
                        $pdo->prepare("UPDATE productos SET stock = stock + ? WHERE id_producto = ?")
                            ->execute([$diferencia, $id_producto]);
                    } else {
                        // Cambió de producto: revertimos el stock del viejo y sumamos al nuevo
                        $pdo->prepare("UPDATE productos SET stock = stock - ? WHERE id_producto = ?")
                            ->execute([$cant_antigua, $prod_antiguo]);
                        $pdo->prepare("UPDATE productos SET stock = stock + ? WHERE id_producto = ?")
                            ->execute([$nueva_cantidad, $id_producto]);
                    }
                }

                // Actualizamos el registro de la compra
                $stmt_update = $pdo->prepare("
                    UPDATE compras_proveedor 
                    SET id_proveedor = ?, id_producto = ?, cantidad = ?, costo_unitario = ?, fecha = ?
                    WHERE id_compra = ?
                ");
                $stmt_update->execute([$id_proveedor, $id_producto, $nueva_cantidad, $costo_unitario, $fecha, $id_compra]);
                
                echo json_encode(['success' => true, 'id' => $id_compra, 'message' => 'Compra editada con éxito']);
            } else {
                // --- MODO NUEVA COMPRA ---
                // Aumentamos el stock del producto
                $pdo->prepare("UPDATE productos SET stock = stock + ? WHERE id_producto = ?")
                    ->execute([$nueva_cantidad, $id_producto]);
                
                // Insertamos el nuevo registro
                $stmt_insert = $pdo->prepare("
                    INSERT INTO compras_proveedor (id_proveedor, id_producto, cantidad, costo_unitario, fecha)
                    VALUES (?, ?, ?, ?, ?)
                ");
                $stmt_insert->execute([$id_proveedor, $id_producto, $nueva_cantidad, $costo_unitario, $fecha]);
                
                echo json_encode(['success' => true, 'id' => $pdo->lastInsertId(), 'message' => 'Compra registrada con éxito']);
            }
            break;
            
        case 'DELETE':
            // 3. ELIMINAR COMPRA (Alineado con el id_compra enviado por JS)
            $data = json_decode(file_get_contents('php://input'), true);
            
            // Buscamos 'id_compra' o en su defecto 'id' para evitar conflictos de nombres
            $id = $data['id_compra'] ?? ($data['id'] ?? null);
            
            if (!$id) {
                echo json_encode(['success' => false, 'error' => 'ID de compra requerido']);
                exit;
            }
            
            // Revertir el stock del producto antes de borrar
            $stmt = $pdo->prepare("SELECT id_producto, cantidad FROM compras_proveedor WHERE id_compra = ?");
            $stmt->execute([$id]);
            $compra = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($compra) {
                $pdo->prepare("UPDATE productos SET stock = stock - ? WHERE id_producto = ?")
                    ->execute([$compra['cantidad'], $compra['id_producto']]);
            }
            
            // Eliminamos la compra físicamente
            $pdo->prepare("DELETE FROM compras_proveedor WHERE id_compra = ?")->execute([$id]);
            
            echo json_encode(['success' => true, 'message' => 'Compra eliminada y stock revertido con éxito']);
            break;
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>