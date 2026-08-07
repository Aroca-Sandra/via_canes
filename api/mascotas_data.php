<?php
require_once 'config.php';

try {
    $pdo = getDB();
    
    $data = [
        'especies' => [],
        'razas' => [],
        'sexos' => [],
        'clientes' => []
    ];
    
    // 1. Especies
    $stmt = $pdo->query("SELECT id_especie, nombre FROM especie ORDER BY id_especie");
    $data['especies'] = $stmt->fetchAll();
    
    // 2. Razas (todas, el frontend filtra)
    $stmt = $pdo->query("SELECT id_raza, nombre, id_especie FROM raza ORDER BY id_especie, nombre");
    $data['razas'] = $stmt->fetchAll();
    
    // 3. Sexos
    $stmt = $pdo->query("SELECT id_sexoMascota, sexo_mascota FROM sexo_mascotas ORDER BY id_sexoMascota");
    $data['sexos'] = $stmt->fetchAll();
    
    // 4. Clientes (rol 2)
    $stmt = $pdo->query("
        SELECT id_usuario, nombres, apellidos, numero_documento 
        FROM usuario 
        WHERE id_rol = 2 
        ORDER BY nombres, apellidos
    ");
    $data['clientes'] = $stmt->fetchAll();
    
    jsonResponse($data);
    
} catch (Exception $e) {
    jsonResponse(['error' => $e->getMessage()], 500);
}