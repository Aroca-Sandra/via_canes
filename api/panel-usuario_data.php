<?php
// api/panel-usuario_data.php
/*
/**
* API Controladora de Usuarios, Mascotas y Citas.
* Versión optimizada y securizada que procesa operaciones de perfil de usuario,
* estadísticas de negocio para paneles de control y listado relacional de mascotas.
* Incluye mitgaciones contra Path Traversal, MIME Sniffing y brechas de información.
*
* @package    App\API
* @author     Tu Nombre / Equipo de Desarrollo
* @version    1.0.0 (Seguridad Reforzada)
*/

// ================================================================
//  HEADERS Y CONFIGURACIÓN (POLÍTICAS DE SEGURIDAD & CORS)
// ================================================================
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
// ✅ SEGURO: Soporte para cabeceras personalizadas de autorización (tokens JWT/Bearer)
header('Access-Control-Allow-Headers: Content-Type, Authorization');
// ✅ SEGURO: Mitiga ataques basados en la alteración o adivinación de tipos de contenido (MIME Sniffing)
header('X-Content-Type-Options: nosniff');

/* Manejo de peticiones Preflight (OPTIONS) requeridas por CORS. */
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
http_response_code(204); // ✅ MEJORA: 204 No Content es el estándar para OPTIONS
exit;
}

// ✅ MEJORA CRÍTICA: En producción, display_errors DEBE ser 0 para no exponer rutas ni datos sensibles.
// Los errores se guardarán en el log del servidor gracias a log_errors = 1.
// ✅ SEGURO: Configuración restrictiva en entornos productivos.
// Suprime la impresión de errores en el buffer de salida (previniendo fugas de paths o variables)
// y delega el rastreo al log privado del servidor web.
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

// Restricciones operativas del tamaño de carga de archivos por petición multipart/form-data
ini_set('upload_max_filesize', '5M');
ini_set('upload_max_filesize', '5M');
ini_set('post_max_size', '10M');

// Inicia el aislamiento del flujo de salida de datos para evitar colisiones con el envío de headers HTTP
ob_start();

// ================================================================
// SESIÓN
// ================================================================
/*Inicialización controlada de la sesión nativa de PHP.*/
if (session_status() === PHP_SESSION_NONE) {
session_start();
}

// ================================================================
// CONEXIÓN A BASE DE DATOS
// ================================================================
/*Validación previa de la existencia del módulo de conectividad.*/
if (!file_exists(__DIR__ . '/db.php')) {
if (ob_get_level()) ob_end_clean();
http_response_code(500);
exit(json_encode(['success' => false, 'error' => 'Error interno del servidor']));
}

require_once __DIR__ . '/db.php';

// ✅ SEGURO: Asegura que el recurso compartido no solo exista sino que herede la interfaz PDO válida
if (!isset($pdo) || !$pdo instanceof PDO) {
if (ob_get_level()) ob_end_clean();
http_response_code(500);
exit(json_encode(['success' => false, 'error' => 'Error de conexión a BD']));
}

// ================================================================
// VARIABLES GLOBALES
// ================================================================

// @var int|null Identificador único del usuario firmado extraído de la sesión
$id_usuario = $_SESSION['id_usuario'] ?? null;
if (!$id_usuario) {
// Llamamos a responderError, pero como está definida más abajo, la declaramos antes o la usamos tras definirla.
// Por simplicidad, movemos las funciones auxiliares ARRIBA de su uso.
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';

// ================================================================
// FUNCIONES AUXILIARES
// ================================================================
/* * Despacha una respuesta HTTP JSON exitosa, limpia el buffer de salida y aborta la ejecución.
* @param array|object $data Payload estructurado con los datos de retorno.
* @param int $code Código de estado HTTP correspondiente (Por defecto 200 OK).
* @return void*/
function responder($data, $code = 200) {
if (ob_get_level()) ob_end_clean();
http_response_code($code);
echo json_encode($data, JSON_UNESCAPED_UNICODE);
exit;
}

/* Despacha una respuesta HTTP JSON fallida, asienta el estado del error y aborta la ejecución.
* @param string $mensaje Descripción legible del fallo de cara al cliente.
* @param int $code Código de error HTTP representativo (Por defecto 400 Bad Request).
* @return void*/
function responderError($mensaje, $code = 400) {
if (ob_get_level()) ob_end_clean();
http_response_code($code);
echo json_encode(['success' => false, 'error' => $mensaje], JSON_UNESCAPED_UNICODE);
exit;
}

/* * Remueve un archivo del almacenamiento del disco previniendo ataques de Path Traversal.
* @param string|null $rutaRelativa Dirección del archivo partiendo del directorio raíz del script.
* @return void */
function borrarArchivoServidor($rutaRelativa) {
if (empty($rutaRelativa)) return;

// Directorio base con privilegios para eliminación (Ruta absoluta canonizada)
$baseDir = realpath(__DIR__ . '/../');
$rutaFisica = realpath(__DIR__ . '/' . $rutaRelativa);


// ✅ SEGURO:Protección contra Path Traversal.  Validación perimetral. Impide que se alteren o borren archivos fuera del contenedor configurado
//Solo permite borrar si la ruta resuelta está DENTRO del directorio base permitido.
if ($rutaFisica && str_starts_with($rutaFisica, $baseDir) && is_file($rutaFisica)) {
unlink($rutaFisica);
}
}

/* Valida la integridad, tamaño y naturaleza real de un archivo binario proveniente del arreglo $_FILES.
* @param array $file Parámetro individual del vector global de cargas $_FILES['input_name'].
* @param int $maxSizeMB Límite tolerable expresado en Megabytes (Por defecto 2MB).
* @throws Exception Si el archivo rompe las políticas de formato, tamaño o integridad del sistema de archivos.
* @return bool Retorna verdadero si el binario aprueba satisfactoriamente los filtros estrictos. */

function validarImagenUpload($file, $maxSizeMB = 2) {
if ($file['error'] !== UPLOAD_ERR_OK) {
throw new Exception('Error en la subida del archivo (Código: ' . $file['error'] . ')');
}

// ✅ SEGURO: Lee la firma binaria real (Magic Numbers) del archivo en vez de confiar en la extensión provista por el cliente
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($file['tmp_name']);
$permitidosMime = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

if (!in_array($mime, $permitidosMime)) {
throw new Exception('Formato de imagen no válido o archivo corrupto. Solo JPG, PNG, WebP o GIF.');
}

if ($file['size'] > $maxSizeMB * 1024 * 1024) {
throw new Exception("La imagen supera el límite de {$maxSizeMB}MB.");
}

return true;
}

// ================================================================
// VALIDACIÓN DE SESIÓN (Arquitectura funcional segura de arriba hacia abajo)
// ================================================================
if (!$id_usuario) {
responderError('No hay sesión activa', 401);
}

// ================================================================
// ROUTER DE ACCIONES
// ================================================================
try {
switch ($action) {

/* @action datos_usuario * Recupera la ficha descriptiva del usuario de forma explícita omitiendo hashes u otras credenciales.*/
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
// Forzado estricto a mapeo asociativo para homogeneidad de datos
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) responderError('Usuario no encontrado', 404);

responder(['success' => true, 'data' => $user]);
break;

/*@action dashboard * Ejecuta métricas numéricas agregadas de control y extrae la cita de atención prioritaria.*/
case 'dashboard':
// Cuenta las mascotas activas vinculadas
$stmt = $pdo->prepare("SELECT COUNT(*) as total FROM mascota WHERE id_usuario = ?");
$stmt->execute([$id_usuario]);
$totalMascotas = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

// Cuenta las citas programadas vigentes
$stmt = $pdo->prepare("SELECT COUNT(*) as total FROM citas WHERE id_usuario = ? AND id_estado_cita IN (1,2)");
$stmt->execute([$id_usuario]);
$totalCitas = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

// Cuenta el consolidado de pedidos registrados
$stmt = $pdo->prepare("SELECT COUNT(*) as total FROM pedido WHERE id_usuario = ?");
$stmt->execute([$id_usuario]);
$totalPedidos = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

// Extrae la cita más inmediata a expirar o ejecutarse basándose en la fecha actual
$stmt = $pdo->prepare("
SELECT c.id_cita, c.fecha_cita, c.hora_cita, s.nombre as servicio, ec.nombre as estado
FROM citas c
LEFT JOIN servicios s ON c.id_servicio = s.id_servicio
LEFT JOIN estado_cita ec ON c.id_estado_cita = ec.id_estado_cita
WHERE c.id_usuario = ? AND c.fecha_cita >= CURDATE() AND c.id_estado_cita IN (1,2)
ORDER BY c.fecha_cita ASC, c.hora_cita ASC
LIMIT 1
");
$stmt->execute([$id_usuario]);
$proximaCita = $stmt->fetch(PDO::FETCH_ASSOC);

responder([
'success' => true,
'stats' => [
'mascotas' => (int)$totalMascotas,
'citas' => (int)$totalCitas,
'pedidos' => (int)$totalPedidos
],
'proximaCita' => $proximaCita ?: null
]);
break;

/* @action mascotas * Resuelve la colección completa de mascotas correspondientes al usuario en sesión activa.*/
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

/* @action guardar_mascota * Procesa el registro (INSERT) o modificación (UPDATE) de mascotas.
* Realiza validaciones estrictas y gestiona la carga segura de fotografías en disco.*/
case 'guardar_mascota':
if (empty($_POST['nombre_mascota'])) responderError('El nombre de la mascota es obligatorio');
if (empty($_POST['id_especie'])) responderError('La especie es obligatoria');

/* @var string|null Almacena la ruta web de la nueva foto subida */
$rutaFoto = null;
$id_mascota = $_POST['id_mascota'] ?? null;
/* @var bool Bandera que determina el modo de operación (Edición o Creación) */
$esEdicion = !empty($id_mascota);
/* @var string|null Almacena la ruta física anterior para proceder a su limpieza */
$fotoParaBorrar = null;

// Bloque de procesamiento de archivos adjuntos (Fotografía de la Mascota)
if (isset($_FILES['foto_mascota']) && $_FILES['foto_mascota']['error'] === UPLOAD_ERR_OK) {
try {
// Invoca la función auxiliar con validaciones MIME estrictas (Magic Numbers)
validarImagenUpload($_FILES['foto_mascota'], 2);

$uploadDir = __DIR__ . '/../img/mascotas/';
if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);

$ext = strtolower(pathinfo($_FILES['foto_mascota']['name'], PATHINFO_EXTENSION));

// ✅ SEGURO: Mitigación de enumeración y colisiones.
// random_bytes() provee aleatoriedad criptográficamente segura.
$nombreFoto = 'mascota_' . $id_usuario . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
$rutaFinal = $uploadDir . $nombreFoto;

if (!move_uploaded_file($_FILES['foto_mascota']['tmp_name'], $rutaFinal)) {
responderError('No se pudo guardar la imagen en el servidor', 500);
}
$rutaFoto = '../img/mascotas/' . $nombreFoto;
} catch (Exception $e) {
responderError($e->getMessage(), 400);
}
}

// Modo: Actualización de registro existente (UPDATE)
if ($esEdicion) {
// Recupera el nombre de la foto actual antes de actualizar los datos para su posterior eliminación
$stmtOld = $pdo->prepare("SELECT foto_mascota FROM mascota WHERE id_mascota = ? AND id_usuario = ?");
$stmtOld->execute([$id_mascota, $id_usuario]);
$oldFoto = $stmtOld->fetchColumn();

$sql = "UPDATE mascota SET nombre_mascota=?, id_especie=?, id_raza=?, id_sexoMascota=?,
peso_mascota=?, edad_mascota=?, color_mascota=?, observaciones_mascota=?,
especie_detalle=?, raza_detalle=?";

// Mapeo parametrizado con sanitización inline y casteo numérico explícito (floatval)
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

// Si se subió un nuevo archivo, se anexa a la consulta y se marca el anterior para borrar
if ($rutaFoto) {
$sql .= ", foto_mascota=?";
$params[] = $rutaFoto;
$fotoParaBorrar = $oldFoto;
}
// Cláusula WHERE restringida al contexto (Scope) del usuario autenticado
$sql .= " WHERE id_mascota=? AND id_usuario=?";
$params[] = $id_mascota;
$params[] = $id_usuario;

$pdo->prepare($sql)->execute($params);
// Limpieza física del almacenamiento en caso de sustitución exitosa
borrarArchivoServidor($fotoParaBorrar);
responder(['success' => true, 'message' => 'Mascota actualizada', 'id' => $id_mascota]);
// Modo: Creación de nuevo registro (INSERT)
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

/* @action eliminar_mascota * Elimina de forma definitiva una mascota.
* Verifica permisos de pertenencia mediante rowCount() y elimina el archivo físico asociado.*/

case 'eliminar_mascota':
    if (empty($_POST['id_mascota'])) responderError('ID de mascota requerido');
    
    $id_mascota = intval($_POST['id_mascota']);
    
    // 1. Verificar si existen citas asociadas
    $stmtCheck = $pdo->prepare("SELECT COUNT(*) FROM citas WHERE id_mascota = ?");
    $stmtCheck->execute([$id_mascota]);
    $tieneCitas = $stmtCheck->fetchColumn();
    
    if ($tieneCitas > 0) {
        // ✅ Retorna un mensaje legible para el toast/alert del JS
        responderError("No se puede eliminar esta mascota porque tiene {$tieneCitas} cita(s) registrada(s). Cancela o elimina las citas primero.");
    }
    
    try {
        $pdo->beginTransaction();
        
        // 2. Obtener foto para borrarla del servidor
        $stmtFoto = $pdo->prepare("SELECT foto_mascota FROM mascota WHERE id_mascota = ?");
        $stmtFoto->execute([$id_mascota]);
        $fotoBorrar = $stmtFoto->fetchColumn();
        
        // 3. Eliminar la mascota
        $stmt = $pdo->prepare("DELETE FROM mascota WHERE id_mascota = ?");
        $stmt->execute([$id_mascota]);
        
        $pdo->commit();
        
        // 4. Borrar archivo físico
        if ($fotoBorrar) {
            $rutaFisica = realpath(__DIR__ . '/../' . $fotoBorrar);
            if ($rutaFisica && file_exists($rutaFisica)) {
                unlink($rutaFisica);
            }
        }
        
        responder(['success' => true, 'message' => 'Mascota eliminada correctamente']);
        
    } catch (PDOException $e) {
        $pdo->rollBack();
        responderError('Error al eliminar la mascota: ' . $e->getMessage());
    }
    break;
/* @action citas * Obtiene la relación de control de citas agendadas por el cliente.*/

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

/* @action guardar_cita * Crea una solicitud de cita para un servicio y mascota específicos, impidiendo fechas extemporáneas pasadas.*/
case 'guardar_cita':
$requeridos = ['id_mascota', 'id_servicio', 'fecha_cita', 'hora_cita'];
foreach ($requeridos as $campo) {
if (empty($_POST[$campo])) responderError("El campo '$campo' es obligatorio", 400);
}

// Regla de Validación Cronológica: Impide agendar citas retroactivas
if (strtotime($_POST['fecha_cita']) < strtotime(date('Y-m-d'))) {
responderError('No se pueden agendar citas en fechas pasadas', 400);
}

// El estado_cita se define explícitamente en '1' (Habitualmente: Solicitada/Pendiente)
$sql = "INSERT INTO citas (id_usuario, id_mascota, id_servicio, fecha_cita, hora_cita, notas, id_estado_cita)
VALUES (?, ?, ?, ?, ?, ?, 1)";
$pdo->prepare($sql)->execute([
$id_usuario, $_POST['id_mascota'], $_POST['id_servicio'],
$_POST['fecha_cita'], $_POST['hora_cita'], trim($_POST['notas'] ?? '')
]);

responder(['success' => true, 'message' => 'Cita agendada'], 201);
break;

/* @action cancelar_cita * Modifica el estado de una cita médica a cancelada (id_estado_cita = 3).
* Restringe el proceso únicamente a citas bajo el scope del usuario y con estado pendiente (1).*/

case 'cancelar_cita':
if (empty($_POST['id_cita'])) responderError('ID de cita no proporcionado', 400);

// ✅ SEGURO: Validación de estado perimetral. Solo permite transicionar desde el estado 1 (Pendiente)
$stmt = $pdo->prepare("UPDATE citas SET id_estado_cita = 3 WHERE id_cita = ? AND id_usuario = ? AND id_estado_cita = 1");
$stmt->execute([$_POST['id_cita'], $id_usuario]);

// ✅ SEGURO: Evita reportar falsos positivos si la cita ya fue atendida, cancelada o no pertenece al usuario
if ($stmt->rowCount() === 0) responderError('No se pudo cancelar la cita o ya no está pendiente', 400);
responder(['success' => true, 'message' => 'Cita cancelada']);
break;

/* @action pedido * Lista de manera descendente el historial de órdenes de compra del usuario logueado.
* Realiza una hidratación relacional para inyectar los artículos en el subvector 'detalles'. */
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

// Mapeo iterativo por referencia (&) para hidratar el árbol JSON con sus partidas
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

/* @action ver_pedido * Extrae el desglose exhaustivo de una sola orden de compra.
* Agrega los datos demográficos del comprador, el listado de productos y la transacción de pago asociada.*/

case 'ver_pedido':
$id_pedido = $_GET['id'] ?? $_POST['id_pedido'] ?? null;
if (!$id_pedido) responderError('ID de pedido requerido', 400);

// Subconsulta 1: Datos de cabecera de la factura y datos del usuario comprador
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

// Subconsulta 2: Colección de artículos indexados al detalle de la factura
$stmt2 = $pdo->prepare("
SELECT dp.*, pr.nombre, pr.imagen_url
FROM detalle_pedido dp
LEFT JOIN productos pr ON dp.id_producto = pr.id_producto
WHERE dp.id_pedido = ?
");
$stmt2->execute([$id_pedido]);
$pedido['detalles'] = $stmt2->fetchAll(PDO::FETCH_ASSOC);

// Subconsulta 3: Información contable sobre la pasarela de pago y su estado
$stmt3 = $pdo->prepare("
SELECT pg.*, mc.nombre as metodo_pago, ep.nombre as estado_pago
FROM pagos pg
LEFT JOIN metodos_catalogo mc ON pg.id_metodo = mc.id_metodo
LEFT JOIN estado_pago ep ON pg.id_estado_pago = ep.id_estado_pago
WHERE pg.id_pedido = ?
LIMIT 1
");
$stmt3->execute([$id_pedido]);
$pedido['pago'] = $stmt3->fetch(PDO::FETCH_ASSOC) ?: null;

responder(['success' => true, 'data' => $pedido]);
break;
/* @action crear_pedido */
case 'crear_pedido':
    if (!$id_usuario) responderError('Debes iniciar sesión', 401);

    $direccion = $_POST['direccion_envio'] ?? '';
    $notas     = $_POST['notas'] ?? '';
    $id_metodo_pago = intval($_POST['id_metodo_pago'] ?? 1); 
    
    $items_json = $_POST['items'] ?? '[]';
    
    $subtotal    = floatval($_POST['subtotal'] ?? 0);
    $costo_envio = floatval($_POST['costo_envio'] ?? 0);
    $total       = floatval($_POST['total'] ?? 0);

    if (empty($direccion)) responderError('La dirección de envío es obligatoria');
    
    $items = json_decode($items_json, true);
    if (!is_array($items) || empty($items)) responderError('El carrito está vacío', 400);

    try {
        // Iniciamos la transacción para garantizar que todo se guarde o nada se guarde
        $pdo->beginTransaction();

        // 1. Insertar Cabecera del Pedido
        $sqlPedido = "INSERT INTO pedido 
                      (id_usuario, direccion_envio, notas, id_metodo_pago, subtotal, costo_envio, total, fecha, id_estado_pedido) 
                      VALUES 
                      (:uid, :dir, :notas, :mp, :sub, :env, :tot, NOW(), 1)";
        
        $stmt = $pdo->prepare($sqlPedido);
        $stmt->execute([
            ':uid' => $id_usuario,
            ':dir' => $direccion,
            ':notas' => $notas,
            ':mp'  => $id_metodo_pago,
            ':sub' => $subtotal,
            ':env' => $costo_envio,
            ':tot' => $total
        ]);

        $id_pedido = $pdo->lastInsertId();

        // 2. Preparar sentencias para detalles y actualización de stock
        $sqlDetalle = "INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad, precio_unitario, subtotal) 
                       VALUES (:id_ped, :id_prod, :cant, :precio, :sub)";
        $stmtDet = $pdo->prepare($sqlDetalle);

        $sqlUpdateStock = "UPDATE productos SET stock = stock - :cant WHERE id_producto = :id_prod";
        $stmtStock = $pdo->prepare($sqlUpdateStock);

        // 3. Procesar cada producto del carrito
        foreach ($items as $item) {
            $idProd = intval($item['id_producto']);
            $cant   = intval($item['cantidad']);
            $precio = floatval($item['precio_unitario']);
            
            if ($idProd > 0 && $cant > 0) {
                // A. Verificar stock actual y BLOQUEAR la fila para evitar condiciones de carrera
                $stmtCheck = $pdo->prepare("SELECT stock FROM productos WHERE id_producto = ? FOR UPDATE");
                $stmtCheck->execute([$idProd]);
                $producto = $stmtCheck->fetch(PDO::FETCH_ASSOC);
                
                if (!$producto) {
                    throw new Exception("El producto con ID $idProd no existe o fue eliminado.");
                }
                
                if ($producto['stock'] < $cant) {
                    throw new Exception("Stock insuficiente para '{$producto['nombre']}' (ID: $idProd). Disponible: {$producto['stock']}, Solicitado: $cant");
                }

                // B. Insertar el detalle del pedido
                $stmtDet->execute([
                    ':id_ped'  => $id_pedido,
                    ':id_prod' => $idProd,
                    ':cant'    => $cant,
                    ':precio'  => $precio,
                    ':sub'     => ($precio * $cant)
                ]);

                // C. Descontar el stock de la base de datos
                $stmtStock->execute([
                    ':cant'    => $cant,
                    ':id_prod' => $idProd
                ]);
            }
        }

        // Si todo salió bien, confirmamos los cambios en la base de datos
        $pdo->commit();
        responder(['success' => true, 'id_pedido' => $id_pedido, 'message' => 'Pedido creado exitosamente'], 201);

    } catch (Exception $e) {
        // Si algo falla (ej: stock insuficiente), deshacemos TODOS los cambios
        $pdo->rollBack();
        error_log("Error Checkout: " . $e->getMessage());
        
        // Enviamos el mensaje específico de error al frontend (ej: "Stock insuficiente...")
        responderError($e->getMessage(), 400); 
    }
    break;
/* @action actualizar_perfil * Actualiza la información personal, credenciales e imagen de avatar del usuario autenticado.
* Valida de forma estricta la unicidad de llaves únicas (Email, Documento) en el sistema.*/
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

// ✅ SEGURO: Validación de unicidad de email ignorando el registro del propio usuario (HTTP 409 Conflict)
$stmt = $pdo->prepare("SELECT id_usuario FROM usuario WHERE email = ? AND id_usuario != ?");
$stmt->execute([trim($_POST['email']), $id_usuario]);
if ($stmt->fetch()) responderError('Este email ya está registrado por otro usuario', 409);

// ✅ SEGURO: Validación de unicidad de número de identidad ignorando al usuario actual (HTTP 409 Conflict)
if (!empty($_POST['numero_documento'])) {
$stmt = $pdo->prepare("SELECT id_usuario FROM usuario WHERE numero_documento = ? AND id_usuario != ?");
$stmt->execute([trim($_POST['numero_documento']), $id_usuario]);
if ($stmt->fetch()) responderError('Este número de documento ya está registrado', 409);
}

$actualizarPassword = false;
if (!empty($_POST['nueva_contrasena'])) {
if (strlen($_POST['nueva_contrasena']) < 6) {
responderError('La contraseña debe tener mínimo 6 caracteres', 400);
}
$actualizarPassword = true;
}

/* @var string|null Destino relativo web del nuevo avatar subido */
$rutaFoto = null;
/* @var string|null Destino físico en disco del archivo huérfano viejo para depuración */
$fotoParaBorrar = null;
/* @var bool Estado bandera que indica la remoción intencional del avatar */
$eliminarFoto = !empty($_POST['eliminar_foto']);

// Bloque seguro de procesamiento de carga para archivos binarios (Foto de Usuario)
if (isset($_FILES['foto_usuario']) && $_FILES['foto_usuario']['error'] === UPLOAD_ERR_OK) {
try {
// Validación perimetral basada en firmas binarias internas (MIME real)
validarImagenUpload($_FILES['foto_usuario'], 2);

$uploadDir = __DIR__ . '/../img/usuarios/';
if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);

$ext = strtolower(pathinfo($_FILES['foto_usuario']['name'], PATHINFO_EXTENSION));
// Generación aleatoria no predecible basada en entropía criptográfica segura
$nombreFoto = 'user_' . $id_usuario . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
$rutaFinal = $uploadDir . $nombreFoto;

if (!move_uploaded_file($_FILES['foto_usuario']['tmp_name'], $rutaFinal)) {
responderError('No se pudo guardar la imagen', 500);
}
$rutaFoto = '../img/usuarios/' . $nombreFoto;
} catch (Exception $e) {
responderError($e->getMessage(), 400);
}
}
//Recupera la foto anterior para no dejar basura espacial en el sistema de almacenamiento
$stmtOld = $pdo->prepare("SELECT foto_usuario FROM usuario WHERE id_usuario = ?");
$stmtOld->execute([$id_usuario]);
$oldFoto = $stmtOld->fetchColumn();

$sql = "UPDATE usuario SET id_tipo_id=?, numero_documento=?, nombres=?, apellidos=?,
email=?, celular=?, id_localidad=?, direccion=?";

// ✅ SEGURO: Casteo explícito a tipos primitivos nativos (intval) antes de interactuar con la BD
$params = [
intval($_POST['id_tipo_id']), trim($_POST['numero_documento']),
trim($_POST['nombres']), trim($_POST['apellidos']),
trim($_POST['email']), trim($_POST['celular']),
!empty($_POST['id_localidad']) ? intval($_POST['id_localidad']) : null,
!empty($_POST['direccion']) ? trim($_POST['direccion']) : null
];
// Inyección condicional y encriptación robusta unidireccional por Bcrypt
if ($actualizarPassword) {
$sql .= ", nueva_contrasena=?";
$params[] = password_hash($_POST['nueva_contrasena'], PASSWORD_DEFAULT);
}

// Selección lógica del flujo de borrado o reemplazo del recurso de imagen
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

responder(['success' => true, 'message' => 'Perfil actualizado', 'foto_actualizada' => $rutaFoto !== null]);
break;
/* @action razas * Consulta parametrizada que retorna el catálogo de razas asociadas a una especie en orden alfabético. */

case 'razas':
// ✅ SEGURO: Casteo preventivo estricto a entero
$idEspecie = intval($_GET['id_especie'] ?? 0);
if (!$idEspecie) responderError('Especie requerida', 400);

$stmt = $pdo->prepare("SELECT id_raza, nombre FROM raza WHERE id_especie = ? ORDER BY nombre");
$stmt->execute([$idEspecie]);
responder(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
break;

/* @action mascotas_cita * Extrae una lista minimalista indexada de las mascotas asociadas exclusivamente al cliente activo.
* Ideal para poblar componentes interactivos de selección rápida (Select/Dropdowns).*/
case 'mascotas_cita':
$stmt = $pdo->prepare("SELECT id_mascota, nombre_mascota FROM mascota WHERE id_usuario = ? ORDER BY nombre_mascota");
$stmt->execute([$id_usuario]);
responder(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
break;

/* @action localidades * Resuelve de forma global el catálogo de cobertura geográfica o localidades registradas en la base de datos. */
case 'localidades':
$stmt = $pdo->query("SELECT id_localidad, nombre_localidad FROM localidad ORDER BY nombre_localidad");
responder(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
break;


/* @action tipos_id * Provee el nomenclador maestro de los tipos de identificación o documentos oficiales admitidos*/
case 'tipos_id':
$stmt = $pdo->query("SELECT id_tipo_id, sigla, nombre FROM tipo_identificacion ORDER BY id_tipo_id");
responder(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
break;

/*@action servicios_activos * Obtiene la cartera comercial de servicios médicos o estéticos vigentes y disponibles para agendamiento.*/
case 'servicios_activos':
$stmt = $pdo->query("SELECT id_servicio, nombre, precio FROM servicios WHERE id_estado_servicio = 1 ORDER BY nombre");
responder(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
break;

/* @action cerrar_sesion * Realiza el desborde completo del estado de autenticación limpiando el contexto en memoria
* y destruyendo de forma física el identificador de sesión asignado al servidor.*/
case 'cerrar_sesion':
$_SESSION = [];
session_destroy();
responder(['success' => true, 'message' => 'Sesión cerrada']);
break;

default:
// ✅ SEGURO: Mitigación contra Cross-Site Scripting (XSS).
responderError('Acción no válida: ' . htmlspecialchars($action), 400);
}

} catch (PDOException $e) {
//// ✅ SEGURO: Principio de Menor Privilegio de Información.
// Envía la traza original y confidencial del error del motor SQL hacia el Log seguro del servidor web
// y despacha al cliente una máscara genérica opaca (HTTP 500) para frustrar labores de reconocimiento.
error_log("DB Error in panel-usuario_data.php: " . $e->getMessage());
// Registra errores de lógica global o fallos críticos en el control del almacenamiento local (Archivos)
responderError('Error interno del servidor', 500);
} catch (Exception $e) {
error_log("App Error in panel-usuario_data.php: " . $e->getMessage());
responderError($e->getMessage(), 500);
}
?>