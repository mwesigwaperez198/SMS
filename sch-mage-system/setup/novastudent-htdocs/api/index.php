<?php
declare(strict_types=1);

date_default_timezone_set('UTC');

const API_VERSION = '1.0.0';
const PASSWORD_SCHEME = 'pbkdf2_sha256';
const PASSWORD_ITERATIONS = 260000;
const USER_ROLES = [
    'super_admin',
    'school_admin',
    'principal',
    'teacher',
    'dos',
    'student',
    'parent',
    'accountant',
    'librarian',
    'transport_manager',
    'receptionist',
];

function load_env_file(string $path): array
{
    if (!is_file($path)) {
        return [];
    }

    $values = [];
    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || substr($line, 0, 1) === '#' || strpos($line, '=') === false) {
            continue;
        }
        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);
        if (
            (substr($value, 0, 1) === '"' && substr($value, -1) === '"') ||
            (substr($value, 0, 1) === "'" && substr($value, -1) === "'")
        ) {
            $value = substr($value, 1, -1);
        }
        $values[$key] = $value;
    }
    return $values;
}

function env_values(): array
{
    static $env = null;
    if ($env !== null) {
        return $env;
    }

    $root = dirname(__DIR__);
    $env = array_merge(
        load_env_file($root . '/.env'),
        load_env_file(__DIR__ . '/.env')
    );
    foreach ($_ENV as $key => $value) {
        if (is_string($value)) {
            $env[$key] = $value;
        }
    }
    return $env;
}

function env_value(string $key, ?string $default = null): ?string
{
    $env = env_values();
    $value = $env[$key] ?? getenv($key);
    if ($value === false || $value === null || trim((string) $value) === '') {
        return $default;
    }
    return trim((string) $value);
}

function env_bool(string $key, bool $default = false): bool
{
    $value = env_value($key);
    if ($value === null) {
        return $default;
    }
    return in_array(strtolower($value), ['1', 'true', 'yes', 'y', 'on'], true);
}

function env_int(string $key, int $default): int
{
    $value = env_value($key);
    if ($value === null) {
        return $default;
    }
    return (int) $value;
}

function send_cors_headers(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowed = array_filter(array_map('trim', explode(',', env_value(
        'CORS_ORIGINS',
        'https://novaadmin.kesug.com,https://novastudent.kesug.com'
    ) ?? '')));

    if ($origin !== '' && (in_array($origin, $allowed, true) || in_array('*', $allowed, true))) {
        header('Access-Control-Allow-Origin: ' . ($origin === '' ? '*' : $origin));
        header('Vary: Origin');
    }

    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
}

function json_response($payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function error_response(int $status, string $detail): void
{
    json_response(['detail' => $detail], $status);
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input') ?: '';
    if ($raw === '') {
        return [];
    }
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        error_response(400, 'Request body must be valid JSON');
    }
    return $decoded;
}

function pdo(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $config = database_config();
    if (!$config['database'] || !$config['user']) {
        error_response(500, 'Database settings are missing. Create .env with DB_HOST, DB_NAME, DB_USER and DB_PASSWORD.');
    }

    $dsn = database_dsn($config);
    try {
        $pdo = new PDO($dsn, $config['user'], $config['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    } catch (Throwable $exception) {
        error_response(503, 'Database connection failed: ' . $exception->getMessage());
    }

    return $pdo;
}

function database_config(): array
{
    $host = env_value('DB_HOST', env_value('MYSQL_HOST', '127.0.0.1'));
    if ($host === 'localhost') {
        $host = '127.0.0.1';
    }
    return [
        'host' => $host,
        'port' => env_value('DB_PORT', env_value('MYSQL_PORT', '3306')),
        'database' => env_value('DB_NAME', env_value('DB_DATABASE', env_value('MYSQL_DATABASE'))),
        'user' => env_value('DB_USER', env_value('DB_USERNAME', env_value('MYSQL_USER'))),
        'password' => env_value('DB_PASSWORD', env_value('MYSQL_PASSWORD', '')) ?? '',
    ];
}

function database_dsn(array $config): string
{
    return "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset=utf8mb4";
}

function database_check_payload(): array
{
    $config = database_config();
    $payload = [
        'host' => $config['host'],
        'port' => $config['port'],
        'database' => $config['database'],
        'user' => $config['user'],
        'password_set' => $config['password'] !== '',
        'connected' => false,
    ];
    if (!$config['database'] || !$config['user']) {
        $payload['error'] = 'DB_NAME and DB_USER are required.';
        return $payload;
    }
    try {
        $db = new PDO(database_dsn($config), $config['user'], $config['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        $db->query('SELECT 1');
        $payload['connected'] = true;
    } catch (Throwable $exception) {
        $payload['error'] = $exception->getMessage();
    }
    return $payload;
}

function execute_schema(PDO $db): void
{
    $statements = [
        "CREATE TABLE IF NOT EXISTS schools (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(160) NOT NULL,
            code VARCHAR(40) NOT NULL UNIQUE,
            domain VARCHAR(160) NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            school_id INT NULL,
            name VARCHAR(160) NOT NULL,
            email VARCHAR(254) NOT NULL UNIQUE,
            phone VARCHAR(40) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(40) NOT NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            is_verified TINYINT(1) NOT NULL DEFAULT 0,
            last_login_at DATETIME NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_users_school_id (school_id),
            INDEX idx_users_role (role),
            INDEX idx_users_email (email),
            INDEX idx_users_phone (phone)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS classrooms (
            id INT AUTO_INCREMENT PRIMARY KEY,
            school_id INT NOT NULL,
            name VARCHAR(80) NOT NULL,
            section VARCHAR(30) NOT NULL DEFAULT '',
            grade_level VARCHAR(30) NULL,
            teacher_user_id INT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_classrooms_school_name_section (school_id, name, section)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS student_profiles (
            user_id INT PRIMARY KEY,
            admission_number VARCHAR(80) NOT NULL UNIQUE,
            class_id INT NULL,
            roll_number VARCHAR(40) NULL,
            date_of_birth DATE NULL,
            gender VARCHAR(30) NULL,
            profile_pic VARCHAR(500) NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS parent_students (
            id INT AUTO_INCREMENT PRIMARY KEY,
            parent_user_id INT NOT NULL,
            student_user_id INT NOT NULL,
            relationship VARCHAR(40) NOT NULL DEFAULT 'guardian',
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_parent_student (parent_user_id, student_user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS teacher_profiles (
            user_id INT PRIMARY KEY,
            employee_number VARCHAR(80) NOT NULL UNIQUE,
            designation VARCHAR(120) NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS attendance (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_user_id INT NOT NULL,
            date DATE NOT NULL,
            status VARCHAR(30) NOT NULL,
            subject VARCHAR(120) NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_attendance_student_date_subject (student_user_id, date, subject),
            INDEX idx_attendance_student_user_id (student_user_id),
            INDEX idx_attendance_date (date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS assessment_tasks (
            id INT AUTO_INCREMENT PRIMARY KEY,
            school_id INT NOT NULL,
            class_id INT NULL,
            teacher_user_id INT NULL,
            subject VARCHAR(120) NOT NULL,
            title VARCHAR(180) NOT NULL,
            term VARCHAR(80) NOT NULL DEFAULT 'Term 1',
            max_marks DOUBLE NOT NULL DEFAULT 100,
            due_date DATE NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_assessment_tasks_school_id (school_id),
            INDEX idx_assessment_tasks_class_id (class_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS assessment_scores (
            id INT AUTO_INCREMENT PRIMARY KEY,
            assessment_id INT NOT NULL,
            student_user_id INT NOT NULL,
            marks DOUBLE NOT NULL DEFAULT 0,
            grade VARCHAR(20) NULL,
            remarks VARCHAR(255) NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_assessment_student (assessment_id, student_user_id),
            INDEX idx_assessment_scores_student_user_id (student_user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS homework (
            id INT AUTO_INCREMENT PRIMARY KEY,
            school_id INT NOT NULL,
            class_id INT NULL,
            teacher_user_id INT NULL,
            subject VARCHAR(120) NOT NULL,
            title VARCHAR(180) NOT NULL,
            description TEXT NOT NULL,
            due_date DATE NOT NULL,
            file_url VARCHAR(500) NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS circulars (
            id INT AUTO_INCREMENT PRIMARY KEY,
            school_id INT NOT NULL,
            title VARCHAR(180) NOT NULL,
            content TEXT NOT NULL,
            issued_date DATE NOT NULL,
            file_url VARCHAR(500) NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS fee_invoices (
            id INT AUTO_INCREMENT PRIMARY KEY,
            school_id INT NOT NULL,
            student_user_id INT NOT NULL,
            description VARCHAR(180) NOT NULL,
            amount DOUBLE NOT NULL,
            due_date DATE NOT NULL,
            status VARCHAR(40) NOT NULL DEFAULT 'pending',
            paid_date DATE NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS student_requirements (
            id INT AUTO_INCREMENT PRIMARY KEY,
            school_id INT NOT NULL,
            student_user_id INT NOT NULL,
            title VARCHAR(180) NOT NULL,
            amount DOUBLE NOT NULL DEFAULT 0,
            status VARCHAR(40) NOT NULL DEFAULT 'pending',
            due_date DATE NULL,
            notes TEXT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_student_requirements_school_id (school_id),
            INDEX idx_student_requirements_student_user_id (student_user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS payments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            invoice_id INT NOT NULL,
            amount DOUBLE NOT NULL,
            method VARCHAR(40) NOT NULL,
            status VARCHAR(40) NOT NULL DEFAULT 'pending',
            transaction_id VARCHAR(160) NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            school_id INT NULL,
            from_user_id INT NOT NULL,
            to_user_id INT NOT NULL,
            subject VARCHAR(180) NOT NULL,
            body TEXT NOT NULL,
            is_read TINYINT(1) NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS leave_requests (
            id INT AUTO_INCREMENT PRIMARY KEY,
            school_id INT NOT NULL,
            user_id INT NOT NULL,
            from_date DATE NOT NULL,
            to_date DATE NOT NULL,
            reason TEXT NOT NULL,
            status VARCHAR(40) NOT NULL DEFAULT 'pending',
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS transport_routes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            school_id INT NOT NULL,
            bus_number VARCHAR(80) NOT NULL,
            driver_name VARCHAR(160) NOT NULL,
            driver_phone VARCHAR(40) NOT NULL,
            pickup_location VARCHAR(180) NOT NULL,
            pickup_time VARCHAR(20) NOT NULL,
            dropoff_location VARCHAR(180) NOT NULL,
            dropoff_time VARCHAR(20) NOT NULL,
            current_location VARCHAR(180) NULL,
            latitude DOUBLE NOT NULL DEFAULT 0,
            longitude DOUBLE NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    ];

    foreach ($statements as $sql) {
        $db->exec($sql);
    }
}

function maybe_auto_create(): void
{
    if (env_bool('DB_AUTO_CREATE', false)) {
        execute_schema(pdo());
        seed_initial_data(pdo());
    }
}

function b64_url_encode(string $data): string
{
    return strtr(base64_encode($data), '+/', '-_');
}

function b64_url_decode(string $data): string
{
    $decoded = base64_decode(strtr($data, '-_', '+/'), true);
    return $decoded === false ? '' : $decoded;
}

function hash_password_value(string $password): string
{
    $salt = random_bytes(16);
    $digest = hash_pbkdf2('sha256', $password, $salt, PASSWORD_ITERATIONS, 32, true);
    return PASSWORD_SCHEME . '$' . PASSWORD_ITERATIONS . '$' . b64_url_encode($salt) . '$' . b64_url_encode($digest);
}

function verify_password_value(string $password, string $hash): bool
{
    $parts = explode('$', $hash, 4);
    if (count($parts) !== 4 || $parts[0] !== PASSWORD_SCHEME) {
        return false;
    }
    [$scheme, $iterations, $encodedSalt, $encodedDigest] = $parts;
    $salt = b64_url_decode($encodedSalt);
    $expected = b64_url_decode($encodedDigest);
    if ($salt === '' || $expected === '') {
        return false;
    }
    $actual = hash_pbkdf2('sha256', $password, $salt, (int) $iterations, strlen($expected), true);
    return hash_equals($expected, $actual);
}

function jwt_secret(): string
{
    $secret = env_value('SECRET_KEY', env_value('JWT_SECRET'));
    if (!$secret || strlen($secret) < 16) {
        error_response(500, 'SECRET_KEY is missing or too short in .env.');
    }
    return $secret;
}

function jwt_create(array $user): string
{
    $header = ['alg' => 'HS256', 'typ' => 'JWT'];
    $payload = [
        'sub' => (string) $user['id'],
        'user_id' => (int) $user['id'],
        'school_id' => $user['school_id'] !== null ? (int) $user['school_id'] : null,
        'role' => $user['role'],
        'type' => 'access',
        'exp' => time() + env_int('ACCESS_TOKEN_EXPIRE_DAYS', 30) * 86400,
    ];
    $segments = [
        rtrim(b64_url_encode(json_encode($header, JSON_UNESCAPED_SLASHES)), '='),
        rtrim(b64_url_encode(json_encode($payload, JSON_UNESCAPED_SLASHES)), '='),
    ];
    $signature = hash_hmac('sha256', implode('.', $segments), jwt_secret(), true);
    $segments[] = rtrim(b64_url_encode($signature), '=');
    return implode('.', $segments);
}

function jwt_decode_payload(string $token): array
{
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        error_response(401, 'Invalid token');
    }
    [$header, $payload, $signature] = $parts;
    $expected = rtrim(b64_url_encode(hash_hmac('sha256', $header . '.' . $payload, jwt_secret(), true)), '=');
    if (!hash_equals($expected, $signature)) {
        error_response(401, 'Invalid token');
    }
    $decoded = json_decode(b64_url_decode($payload), true);
    if (!is_array($decoded) || ($decoded['exp'] ?? 0) < time()) {
        error_response(401, 'Token expired');
    }
    return $decoded;
}

function insert_if_missing(PDO $db, string $sql, array $params, string $lookupSql, array $lookupParams): int
{
    $lookup = $db->prepare($lookupSql);
    $lookup->execute($lookupParams);
    $existing = $lookup->fetchColumn();
    if ($existing) {
        return (int) $existing;
    }

    $statement = $db->prepare($sql);
    $statement->execute($params);
    return (int) $db->lastInsertId();
}

function seed_initial_data(PDO $db): void
{
    $schoolId = insert_if_missing(
        $db,
        'INSERT INTO schools (name, code, domain, is_active) VALUES (?, ?, ?, 1)',
        [
            env_value('DEFAULT_SCHOOL_NAME', 'NovaAdmin School'),
            env_value('DEFAULT_SCHOOL_CODE', 'NOVA'),
            env_value('API_DOMAIN', 'novaadmin.kesug.com'),
        ],
        'SELECT id FROM schools WHERE code = ? LIMIT 1',
        [env_value('DEFAULT_SCHOOL_CODE', 'NOVA')]
    );

    $superAdminExists = (int) $db->query("SELECT COUNT(*) FROM users WHERE role = 'super_admin'")->fetchColumn();
    if ($superAdminExists === 0) {
        insert_if_missing(
            $db,
            'INSERT INTO users (school_id, name, email, phone, password_hash, role, is_active, is_verified) VALUES (NULL, ?, ?, ?, ?, ?, 1, 1)',
            [
                env_value('INITIAL_ADMIN_NAME', 'NovaAdmin Super Admin'),
                strtolower(env_value('INITIAL_ADMIN_EMAIL', 'admin@novaadmin.kesug.com') ?? 'admin@novaadmin.kesug.com'),
                env_value('INITIAL_ADMIN_PHONE', '256700000000'),
                hash_password_value(env_value('INITIAL_ADMIN_PASSWORD', 'ChangeMe123!') ?? 'ChangeMe123!'),
                'super_admin',
            ],
            'SELECT id FROM users WHERE email = ? LIMIT 1',
            [strtolower(env_value('INITIAL_ADMIN_EMAIL', 'admin@novaadmin.kesug.com') ?? 'admin@novaadmin.kesug.com')]
        );
    }

    if (!env_bool('SEED_DEMO_DATA', false)) {
        return;
    }

    $teacherId = seed_user($db, $schoolId, 'Amina Teacher', 'teacher@novaadmin.kesug.com', '256700000101', 'teacher');
    $studentId = seed_user($db, $schoolId, 'Jeetendra Sahu', 'jeetendra@doon.edu.in', '9876543210', 'student');
    $parentId = seed_user($db, $schoolId, 'Parent Guardian', 'parent@novaadmin.kesug.com', '256700000102', 'parent');

    foreach ([
        ['School Admin', 'schooladmin@novaadmin.kesug.com', '256700000103', 'school_admin'],
        ['School Principal', 'principal@novaadmin.kesug.com', '256700000104', 'principal'],
        ['Director of Studies', 'dos@novaadmin.kesug.com', '256700000109', 'dos'],
        ['School Accountant', 'accountant@novaadmin.kesug.com', '256700000105', 'accountant'],
        ['School Librarian', 'librarian@novaadmin.kesug.com', '256700000106', 'librarian'],
        ['Transport Manager', 'transport@novaadmin.kesug.com', '256700000107', 'transport_manager'],
        ['Receptionist', 'reception@novaadmin.kesug.com', '256700000108', 'receptionist'],
    ] as [$name, $email, $phone, $role]) {
        seed_user($db, $schoolId, $name, $email, $phone, $role);
    }

    $classId = insert_if_missing(
        $db,
        'INSERT INTO classrooms (school_id, name, section, grade_level, teacher_user_id) VALUES (?, ?, ?, ?, ?)',
        [$schoolId, 'X', 'A', '10', $teacherId],
        'SELECT id FROM classrooms WHERE school_id = ? AND name = ? AND section = ? LIMIT 1',
        [$schoolId, 'X', 'A']
    );

    insert_if_missing(
        $db,
        'INSERT INTO student_profiles (user_id, admission_number, class_id, roll_number, gender, profile_pic) VALUES (?, ?, ?, ?, ?, ?)',
        [$studentId, 'ADM-0001', $classId, '1', 'male', 'https://via.placeholder.com/150'],
        'SELECT user_id FROM student_profiles WHERE user_id = ? LIMIT 1',
        [$studentId]
    );

    insert_if_missing(
        $db,
        'INSERT INTO teacher_profiles (user_id, employee_number, designation) VALUES (?, ?, ?)',
        [$teacherId, 'EMP-0001', 'Class Teacher'],
        'SELECT user_id FROM teacher_profiles WHERE user_id = ? LIMIT 1',
        [$teacherId]
    );

    insert_if_missing(
        $db,
        'INSERT INTO parent_students (parent_user_id, student_user_id, relationship) VALUES (?, ?, ?)',
        [$parentId, $studentId, 'guardian'],
        'SELECT id FROM parent_students WHERE parent_user_id = ? AND student_user_id = ? LIMIT 1',
        [$parentId, $studentId]
    );

    if ((int) $db->query('SELECT COUNT(*) FROM attendance')->fetchColumn() === 0) {
        $subjects = ['Math', 'English', 'Science', 'History'];
        $statuses = ['present', 'absent', 'late'];
        $statement = $db->prepare('INSERT INTO attendance (student_user_id, date, status, subject) VALUES (?, ?, ?, ?)');
        for ($day = 1; $day <= 24; $day++) {
            $statement->execute([$studentId, sprintf('2025-09-%02d', $day), $statuses[$day % 3], $subjects[$day % 4]]);
        }
    }

    if ((int) $db->query('SELECT COUNT(*) FROM circulars')->fetchColumn() === 0) {
        $statement = $db->prepare('INSERT INTO circulars (school_id, title, content, issued_date, file_url) VALUES (?, ?, ?, ?, ?)');
        $statement->execute([$schoolId, 'Mid-Term Examination Schedule Released', 'Mid-term exams will start from October 1st.', '2025-09-18', 'https://example.com/exam_schedule.pdf']);
        $statement->execute([$schoolId, 'School Closed on 2nd October', 'School will remain closed on October 2nd.', '2025-09-20', null]);
    }

    if ((int) $db->query('SELECT COUNT(*) FROM fee_invoices')->fetchColumn() === 0) {
        $statement = $db->prepare('INSERT INTO fee_invoices (school_id, student_user_id, description, amount, due_date, status, paid_date) VALUES (?, ?, ?, ?, ?, ?, ?)');
        $statement->execute([$schoolId, $studentId, 'Tuition Fee - Term 1', 50000, '2025-08-31', 'paid', '2025-08-30']);
        $statement->execute([$schoolId, $studentId, 'Activity Fee - Term 1', 5000, '2025-09-15', 'pending', null]);
    }

    if ((int) $db->query('SELECT COUNT(*) FROM student_requirements')->fetchColumn() === 0) {
        $statement = $db->prepare('INSERT INTO student_requirements (school_id, student_user_id, title, amount, status, due_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)');
        $statement->execute([$schoolId, $studentId, 'Uniform balance', 25000, 'pending', '2025-10-05', 'Tracksuit and sweater balance']);
        $statement->execute([$schoolId, $studentId, 'Exercise books', 12000, 'cleared', '2025-09-10', 'Submitted at reception']);
    }

    if ((int) $db->query('SELECT COUNT(*) FROM assessment_tasks')->fetchColumn() === 0) {
        $statement = $db->prepare('INSERT INTO assessment_tasks (school_id, class_id, teacher_user_id, subject, title, term, max_marks, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        $statement->execute([$schoolId, $classId, $teacherId, 'Mathematics', 'Beginning of Term Test', 'Term 1', 100, '2025-09-30']);
        $assessmentId = (int) $db->lastInsertId();
        $score = $db->prepare('INSERT INTO assessment_scores (assessment_id, student_user_id, marks, grade, remarks) VALUES (?, ?, ?, ?, ?)');
        $score->execute([$assessmentId, $studentId, 82, 'A', 'Strong performance']);
    }

    if ((int) $db->query('SELECT COUNT(*) FROM messages')->fetchColumn() === 0) {
        $statement = $db->prepare('INSERT INTO messages (school_id, from_user_id, to_user_id, subject, body, is_read) VALUES (?, ?, ?, ?, ?, 0)');
        $statement->execute([$schoolId, $teacherId, $studentId, 'Great performance in Math class!', 'Your recent exam shows excellent understanding of quadratic equations.']);
    }

    if ((int) $db->query('SELECT COUNT(*) FROM transport_routes')->fetchColumn() === 0) {
        $statement = $db->prepare('INSERT INTO transport_routes (school_id, bus_number, driver_name, driver_phone, pickup_location, pickup_time, dropoff_location, dropoff_time, current_location, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $statement->execute([$schoolId, 'DIS-2024-05', 'Raj Kumar', '9876543210', 'Gurgaon Gate', '07:30', 'School Main Gate', '08:15', 'Sector 12, Gurgaon', 28.4595, 77.0266]);
    }
}

function seed_user(PDO $db, int $schoolId, string $name, string $email, string $phone, string $role): int
{
    return insert_if_missing(
        $db,
        'INSERT INTO users (school_id, name, email, phone, password_hash, role, is_active, is_verified) VALUES (?, ?, ?, ?, ?, ?, 1, 1)',
        [$schoolId, $name, strtolower($email), $phone, hash_password_value('password123'), $role],
        'SELECT id FROM users WHERE email = ? LIMIT 1',
        [strtolower($email)]
    );
}

function get_user_by_id(int $id): ?array
{
    $statement = pdo()->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
    $statement->execute([$id]);
    $user = $statement->fetch();
    return $user ?: null;
}

function current_user(): array
{
    $authorization = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if ($authorization === '' && function_exists('getallheaders')) {
        foreach (getallheaders() as $key => $value) {
            if (strtolower($key) === 'authorization') {
                $authorization = $value;
                break;
            }
        }
    }
    if (!preg_match('/^Bearer\s+(.+)$/i', $authorization, $matches)) {
        error_response(401, 'Missing bearer token');
    }
    $payload = jwt_decode_payload(trim($matches[1]));
    $userId = (int) ($payload['user_id'] ?? $payload['sub'] ?? 0);
    $user = get_user_by_id($userId);
    if (!$user || !(bool) $user['is_active']) {
        error_response(401, 'Invalid token');
    }
    return $user;
}

function require_roles(array $roles): array
{
    $user = current_user();
    if ($user['role'] === 'super_admin' || in_array($user['role'], $roles, true)) {
        return $user;
    }
    error_response(403, 'Insufficient role permissions');
}

function office_user(): array
{
    return require_roles(['school_admin', 'principal', 'dos', 'teacher', 'accountant', 'receptionist']);
}

function academic_user(): array
{
    return require_roles(['school_admin', 'principal', 'dos', 'teacher']);
}

function finance_user(): array
{
    return require_roles(['school_admin', 'principal', 'accountant', 'receptionist']);
}

function school_filter(array $user, string $alias = ''): array
{
    if ($user['role'] === 'super_admin' || empty($user['school_id'])) {
        return ['', []];
    }
    $prefix = $alias !== '' ? $alias . '.' : '';
    return ["{$prefix}school_id = ?", [(int) $user['school_id']]];
}

function normalize_date_or_null($value): ?string
{
    $value = trim((string) ($value ?? ''));
    if ($value === '') {
        return null;
    }
    $date = DateTime::createFromFormat('Y-m-d', $value);
    if (!$date || $date->format('Y-m-d') !== $value) {
        error_response(422, 'Date values must use YYYY-MM-DD.');
    }
    return $value;
}

function grade_from_marks(float $marks, float $maxMarks): string
{
    $percentage = $maxMarks > 0 ? ($marks / $maxMarks) * 100 : 0;
    if ($percentage >= 80) {
        return 'A';
    }
    if ($percentage >= 70) {
        return 'B';
    }
    if ($percentage >= 60) {
        return 'C';
    }
    if ($percentage >= 50) {
        return 'D';
    }
    return 'E';
}

function current_student_user(array $user): array
{
    if ($user['role'] === 'parent') {
        $statement = pdo()->prepare('SELECT student_user_id FROM parent_students WHERE parent_user_id = ? LIMIT 1');
        $statement->execute([(int) $user['id']]);
        $studentId = $statement->fetchColumn();
        if ($studentId) {
            $student = get_user_by_id((int) $studentId);
            if ($student) {
                return $student;
            }
        }
    }
    return $user;
}

function user_response(array $user): array
{
    $statement = pdo()->prepare(
        'SELECT u.*, s.name AS school_name, sp.class_id, sp.profile_pic, c.name AS class_name, c.section AS class_section
         FROM users u
         LEFT JOIN schools s ON s.id = u.school_id
         LEFT JOIN student_profiles sp ON sp.user_id = u.id
         LEFT JOIN classrooms c ON c.id = sp.class_id
         WHERE u.id = ? LIMIT 1'
    );
    $statement->execute([(int) $user['id']]);
    $row = $statement->fetch() ?: $user;
    $className = '';
    if (!empty($row['class_name'])) {
        $className = $row['class_name'] . (!empty($row['class_section']) ? '-' . $row['class_section'] : '');
    }
    return [
        'id' => (int) $row['id'],
        'name' => $row['name'],
        'email' => $row['email'],
        'phone' => $row['phone'],
        'role' => $row['role'],
        'school_id' => $row['school_id'] !== null ? (int) $row['school_id'] : 0,
        'school_name' => $row['school_name'] ?? 'Global',
        'class_id' => $row['class_id'] !== null ? (int) $row['class_id'] : 0,
        'class_name' => $className,
        'profile_pic' => $row['profile_pic'] ?? '',
    ];
}

function user_summary(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'name' => $row['name'],
        'email' => $row['email'],
        'phone' => $row['phone'],
        'role' => $row['role'],
        'school_id' => $row['school_id'] !== null ? (int) $row['school_id'] : null,
        'is_active' => (bool) $row['is_active'],
    ];
}

function route_path(): string
{
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $path = preg_replace('#/+#', '/', $path);
    if (substr($path, 0, strlen('/api/index.php')) === '/api/index.php') {
        $path = substr($path, strlen('/api/index.php')) ?: '/';
    }
    return rtrim($path, '/') ?: '/';
}

function handle_request(): void
{
    send_cors_headers();
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
        json_response(['status' => 'ok']);
    }

    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $path = route_path();

    if ($method === 'GET' && $path === '/api/v1/health') {
        json_response(['status' => 'ok', 'version' => API_VERSION]);
    }

    if ($method === 'GET' && $path === '/api/v1/db-check') {
        json_response(database_check_payload());
    }

    if ($path === '/api/v1/install') {
        $token = $_GET['token'] ?? '';
        $expected = env_value('INSTALL_TOKEN');
        if (!$expected || !hash_equals($expected, (string) $token)) {
            error_response(403, 'Installer token is missing or invalid.');
        }
        execute_schema(pdo());
        seed_initial_data(pdo());
        json_response(['status' => 'installed', 'version' => API_VERSION]);
    }

    maybe_auto_create();

    if ($method === 'GET' && $path === '/api/v1/ready') {
        pdo()->query('SELECT 1');
        json_response(['status' => 'ready', 'version' => API_VERSION]);
    }

    if ($method === 'POST' && $path === '/api/v1/auth/login') {
        $body = read_json_body();
        $identifier = strtolower(trim((string) ($body['phone_or_email'] ?? '')));
        $password = (string) ($body['password'] ?? '');
        $statement = pdo()->prepare('SELECT * FROM users WHERE LOWER(email) = ? OR phone = ? LIMIT 1');
        $statement->execute([$identifier, trim((string) ($body['phone_or_email'] ?? ''))]);
        $user = $statement->fetch();
        if (!$user || !(bool) $user['is_active'] || !verify_password_value($password, $user['password_hash'])) {
            error_response(401, 'Invalid credentials');
        }
        $update = pdo()->prepare('UPDATE users SET last_login_at = NOW() WHERE id = ?');
        $update->execute([(int) $user['id']]);
        json_response(['token' => jwt_create($user), 'user' => user_response($user)]);
    }

    if ($method === 'GET' && $path === '/api/v1/auth/me') {
        json_response(user_response(current_user()));
    }

    if ($method === 'GET' && $path === '/api/v1/roles') {
        require_roles(['school_admin', 'principal']);
        json_response(['roles' => USER_ROLES]);
    }

    if ($method === 'GET' && $path === '/api/v1/admin/users') {
        $current = require_roles(['school_admin', 'principal', 'receptionist']);
        $params = [];
        $where = [];
        if ($current['role'] !== 'super_admin') {
            $where[] = 'school_id = ?';
            $params[] = $current['school_id'];
        }
        if (!empty($_GET['role'])) {
            $where[] = 'role = ?';
            $params[] = $_GET['role'];
        }
        $sql = 'SELECT * FROM users' . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . ' ORDER BY created_at DESC LIMIT 200';
        $statement = pdo()->prepare($sql);
        $statement->execute($params);
        json_response(array_map('user_summary', $statement->fetchAll()));
    }

    if ($method === 'POST' && $path === '/api/v1/admin/users') {
        $current = require_roles(['school_admin', 'principal']);
        $body = read_json_body();
        $role = (string) ($body['role'] ?? '');
        if (!in_array($role, USER_ROLES, true)) {
            error_response(422, 'Invalid role');
        }
        if ($role === 'super_admin' && $current['role'] !== 'super_admin') {
            error_response(403, 'Only super admins can create super admins');
        }
        $schoolId = $current['role'] === 'super_admin' ? ($body['school_id'] ?? null) : $current['school_id'];
        $statement = pdo()->prepare('SELECT id FROM users WHERE LOWER(email) = ? OR phone = ? LIMIT 1');
        $statement->execute([strtolower((string) ($body['email'] ?? '')), (string) ($body['phone'] ?? '')]);
        if ($statement->fetchColumn()) {
            error_response(409, 'User with email or phone already exists');
        }
        $insert = pdo()->prepare('INSERT INTO users (school_id, name, email, phone, password_hash, role, is_active, is_verified) VALUES (?, ?, ?, ?, ?, ?, 1, 1)');
        $insert->execute([
            $schoolId,
            (string) ($body['name'] ?? ''),
            strtolower((string) ($body['email'] ?? '')),
            (string) ($body['phone'] ?? ''),
            hash_password_value((string) ($body['password'] ?? '')),
            $role,
        ]);
        json_response(user_summary(get_user_by_id((int) pdo()->lastInsertId())), 201);
    }

    if ($method === 'GET' && $path === '/api/v1/admin/summary') {
        $current = office_user();
        [$schoolWhere, $schoolParams] = school_filter($current);
        $where = $schoolWhere ? ' WHERE ' . $schoolWhere : '';
        $countUsers = function (string $role = '') use ($where, $schoolParams): int {
            $params = $schoolParams;
            $roleWhere = $where;
            if ($role !== '') {
                $roleWhere .= $roleWhere ? ' AND role = ?' : ' WHERE role = ?';
                $params[] = $role;
            }
            $statement = pdo()->prepare('SELECT COUNT(*) FROM users' . $roleWhere);
            $statement->execute($params);
            return (int) $statement->fetchColumn();
        };

        $financeWhere = $schoolWhere ? ' WHERE ' . $schoolWhere : '';
        $finance = pdo()->prepare(
            "SELECT
              COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS paid,
              COALESCE(SUM(CASE WHEN status <> 'paid' THEN amount ELSE 0 END), 0) AS due,
              COALESCE(SUM(CASE WHEN status <> 'paid' AND due_date < CURDATE() THEN amount ELSE 0 END), 0) AS overdue
             FROM fee_invoices" . $financeWhere
        );
        $finance->execute($schoolParams);
        $financeRow = $finance->fetch() ?: ['paid' => 0, 'due' => 0, 'overdue' => 0];

        $todayAttendance = pdo()->prepare(
            "SELECT
              COALESCE(SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END), 0) AS present,
              COALESCE(SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END), 0) AS absent
             FROM attendance a
             JOIN users u ON u.id = a.student_user_id" .
             ($schoolWhere ? ' WHERE u.' . $schoolWhere . ' AND a.date = CURDATE()' : ' WHERE a.date = CURDATE()')
        );
        $todayAttendance->execute($schoolParams);
        $attendanceRow = $todayAttendance->fetch() ?: ['present' => 0, 'absent' => 0];

        json_response([
            'students' => $countUsers('student'),
            'teachers' => $countUsers('teacher'),
            'parents' => $countUsers('parent'),
            'staff' => $countUsers() - $countUsers('student') - $countUsers('parent'),
            'fees_paid' => (float) $financeRow['paid'],
            'fees_due' => (float) $financeRow['due'],
            'fees_overdue' => (float) $financeRow['overdue'],
            'attendance_present_today' => (int) $attendanceRow['present'],
            'attendance_absent_today' => (int) $attendanceRow['absent'],
        ]);
    }

    if ($method === 'GET' && $path === '/api/v1/admin/classes') {
        $current = office_user();
        [$where, $params] = school_filter($current, 'c');
        $sql = "SELECT c.id, c.name, c.section, c.grade_level, t.name AS teacher_name,
                   COUNT(sp.user_id) AS student_count
                FROM classrooms c
                LEFT JOIN users t ON t.id = c.teacher_user_id
                LEFT JOIN student_profiles sp ON sp.class_id = c.id";
        if ($where) {
            $sql .= ' WHERE ' . $where;
        }
        $sql .= ' GROUP BY c.id, c.name, c.section, c.grade_level, t.name ORDER BY c.name, c.section';
        $statement = pdo()->prepare($sql);
        $statement->execute($params);
        json_response(array_map(fn($row) => [
            'id' => (int) $row['id'],
            'name' => $row['name'],
            'section' => $row['section'],
            'grade_level' => $row['grade_level'],
            'teacher_name' => $row['teacher_name'] ?? '',
            'student_count' => (int) $row['student_count'],
        ], $statement->fetchAll()));
    }

    if ($method === 'GET' && $path === '/api/v1/admin/students') {
        $current = office_user();
        [$where, $params] = school_filter($current, 'u');
        $conditions = ["u.role = 'student'"];
        if ($where) {
            $conditions[] = $where;
        }
        if (!empty($_GET['class_id'])) {
            $conditions[] = 'sp.class_id = ?';
            $params[] = (int) $_GET['class_id'];
        }
        if (!empty($_GET['q'])) {
            $conditions[] = '(u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR sp.admission_number LIKE ?)';
            $needle = '%' . $_GET['q'] . '%';
            array_push($params, $needle, $needle, $needle, $needle);
        }

        $sql = "SELECT
                  u.id, u.name, u.email, u.phone, u.school_id, u.is_active,
                  sp.admission_number, sp.roll_number, sp.gender, sp.profile_pic,
                  c.id AS class_id, c.name AS class_name, c.section AS class_section,
                  p.name AS parent_name, p.phone AS parent_phone,
                  COALESCE(f.total_due, 0) AS fees_due,
                  COALESCE(f.total_paid, 0) AS fees_paid,
                  COALESCE(r.requirements_due, 0) AS requirements_due,
                  COALESCE(a.present_count, 0) AS present_count,
                  COALESCE(a.total_count, 0) AS attendance_total
                FROM users u
                LEFT JOIN student_profiles sp ON sp.user_id = u.id
                LEFT JOIN classrooms c ON c.id = sp.class_id
                LEFT JOIN parent_students ps ON ps.student_user_id = u.id
                LEFT JOIN users p ON p.id = ps.parent_user_id
                LEFT JOIN (
                  SELECT student_user_id,
                    SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS total_paid,
                    SUM(CASE WHEN status <> 'paid' THEN amount ELSE 0 END) AS total_due
                  FROM fee_invoices GROUP BY student_user_id
                ) f ON f.student_user_id = u.id
                LEFT JOIN (
                  SELECT student_user_id, SUM(CASE WHEN status <> 'cleared' THEN amount ELSE 0 END) AS requirements_due
                  FROM student_requirements GROUP BY student_user_id
                ) r ON r.student_user_id = u.id
                LEFT JOIN (
                  SELECT student_user_id,
                    SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS present_count,
                    COUNT(*) AS total_count
                  FROM attendance GROUP BY student_user_id
                ) a ON a.student_user_id = u.id
                WHERE " . implode(' AND ', $conditions) . "
                ORDER BY c.name, c.section, u.name
                LIMIT 500";
        $statement = pdo()->prepare($sql);
        $statement->execute($params);
        json_response(array_map(fn($row) => [
            'id' => (int) $row['id'],
            'name' => $row['name'],
            'email' => $row['email'],
            'phone' => $row['phone'],
            'school_id' => $row['school_id'] !== null ? (int) $row['school_id'] : null,
            'is_active' => (bool) $row['is_active'],
            'admission_number' => $row['admission_number'] ?? '',
            'roll_number' => $row['roll_number'] ?? '',
            'gender' => $row['gender'] ?? '',
            'profile_pic' => $row['profile_pic'] ?? '',
            'class_id' => $row['class_id'] !== null ? (int) $row['class_id'] : null,
            'class_name' => trim(($row['class_name'] ?? '') . (!empty($row['class_section']) ? '-' . $row['class_section'] : '')),
            'parent_name' => $row['parent_name'] ?? '',
            'parent_phone' => $row['parent_phone'] ?? '',
            'fees_due' => (float) $row['fees_due'],
            'fees_paid' => (float) $row['fees_paid'],
            'requirements_due' => (float) $row['requirements_due'],
            'attendance_percentage' => (int) $row['attendance_total'] > 0
                ? round(((int) $row['present_count'] / (int) $row['attendance_total']) * 100, 1)
                : 0,
        ], $statement->fetchAll()));
    }

    if ($method === 'GET' && $path === '/api/v1/admin/class-attendance') {
        $current = academic_user();
        $classId = (int) ($_GET['class_id'] ?? 0);
        $date = normalize_date_or_null($_GET['date'] ?? date('Y-m-d')) ?: date('Y-m-d');
        $subject = trim((string) ($_GET['subject'] ?? 'Class'));
        $params = [$date, $subject];
        $conditions = ["u.role = 'student'"];
        [$schoolWhere, $schoolParams] = school_filter($current, 'u');
        if ($schoolWhere) {
            $conditions[] = $schoolWhere;
            $params = array_merge($params, $schoolParams);
        }
        if ($classId > 0) {
            $conditions[] = 'sp.class_id = ?';
            $params[] = $classId;
        }
        $sql = "SELECT u.id AS student_user_id, u.name, sp.admission_number,
                  c.name AS class_name, c.section AS class_section,
                  a.id AS attendance_id, a.status, a.subject, a.date
                FROM users u
                LEFT JOIN student_profiles sp ON sp.user_id = u.id
                LEFT JOIN classrooms c ON c.id = sp.class_id
                LEFT JOIN attendance a ON a.student_user_id = u.id AND a.date = ? AND a.subject = ?
                WHERE " . implode(' AND ', $conditions) . "
                ORDER BY u.name";
        $statement = pdo()->prepare($sql);
        $statement->execute($params);
        json_response(array_map(fn($row) => [
            'student_user_id' => (int) $row['student_user_id'],
            'name' => $row['name'],
            'admission_number' => $row['admission_number'] ?? '',
            'class_name' => trim(($row['class_name'] ?? '') . (!empty($row['class_section']) ? '-' . $row['class_section'] : '')),
            'attendance_id' => $row['attendance_id'] !== null ? (int) $row['attendance_id'] : null,
            'date' => $date,
            'subject' => $subject,
            'status' => $row['status'] ?? 'unmarked',
        ], $statement->fetchAll()));
    }

    if ($method === 'POST' && $path === '/api/v1/admin/class-attendance') {
        academic_user();
        $body = read_json_body();
        $date = normalize_date_or_null($body['date'] ?? date('Y-m-d')) ?: date('Y-m-d');
        $subject = trim((string) ($body['subject'] ?? 'Class'));
        $records = is_array($body['records'] ?? null) ? $body['records'] : [];
        $statement = pdo()->prepare(
            "INSERT INTO attendance (student_user_id, date, status, subject)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE status = VALUES(status), updated_at = CURRENT_TIMESTAMP"
        );
        $saved = 0;
        foreach ($records as $record) {
            $studentId = (int) ($record['student_user_id'] ?? 0);
            $statusValue = (string) ($record['status'] ?? '');
            if ($studentId <= 0 || !in_array($statusValue, ['present', 'absent', 'late', 'excused'], true)) {
                continue;
            }
            $statement->execute([$studentId, $date, $statusValue, $subject]);
            $saved++;
        }
        json_response(['status' => 'saved', 'saved' => $saved]);
    }

    if ($method === 'GET' && $path === '/api/v1/admin/assessments') {
        $current = academic_user();
        [$where, $params] = school_filter($current, 'at');
        $conditions = [];
        if ($where) {
            $conditions[] = $where;
        }
        if (!empty($_GET['class_id'])) {
            $conditions[] = 'at.class_id = ?';
            $params[] = (int) $_GET['class_id'];
        }
        $sql = "SELECT at.*, c.name AS class_name, c.section AS class_section, u.name AS teacher_name,
                  COUNT(sc.id) AS submitted_count,
                  COALESCE(AVG(sc.marks), 0) AS average_marks
                FROM assessment_tasks at
                LEFT JOIN classrooms c ON c.id = at.class_id
                LEFT JOIN users u ON u.id = at.teacher_user_id
                LEFT JOIN assessment_scores sc ON sc.assessment_id = at.id";
        if ($conditions) {
            $sql .= ' WHERE ' . implode(' AND ', $conditions);
        }
        $sql .= ' GROUP BY at.id, c.name, c.section, u.name ORDER BY at.created_at DESC LIMIT 200';
        $statement = pdo()->prepare($sql);
        $statement->execute($params);
        json_response(array_map(fn($row) => [
            'id' => (int) $row['id'],
            'school_id' => (int) $row['school_id'],
            'class_id' => $row['class_id'] !== null ? (int) $row['class_id'] : null,
            'class_name' => trim(($row['class_name'] ?? '') . (!empty($row['class_section']) ? '-' . $row['class_section'] : '')),
            'teacher_name' => $row['teacher_name'] ?? '',
            'subject' => $row['subject'],
            'title' => $row['title'],
            'term' => $row['term'],
            'max_marks' => (float) $row['max_marks'],
            'due_date' => $row['due_date'],
            'submitted_count' => (int) $row['submitted_count'],
            'average_marks' => round((float) $row['average_marks'], 1),
        ], $statement->fetchAll()));
    }

    if ($method === 'POST' && $path === '/api/v1/admin/assessments') {
        $current = academic_user();
        $body = read_json_body();
        $schoolId = $current['school_id'] ?: (int) ($body['school_id'] ?? 1);
        $statement = pdo()->prepare('INSERT INTO assessment_tasks (school_id, class_id, teacher_user_id, subject, title, term, max_marks, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        $statement->execute([
            $schoolId,
            !empty($body['class_id']) ? (int) $body['class_id'] : null,
            (int) $current['id'],
            trim((string) ($body['subject'] ?? 'General')),
            trim((string) ($body['title'] ?? 'Assessment')),
            trim((string) ($body['term'] ?? 'Term 1')),
            (float) ($body['max_marks'] ?? 100),
            normalize_date_or_null($body['due_date'] ?? null),
        ]);
        json_response(['status' => 'created', 'id' => (int) pdo()->lastInsertId()], 201);
    }

    if ($method === 'POST' && $path === '/api/v1/admin/assessment-scores') {
        academic_user();
        $body = read_json_body();
        $assessmentId = (int) ($body['assessment_id'] ?? 0);
        $scores = is_array($body['scores'] ?? null) ? $body['scores'] : [];
        $maxMarksStatement = pdo()->prepare('SELECT max_marks FROM assessment_tasks WHERE id = ? LIMIT 1');
        $maxMarksStatement->execute([$assessmentId]);
        $maxMarks = (float) ($maxMarksStatement->fetchColumn() ?: 100);
        $statement = pdo()->prepare(
            "INSERT INTO assessment_scores (assessment_id, student_user_id, marks, grade, remarks)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE marks = VALUES(marks), grade = VALUES(grade), remarks = VALUES(remarks), updated_at = CURRENT_TIMESTAMP"
        );
        $saved = 0;
        foreach ($scores as $score) {
            $studentId = (int) ($score['student_user_id'] ?? 0);
            $marks = (float) ($score['marks'] ?? 0);
            if ($assessmentId <= 0 || $studentId <= 0) {
                continue;
            }
            $grade = trim((string) ($score['grade'] ?? '')) ?: grade_from_marks($marks, $maxMarks);
            $statement->execute([$assessmentId, $studentId, $marks, $grade, (string) ($score['remarks'] ?? '')]);
            $saved++;
        }
        json_response(['status' => 'saved', 'saved' => $saved]);
    }

    if ($method === 'GET' && $path === '/api/v1/admin/requirements') {
        $current = office_user();
        [$where, $params] = school_filter($current, 'sr');
        $conditions = [];
        if ($where) {
            $conditions[] = $where;
        }
        if (!empty($_GET['student_user_id'])) {
            $conditions[] = 'sr.student_user_id = ?';
            $params[] = (int) $_GET['student_user_id'];
        }
        $sql = "SELECT sr.*, u.name AS student_name, sp.admission_number, c.name AS class_name, c.section AS class_section
                FROM student_requirements sr
                JOIN users u ON u.id = sr.student_user_id
                LEFT JOIN student_profiles sp ON sp.user_id = u.id
                LEFT JOIN classrooms c ON c.id = sp.class_id";
        if ($conditions) {
            $sql .= ' WHERE ' . implode(' AND ', $conditions);
        }
        $sql .= ' ORDER BY sr.created_at DESC LIMIT 300';
        $statement = pdo()->prepare($sql);
        $statement->execute($params);
        json_response(array_map(fn($row) => [
            'id' => (int) $row['id'],
            'student_user_id' => (int) $row['student_user_id'],
            'student_name' => $row['student_name'],
            'admission_number' => $row['admission_number'] ?? '',
            'class_name' => trim(($row['class_name'] ?? '') . (!empty($row['class_section']) ? '-' . $row['class_section'] : '')),
            'title' => $row['title'],
            'amount' => (float) $row['amount'],
            'status' => $row['status'],
            'due_date' => $row['due_date'],
            'notes' => $row['notes'] ?? '',
        ], $statement->fetchAll()));
    }

    if ($method === 'POST' && $path === '/api/v1/admin/requirements') {
        $current = finance_user();
        $body = read_json_body();
        $schoolId = $current['school_id'] ?: (int) ($body['school_id'] ?? 1);
        $statement = pdo()->prepare('INSERT INTO student_requirements (school_id, student_user_id, title, amount, status, due_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)');
        $statement->execute([
            $schoolId,
            (int) ($body['student_user_id'] ?? 0),
            trim((string) ($body['title'] ?? 'Requirement')),
            (float) ($body['amount'] ?? 0),
            trim((string) ($body['status'] ?? 'pending')),
            normalize_date_or_null($body['due_date'] ?? null),
            (string) ($body['notes'] ?? ''),
        ]);
        json_response(['status' => 'created', 'id' => (int) pdo()->lastInsertId()], 201);
    }

    if ($method === 'GET' && $path === '/api/v1/admin/finance/ledger') {
        $current = finance_user();
        [$where, $params] = school_filter($current, 'u');
        $conditions = ["u.role = 'student'"];
        if ($where) {
            $conditions[] = $where;
        }
        $sql = "SELECT u.id AS student_user_id, u.name AS student_name, sp.admission_number,
                  c.name AS class_name, c.section AS class_section,
                  COALESCE(f.total_paid, 0) AS total_paid,
                  COALESCE(f.total_due, 0) AS total_due,
                  COALESCE(f.overdue, 0) AS overdue,
                  COALESCE(r.requirements_due, 0) AS requirements_due
                FROM users u
                LEFT JOIN student_profiles sp ON sp.user_id = u.id
                LEFT JOIN classrooms c ON c.id = sp.class_id
                LEFT JOIN (
                  SELECT student_user_id,
                    SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS total_paid,
                    SUM(CASE WHEN status <> 'paid' THEN amount ELSE 0 END) AS total_due,
                    SUM(CASE WHEN status <> 'paid' AND due_date < CURDATE() THEN amount ELSE 0 END) AS overdue
                  FROM fee_invoices GROUP BY student_user_id
                ) f ON f.student_user_id = u.id
                LEFT JOIN (
                  SELECT student_user_id, SUM(CASE WHEN status <> 'cleared' THEN amount ELSE 0 END) AS requirements_due
                  FROM student_requirements GROUP BY student_user_id
                ) r ON r.student_user_id = u.id
                WHERE " . implode(' AND ', $conditions) . "
                ORDER BY u.name LIMIT 500";
        $statement = pdo()->prepare($sql);
        $statement->execute($params);
        json_response(array_map(fn($row) => [
            'student_user_id' => (int) $row['student_user_id'],
            'student_name' => $row['student_name'],
            'admission_number' => $row['admission_number'] ?? '',
            'class_name' => trim(($row['class_name'] ?? '') . (!empty($row['class_section']) ? '-' . $row['class_section'] : '')),
            'total_paid' => (float) $row['total_paid'],
            'total_due' => (float) $row['total_due'],
            'overdue' => (float) $row['overdue'],
            'requirements_due' => (float) $row['requirements_due'],
            'balance' => (float) $row['total_due'] + (float) $row['requirements_due'],
        ], $statement->fetchAll()));
    }

    if ($method === 'GET' && $path === '/api/v1/attendance') {
        $student = current_student_user(current_user());
        $month = $_GET['month'] ?? date('Y-m');
        if (!preg_match('/^\d{4}-\d{2}$/', (string) $month)) {
            error_response(422, 'month must be a valid YYYY-MM value');
        }
        $start = $month . '-01';
        $end = date('Y-m-d', strtotime($start . ' +1 month'));
        $statement = pdo()->prepare('SELECT id, date, status, subject FROM attendance WHERE student_user_id = ? AND date >= ? AND date < ? ORDER BY date ASC');
        $statement->execute([(int) $student['id'], $start, $end]);
        $rows = array_map(fn($row) => [
            'id' => (int) $row['id'],
            'date' => $row['date'],
            'status' => $row['status'],
            'subject' => $row['subject'],
        ], $statement->fetchAll());
        json_response($rows);
    }

    if ($method === 'GET' && $path === '/api/v1/fees/invoices') {
        $student = current_student_user(current_user());
        $statement = pdo()->prepare('SELECT id, description, amount, due_date, status, paid_date FROM fee_invoices WHERE student_user_id = ? ORDER BY due_date DESC');
        $statement->execute([(int) $student['id']]);
        json_response(array_map(fn($row) => [
            'id' => (int) $row['id'],
            'description' => $row['description'],
            'amount' => (float) $row['amount'],
            'due_date' => $row['due_date'],
            'status' => $row['status'],
            'paid_date' => $row['paid_date'],
        ], $statement->fetchAll()));
    }

    if ($method === 'GET' && $path === '/api/v1/fees/dashboard') {
        $student = current_student_user(current_user());
        $statement = pdo()->prepare('SELECT amount, due_date, status FROM fee_invoices WHERE student_user_id = ?');
        $statement->execute([(int) $student['id']]);
        $totalPaid = 0.0;
        $totalDue = 0.0;
        $totalOverdue = 0.0;
        $today = date('Y-m-d');
        foreach ($statement->fetchAll() as $row) {
            $amount = (float) $row['amount'];
            if ($row['status'] === 'paid') {
                $totalPaid += $amount;
            } else {
                $totalDue += $amount;
                if ($row['due_date'] < $today) {
                    $totalOverdue += $amount;
                }
            }
        }
        json_response(['total_due' => $totalDue, 'total_paid' => $totalPaid, 'total_overdue' => $totalOverdue]);
    }

    if ($method === 'GET' && $path === '/api/v1/circulars') {
        $current = current_user();
        $limit = max(1, min(100, (int) ($_GET['limit'] ?? 20)));
        $params = [];
        $where = '';
        if ($current['school_id']) {
            $where = ' WHERE school_id = ?';
            $params[] = $current['school_id'];
        }
        $statement = pdo()->prepare("SELECT id, title, content, issued_date, file_url FROM circulars{$where} ORDER BY issued_date DESC LIMIT {$limit}");
        $statement->execute($params);
        json_response(array_map(fn($row) => [
            'id' => (int) $row['id'],
            'title' => $row['title'],
            'content' => $row['content'],
            'issued_date' => $row['issued_date'],
            'file_url' => $row['file_url'],
        ], $statement->fetchAll()));
    }

    if ($method === 'GET' && $path === '/api/v1/messages/inbox') {
        $current = current_user();
        $limit = max(1, min(100, (int) ($_GET['limit'] ?? 20)));
        $statement = pdo()->prepare(
            "SELECT m.id, m.subject, m.body, m.created_at, m.is_read, u.name AS from_user, u.role AS from_role
             FROM messages m
             LEFT JOIN users u ON u.id = m.from_user_id
             WHERE m.to_user_id = ?
             ORDER BY m.created_at DESC
             LIMIT {$limit}"
        );
        $statement->execute([(int) $current['id']]);
        json_response(array_map(fn($row) => [
            'id' => (int) $row['id'],
            'from_user' => $row['from_user'] ?? 'System',
            'from_role' => $row['from_role'] ?? 'system',
            'subject' => $row['subject'],
            'body' => $row['body'],
            'created_at' => str_replace(' ', 'T', $row['created_at']) . 'Z',
            'is_read' => (bool) $row['is_read'],
        ], $statement->fetchAll()));
    }

    if ($method === 'GET' && $path === '/api/v1/transport/route') {
        $current = current_user();
        $params = [];
        $where = '';
        if ($current['school_id']) {
            $where = ' WHERE school_id = ?';
            $params[] = $current['school_id'];
        }
        $statement = pdo()->prepare("SELECT * FROM transport_routes{$where} ORDER BY id ASC LIMIT 1");
        $statement->execute($params);
        $route = $statement->fetch();
        if (!$route) {
            error_response(404, 'Transport route not configured');
        }
        json_response([
            'route_id' => (int) $route['id'],
            'bus_number' => $route['bus_number'],
            'driver_name' => $route['driver_name'],
            'driver_phone' => $route['driver_phone'],
            'pickup_location' => $route['pickup_location'],
            'pickup_time' => $route['pickup_time'],
            'dropoff_location' => $route['dropoff_location'],
            'dropoff_time' => $route['dropoff_time'],
            'current_location' => $route['current_location'],
            'latitude' => (float) $route['latitude'],
            'longitude' => (float) $route['longitude'],
        ]);
    }

    error_response(404, 'Endpoint not found');
}

set_exception_handler(function (Throwable $exception): void {
    error_response(500, 'Server error: ' . $exception->getMessage());
});

handle_request();
