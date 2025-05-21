CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(24) COLLATE utf8mb4_bin NOT NULL,
    username_ci VARCHAR(24) AS (LOWER(username)) STORED,
    email VARCHAR(254) COLLATE utf8mb4_bin NOT NULL, 
    email_ci VARCHAR(254) AS (LOWER(email)) STORED,
    email_pending VARCHAR(254) COLLATE utf8mb4_bin DEFAULT NULL,
    email_pending_ci VARCHAR(254) AS (LOWER(email_pending)) STORED,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(24) DEFAULT 'user' NOT NULL,
    verified_by_email TINYINT DEFAULT 0 NOT NULL,
    account_active TINYINT DEFAULT 1 NOT NULL,
    totp_auth_on TINYINT DEFAULT 0 NOT NULL,
    totp_auth_secret VARCHAR(255) CHARACTER SET ascii,
    totp_auth_init_vector VARCHAR(255) CHARACTER SET ascii,
    totp_auth_tag VARCHAR(255) CHARACTER SET ascii,
    totp_auth_backup_codes JSON,
    verification_token VARCHAR(64) UNIQUE,
    verification_token_expires_at TIMESTAMP, -- No need for DEFAULT NULL
    password_reset_token VARCHAR(64) UNIQUE,
    password_reset_token_expires_at TIMESTAMP, -- No need for DEFAULT NULL
    email_change_token VARCHAR(64) UNIQUE,
    email_change_token_expires_at TIMESTAMP, -- No need for DEFAULT NULL
    username_last_changed_at TIMESTAMP,
    email_last_changed_at TIMESTAMP,
    last_deactivated_at TIMESTAMP,
    last_reactivated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP NOT NULL,

    UNIQUE KEY unique_username_ci (username_ci),
    UNIQUE KEY unique_email_ci (email_ci),
    UNIQUE KEY unique_email_pending_ci (email_pending_ci),

    CONSTRAINT username_length_3_to_24
        CHECK (CHAR_LENGTH(username) BETWEEN 3 AND 24),
    CONSTRAINT verified_by_email_0_or_1
        CHECK (verified_by_email IN (0, 1)),
    CONSTRAINT account_active_0_or_1
        CHECK (account_active IN (0, 1)),
    CONSTRAINT totp_auth_on_0_or_1
        CHECK (totp_auth_on IN (0, 1)),
    CONSTRAINT verification_token_length
        CHECK (
            verification_token IS NULL 
            OR CHAR_LENGTH(verification_token) = 64
        ),
    CONSTRAINT password_reset_token_length
        CHECK (
            password_reset_token IS NULL 
            OR CHAR_LENGTH(password_reset_token) = 64
        ),
    CONSTRAINT email_change_token_length
        CHECK (
            email_change_token IS NULL 
            OR CHAR_LENGTH(email_change_token) = 64
        )
);

DELIMITER //

CREATE TRIGGER validate_user_insert
BEFORE INSERT ON users
FOR EACH ROW
BEGIN
    IF NOT REGEXP_LIKE(
        NEW.username,
        '^[a-zA-Z_][a-zA-Z0-9._]{2,23}$'
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Invalid username';
    END IF;

    IF NOT REGEXP_LIKE(
        NEW.email,
        '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Invalid email address';
    END IF;

    IF NEW.email_pending IS NOT NULL AND NOT REGEXP_LIKE(
        NEW.email_pending,
        '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Invalid pending email address';
    END IF;

    IF NEW.verification_token_expires_at IS NOT NULL 
        AND NEW.verification_token_expires_at <= NOW() THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Expiration time must be in the future';
    END IF;

    IF NEW.password_reset_token_expires_at IS NOT NULL 
        AND NEW.password_reset_token_expires_at <= NOW() THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Expiration time must be in the future';
    END IF;

    IF NEW.email_change_token_expires_at IS NOT NULL 
        AND NEW.email_change_token_expires_at <= NOW() THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Expiration time must be in the future';
    END IF;

    IF LOWER(NEW.email) = LOWER(NEW.email_pending) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Email and pending email must not be the same';
    END IF;

    IF NEW.totp_auth_on = 1 AND NEW.totp_auth_secret IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '2FA enabled without secret';
    END IF;
END //

CREATE TRIGGER validate_user_update
BEFORE UPDATE ON users
FOR EACH ROW
BEGIN
    IF NOT REGEXP_LIKE(
        NEW.username,
        '^[a-zA-Z_][a-zA-Z0-9._]{2,23}$'
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Invalid username';
    END IF;

    IF NOT REGEXP_LIKE(
        NEW.email,
        '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Invalid email address';
    END IF;

    IF NEW.email_pending IS NOT NULL AND NOT REGEXP_LIKE(
        NEW.email_pending,
        '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Invalid pending email address';
    END IF;

    IF NEW.verification_token_expires_at IS NOT NULL 
        AND NEW.verification_token_expires_at <= NOW() THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Expiration time must be in the future';
    END IF;

    IF NEW.password_reset_token_expires_at IS NOT NULL 
        AND NEW.password_reset_token_expires_at <= NOW() THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Expiration time must be in the future';
    END IF;

    IF NEW.email_change_token_expires_at IS NOT NULL 
        AND NEW.email_change_token_expires_at <= NOW() THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Expiration time must be in the future';
    END IF;

    IF NEW.username != OLD.username THEN
        SET NEW.username_last_changed_at = CURRENT_TIMESTAMP;
    END IF;

    IF NEW.email != OLD.email THEN
        SET NEW.email_last_changed_at = CURRENT_TIMESTAMP;
    END IF;

    IF NEW.account_active = 0 AND OLD.account_active != 0 THEN
        SET NEW.last_deactivated_at = CURRENT_TIMESTAMP;
    END IF;

    IF NEW.account_active = 1 AND OLD.account_active != 1 THEN
        SET NEW.last_reactivated_at = CURRENT_TIMESTAMP;
    END IF;

    IF LOWER(NEW.email) = LOWER(NEW.email_pending) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Email and pending email must not be the same';
    END IF;

    IF NEW.totp_auth_on = 1 AND NEW.totp_auth_secret IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '2FA enabled without secret';
    END IF;
END //

DELIMITER ;
