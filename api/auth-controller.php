<?php
// api/auth-controller.php

// Configurar manejo de errores para devolver JSON
error_reporting(E_ALL);
ini_set('display_errors', 0); 
ini_set('log_errors', 1);

// Manejador de errores fatal
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        if (ob_get_length()) ob_clean();
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'message' => 'Error interno del servidor: ' . $error['message']
        ]);
        exit;
    }
});

// Manejador de excepciones no capturadas
set_exception_handler(function($e) {
    if (ob_get_length()) ob_clean();
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
    exit;
});

ob_start();
session_start();
header('Content-Type: application/json');

if (!file_exists('db.php')) {
    echo json_encode(['success' => false, 'message' => 'Configuración DB no encontrada.']);
    exit;
}
require_once 'db.php';

if (!isset($pdo)) {
    echo json_encode(['success' => false, 'message' => 'Error de conexión BD.']);
    exit;
}

function sendResponse($success, $message, $extra = [], $httpCode = 200) {
    if (ob_get_length()) ob_clean();
    http_response_code($httpCode);
    echo json_encode(array_merge(['success' => $success, 'message' => $message], $extra));
    exit;
}

// --- LECTURA DE DATOS ROBUSTA (Soporta JSON y Form-Data) ---
$inputJSON = file_get_contents('php://input');
$data = json_decode($inputJSON, true);

// Si falla el JSON o está vacío, intentar leer $_POST (por si acaso)
if (json_last_error() !== JSON_ERROR_NONE || empty($data)) {
    $data = $_POST;
}

$action = $data['action'] ?? '';

switch ($action) {
    
    // ============ INICIAR SESIÓN =========== // 
    case 'login':
        $email = trim($data['email'] ?? '');
        $password = $data['password'] ?? '';

        if (!$email || !$password) {
            sendResponse(false, 'Correo y contraseña son obligatorios.', [], 400);
        }

        try {
            // Tu tabla usa 'nueva_contrasena'
            $stmt = $pdo->prepare("SELECT u.*, r.nombre_rol FROM usuario u JOIN rol r ON u.id_rol = r.id_rol WHERE u.email = ?");
            $stmt->execute([$email]);
            $user = $stmt->fetch();

            if ($user && password_verify($password, $user['nueva_contrasena'])) {
                $_SESSION['id_usuario'] = $user['id_usuario'];
                $_SESSION['nombre'] = $user['nombres'];
                $_SESSION['rol'] = $user['nombre_rol'];

                $redirect = '../html/panel-usuario.html'; // Default cliente
                if ($user['nombre_rol'] === 'ADMINISTRADOR' || $user['nombre_rol'] === 'VENDEDOR') {
                    $redirect = '../admin/index.html';
                }

                sendResponse(true, 'Inicio de sesión exitoso.', ['redirect' => $redirect], 200);
            } else {
                sendResponse(false, 'Correo o contraseña incorrectos.', [], 401);
            }
        } catch (PDOException $e) {
            sendResponse(false, 'Error interno al iniciar sesión.', [], 500);
        }
        break;

    // ================= REGISTRO =================// 
    // CORRECCIÓN: Aceptamos 'register' Y 'registrar_usuario'
    case 'register':
    case 'registrar_usuario':
        $nombres = trim($data['nombres'] ?? '');
        $apellidos = trim($data['apellidos'] ?? '');
        $celular = trim($data['celular'] ?? '');
        $email = trim($data['email'] ?? '');
        $password = $data['password'] ?? '';

        if (!$nombres || !$apellidos || !$celular || !$email || !$password) {
            sendResponse(false, 'Todos los campos son obligatorios.', [], 400);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            sendResponse(false, 'El formato del correo electrónico no es válido.', [], 400);
        }

        // Validación de contraseña segura
        if (!preg_match('/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/', $password)) {
            sendResponse(false, 'La contraseña debe tener 6+ caracteres, mayúscula, minúscula, número y símbolo.', [], 400);
        }

        try {
            $stmt = $pdo->prepare("SELECT id_usuario FROM usuario WHERE email = ?");
            $stmt->execute([$email]);
            if ($stmt->fetch()) {
                sendResponse(false, 'Este correo electrónico ya está registrado.', [], 409);
            }

            $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

            // Insertar con Rol 2 (Cliente)
            $stmt = $pdo->prepare("INSERT INTO usuario (id_rol, nombres, apellidos, email, celular, nueva_contrasena) VALUES (2, ?, ?, ?, ?, ?)");
            $stmt->execute([$nombres, $apellidos, $email, $celular, $hashedPassword]);
            
            sendResponse(true, 'Cuenta creada exitosamente.', [], 201);
        } catch (PDOException $e) {
            sendResponse(false, 'Error al registrar: ' . $e->getMessage(), [], 500);
        }
        break;

    // ==========================================
    // RECUPERAR CONTRASEÑA
    // ==========================================
    case 'recover':
        $email = trim($data['email'] ?? '');
        if (!$email) sendResponse(false, 'El correo es obligatorio.', [], 400);

        try {
            $stmt = $pdo->prepare("SELECT id_usuario FROM usuario WHERE email = ?");
            $stmt->execute([$email]);
            $user = $stmt->fetch();

            if (!$user) {
                // Por seguridad, no decimos si existe o no, pero aquí seguimos tu lógica original
                sendResponse(false, 'No existe una cuenta con este correo.', [], 404);
            }

            $token = rand(100000, 999999);
            $expiracion = date('Y-m-d H:i:s', strtotime('+15 minutes'));

            // Invalidar tokens anteriores
            $pdo->prepare("UPDATE recuperar_clave SET usado = 1 WHERE id_usuario = ? AND usado = 0")->execute([$user['id_usuario']]);
            
            $stmt = $pdo->prepare("INSERT INTO recuperar_clave (id_usuario, token, fecha_expiracion) VALUES (?, ?, ?)");
            $stmt->execute([$user['id_usuario'], $token, $expiracion]);
            
            sendResponse(true, 'Código enviado.', ['debug_token' => $token], 200);
        } catch (PDOException $e) {
            sendResponse(false, 'Error al generar código.', [], 500);
        }
        break;

    // ================== RESTABLECER CONTRASEÑA =======================//
    case 'reset':
        $token = trim($data['token'] ?? '');
        $newPassword = $data['password'] ?? ''; // Ojo: tu JS puede enviar 'password' o 'newPassword'

        if (!$token || !$newPassword) {
            sendResponse(false, 'Datos incompletos.', [], 400);
        }

        if (!preg_match('/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/', $newPassword)) {
            sendResponse(false, 'La contraseña no cumple con los requisitos de seguridad.', [], 400);
        }

        try {
            $stmt = $pdo->prepare("SELECT * FROM recuperar_clave WHERE token = ? AND usado = 0 AND fecha_expiracion > NOW()");
            $stmt->execute([$token]);
            $recovery = $stmt->fetch();

            if (!$recovery) {
                sendResponse(false, 'Código inválido o expirado.', [], 400);
            }

            $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);

            $updateUser = $pdo->prepare("UPDATE usuario SET nueva_contrasena = ? WHERE id_usuario = ?");
            $updateUser->execute([$hashedPassword, $recovery['id_usuario']]);
            
            $updateToken = $pdo->prepare("UPDATE recuperar_clave SET usado = 1 WHERE id_token = ?");
            $updateToken->execute([$recovery['id_token']]);
            
            sendResponse(true, 'Contraseña actualizada correctamente.', [], 200);

        } catch (PDOException $e) {
            sendResponse(false, 'Error al actualizar contraseña.', [], 500);
        }
        break;

    default:
        sendResponse(false, 'Acción no válida: ' . $action, [], 400);
        break;
}
?>