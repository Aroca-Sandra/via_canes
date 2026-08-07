<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

ob_start();
require_once 'db.php'; // Ajusta la ruta según tu estructura

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

 $action = $_GET['action'] ?? $_POST['action'] ?? '';

function responder($data) {
    ob_end_clean();
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function responderError($mensaje, $code = 400) {
    ob_end_clean();
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $mensaje], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    switch ($action) {

        case 'listar_usuarios':
            $stmt = $pdo->query("
                SELECT 
                    u.id_usuario, u.id_tipo_id, ti.sigla as tipo_doc, u.numero_documento,
                    u.nombres, u.apellidos, u.email, u.celular, u.id_rol, r.nombre_rol,
                    u.id_localidad, l.nombre_localidad, u.direccion, u.foto_usuario, u.fecha_registro
                FROM usuario u
                LEFT JOIN tipo_identificacion ti ON u.id_tipo_id = ti.id_tipo_id
                LEFT JOIN rol r ON u.id_rol = r.id_rol
                LEFT JOIN localidad l ON u.id_localidad = l.id_localidad
                ORDER BY u.fecha_registro DESC
            ");
            responder(['success' => true, 'data' => $stmt->fetchAll()]);
            break;

        case 'guardar_usuario':
            $requeridos = ['id_tipo_id', 'numero_documento', 'nombres', 'apellidos', 'email', 'id_rol'];
            foreach ($requeridos as $campo) {
                if (empty($_POST[$campo])) responderError("El campo '$campo' es obligatorio");
            }
            
            if (!filter_var($_POST['email'], FILTER_VALIDATE_EMAIL)) responderError('Email no válido');
            
            $celular = preg_replace('/[^0-9]/', '', $_POST['celular'] ?? '');
            
            $id_usuario_edit = $_POST['id_usuario'] ?? null;
            $esEdicion = !empty($id_usuario_edit);
            
            $check = $pdo->prepare("SELECT id_usuario FROM usuario WHERE email = ? AND id_usuario != ?");
            $check->execute([$_POST['email'], $id_usuario_edit ?? 0]);
            if ($check->fetch()) responderError('El email ya está registrado');
            
            $check = $pdo->prepare("SELECT id_usuario FROM usuario WHERE numero_documento = ? AND id_usuario != ?");
            $check->execute([$_POST['numero_documento'], $id_usuario_edit ?? 0]);
            if ($check->fetch()) responderError('El número de documento ya está registrado');
            
            $rutaFoto = null;
            if (isset($_FILES['foto_usuario']) && $_FILES['foto_usuario']['error'] === UPLOAD_ERR_OK) {
                $uploadDir = __DIR__ . '/../img/usuarios/';
                if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
                
                $ext = strtolower(pathinfo($_FILES['foto_usuario']['name'], PATHINFO_EXTENSION));
                $permitidos = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
                
                if (!in_array($ext, $permitidos)) responderError('Formato de imagen no permitido');
                if ($_FILES['foto_usuario']['size'] > 2 * 1024 * 1024) responderError('La imagen no puede superar los 2MB');
                
                $nombreFoto = 'user_' . time() . '_' . rand(1000, 9999) . '.' . $ext;
                $rutaFinal = $uploadDir . $nombreFoto;
                
                if (!move_uploaded_file($_FILES['foto_usuario']['tmp_name'], $rutaFinal)) responderError('No se pudo guardar la imagen');
                $rutaFoto = '../img/usuarios/' . $nombreFoto;
            }
            
            $data = [
                'id_tipo_id' => intval($_POST['id_tipo_id']),
                'numero_documento' => trim($_POST['numero_documento']),
                'nombres' => trim(ucwords(strtolower($_POST['nombres']))),
                'apellidos' => trim(ucwords(strtolower($_POST['apellidos']))),
                'email' => trim(strtolower($_POST['email'])),
                'celular' => $celular,
                'id_rol' => intval($_POST['id_rol']),
                'id_localidad' => !empty($_POST['id_localidad']) ? intval($_POST['id_localidad']) : null,
                'direccion' => trim($_POST['direccion'] ?? '')
            ];
            
            $actualizarPassword = false;
            if (!empty($_POST['nueva_contrasena'])) {
                if (strlen($_POST['nueva_contrasena']) < 6) responderError('La contraseña debe tener mínimo 6 caracteres');
                $actualizarPassword = true;
            }
            
            if ($esEdicion) {
                // Obtener la foto vieja ANTES de actualizar la BD
                $stmtOld = $pdo->prepare("SELECT foto_usuario FROM usuario WHERE id_usuario = ?");
                $stmtOld->execute([$id_usuario_edit]);
                $oldFoto = $stmtOld->fetchColumn();
                
                $sql = "UPDATE usuario SET id_tipo_id = ?, numero_documento = ?, nombres = ?, apellidos = ?, email = ?, celular = ?, id_rol = ?, id_localidad = ?, direccion = ?";
                $params = [$data['id_tipo_id'], $data['numero_documento'], $data['nombres'], $data['apellidos'], $data['email'], $data['celular'], $data['id_rol'], $data['id_localidad'], $data['direccion']];
                
                if ($actualizarPassword) {
                    $sql .= ", nueva_contrasena = ?";
                    $params[] = password_hash($_POST['nueva_contrasena'], PASSWORD_DEFAULT);
                }

                $eliminarFoto = !empty($_POST['eliminar_foto']);
                $fotoParaBorrar = null;
                
                if ($eliminarFoto) {
                    $sql .= ", foto_usuario = ?";
                    $params[] = null;
                    $fotoParaBorrar = $oldFoto;
                } elseif ($rutaFoto) {
                    $sql .= ", foto_usuario = ?";
                    $params[] = $rutaFoto;
                    $fotoParaBorrar = $oldFoto; // Si sube una nueva, la vieja se borra
                }

                $sql .= " WHERE id_usuario = ?";
                $params[] = $id_usuario_edit;
                
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);

                // BORRAR EL ARCHIVO FÍSICO DE LA CARPETA
                if ($fotoParaBorrar) {
                    $rutaFisica = realpath(__DIR__ . '/' . $fotoParaBorrar);
                    if ($rutaFisica && file_exists($rutaFisica)) {
                        unlink($rutaFisica);
                    }
                }

                responder(['success' => true, 'message' => 'Usuario actualizado', 'id' => $id_usuario_edit]);
            } else {
                if (empty($_POST['nueva_contrasena'])) responderError('La contraseña es obligatoria para nuevos usuarios');
                
                $sql = "INSERT INTO usuario (id_tipo_id, numero_documento, nombres, apellidos, email, celular, id_rol, id_localidad, direccion, nueva_contrasena";
                $params = [$data['id_tipo_id'], $data['numero_documento'], $data['nombres'], $data['apellidos'], $data['email'], $data['celular'], $data['id_rol'], $data['id_localidad'], $data['direccion'], password_hash($_POST['nueva_contrasena'], PASSWORD_DEFAULT)];
                
                if ($rutaFoto) {
                    $sql .= ", foto_usuario";
                    $params[] = $rutaFoto;
                }
                $sql .= ") VALUES (" . implode(',', array_fill(0, count($params), '?')) . ")";
                
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
                responder(['success' => true, 'message' => 'Usuario registrado', 'id' => $pdo->lastInsertId()]);
            }
            break;

        case 'eliminar_usuario':
            if (empty($_POST['id_usuario'])) responderError('ID de usuario no proporcionado');
            $id = intval($_POST['id_usuario']);
            
            $id_sesion = $_SESSION['id_usuario'] ?? 0;
            if ($id == $id_sesion) responderError('No puedes eliminar tu propio usuario');
            
            // Validar relaciones
            $check = $pdo->prepare("SELECT (SELECT COUNT(*) FROM mascota WHERE id_usuario = ?) as mascotas, (SELECT COUNT(*) FROM citas WHERE id_usuario = ?) as citas, (SELECT COUNT(*) FROM pedido WHERE id_usuario = ?) as pedidos");
            $check->execute([$id, $id, $id]);
            $relaciones = $check->fetch();
            
            if ($relaciones['mascotas'] > 0 || $relaciones['citas'] > 0 || $relaciones['pedidos'] > 0) {
                responderError('No se puede eliminar: tiene registros asociados (mascotas, citas o pedidos)');
            }
            
            // Borrar foto física del servidor antes de eliminar el registro
            $stmtFoto = $pdo->prepare("SELECT foto_usuario FROM usuario WHERE id_usuario = ?");
            $stmtFoto->execute([$id]);
            $fotoBorrar = $stmtFoto->fetchColumn();
            
            $stmt = $pdo->prepare("DELETE FROM usuario WHERE id_usuario = ?");
            $stmt->execute([$id]);
            
            if ($fotoBorrar) {
                $rutaFisica = realpath(__DIR__ . '/' . $fotoBorrar);
                if ($rutaFisica && file_exists($rutaFisica)) {
                    unlink($rutaFisica);
                }
            }
            
            responder(['success' => true, 'message' => 'Usuario eliminado correctamente']);
            break;

        default:
            responderError('Acción no válida en usuarios_data.php', 400);
    }
} catch (PDOException $e) {
    responderError('Error BD: ' . $e->getMessage(), 500);
} catch (Exception $e) {
    responderError('Error: ' . $e->getMessage(), 500);
}
?>