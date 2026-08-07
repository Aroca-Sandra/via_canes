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
ini_set('upload_max_filesize', '5M');
ini_set('post_max_size', '10M');

ob_start();
require_once 'db.php';

// ================================================================
// SESIÓN Y VERIFICACIÓN DE ADMIN
// ================================================================
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

 $id_usuario = $_SESSION['id_usuario'] ?? 1;
 $id_rol = $_SESSION['id_rol'] ?? 1;

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

// ================================================================
// ROUTER DE ACCIONES
// ================================================================
try {
    switch ($action) {

        // ============================================================
        // DASHBOARD ADMIN
        // ============================================================
        case 'dashboard':
            $stats = [];
            $stats['usuarios'] = $pdo->query("SELECT COUNT(*) FROM usuario")->fetchColumn();
            $stats['productos'] = $pdo->query("SELECT COUNT(*) FROM productos WHERE id_estado_producto = 1")->fetchColumn();
            $stats['servicios'] = $pdo->query("SELECT COUNT(*) FROM servicios WHERE id_estado_servicio = 1")->fetchColumn();
            $stats['stockBajo'] = $pdo->query("SELECT COUNT(*) FROM productos WHERE stock <= 5 AND id_estado_producto = 1")->fetchColumn();
            $stats['citas'] = $pdo->query("SELECT COUNT(*) FROM citas WHERE id_estado_cita IN (1,2)")->fetchColumn();
            $stats['pedidos'] = $pdo->query("SELECT COUNT(*) FROM pedido")->fetchColumn();
            $stats['ventas'] = $pdo->query("SELECT COALESCE(SUM(total),0) FROM pedido WHERE id_estado_pedido IN (2,3,5)")->fetchColumn();
            $stats['mascotas'] = $pdo->query("SELECT COUNT(*) FROM mascota")->fetchColumn();
            $stats['carritos'] = $pdo->query("SELECT COUNT(*) FROM carrito")->fetchColumn();
            $stats['resenas'] = $pdo->query("SELECT COUNT(*) FROM reseñas_productos")->fetchColumn();
            
            responder(['success' => true, 'stats' => $stats]);
            break;

        // ============================================================
        // USUARIOS
        // ============================================================
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
                    $fotoParaBorrar = $oldFoto;
                }

                $sql .= " WHERE id_usuario = ?";
                $params[] = $id_usuario_edit;
                
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);

                if ($fotoParaBorrar) {
                    $rutaFisica = realpath(__DIR__ . '/' . $fotoParaBorrar);
                    if ($rutaFisica && file_exists($rutaFisica)) unlink($rutaFisica);
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
            if ($id == $id_usuario) responderError('No puedes eliminar tu propio usuario');
            
            $stmtFoto = $pdo->prepare("SELECT foto_usuario FROM usuario WHERE id_usuario = ?");
            $stmtFoto->execute([$id]);
            $fotoBorrar = $stmtFoto->fetchColumn();
            
            $check = $pdo->prepare("SELECT (SELECT COUNT(*) FROM mascota WHERE id_usuario = ?) as mascotas, (SELECT COUNT(*) FROM citas WHERE id_usuario = ?) as citas, (SELECT COUNT(*) FROM pedido WHERE id_usuario = ?) as pedidos");
            $check->execute([$id, $id, $id]);
            $relaciones = $check->fetch();
            
            if ($relaciones['mascotas'] > 0 || $relaciones['citas'] > 0 || $relaciones['pedidos'] > 0) {
                responderError('No se puede eliminar: tiene registros asociados');
            }
            
            $stmt = $pdo->prepare("DELETE FROM usuario WHERE id_usuario = ?");
            $stmt->execute([$id]);
            
            if ($fotoBorrar) {
                $rutaFisica = realpath(__DIR__ . '/' . $fotoBorrar);
                if ($rutaFisica && file_exists($rutaFisica)) unlink($rutaFisica);
            }
            
            responder(['success' => true, 'message' => 'Usuario eliminado']);
            break;

        // ============================================================
        // MASCOTAS (ADMIN VE TODAS)
        // ============================================================
        case 'listar_mascotas':
            $stmt = $pdo->query("
                SELECT m.*, u.nombres, u.apellidos, e.nombre as especie, r.nombre as raza, s.sexo_mascota
                FROM mascota m
                LEFT JOIN usuario u ON m.id_usuario = u.id_usuario
                LEFT JOIN especie e ON m.id_especie = e.id_especie
                LEFT JOIN raza r ON m.id_raza = r.id_raza
                LEFT JOIN sexo_mascotas s ON m.id_sexoMascota = s.id_sexoMascota
                ORDER BY m.id_mascota DESC
            ");
            responder(['success' => true, 'data' => $stmt->fetchAll()]);
            break;

        case 'guardar_mascota_admin':
            if (empty($_POST['nombre_mascota']) || empty($_POST['id_usuario'])) {
                responderError('Nombre y dueño son obligatorios');
            }

            $rutaFoto = null;
            if (isset($_FILES['foto_mascota']) && $_FILES['foto_mascota']['error'] === UPLOAD_ERR_OK) {
                $uploadDir = __DIR__ . '/../img/mascotas/';
                if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);

                $ext = strtolower(pathinfo($_FILES['foto_mascota']['name'], PATHINFO_EXTENSION));
                $permitidos = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
                if (!in_array($ext, $permitidos)) responderError('Formato no permitido');

                $nombreFoto = 'mascota_' . $_POST['id_usuario'] . '_' . time() . '.' . $ext;
                $rutaFinal = $uploadDir . $nombreFoto;
                if (!move_uploaded_file($_FILES['foto_mascota']['tmp_name'], $rutaFinal)) responderError('No se pudo guardar la imagen');
                $rutaFoto = '../img/mascotas/' . $nombreFoto;
            }

            $id_mascota = $_POST['id_mascota'] ?? null;
            $esEdicion = !empty($id_mascota);

            if ($esEdicion) {
                $stmtOld = $pdo->prepare("SELECT foto_mascota FROM mascota WHERE id_mascota = ?");
                $stmtOld->execute([$id_mascota]);
                $oldFoto = $stmtOld->fetchColumn();

                $sql = "UPDATE mascota SET id_usuario = ?, nombre_mascota = ?, id_especie = ?, id_raza = ?, id_sexoMascota = ?, peso_mascota = ?, edad_mascota = ?, color_mascota = ?, observaciones_mascota = ?, especie_detalle = ?, raza_detalle = ?";
                $params = [$_POST['id_usuario'], trim($_POST['nombre_mascota']), $_POST['id_especie'] ?? 1, $_POST['id_raza'] ?? null, $_POST['id_sexoMascota'] ?? null, $_POST['peso_mascota'] ?? null, trim($_POST['edad_mascota'] ?? ''), trim($_POST['color_mascota'] ?? ''), trim($_POST['observaciones_mascota'] ?? ''), $_POST['especie_detalle'] ?? null, $_POST['raza_detalle'] ?? null];
                
                $fotoParaBorrar = null;
                if ($rutaFoto) {
                    $sql .= ", foto_mascota = ?";
                    $params[] = $rutaFoto;
                    $fotoParaBorrar = $oldFoto; // Se marca la vieja para borrar
                }
                $sql .= " WHERE id_mascota = ?";
                $params[] = $id_mascota;
                
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);

                if ($fotoParaBorrar) {
                    $rutaFisica = realpath(__DIR__ . '/' . $fotoParaBorrar);
                    if ($rutaFisica && file_exists($rutaFisica)) unlink($rutaFisica);
                }

                responder(['success' => true, 'message' => 'Mascota actualizada']);
            } else {
                $sql = "INSERT INTO mascota (id_usuario, nombre_mascota, id_especie, id_raza, id_sexoMascota, peso_mascota, edad_mascota, color_mascota, observaciones_mascota, especie_detalle, raza_detalle";
                $params = [$_POST['id_usuario'], trim($_POST['nombre_mascota']), $_POST['id_especie'] ?? 1, $_POST['id_raza'] ?? null, $_POST['id_sexoMascota'] ?? null, $_POST['peso_mascota'] ?? null, trim($_POST['edad_mascota'] ?? ''), trim($_POST['color_mascota'] ?? ''), trim($_POST['observaciones_mascota'] ?? ''), $_POST['especie_detalle'] ?? null, $_POST['raza_detalle'] ?? null];
                
                if ($rutaFoto) {
                    $sql .= ", foto_mascota";
                    $params[] = $rutaFoto;
                }
                $sql .= ") VALUES (" . implode(',', array_fill(0, count($params), '?')) . ")";
                
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
                responder(['success' => true, 'message' => 'Mascota registrada', 'id' => $pdo->lastInsertId()]);
            }
            break;

        case 'eliminar_mascota_admin':
            if (empty($_POST['id_mascota'])) responderError('ID requerido');
            
            $stmtFoto = $pdo->prepare("SELECT foto_mascota FROM mascota WHERE id_mascota = ?");
            $stmtFoto->execute([$_POST['id_mascota']]);
            $fotoBorrar = $stmtFoto->fetchColumn();
            
            $stmt = $pdo->prepare("DELETE FROM mascota WHERE id_mascota = ?");
            $stmt->execute([$_POST['id_mascota']]);
            
            if ($fotoBorrar) {
                $rutaFisica = realpath(__DIR__ . '/' . $fotoBorrar);
                if ($rutaFisica && file_exists($rutaFisica)) unlink($rutaFisica);
            }
            
            responder(['success' => true, 'message' => 'Mascota eliminada']);
            break;

        // ============================================================
        // CITAS (ADMIN VE TODAS)
        // ============================================================
        case 'listar_citas':
            $stmt = $pdo->query("
                SELECT c.*, u.nombres, u.apellidos, m.nombre_mascota, s.nombre as servicio, ec.nombre as estado
                FROM citas c
                LEFT JOIN usuario u ON c.id_usuario = u.id_usuario
                LEFT JOIN mascota m ON c.id_mascota = m.id_mascota
                LEFT JOIN servicios s ON c.id_servicio = s.id_servicio
                LEFT JOIN estado_cita ec ON c.id_estado_cita = ec.id_estado_cita
                ORDER BY c.fecha_cita DESC, c.hora_cita DESC
            ");
            responder(['success' => true, 'data' => $stmt->fetchAll()]);
            break;

        case 'guardar_cita_admin':
            $requeridos = ['id_usuario', 'id_mascota', 'id_servicio', 'fecha', 'hora'];
            foreach ($requeridos as $campo) {
                if (empty($_POST[$campo])) responderError("El campo '$campo' es obligatorio");
            }

            $sql = "INSERT INTO citas (id_usuario, id_mascota, id_servicio, fecha_cita, hora_cita, notas, id_estado_cita) VALUES (?, ?, ?, ?, ?, ?, ?)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$_POST['id_usuario'], $_POST['id_mascota'], $_POST['id_servicio'], $_POST['fecha'], $_POST['hora'], trim($_POST['notas'] ?? ''), $_POST['id_estado_cita'] ?? 1]);
            responder(['success' => true, 'message' => 'Cita agendada', 'id' => $pdo->lastInsertId()]);
            break;

        case 'actualizar_estado_cita':
            if (empty($_POST['id_cita']) || empty($_POST['id_estado_cita'])) responderError('ID de cita y estado son obligatorios');
            $stmt = $pdo->prepare("UPDATE citas SET id_estado_cita = ? WHERE id_cita = ?");
            $stmt->execute([$_POST['id_estado_cita'], $_POST['id_cita']]);
            responder(['success' => true, 'message' => 'Estado actualizado']);
            break;

        case 'eliminar_cita_admin':
            if (empty($_POST['id_cita'])) responderError('ID requerido');
            $stmt = $pdo->prepare("DELETE FROM citas WHERE id_cita = ?");
            $stmt->execute([$_POST['id_cita']]);
            responder(['success' => true, 'message' => 'Cita eliminada']);
            break;

        // ============================================================
        // PRODUCTOS
        // ============================================================
        case 'listar_productos':
            $stmt = $pdo->query("
                SELECT p.*, c.nombre as categoria, pr.nombre_empresa as proveedor, ep.nombre as estado
                FROM productos p
                LEFT JOIN categorias_producto c ON p.id_categoria = c.id_categoria
                LEFT JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor
                LEFT JOIN estados_producto ep ON p.id_estado_producto = ep.id_estado_producto
                ORDER BY p.id_producto DESC
            ");
            responder(['success' => true, 'data' => $stmt->fetchAll()]);
            break;

        case 'productos_stock_bajo':
            $stmt = $pdo->query("SELECT p.*, c.nombre as categoria FROM productos p LEFT JOIN categorias_producto c ON p.id_categoria = c.id_categoria WHERE p.stock <= 5 AND p.id_estado_producto = 1 ORDER BY p.stock ASC");
            responder(['success' => true, 'data' => $stmt->fetchAll()]);
            break;

        case 'guardar_producto':
            $requeridos = ['nombre', 'costo_compra', 'precio_venta', 'id_categoria'];
            foreach ($requeridos as $campo) {
                if (empty($_POST[$campo])) responderError("El campo '$campo' es obligatorio");
            }

            $id_producto = $_POST['id_producto'] ?? null;
            $esEdicion = !empty($id_producto);

            $rutaImagen = null;
            if (isset($_FILES['imagen_producto']) && $_FILES['imagen_producto']['error'] === UPLOAD_ERR_OK) {
                $uploadDir = __DIR__ . '/../img/img.productosperros/';
                if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);

                $ext = strtolower(pathinfo($_FILES['imagen_producto']['name'], PATHINFO_EXTENSION));
                $permitidos = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
                if (!in_array($ext, $permitidos)) responderError('Formato no permitido');

                $nombreImg = 'prod_' . time() . '_' . rand(1000,9999) . '.' . $ext;
                $rutaFinal = $uploadDir . $nombreImg;
                if (!move_uploaded_file($_FILES['imagen_producto']['tmp_name'], $rutaFinal)) responderError('No se pudo guardar la imagen');
                $rutaImagen = '../img/img.productosperros/' . $nombreImg;
            }

            if ($esEdicion) {
                $stmtOld = $pdo->prepare("SELECT imagen_url FROM productos WHERE id_producto = ?");
                $stmtOld->execute([$id_producto]);
                $oldFoto = $stmtOld->fetchColumn();

                $sql = "UPDATE productos SET id_categoria = ?, id_proveedor = ?, nombre = ?, descripcion = ?, stock = ?, costo_compra = ?, precio_venta = ?, id_estado_producto = ?, codigo_barras = ?";
                $params = [$_POST['id_categoria'], !empty($_POST['id_proveedor']) ? $_POST['id_proveedor'] : null, trim($_POST['nombre']), trim($_POST['descripcion'] ?? ''), $_POST['stock'] ?? 0, $_POST['costo_compra'], $_POST['precio_venta'], $_POST['id_estado_producto'] ?? 1, trim($_POST['codigo_barras'] ?? '')];

                $fotoParaBorrar = null;
                if ($rutaImagen) {
                    $sql .= ", imagen_url = ?";
                    $params[] = $rutaImagen;
                    $fotoParaBorrar = $oldFoto; // Se marca la vieja para borrar
                }
                $sql .= " WHERE id_producto = ?";
                $params[] = $id_producto;

                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);

                if ($fotoParaBorrar) {
                    $rutaFisica = realpath(__DIR__ . '/' . $fotoParaBorrar);
                    if ($rutaFisica && file_exists($rutaFisica)) unlink($rutaFisica);
                }

                responder(['success' => true, 'message' => 'Producto actualizado']);
            } else {
                $sql = "INSERT INTO productos (id_categoria, id_proveedor, nombre, descripcion, stock, costo_compra, precio_venta, imagen_url, id_estado_producto, codigo_barras) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$_POST['id_categoria'], !empty($_POST['id_proveedor']) ? $_POST['id_proveedor'] : null, trim($_POST['nombre']), trim($_POST['descripcion'] ?? ''), $_POST['stock'] ?? 0, $_POST['costo_compra'], $_POST['precio_venta'], $rutaImagen, $_POST['id_estado_producto'] ?? 1, trim($_POST['codigo_barras'] ?? '')]);
                responder(['success' => true, 'message' => 'Producto creado', 'id' => $pdo->lastInsertId()]);
            }
            break;

        case 'eliminar_producto':
            if (empty($_POST['id_producto'])) responderError('ID requerido');
            
            $stmtFoto = $pdo->prepare("SELECT imagen_url FROM productos WHERE id_producto = ?");
            $stmtFoto->execute([$_POST['id_producto']]);
            $fotoBorrar = $stmtFoto->fetchColumn();
            
            $stmt = $pdo->prepare("DELETE FROM productos WHERE id_producto = ?");
            $stmt->execute([$_POST['id_producto']]);
            
            if ($fotoBorrar) {
                $rutaFisica = realpath(__DIR__ . '/' . $fotoBorrar);
                if ($rutaFisica && file_exists($rutaFisica)) unlink($rutaFisica);
            }
            
            responder(['success' => true, 'message' => 'Producto eliminado']);
            break;

        // ============================================================
        // SERVICIOS
        // ============================================================
        case 'listar_servicios':
            $stmt = $pdo->query("SELECT s.*, cs.nombre as categoria, es.nombre as estado FROM servicios s LEFT JOIN categoria_servicio cs ON s.id_categoria_servicio = cs.id_categoria_servicio LEFT JOIN estado_servicio es ON s.id_estado_servicio = es.id_estado_servicio ORDER BY s.id_servicio DESC");
            responder(['success' => true, 'data' => $stmt->fetchAll()]);
            break;

        case 'guardar_servicio':
            $requeridos = ['nombre', 'precio'];
            foreach ($requeridos as $campo) {
                if (empty($_POST[$campo])) responderError("El campo '$campo' es obligatorio");
            }

            $id_servicio = !empty($_POST['id_servicio']) ? $_POST['id_servicio'] : null;
            $esEdicion = !empty($id_servicio);
            
            $duracion = !empty($_POST['duracion']) ? $_POST['duracion'] : null;
            $id_categoria_servicio = !empty($_POST['id_categoria_servicio']) ? intval($_POST['id_categoria_servicio']) : null;
            $id_estado_servicio = !empty($_POST['id_estado_servicio']) ? intval($_POST['id_estado_servicio']) : 1;

            if ($esEdicion) {
                $sql = "UPDATE servicios SET nombre = ?, descripcion = ?, precio = ?, duracion = ?, id_estado_servicio = ?, id_categoria_servicio = ?";
                $params = [
                    trim($_POST['nombre']), 
                    trim($_POST['descripcion'] ?? ''), 
                    $_POST['precio'], 
                    $duracion,                      
                    $id_estado_servicio,            
                    $id_categoria_servicio         
                ];
                $sql .= " WHERE id_servicio = ?";
                $params[] = $id_servicio;
                
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
                responder(['success' => true, 'message' => 'Servicio actualizado']);
            } else {
                $sql = "INSERT INTO servicios (nombre, descripcion, precio, duracion, id_estado_servicio, id_categoria_servicio) VALUES (?, ?, ?, ?, ?, ?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    trim($_POST['nombre']), 
                    trim($_POST['descripcion'] ?? ''), 
                    $_POST['precio'], 
                    $duracion,                      
                    $id_estado_servicio,            
                    $id_categoria_servicio         
                ]);
                responder(['success' => true, 'message' => 'Servicio creado', 'id' => $pdo->lastInsertId()]);
            }
            break;

        // ============================================================
        // PROVEEDORES
        // ============================================================
        case 'listar_proveedores':
            $stmt = $pdo->query("SELECT * FROM proveedores ORDER BY nombre_empresa");
            responder(['success' => true, 'data' => $stmt->fetchAll()]);
            break;

        case 'guardar_proveedor':
            $requeridos = ['nombre_empresa', 'nit_cedula', 'contacto_nombre', 'telefono', 'correo'];
            foreach ($requeridos as $campo) {
                if (empty($_POST[$campo])) responderError("El campo '$campo' es obligatorio");
            }

            $id_proveedor = $_POST['id_proveedor'] ?? null;
            $esEdicion = !empty($id_proveedor);
            
            $direccion = trim($_POST['direccion'] ?? '');
            $marcas = trim($_POST['marcas'] ?? '');

            if ($esEdicion) {
                $sql = "UPDATE proveedores SET nombre_empresa = ?, nit_cedula = ?, contacto_nombre = ?, telefono = ?, correo = ?, direccion = ?, marcas = ? WHERE id_proveedor = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    trim($_POST['nombre_empresa']), 
                    trim($_POST['nit_cedula']), 
                    trim($_POST['contacto_nombre']), 
                    trim($_POST['telefono']), 
                    trim($_POST['correo']), 
                    $direccion, 
                    $marcas,    
                    $id_proveedor
                ]);
                responder(['success' => true, 'message' => 'Proveedor actualizado']);
            } else {
                $sql = "INSERT INTO proveedores (nombre_empresa, nit_cedula, contacto_nombre, telefono, correo, direccion, marcas) VALUES (?, ?, ?, ?, ?, ?, ?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    trim($_POST['nombre_empresa']), 
                    trim($_POST['nit_cedula']), 
                    trim($_POST['contacto_nombre']), 
                    trim($_POST['telefono']), 
                    trim($_POST['correo']), 
                    $direccion, 
                    $marcas     
                ]);
                responder(['success' => true, 'message' => 'Proveedor creado', 'id' => $pdo->lastInsertId()]);
            }
            break;

        case 'eliminar_proveedor':
            if (empty($_POST['id_proveedor'])) responderError('ID requerido');
            try {
                $stmt = $pdo->prepare("DELETE FROM proveedores WHERE id_proveedor = ?");
                $stmt->execute([$_POST['id_proveedor']]);
                responder(['success' => true, 'message' => 'Proveedor eliminado']);
            } catch (PDOException $e) {
                if ($e->getCode() == 23000) responderError('No se puede eliminar: tiene productos o compras asociadas');
                responderError('Error: ' . $e->getMessage());
            }
            break;

        // ============================================================
        // COMPRAS
        // ============================================================
        case 'listar_compras':
            $stmt = $pdo->query("SELECT cp.*, pr.nombre_empresa as proveedor, p.nombre as producto FROM compras_proveedor cp LEFT JOIN proveedores pr ON cp.id_proveedor = pr.id_proveedor LEFT JOIN productos p ON cp.id_producto = p.id_producto ORDER BY cp.fecha DESC");
            responder(['success' => true, 'data' => $stmt->fetchAll()]);
            break;

        case 'guardar_compra':
            $requeridos = ['id_proveedor', 'id_producto', 'cantidad', 'costo_unitario', 'fecha'];
            foreach ($requeridos as $campo) {
                if (empty($_POST[$campo])) responderError("El campo '$campo' es obligatorio");
            }

            $numero_factura = $_POST['numero_factura'] ?? null;
            $id_compra = $_POST['id_compra'] ?? null;
            $esEdicion = !empty($id_compra);

            if ($esEdicion) {
                $stmtOld = $pdo->prepare("SELECT id_producto, cantidad FROM compras_proveedor WHERE id_compra = ?");
                $stmtOld->execute([$id_compra]);
                $old = $stmtOld->fetch();
                if ($old) {
                    $pdo->prepare("UPDATE productos SET stock = stock - ? WHERE id_producto = ?")->execute([$old['cantidad'], $old['id_producto']]);
                }
            }

            $pdo->prepare("UPDATE productos SET stock = stock + ? WHERE id_producto = ?")->execute([$_POST['cantidad'], $_POST['id_producto']]);

            if ($esEdicion) {
                $sql = "UPDATE compras_proveedor SET id_proveedor = ?, numero_factura = ?, id_producto = ?, cantidad = ?, costo_unitario = ?, fecha = ? WHERE id_compra = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    $_POST['id_proveedor'], 
                    $numero_factura, 
                    $_POST['id_producto'], 
                    $_POST['cantidad'], 
                    $_POST['costo_unitario'], 
                    $_POST['fecha'], 
                    $id_compra
                ]);
                responder(['success' => true, 'message' => 'Compra actualizada']);
            } else {
                $sql = "INSERT INTO compras_proveedor (id_proveedor, numero_factura, id_producto, cantidad, costo_unitario, fecha) VALUES (?, ?, ?, ?, ?, ?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    $_POST['id_proveedor'], 
                    $numero_factura, 
                    $_POST['id_producto'], 
                    $_POST['cantidad'], 
                    $_POST['costo_unitario'], 
                    $_POST['fecha']
                ]);
                responder(['success' => true, 'message' => 'Compra registrada', 'id' => $pdo->lastInsertId()]);
            }
            break;

        case 'eliminar_compra':
            if (empty($_POST['id_compra'])) responderError('ID requerido');
            $stmt = $pdo->prepare("SELECT id_producto, cantidad FROM compras_proveedor WHERE id_compra = ?");
            $stmt->execute([$_POST['id_compra']]);
            $compra = $stmt->fetch();
            if ($compra) {
                $pdo->prepare("UPDATE productos SET stock = stock - ? WHERE id_producto = ?")->execute([$compra['cantidad'], $compra['id_producto']]);
            }
            $pdo->prepare("DELETE FROM compras_proveedor WHERE id_compra = ?")->execute([$_POST['id_compra']]);
            responder(['success' => true, 'message' => 'Compra eliminada y stock revertido']);
            break;

        // ============================================================
        // PEDIDOS
        // ============================================================
        case 'listar_pedidos_admin':
            $stmt = $pdo->query("SELECT p.*, u.nombres, u.apellidos, ep.nombre as estado FROM pedido p LEFT JOIN usuario u ON p.id_usuario = u.id_usuario LEFT JOIN estado_pedido ep ON p.id_estado_pedido = ep.id_estado_pedido ORDER BY p.fecha DESC");
            $pedidos = $stmt->fetchAll();

            foreach ($pedidos as &$p) {
                $stmt2 = $pdo->prepare("SELECT dp.*, pr.nombre, pr.imagen_url FROM detalle_pedido dp LEFT JOIN productos pr ON dp.id_producto = pr.id_producto WHERE dp.id_pedido = ?");
                $stmt2->execute([$p['id_pedido']]);
                $p['detalles'] = $stmt2->fetchAll();

                $stmt3 = $pdo->prepare("SELECT pg.*, m.nombre as metodo_pago, ep.nombre as estado_pago FROM pagos pg LEFT JOIN metodos_catalogo m ON pg.id_metodo = m.id_metodo LEFT JOIN estado_pago ep ON pg.id_estado_pago = ep.id_estado_pago WHERE pg.id_pedido = ? LIMIT 1");
                $stmt3->execute([$p['id_pedido']]);
                $p['pago'] = $stmt3->fetch() ?: null;
            }
            responder(['success' => true, 'data' => $pedidos]);
            break;

        case 'actualizar_estado_pedido':
            if (empty($_POST['id_pedido']) || empty($_POST['id_estado_pedido'])) responderError('ID de pedido y estado son obligatorios');
            $stmt = $pdo->prepare("UPDATE pedido SET id_estado_pedido = ? WHERE id_pedido = ?");
            $stmt->execute([$_POST['id_estado_pedido'], $_POST['id_pedido']]);
            responder(['success' => true, 'message' => 'Estado actualizado']);
            break;

        // ============================================================
        // PROMOCIONES
        // ============================================================
        case 'listar_promociones':
            $stmt = $pdo->query("SELECT p.*, ep.nombre as estado_nombre FROM promociones p LEFT JOIN estado_promocion ep ON p.id_estado_promocion = ep.id_estado_promocion ORDER BY p.fecha_creacion DESC");
            $promos = $stmt->fetchAll();
            foreach ($promos as &$promo) {
                $stmt2 = $pdo->prepare("SELECT pp.*, pr.nombre as producto_nombre FROM producto_promocion pp LEFT JOIN productos pr ON pp.id_producto = pr.id_producto WHERE pp.id_promo = ?");
                $stmt2->execute([$promo['id_promo']]);
                $promo['productos'] = $stmt2->fetchAll();
            }
            responder(['success' => true, 'data' => $promos]);
            break;

        case 'guardar_promocion':
            $requeridos = ['nombre', 'valor', 'tipo_descuento', 'fecha_inicio', 'fecha_fin'];
            foreach ($requeridos as $campo) {
                if (empty($_POST[$campo])) responderError("El campo '$campo' es obligatorio");
            }

            $id_promo = $_POST['id_promo'] ?? null;
            $esEdicion = !empty($id_promo);

            if ($esEdicion) {
                $sql = "UPDATE promociones SET nombre = ?, descripcion = ?, valor = ?, tipo_descuento = ?, fecha_inicio = ?, fecha_fin = ?, id_estado_promocion = ? WHERE id_promo = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([trim($_POST['nombre']), trim($_POST['descripcion'] ?? ''), $_POST['valor'], $_POST['tipo_descuento'], $_POST['fecha_inicio'], $_POST['fecha_fin'], $_POST['id_estado_promocion'] ?? 1, $id_promo]);
                responder(['success' => true, 'message' => 'Promoción actualizada']);
            } else {
                $sql = "INSERT INTO promociones (nombre, descripcion, valor, tipo_descuento, fecha_inicio, fecha_fin, fecha_creacion, id_estado_promocion) VALUES (?, ?, ?, ?, ?, ?, CURDATE(), ?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([trim($_POST['nombre']), trim($_POST['descripcion'] ?? ''), $_POST['valor'], $_POST['tipo_descuento'], $_POST['fecha_inicio'], $_POST['fecha_fin'], $_POST['id_estado_promocion'] ?? 1]);
                responder(['success' => true, 'message' => 'Promoción creada', 'id' => $pdo->lastInsertId()]);
            }
            break;

        case 'eliminar_promocion':
            if (empty($_POST['id_promo'])) responderError('ID requerido');
            $pdo->prepare("DELETE FROM producto_promocion WHERE id_promo = ?")->execute([$_POST['id_promo']]);
            $pdo->prepare("DELETE FROM promociones WHERE id_promo = ?")->execute([$_POST['id_promo']]);
            responder(['success' => true, 'message' => 'Promoción eliminada']);
            break;

        case 'asignar_producto_promo':
            if (empty($_POST['id_promo']) || empty($_POST['id_producto'])) responderError('Promoción y producto son obligatorios');
            $stmt = $pdo->prepare("SELECT * FROM producto_promocion WHERE id_promo = ? AND id_producto = ?");
            $stmt->execute([$_POST['id_promo'], $_POST['id_producto']]);
            if ($stmt->fetch()) responderError('Este producto ya está vinculado');
            $sql = "INSERT INTO producto_promocion (id_producto, id_promo) VALUES (?, ?)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$_POST['id_producto'], $_POST['id_promo']]);
            responder(['success' => true, 'message' => 'Producto vinculado']);
            break;

        case 'desvincular_producto_promo':
            if (empty($_POST['id_producto_promocion'])) responderError('ID requerido');
            $pdo->prepare("DELETE FROM producto_promocion WHERE id_producto_promocion = ?")->execute([$_POST['id_producto_promocion']]);
            responder(['success' => true, 'message' => 'Vínculo eliminado']);
            break;

        // ============================================================
        // RESEÑAS
        // ============================================================
        case 'listar_resenas':
            $stmt = $pdo->query("SELECT r.*, p.nombre as producto, u.nombres, u.apellidos FROM reseñas_productos r LEFT JOIN productos p ON r.id_producto = p.id_producto LEFT JOIN usuario u ON r.id_usuario = u.id_usuario ORDER BY r.fecha DESC");
            responder(['success' => true, 'data' => $stmt->fetchAll()]);
            break;

        case 'guardar_resena':
            $requeridos = ['id_producto', 'id_usuario', 'estrellas', 'comentario'];
            foreach ($requeridos as $campo) {
                if (empty($_POST[$campo])) responderError("El campo '$campo' es obligatorio");
            }

            $id_resena = $_POST['id_resena'] ?? null;
            $esEdicion = !empty($id_resena);

            if ($esEdicion) {
                $sql = "UPDATE reseñas_productos SET id_producto = ?, id_usuario = ?, estrellas = ?, comentario = ? WHERE id_reseña = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$_POST['id_producto'], $_POST['id_usuario'], $_POST['estrellas'], trim($_POST['comentario']), $id_resena]);
                responder(['success' => true, 'message' => 'Reseña actualizada']);
            } else {
                $sql = "INSERT INTO reseñas_productos (id_producto, id_usuario, estrellas, comentario, fecha) VALUES (?, ?, ?, ?, NOW())";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$_POST['id_producto'], $_POST['id_usuario'], $_POST['estrellas'], trim($_POST['comentario'])]);
                responder(['success' => true, 'message' => 'Reseña creada', 'id' => $pdo->lastInsertId()]);
            }
            break;

        case 'eliminar_resena':
            if (empty($_POST['id_resena'])) responderError('ID requerido');
            $pdo->prepare("DELETE FROM reseñas_productos WHERE id_reseña = ?")->execute([$_POST['id_resena']]);
            responder(['success' => true, 'message' => 'Reseña eliminada']);
            break;

        // ============================================================
        // CARRITOS
        // ============================================================
        case 'listar_carritos':
            $stmt = $pdo->query("SELECT c.*, u.nombres, u.apellidos, u.email, COUNT(dc.id_detalle) as total_productos, COALESCE(SUM(dc.subtotal), 0) as total_carrito FROM carrito c LEFT JOIN usuario u ON c.id_usuario = u.id_usuario LEFT JOIN detalle_carrito dc ON c.id_carrito = dc.id_carrito GROUP BY c.id_carrito ORDER BY c.fecha_creacion DESC");
            $carritos = $stmt->fetchAll();
            foreach ($carritos as &$c) {
                $stmt2 = $pdo->prepare("SELECT dc.*, p.nombre, p.imagen_url, p.precio_venta FROM detalle_carrito dc LEFT JOIN productos p ON dc.id_producto = p.id_producto WHERE dc.id_carrito = ?");
                $stmt2->execute([$c['id_carrito']]);
                $c['productos'] = $stmt2->fetchAll();
            }
            responder(['success' => true, 'data' => $carritos]);
            break;

        case 'eliminar_carrito':
            if (empty($_POST['id_carrito'])) responderError('ID requerido');
            $pdo->prepare("DELETE FROM detalle_carrito WHERE id_carrito = ?")->execute([$_POST['id_carrito']]);
            $pdo->prepare("DELETE FROM carrito WHERE id_carrito = ?")->execute([$_POST['id_carrito']]);
            responder(['success' => true, 'message' => 'Carrito eliminado']);
            break;

        // ============================================================
        // DATOS PARA SELECTS
        // ============================================================
        case 'listar_roles':
            $stmt = $pdo->query("SELECT id_rol, nombre_rol FROM rol ORDER BY nombre_rol");
            responder(['success' => true, 'data' => $stmt->fetchAll()]);
            break;

        case 'listar_localidades':
            $stmt = $pdo->query("SELECT id_localidad, nombre_localidad FROM localidad ORDER BY nombre_localidad");
            responder(['success' => true, 'data' => $stmt->fetchAll()]);
            break;

        case 'listar_tipos_documento':
            $stmt = $pdo->query("SELECT id_tipo_id, sigla, nombre FROM tipo_identificacion ORDER BY nombre");
            responder(['success' => true, 'data' => $stmt->fetchAll()]);
            break;

        case 'listar_especies':
            $stmt = $pdo->query("SELECT id_especie, nombre FROM especie ORDER BY nombre");
            responder(['success' => true, 'data' => $stmt->fetchAll()]);
            break;

        case 'listar_razas':
            $idEspecie = $_GET['id_especie'] ?? null;
            $sql = "SELECT id_raza, nombre FROM raza";
            $params = [];
            if ($idEspecie) {
                $sql .= " WHERE id_especie = ?";
                $params[] = $idEspecie;
            }
            $sql .= " ORDER BY nombre";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            responder(['success' => true, 'data' => $stmt->fetchAll()]);
            break;

        case 'listar_sexos_mascota':
            $stmt = $pdo->query("SELECT id_sexoMascota, sexo_mascota FROM sexo_mascotas ORDER BY sexo_mascota");
            responder(['success' => true, 'data' => $stmt->fetchAll()]);
            break;

        case 'listar_servicios_select':
            $stmt = $pdo->query("SELECT id_servicio, nombre, precio FROM servicios WHERE id_estado_servicio = 1 ORDER BY nombre");
            responder(['success' => true, 'data' => $stmt->fetchAll()]);
            break;

        case 'listar_clientes':
            $stmt = $pdo->query("SELECT id_usuario, CONCAT(nombres, ' ', apellidos) as nombre_completo, email FROM usuario WHERE id_rol = 2 ORDER BY nombres");
            responder(['success' => true, 'data' => $stmt->fetchAll()]);
            break;

        case 'listar_mascotas_por_cliente':
            $idUsuario = $_GET['id_usuario'] ?? null;
            if (!$idUsuario) responderError('ID de usuario requerido');
            $stmt = $pdo->prepare("SELECT id_mascota, nombre_mascota FROM mascota WHERE id_usuario = ? ORDER BY nombre_mascota");
            $stmt->execute([$idUsuario]);
            responder(['success' => true, 'data' => $stmt->fetchAll()]);
            break;

        case 'listar_estados_cita':
            $stmt = $pdo->query("SELECT id_estado_cita, nombre FROM estado_cita ORDER BY nombre");
            responder(['success' => true, 'data' => $stmt->fetchAll()]);
            break;

        case 'listar_categorias_producto':
            $stmt = $pdo->query("SELECT id_categoria, nombre FROM categorias_producto ORDER BY nombre");
            responder(['success' => true, 'data' => $stmt->fetchAll()]);
            break;

        case 'listar_estados_producto':
            $stmt = $pdo->query("SELECT id_estado_producto, nombre FROM estados_producto ORDER BY nombre");
            responder(['success' => true, 'data' => $stmt->fetchAll()]);
            break;

        case 'listar_categorias_servicio':
            $stmt = $pdo->query("SELECT id_categoria_servicio, nombre FROM categoria_servicio ORDER BY nombre");
            responder(['success' => true, 'data' => $stmt->fetchAll()]);
            break;

        case 'listar_estados_pedido':
            $stmt = $pdo->query("SELECT id_estado_pedido, nombre FROM estado_pedido ORDER BY nombre");
            responder(['success' => true, 'data' => $stmt->fetchAll()]);
            break;

        case 'listar_estados_promocion':
            $stmt = $pdo->query("SELECT id_estado_promocion, nombre FROM estado_promocion ORDER BY nombre");
            responder(['success' => true, 'data' => $stmt->fetchAll()]);
            break;

        case 'cerrar_sesion':
            $_SESSION = [];
            session_destroy();
            responder(['success' => true, 'message' => 'Sesión cerrada']);
            break;

        default:
            responderError('Acción no válida: ' . $action, 400);
    }

} catch (PDOException $e) {
    responderError('Error BD: ' . $e->getMessage(), 500);
} catch (Exception $e) {
    responderError('Error: ' . $e->getMessage(), 500);
}
?>