CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(24) UNIQUE NOT NULL,
    email VARCHAR(254) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(24) DEFAULT 'user' NOT NULL,
    email_verified TINYINT(1) DEFAULT 0 NOT NULL,
    verification_token VARCHAR(64),
    verification_token_expires_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP NOT NULL,

    CONSTRAINT username_length_3_to_24
        CHECK (CHAR_LENGTH(username) BETWEEN 3 AND 24),
    CONSTRAINT email_verified_0_or_1
        CHECK (email_verified IN (0, 1)),
    CONSTRAINT verification_token_length
        CHECK (
            verification_token IS NULL 
            OR CHAR_LENGTH(verification_token) = 64
        )
);

DELIMITER //

CREATE TRIGGER validate_user
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
    
    IF NEW.verification_token_expires_at IS NOT NULL 
       AND NEW.verification_token_expires_at <= NOW() 
    THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Token expiration time must be in the future';
    END IF;
END //

DELIMITER ;
