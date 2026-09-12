CREATE TABLE IF NOT EXISTS workflow_migrations (name VARCHAR(120) PRIMARY KEY);
CREATE TABLE IF NOT EXISTS order_workflows (
 order_id INT PRIMARY KEY,
 estimate DECIMAL(12,2) NOT NULL,
 quote_status VARCHAR(30) NOT NULL DEFAULT 'requested',
 quote_version INT NOT NULL DEFAULT 0,
 proof_version INT NOT NULL DEFAULT 0,
 completed_at DATETIME NULL,
 FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS quote_versions (
 id INT AUTO_INCREMENT PRIMARY KEY,
 order_id INT NOT NULL,
 version INT NOT NULL,
 amount DECIMAL(12,2) NOT NULL,
 note TEXT,
 status VARCHAR(30) NOT NULL DEFAULT 'sent',
 customer_note TEXT,
 actor_id INT NOT NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 responded_at DATETIME NULL,
 UNIQUE KEY quote_order_version (order_id,version),
 FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS artwork_proofs (
 id INT AUTO_INCREMENT PRIMARY KEY,
 order_id INT NOT NULL,
 version INT NOT NULL,
 original_name VARCHAR(255) NOT NULL,
 stored_name VARCHAR(255) NOT NULL,
 mime_type VARCHAR(120) NOT NULL,
 note TEXT,
 customer_note TEXT,
 status VARCHAR(30) NOT NULL DEFAULT 'pending',
 actor_id INT NOT NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 responded_at DATETIME NULL,
 UNIQUE KEY proof_order_version (order_id,version),
 FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS site_stories (
 id INT AUTO_INCREMENT PRIMARY KEY,
 kind VARCHAR(30) NOT NULL,
 title VARCHAR(160) NOT NULL,
 category VARCHAR(80) NOT NULL DEFAULT 'Studio',
 description TEXT,
 image_url VARCHAR(500),
 customer_name VARCHAR(160),
 consent BOOLEAN NOT NULL DEFAULT FALSE,
 published BOOLEAN NOT NULL DEFAULT FALSE,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
