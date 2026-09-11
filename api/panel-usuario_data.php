<?php
// ================================================================
// API PANEL USUARIO - VÍA CANES (VERSIÓN PRODUCCIÓN)
// ================================================================

// 1. Headers y Buffer
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('X-Content-Type-Options: nosniff'); // Prevenir sniffing de MIME

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

ini_set('display_errors', 0); // ⚠️ NUNCA mostrar errores en producción
error_reporting(E_ALL);
ini_set('log_errors', 1);     // ✅ Registrar errores en log del servidor
ini_set('upload_max_filesize', '5M');
ini_set('post_max_size', '10M');

ob_start();

// 2. Sesión
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// 3. Conexión DB Segura
$dbPath = __DIR__ . '/db.php';
if (!file_exists($dbPath)) {
    if (ob_get_level()) ob_end_clean();
    http_response_code(500);
    exit(json_encode(['success' => false, 'error' => 'Configuración de BD faltante']));
}
require_once $dbPath;

if (!isset($pdo) || !$pdo instanceof PDO) {
    if (ob_get_level()) ob_end_clean();
    http_response_code(500);
    exit(json_encode(['success' => false, 'error' => 'Fallo en conexión a BD']));
}

// 4. Autenticación
$id_usuario = $_SESSION['id_usuario'] ?? null;
if (!$id_usuario) {
    responderError('Sesión no activa o expirada', 401);
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';

// ================================================================
// FUNCIONES AUXILIARES
// ================================================================
function responder($data, $code = 200) {
    if (ob_get_level()) ob_end_clean();
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

function responderError($mensaje, $code = 400) {
    if (ob_get_level()) ob_end_clean();
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $mensaje], JSON_UNESCAPED_UNICODE);
    exit;
}

function borrarArchivoServidor($rutaRelativa) {
    if (empty($rutaRelativa)) return;
    $baseDir = realpath(__DIR__ . '/../');
    $rutaFisica = realpath(__DIR__ . '/' . $rutaRelativa);
    
    // 🛡️ Seguridad: Evitar Path Traversal
    if ($rutaFisica && str_starts_with($rutaFisica, $baseDir) && is_file($rutaFisica)) {
        unlink($rutaFisica);
    }
}

function validarImagenUpload($file, $maxSizeMB = 2) {
    if ($file['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('Error en la subida del archivo (Código: ' . $file['error'] . ')');
    }
    
    // Validar tipo MIME real (no confiar en extensión)
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($file['tmp_name']);
    $permitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'/image/jpj'];
    
    if (!in_array($mime, $permitidos)) {
        throw new Exception('Formato de imagen no válido. Solo JPG, PNG, WebP o GIF.');
    }
    
    if ($file['size'] > $maxSizeMB * 1024 * 1024) {
        throw new Exception("La imagen supera el límite de {$maxSizeMB}MB.");
    }
    
    return true;
}

// ================================================================
// ROUTER DE ACCIONES
// ================================================================
try {
    switch ($action) {

        case 'datos_usuario':
            $stmt = $pdo->prepare("
                SELECT u.id_usuario, u.id_tipo_id, u.numero_documento, u.nombres, u.apellidos, 
                       u.email, u.celular, u.id_localidad, u.direccion, u.foto_usuario,
                       r.nombre_rol, l.nombre_localidad, ti.sigla as tipo_id_sigla
                FROM usuario u 
                LEFT JOIN rol r ON u.id_rol = r.id_rol 
                LEFT JOIN localidad l ON u.id_localidad = l.id_localidad 
                LEFT JOIN tipo_identificacion ti ON u.id_tipo_id = ti.id_tipo_id
                WHERE u.id_usuario = ?
            ");
            $stmt->execute([$id_usuario]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$user) responderError('Usuario no encontrado', 404);
            responder(['success' => true, 'data' => $user]);
            break;

        case 'dashboard':
            $stats = [];
            
            $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM mascota WHERE id_usuario = ?");
            $stmt->execute([$id_usuario]);
            $stats['mascotas'] = $stmt->fetch()['total'];

            $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM citas WHERE id_usuario = ? AND id_estado_cita IN (1,2)");
            $stmt->execute([$id_usuario]);
            $stats['citas'] = $stmt->fetch()['total'];

            $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM pedido WHERE id_usuario = ?");
            $stmt->execute([$id_usuario]);
            $stats['pedidos'] = $stmt->fetch()['total'];

            $stmt = $pdo->prepare("
                SELECT c.id_cita, c.fecha_cita, c.hora_cita, s.nombre as servicio, ec.nombre as estado 
                FROM citas c 
                LEFT JOIN servicios s ON c.id_servicio = s.id_servicio 
                LEFT JOIN estado_cita ec ON c.id_estado_cita = ec.id_estado_cita 
                WHERE c.id_usuario = ? AND c.fecha_cita >= CURDATE() AND c.id_estado_cita IN (1,2)
                ORDER BY c.fecha_cita ASC, c.hora_cita ASC LIMIT 1
            ");
            $stmt->execute([$id_usuario]);
            $proximaCita = $stmt->fetch(PDO::FETCH_ASSOC);

            responder([
                'success' => true,
                'stats' => $stats,
                'proximaCita' => $proximaCita ?: null
            ]);
            break;

        case 'mascotas':
            $stmt = $pdo->prepare("
                SELECT m.*, e.nombre as especie, r.nombre as raza, s.sexo_mascota 
                FROM mascota m 
                LEFT JOIN especie e ON m.id_especie = e.id_especie 
                LEFT JOIN raza r ON m.id_raza = r.id_raza 
                LEFT JOIN sexo_mascotas s ON m.id_sexoMascota = s.id_sexoMascota 
                WHERE m.id_usuario = ?
                ORDER BY m.id_mascota DESC
            ");
            $stmt->execute([$id_usuario]);
            responder(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        case 'guardar_mascota':
            if (empty($_POST['nombre_mascota']) || empty($_POST['id_especie'])) {
                responderError('Nombre y especie son obligatorios', 400);
            }

            $rutaFoto = null;
            $id_mascota = $_POST['id_mascota'] ?? null;
            $esEdicion = !empty($id_mascota);
            $fotoParaBorrar = null;

            if (isset($_FILES['foto_mascota']) && $_FILES['foto_mascota']['error'] === UPLOAD_ERR_OK) {
                validarImagenUpload($_FILES['foto_mascota']);
                
                $uploadDir = __DIR__ . '/../img/mascotas/';
                if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);

                $ext = strtolower(pathinfo($_FILES['foto_mascota']['name'], PATHINFO_EXTENSION));
                $nombreFoto = 'mascota_' . $id_usuario . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
                $rutaFinal = $uploadDir . $nombreFoto;

                if (!move_uploaded_file($_FILES['foto_mascota']['tmp_name'], $rutaFinal)) {
                    responderError('Error al guardar la imagen en el servidor', 500);
                }
                $rutaFoto = '../img/mascotas/' . $nombreFoto;
            }

            if ($esEdicion) {
                // Obtener foto vieja antes de actualizar
                $stmtOld = $pdo->prepare("SELECT foto_mascota FROM mascota WHERE id_mascota = ? AND id_usuario = ?");
                $stmtOld->execute([$id_mascota, $id_usuario]);
                $oldFoto = $stmtOld->fetchColumn();

                $sql = "UPDATE mascota SET nombre_mascota=?, id_especie=?, id_raza=?, id_sexoMascota=?, 
                        peso_mascota=?, edad_mascota=?, color_mascota=?, observaciones_mascota=?, 
                        especie_detalle=?, raza_detalle=?";
                
                $params = [
                    trim($_POST['nombre_mascota']), $_POST['id_especie'],
                    !empty($_POST['id_raza']) ? $_POST['id_raza'] : null,
                    !empty($_POST['id_sexoMascota']) ? $_POST['id_sexoMascota'] : null,
                    !empty($_POST['peso_mascota']) ? floatval($_POST['peso_mascota']) : null,
                    trim($_POST['edad_mascota'] ?? ''), trim($_POST['color_mascota'] ?? ''),
                    trim($_POST['observaciones_mascota'] ?? ''),
                    !empty($_POST['especie_detalle']) ? trim($_POST['especie_detalle']) : null,
                    !empty($_POST['raza_detalle']) ? trim($_POST['raza_detalle']) : null
                ];

                if ($rutaFoto) {
                    $sql .= ", foto_mascota=?";
                    $params[] = $rutaFoto;
                    $fotoParaBorrar = $oldFoto;
                }
                $sql .= " WHERE id_mascota=? AND id_usuario=?";
                $params[] = $id_mascota; $params[] = $id_usuario;

                $pdo->prepare($sql)->execute($params);
                borrarArchivoServidor($fotoParaBorrar);
                responder(['success' => true, 'message' => 'Mascota actualizada', 'id' => $id_mascota]);

            } else {
                $cols = "id_usuario, nombre_mascota, id_especie, id_raza, id_sexoMascota, 
                         peso_mascota, edad_mascota, color_mascota, observaciones_mascota, 
                         especie_detalle, raza_detalle";
                $vals = "$id_usuario, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?";
                $params = [
                    trim($_POST['nombre_mascota']), $_POST['id_especie'],
                    !empty($_POST['id_raza']) ? $_POST['id_raza'] : null,
                    !empty($_POST['id_sexoMascota']) ? $_POST['id_sexoMascota'] : null,
                    !empty($_POST['peso_mascota']) ? floatval($_POST['peso_mascota']) : null,
                    trim($_POST['edad_mascota'] ?? ''), trim($_POST['color_mascota'] ?? ''),
                    trim($_POST['observaciones_mascota'] ?? ''),
                    !empty($_POST['especie_detalle']) ? trim($_POST['especie_detalle']) : null,
                    !empty($_POST['raza_detalle']) ? trim($_POST['raza_detalle']) : null
                ];

                if ($rutaFoto) { $cols .= ", foto_mascota"; $vals .= ", ?"; $params[] = $rutaFoto; }
                
                $sql = "INSERT INTO mascota ($cols) VALUES ($vals)";
                $pdo->prepare($sql)->execute($params);
                responder(['success' => true, 'message' => 'Mascota guardada', 'id' => $pdo->lastInsertId()], 201);
            }
            break;

        case 'eliminar_mascota':
            if (empty($_POST['id_mascota'])) responderError('ID de mascota requerido', 400);
            
            $stmtFoto = $pdo->prepare("SELECT foto_mascota FROM mascota WHERE id_mascota = ? AND id_usuario = ?");
            $stmtFoto->execute([$_POST['id_mascota'], $id_usuario]);
            $fotoBorrar = $stmtFoto->fetchColumn();
            
            $stmt = $pdo->prepare("DELETE FROM mascota WHERE id_mascota = ? AND id_usuario = ?");
            $stmt->execute([$_POST['id_mascota'], $id_usuario]);
            
            if ($stmt->rowCount() === 0) responderError('No se pudo eliminar o no tienes permiso', 403);
            
            borrarArchivoServidor($fotoBorrar);
            responder(['success' => true, 'message' => 'Mascota eliminada']);
            break;

        case 'citas':
            $stmt = $pdo->prepare("
                SELECT c.*, s.nombre as servicio, m.nombre_mascota, ec.nombre as estado 
                FROM citas c 
                LEFT JOIN servicios s ON c.id_servicio = s.id_servicio 
                LEFT JOIN mascota m ON c.id_mascota = m.id_mascota 
                LEFT JOIN estado_cita ec ON c.id_estado_cita = ec.id_estado_cita 
                WHERE c.id_usuario = ? 
                ORDER BY c.fecha_cita DESC, c.hora_cita DESC
            ");
            $stmt->execute([$id_usuario]);
            responder(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        case 'guardar_cita':
            $requeridos = ['id_mascota', 'id_servicio', 'fecha_cita', 'hora_cita'];
            foreach ($requeridos as $campo) {
                if (empty($_POST[$campo])) responderError("El campo '$campo' es obligatorio", 400);
            }

            if (strtotime($_POST['fecha_cita']) < strtotime(date('Y-m-d'))) {
                responderError('No se pueden agendar citas en fechas pasadas', 400);
            }

            // Verificar propiedad de la mascota
            $checkMas = $pdo->prepare("SELECT COUNT(*) FROM mascota WHERE id_mascota = ? AND id_usuario = ?");
            $checkMas->execute([$_POST['id_mascota'], $id_usuario]);
            if ($checkMas->fetchColumn() == 0) responderError('Mascota no válida', 403);

            $sql = "INSERT INTO citas (id_usuario, id_mascota, id_servicio, fecha_cita, hora_cita, notas, id_estado_cita) 
                    VALUES (?, ?, ?, ?, ?, ?, 1)";
            $pdo->prepare($sql)->execute([
                $id_usuario, $_POST['id_mascota'], $_POST['id_servicio'],
                $_POST['fecha_cita'], $_POST['hora_cita'], trim($_POST['notas'] ?? '')
            ]);

            responder(['success' => true, 'message' => 'Cita agendada'], 201);
            break;

        case 'cancelar_cita':
            if (empty($_POST['id_cita'])) responderError('ID de cita requerido', 400);
            
            $stmt = $pdo->prepare("UPDATE citas SET id_estado_cita = 3 WHERE id_cita = ? AND id_usuario = ? AND id_estado_cita = 1");
            $stmt->execute([$_POST['id_cita'], $id_usuario]);
            
            if ($stmt->rowCount() === 0) responderError('No se pudo cancelar la cita', 400);
            responder(['success' => true, 'message' => 'Cita cancelada']);
            break;

        case 'pedidos':
            $stmt = $pdo->prepare("
                SELECT p.*, ep.nombre as estado 
                FROM pedido p 
                LEFT JOIN estado_pedido ep ON p.id_estado_pedido = ep.id_estado_pedido 
                WHERE p.id_usuario = ? 
                ORDER BY p.fecha DESC
            ");
            $stmt->execute([$id_usuario]);
            $pedidos = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($pedidos as &$p) {
                $stmt2 = $pdo->prepare("
                    SELECT dp.*, pr.nombre, pr.imagen_url 
                    FROM detalle_pedido dp 
                    LEFT JOIN productos pr ON dp.id_producto = pr.id_producto 
                    WHERE dp.id_pedido = ?
                ");
                $stmt2->execute([$p['id_pedido']]);
                $p['detalles'] = $stmt2->fetchAll(PDO::FETCH_ASSOC);
            }
            responder(['success' => true, 'data' => $pedidos]);
            break;

        case 'ver_pedido':
            $id_pedido = $_GET['id'] ?? $_POST['id_pedido'] ?? null;
            if (!$id_pedido) responderError('ID de pedido requerido', 400);
            
            $stmt = $pdo->prepare("
                SELECT p.*, ep.nombre as estado, u.nombres, u.apellidos, u.email, u.celular
                FROM pedido p
                LEFT JOIN estado_pedido ep ON p.id_estado_pedido = ep.id_estado_pedido
                LEFT JOIN usuario u ON p.id_usuario = u.id_usuario
                WHERE p.id_pedido = ? AND p.id_usuario = ?
            ");
            $stmt->execute([$id_pedido, $id_usuario]);
            $pedido = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$pedido) responderError('Pedido no encontrado', 404);
            
            $stmt2 = $pdo->prepare("
                SELECT dp.*, pr.nombre, pr.imagen_url
                FROM detalle_pedido dp
                LEFT JOIN productos pr ON dp.id_producto = pr.id_producto
                WHERE dp.id_pedido = ?
            ");
            $stmt2->execute([$id_pedido]);
            $pedido['detalles'] = $stmt2->fetchAll(PDO::FETCH_ASSOC);
            
            $stmt3 = $pdo->prepare("
                SELECT pg.*, mc.nombre as metodo_pago, ep.nombre as estado_pago
                FROM pagos pg
                LEFT JOIN metodos_catalogo mc ON pg.id_metodo = mc.id_metodo
                LEFT JOIN estado_pago ep ON pg.id_estado_pago = ep.id_estado_pago
                WHERE pg.id_pedido = ? LIMIT 1
            ");
            $stmt3->execute([$id_pedido]);
            $pedido['pago'] = $stmt3->fetch(PDO::FETCH_ASSOC) ?: null;
            
            responder(['success' => true, 'data' => $pedido]);
            break;

        case 'actualizar_perfil':
            $campos_requeridos = ['id_tipo_id', 'numero_documento', 'nombres', 'apellidos', 'email', 'celular'];
            foreach ($campos_requeridos as $campo) {
                if (!isset($_POST[$campo]) || trim($_POST[$campo]) === '') {
                    responderError("El campo '$campo' es obligatorio", 400);
                }
            }

            if (!filter_var($_POST['email'], FILTER_VALIDATE_EMAIL)) {
                responderError('Email no válido', 400);
            }

            // Verificar email único
            $stmt = $pdo->prepare("SELECT id_usuario FROM usuario WHERE email = ? AND id_usuario != ?");
            $stmt->execute([trim($_POST['email']), $id_usuario]);
            if ($stmt->fetch()) responderError('Este email ya está registrado', 409);

            // Verificar documento único
            if (!empty($_POST['numero_documento'])) {
                $stmt = $pdo->prepare("SELECT id_usuario FROM usuario WHERE numero_documento = ? AND id_usuario != ?");
                $stmt->execute([trim($_POST['numero_documento']), $id_usuario]);
                if ($stmt->fetch()) responderError('Este documento ya está registrado', 409);
            }

            $actualizarPassword = false;
            if (!empty($_POST['nueva_contrasena'])) {
                if (strlen($_POST['nueva_contrasena']) < 6) {
                    responderError('La contraseña debe tener mínimo 6 caracteres', 400);
                }
                $actualizarPassword = true;
            }

            $rutaFoto = null;
            $fotoParaBorrar = null;
            $eliminarFoto = !empty($_POST['eliminar_foto']);

            if (isset($_FILES['foto_usuario']) && $_FILES['foto_usuario']['error'] === UPLOAD_ERR_OK) {
                validarImagenUpload($_FILES['foto_usuario']);
                
                $uploadDir = __DIR__ . '/../img/usuarios/';
                if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);

                $ext = strtolower(pathinfo($_FILES['foto_usuario']['name'], PATHINFO_EXTENSION));
                $nombreFoto = 'user_' . $id_usuario . '_' . time() . '.' . $ext;
                $rutaFinal = $uploadDir . $nombreFoto;

                if (!move_uploaded_file($_FILES['foto_usuario']['tmp_name'], $rutaFinal)) {
                    responderError('Error al guardar la imagen', 500);
                }
                $rutaFoto = '../img/usuarios/' . $nombreFoto;
            }

            // Obtener foto vieja
            $stmtOld = $pdo->prepare("SELECT foto_usuario FROM usuario WHERE id_usuario = ?");
            $stmtOld->execute([$id_usuario]);
            $oldFoto = $stmtOld->fetchColumn();

            $sql = "UPDATE usuario SET id_tipo_id=?, numero_documento=?, nombres=?, apellidos=?, 
                    email=?, celular=?, id_localidad=?, direccion=?";
            
            $params = [
                intval($_POST['id_tipo_id']), trim($_POST['numero_documento']),
                trim($_POST['nombres']), trim($_POST['apellidos']),
                trim($_POST['email']), trim($_POST['celular']),
                !empty($_POST['id_localidad']) ? intval($_POST['id_localidad']) : null,
                !empty($_POST['direccion']) ? trim($_POST['direccion']) : null
            ];

            if ($actualizarPassword) {
                $sql .= ", nueva_contrasena=?";
                $params[] = password_hash($_POST['nueva_contrasena'], PASSWORD_DEFAULT);
            }

            if ($eliminarFoto) {
                $sql .= ", foto_usuario=NULL";
                $fotoParaBorrar = $oldFoto;
            } elseif ($rutaFoto) {
                $sql .= ", foto_usuario=?";
                $params[] = $rutaFoto;
                $fotoParaBorrar = $oldFoto;
            }

            $sql .= " WHERE id_usuario=?";
            $params[] = $id_usuario;

            $pdo->prepare($sql)->execute($params);
            borrarArchivoServidor($fotoParaBorrar);

            responder(['success' => true, 'message' => 'Perfil actualizado']);
            break;

        case 'razas':
            $idEspecie = intval($_GET['id_especie'] ?? 0);
            if (!$idEspecie) responderError('Especie requerida', 400);
            
            $stmt = $pdo->prepare("SELECT id_raza, nombre FROM raza WHERE id_especie = ? ORDER BY nombre");
            $stmt->execute([$idEspecie]);
            responder(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        case 'mascotas_cita':
            $stmt = $pdo->prepare("SELECT id_mascota, nombre_mascota FROM mascota WHERE id_usuario = ? ORDER BY nombre_mascota");
            $stmt->execute([$id_usuario]);
            responder(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        case 'localidades':
            $stmt = $pdo->query("SELECT id_localidad, nombre_localidad FROM localidad ORDER BY nombre_localidad");
            responder(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        case 'tipos_id':
            $stmt = $pdo->query("SELECT id_tipo_id, sigla, nombre FROM tipo_identificacion ORDER BY id_tipo_id");
            responder(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        case 'servicios_activos':
            $stmt = $pdo->query("SELECT id_servicio, nombre, precio FROM servicios WHERE id_estado_servicio = 1 ORDER BY nombre");
            responder(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        case 'cerrar_sesion':
            $_SESSION = [];
            session_destroy();
            responder(['success' => true, 'message' => 'Sesión cerrada']);
            break;

        default:
            responderError('Acción no válida: ' . htmlspecialchars($action), 400);
    }

} catch (PDOException $e) {
    error_log("DB Error in panel-usuario_data.php: " . $e->getMessage());
    responderError('Error interno del servidor', 500);
} catch (Exception $e) {
    error_log("App Error in panel-usuario_data.php: " . $e->getMessage());
    responderError($e->getMessage(), 500);
}
?>