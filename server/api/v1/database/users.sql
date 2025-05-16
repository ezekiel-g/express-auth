CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(24) UNIQUE NOT NULL,
    email VARCHAR(254) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(24) DEFAULT 'user' NOT NULL,
    email_confirmed TINYINT(1) DEFAULT 0 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP NOT NULL,

    CONSTRAINT username_length_3_to_24
        CHECK (CHAR_LENGTH(username) BETWEEN 3 AND 24),
    CONSTRAINT email_confirmed_0_or_1
        CHECK (email_confirmed IN (0, 1))
);

DELIMITER //

CREATE TRIGGER validate_username_email
BEFORE INSERT ON users
FOR EACH ROW
BEGIN
    IF NEW.username NOT REGEXP 
        '^[a-zA-Z_][a-zA-Z0-9._]{2,23}$' 
    THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Invalid username';
    END IF;

    IF NEW.email NOT REGEXP 
        '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' 
    THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Invalid email address';
    END IF;
END //

DELIMITER ;
