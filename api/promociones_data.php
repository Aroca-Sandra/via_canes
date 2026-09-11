<?php
session_start();
require_once 'db.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

// Soporte para peticiones JSON (fetch/axios) y $_REQUEST tradicional
$inputData = json_decode(file_get_contents('php://input'), true) ?? [];
$accion = $_POST['accion'] ?? $_GET['accion'] ?? $inputData['accion'] ?? 'listar_activas';

try {
    switch ($accion) {
        // ============================================================
        // 1. LISTAR PROMOCIONES (PANEL ADMINISTRATIVO)
        // ============================================================
        case 'listar_promociones':
        case 'admin_listar':
            $stmt = $pdo->query("
                SELECT p.id_promo, p.nombre, p.descripcion, p.valor, p.tipo_descuento,
                       p.fecha_inicio, p.fecha_fin, p.fecha_creacion,
                       p.id_estado_promocion, p.foto_url, ep.nombre AS estado_nombre
                FROM promociones p
                LEFT JOIN estado_promocion ep ON p.id_estado_promocion = ep.id_estado_promocion
                ORDER BY p.id_promo DESC
            ");
            $promos = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $stmtProd = $pdo->query("
                SELECT pp.id_promo, pp.id_producto, pr.nombre AS producto_nombre, pr.precio_venta, pr.imagen_url
                FROM producto_promocion pp
                INNER JOIN productos pr ON pp.id_producto = pr.id_producto
            ");
            $vinculos = $stmtProd->fetchAll(PDO::FETCH_ASSOC);

            $mapProductos = [];
            foreach ($vinculos as $v) {
                $mapProductos[$v['id_promo']][] = [
                    'id_producto'     => (int)$v['id_producto'],
                    'producto_nombre' => $v['producto_nombre'],
                    'precio_venta'    => floatval($v['precio_venta']),
                    'imagen_url'      => $v['imagen_url'] ?? null
                ];
            }

            foreach ($promos as &$p) {
                $p['id_promo'] = (int)$p['id_promo'];
                $p['valor'] = floatval($p['valor']);
                $p['id_estado_promocion'] = (int)$p['id_estado_promocion'];
                $p['productos'] = $mapProductos[$p['id_promo']] ?? [];
            }
            unset($p);

            responder(['ok' => true, 'success' => true, 'data' => $promos]);
            break;

        // ============================================================
        // 2. LISTAR ACTIVAS (TIENDA PÚBLICA VÍA CANES)
        // ============================================================
        case 'listar_activas':
            $sql = "
                SELECT 
                    p.id_promo,
                    pr.id_producto,
                    pr.nombre,
                    pr.descripcion,
                    pr.precio_venta,
                    pr.stock,
                    pr.imagen_url, 
                    p.valor AS valor_descuento,
                    p.tipo_descuento,
                    p.fecha_inicio,
                    p.fecha_fin
                FROM promociones p
                INNER JOIN producto_promocion pp ON p.id_promo = pp.id_promo
                INNER JOIN productos pr ON pp.id_producto = pr.id_producto
                WHERE p.id_estado_promocion = 1 
                  AND (p.fecha_fin IS NULL OR p.fecha_fin >= CURDATE())
                  AND (p.fecha_inicio IS NULL OR p.fecha_inicio <= CURDATE())
                ORDER BY p.valor DESC, pr.nombre ASC
            ";
            
            $res = $pdo->query($sql);
            $data = $res->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($data as &$item) {  
                $item['id_promo'] = (int)$item['id_promo'];
                $item['id_producto'] = (int)$item['id_producto'];
                $item['precio_venta'] = floatval($item['precio_venta']);
                $item['stock'] = (int)$item['stock'];
                $item['valor_descuento'] = floatval($item['valor_descuento']);
                $item['tipo_descuento'] = (string)$item['tipo_descuento'];
                
                $img = $item['imagen_url'] ?? '';
                
                if (empty($img)) {
                    $item['imagen_url'] = '../../img/producto-default.png';
                } elseif (strpos($img, 'http') === 0 || strpos($img, '../../') === 0) {
                    $item['imagen_url'] = $img;
                } elseif (strpos($img, '../') === 0) {
                    $item['imagen_url'] = '../../' . substr($img, 3);
                } else {
                    $item['imagen_url'] = '../../' . $img;
                }
            }
            unset($item);
            
            responder(['ok' => true, 'success' => true, 'data' => $data]);
            break;

        // ============================================================
        // 3. GUARDAR / ACTUALIZAR PROMOCIÓN
        // ============================================================
        case 'guardar_promocion':
        case 'actualizar_promocion':
        case 'guardar':
        case 'actualizar':
            $id     = intval($_POST['id_promo'] ?? $_POST['id_prom'] ?? $inputData['id_promo'] ?? 0);
            $nombre = trim($_POST['nombre'] ?? $inputData['nombre'] ?? '');
            $valor  = $_POST['valor'] ?? $inputData['valor'] ?? '';
            $tipo   = $_POST['tipo_descuento'] ?? $inputData['tipo_descuento'] ?? 'porcentaje';
            
            if (!$nombre || $valor === '') {
                throw new Exception('El nombre y el valor del descuento son obligatorios');
            }
            
            if ($tipo === 'porcentaje' && floatval($valor) > 100) {
                throw new Exception('El descuento porcentual no puede superar el 100%');
            }

            // Obtener foto anterior si es edición
            $oldFoto = null;
            if ($id > 0) {
                $stmtOld = $pdo->prepare("SELECT foto_url FROM promociones WHERE id_promo = :id");
                $stmtOld->execute([':id' => $id]);
                $oldFoto = $stmtOld->fetchColumn();
            }

            // Subida de imagen
            $nuevaRutaImg = null;
            $file = $_FILES['foto_url'] ?? $_FILES['promoImagen'] ?? $_FILES['foto_promo'] ?? null;
            
            if ($file && isset($file['error']) && $file['error'] === UPLOAD_ERR_OK) {
                $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
                $permitidos = ['jpg', 'jpeg', 'png', 'webp'];
                
                if (!in_array($ext, $permitidos)) throw new Exception('Formato no permitido. Solo JPG, PNG o WEBP');
                if ($file['size'] > 2 * 1024 * 1024) throw new Exception('La imagen supera el límite de 2MB');
                
                $dir = __DIR__ . '/../img/promociones/';
                if (!is_dir($dir)) {
                    mkdir($dir, 0755, true);
                }
                
                $nombreImg = 'promo_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
                if (!move_uploaded_file($file['tmp_name'], $dir . $nombreImg)) {
                    throw new Exception('Error al guardar la imagen en el servidor');
                }
                
                $nuevaRutaImg = 'img/promociones/' . $nombreImg;
            }

            $eliminarFotoFlag = isset($_POST['eliminar_foto']) && $_POST['eliminar_foto'] == '1';
            $fotoParaBorrarFisico = null;

            if ($id > 0) { 
                if ($nuevaRutaImg) {
                    $fotoParaBorrarFisico = $oldFoto;
                } elseif ($eliminarFotoFlag) {
                    $fotoParaBorrarFisico = $oldFoto;
                    $nuevaRutaImg = "";
                }
            }

            $campos = [
                ':n' => $nombre,
                ':d' => trim($_POST['descripcion'] ?? $inputData['descripcion'] ?? ''),
                ':v' => floatval($valor),
                ':t' => $tipo,
                ':i' => !empty($_POST['fecha_inicio'] ?? $inputData['fecha_inicio'] ?? null) ? ($_POST['fecha_inicio'] ?? $inputData['fecha_inicio']) : null,
                ':f' => !empty($_POST['fecha_fin'] ?? $inputData['fecha_fin'] ?? null) ? ($_POST['fecha_fin'] ?? $inputData['fecha_fin']) : null,
                ':e' => intval($_POST['id_estado_promocion'] ?? $inputData['id_estado_promocion'] ?? 1),
            ];

            if ($id > 0) {
                $sql = "UPDATE promociones SET nombre=:n, descripcion=:d, valor=:v, tipo_descuento=:t, fecha_inicio=:i, fecha_fin=:f, id_estado_promocion=:e";
                if ($nuevaRutaImg !== null) { 
                     $sql .= ", foto_url=:foto";
                     $campos[':foto'] = $nuevaRutaImg;
                }
                $sql .= " WHERE id_promo=:id";
                $campos[':id'] = $id;
                
                $stmt = $pdo->prepare($sql);
                $stmt->execute($campos);
            } else {
                $sql = "INSERT INTO promociones (nombre, descripcion, valor, tipo_descuento, fecha_inicio, fecha_fin, id_estado_promocion, foto_url, fecha_creacion) 
                        VALUES(:n, :d, :v, :t, :i, :f, :e, :foto, NOW())";
                $campos[':foto'] = $nuevaRutaImg;
                
                $stmt = $pdo->prepare($sql);
                $stmt->execute($campos);
                $id = (int)$pdo->lastInsertId();
            }

            if ($fotoParaBorrarFisico) {
                $rutaFisica = realpath(__DIR__ . '/../' . $fotoParaBorrarFisico);
                if ($rutaFisica && file_exists($rutaFisica)) {
                    unlink($rutaFisica);
                }
            }

            $mensaje = $id > 0 ? 'Promoción actualizada correctamente' : 'Promoción creada correctamente';
            responder(['ok' => true, 'success' => true, 'message' => $mensaje, 'id' => $id]);
            break;

        // ============================================================
        // 4. VINCULAR / DESVINCULAR PRODUCTOS
        // ============================================================
        case 'asignar_producto':
        case 'vincular_producto':
            $idP = intval($_POST['id_promo'] ?? $_GET['id_promo'] ?? $inputData['id_promo'] ?? 0);
            $idR = intval($_POST['id_producto'] ?? $_GET['id_producto'] ?? $inputData['id_producto'] ?? 0);
            
            if (!$idP || !$idR) throw new Exception('Promoción y producto son requeridos');

            $dup = $pdo->prepare("SELECT 1 FROM producto_promocion WHERE id_promo=? AND id_producto=?");
            $dup->execute([$idP, $idR]);
            if ($dup->fetch()) throw new Exception('El producto ya está vinculado a esta promoción');

            $pdo->prepare("INSERT INTO producto_promocion (id_promo, id_producto) VALUES(?,?)")->execute([$idP, $idR]);
            responder(['ok' => true, 'success' => true, 'message' => 'Producto vinculado exitosamente']);
            break;

        case 'desasignar_producto':
        case 'desvincular_producto':
            $idP = intval($_POST['id_promo'] ?? $_GET['id_promo'] ?? $inputData['id_promo'] ?? 0);
            $idR = intval($_POST['id_producto'] ?? $_GET['id_producto'] ?? $inputData['id_producto'] ?? 0);
            
            if (!$idP || !$idR) throw new Exception('Datos insuficientes para desvincular');
            
            $pdo->prepare("DELETE FROM producto_promocion WHERE id_promo=? AND id_producto=?")->execute([$idP, $idR]);
            responder(['ok' => true, 'success' => true, 'message' => 'Producto desvinculado']);
            break;

        // ============================================================
        // 5. ELIMINAR PROMOCIÓN
        // ============================================================
        case 'eliminar_promocion':
        case 'eliminar':
            $id = intval($_POST['id_promo'] ?? $_GET['id_promo'] ?? $inputData['id_promo'] ?? 0);
            if (!$id) throw new Exception('ID de promoción no válido');

            $stmtFoto = $pdo->prepare("SELECT foto_url FROM promociones WHERE id_promo=?");
            $stmtFoto->execute([$id]);
            $rutaFoto = $stmtFoto->fetchColumn();
            
            if ($rutaFoto) {
                $rutaFisica = realpath(__DIR__ . '/../' . $rutaFoto);
                if ($rutaFisica && file_exists($rutaFisica)) {
                    unlink($rutaFisica);
                }
            }

            $pdo->beginTransaction();
            $pdo->prepare("DELETE FROM producto_promocion WHERE id_promo=?")->execute([$id]);
            $pdo->prepare("DELETE FROM promociones WHERE id_promo=?")->execute([$id]);
            $pdo->commit();
            
            responder(['ok' => true, 'success' => true, 'message' => 'Promoción eliminada definitivamente']);
            break;
            
        default:
            responderError('Acción no válida: ' . htmlspecialchars($accion));
            break;
    }
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    responderError($e->getMessage());
}

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

function responder($data) {
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function responderError($msg) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'success' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}
?>