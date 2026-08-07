<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'conexion.php'; 

try {
    if (!isset($pdo)) {
        throw new Exception("Variable de conexión \$pdo no definida en conexion.php");
    }

    $data = [];

    // 1. Obtener todas las citas con nombres relacionados
    $stmt = $pdo->query("
        SELECT c.*, 
               CONCAT(u.nombres, ' ', u.apellidos) AS nombre_cliente,
               u.celular AS celular_cliente,
               m.nombre_mascota,
               m.foto_mascota,
               e.nombre AS nombre_especie,
               r.nombre AS nombre_raza,
               s.nombre AS nombre_servicio,
               s.precio AS precio_servicio,
               s.duracion AS duracion_servicio,
               ec.nombre AS nombre_estado
        FROM citas c
        LEFT JOIN usuario u ON c.id_usuario = u.id_usuario
        LEFT JOIN mascota m ON c.id_mascota = m.id_mascota
        LEFT JOIN especie e ON m.id_especie = e.id_especie
        LEFT JOIN raza r ON m.id_raza = r.id_raza
        LEFT JOIN servicios s ON c.id_servicio = s.id_servicio
        LEFT JOIN estado_cita ec ON c.id_estado_cita = ec.id_estado_cita
        ORDER BY c.fecha_cita DESC, c.hora_cita DESC
    ");
    $data['citas'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 2. Obtener Clientes (usuarios con rol 2 = CLIENTE)
    $stmt = $pdo->query("
        SELECT id_usuario, 
               CONCAT(nombres, ' ', apellidos) AS nombre_completo,
               numero_documento, celular, email
        FROM usuario 
        WHERE id_rol = 2 
        ORDER BY nombres ASC
    ");
    $data['clientes'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 3. Obtener todas las mascotas (para filtrar por cliente en JS)
    $stmt = $pdo->query("
        SELECT m.id_mascota, 
               m.nombre_mascota, 
               m.id_usuario,
               m.foto_mascota,
               m.peso_mascota,
               m.edad_mascota,
               m.color_mascota,
               e.nombre AS nombre_especie,
               r.nombre AS nombre_raza
        FROM mascota m
        LEFT JOIN especie e ON m.id_especie = e.id_especie
        LEFT JOIN raza r ON m.id_raza = r.id_raza
        ORDER BY m.nombre_mascota ASC
    ");
    $data['mascotas'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 4. Obtener Servicios activos
    $stmt = $pdo->query("
        SELECT s.id_servicio, s.nombre, s.precio, s.duracion, 
               cs.nombre AS nombre_categoria
        FROM servicios s
        LEFT JOIN categoria_servicio cs ON s.id_categoria_servicio = cs.id_categoria_servicio
        WHERE s.id_estado_servicio = 1
        ORDER BY s.nombre ASC
    ");
    $data['servicios'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 5. Obtener Estados de cita
    $stmt = $pdo->query("SELECT id_estado_cita, nombre FROM estado_cita ORDER BY id_estado_cita");
    $data['estados_cita'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($data);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error al cargar datos de citas: ' . $e->getMessage()]);
}
?>