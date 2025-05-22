CREATE TABLE user_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_type ENUM(
        'account_verification',
        'password_reset',
        'email_change',
        'account_deletion',
        'account_deactivation'
    ) NOT NULL,
    token_value VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    used_at TIMESTAMP,

    UNIQUE KEY unique_user_token_type (user_id, token_type),
    INDEX index_user_token_type (user_id, token_type),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

    CONSTRAINT token_value_length CHECK (CHAR_LENGTH(token_value) = 64)
);

DELIMITER //

CREATE TRIGGER validate_user_token_insert
BEFORE INSERT ON user_tokens
FOR EACH ROW
BEGIN
    IF NEW.expires_at <= NOW() THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Token expiration must be in future';
    END IF;
END //

CREATE TRIGGER validate_user_token_update
BEFORE UPDATE ON user_tokens
FOR EACH ROW
BEGIN
    IF NEW.expires_at <= NOW() THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Token expiration must be in future';
    END IF;
END //

CREATE EVENT delete_general_used_or_expired_tokens
    ON SCHEDULE EVERY 1 DAY
    DO
        DELETE FROM user_tokens
        WHERE token_type IN (
                'account_verification',
                'password_reset',
                'email_change'
            )
            AND (
                expires_at < NOW()
                OR used_at IS NOT NULL
            );

CREATE EVENT delete_expired_unused_tokens
    ON SCHEDULE EVERY 1 DAY
    DO
        DELETE FROM user_tokens
        WHERE token_type IN ('account_deletion', 'account_deactivation')
            AND expires_at < NOW()
            AND used_at IS NULL;

DELIMITER ;
