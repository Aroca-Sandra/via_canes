<?php
// api/db.php
$host    = $_ENV['DB_HOST']     ?? '127.0.0.1';
$db      = $_ENV['DB_NAME']     ?? 'via_canes';
$user    = $_ENV['DB_USER']     ?? 'root';
$pass    = $_ENV['DB_PASS']     ?? '';
$charset = $_ENV['DB_CHARSET']  ?? 'utf8mb4';


 $dsn = "mysql:host=$host;dbname=$db;charset=$charset";
 $options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false, // Bloquea Inyecciones SQL
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
// Guarda el error real en secreto y muestra un mensaje genérico
 error_log($e->getMessage()); // Opcional: log the error internally for debugging
    if (ob_get_level()) ob_end_clean(); 
    http_response_code(500); 
    exit("Error interno del servidor. Por favor, inténtelo más tarde."); 
}
?>