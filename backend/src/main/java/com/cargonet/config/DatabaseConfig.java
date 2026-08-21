package com.cargonet.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import io.github.cdimascio.dotenv.Dotenv;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.sql.DataSource;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

public class DatabaseConfig {

    private static final Logger logger = LoggerFactory.getLogger(DatabaseConfig.class);
    private static HikariDataSource dataSource;
    private static Dotenv dotenv;

    static {
        try {
            dotenv = Dotenv.configure().ignoreIfMissing().load();
        } catch (Exception e) {
            logger.warn("Could not load .env file, falling back to system environment variables.");
        }
    }

    public static String getEnv(String key) {
        if (dotenv != null && dotenv.get(key) != null && !dotenv.get(key).isBlank()) {
            return dotenv.get(key);
        }
        String sysVal = System.getenv(key);
        return (sysVal != null && !sysVal.isBlank()) ? sysVal : null;
    }

    public static String getEnv(String key, String defaultValue) {
        String val = getEnv(key);
        return val != null ? val : defaultValue;
    }

    public static synchronized DataSource getDataSource() {
        if (dataSource == null) {
            String jdbcUrl = getEnv("JDBC_URL");
            String host = getEnv("SUPABASE_DB_HOST", "localhost");
            String port = getEnv("SUPABASE_DB_PORT", "5432");
            String db = getEnv("SUPABASE_DB_NAME", "postgres");
            String user = getEnv("SUPABASE_DB_USER", "postgres");
            String password = getEnv("SUPABASE_DB_PASSWORD", "");

            if (jdbcUrl == null || jdbcUrl.isBlank()) {
                boolean isLocal = "localhost".equalsIgnoreCase(host) || "127.0.0.1".equalsIgnoreCase(host);
                if (isLocal) {
                    jdbcUrl = String.format("jdbc:postgresql://%s:%s/%s", host, port, db);
                } else {
                    jdbcUrl = String.format("jdbc:postgresql://%s:%s/%s?sslmode=require", host, port, db);
                }
            }

            HikariConfig config = new HikariConfig();
            config.setDriverClassName("org.postgresql.Driver");
            config.setJdbcUrl(jdbcUrl);
            if (user != null && !user.isBlank()) {
                config.setUsername(user);
            }
            if (password != null && !password.isBlank()) {
                config.setPassword(password);
            }
            config.setMaximumPoolSize(10);
            config.setMinimumIdle(2);
            config.setConnectionTimeout(30000);
            config.setIdleTimeout(600000);

            dataSource = new HikariDataSource(config);
            logger.info("PostgreSQL HikariCP connection pool initialized successfully.");

            initSchemaAndSeed();
        }
        return dataSource;
    }

    public static Connection getConnection() throws SQLException {
        return getDataSource().getConnection();
    }

    private static void initSchemaAndSeed() {
        try (Connection conn = dataSource.getConnection(); Statement stmt = conn.createStatement()) {
            logger.info("Verifying PostgreSQL Database Schema...");
            
            String schemaSql = loadResourceFile("schema.sql");
            if (schemaSql != null && !schemaSql.isBlank()) {
                for (String sql : schemaSql.split(";")) {
                    String trimmed = sql.trim();
                    if (!trimmed.isEmpty()) {
                        try {
                            stmt.execute(trimmed);
                        } catch (SQLException e) {
                            logger.debug("Schema init statement message: {}", e.getMessage());
                        }
                    }
                }
            }
            logger.info("PostgreSQL Database Schema successfully initialized.");
        } catch (Exception e) {
            logger.error("Error during PostgreSQL schema initialization: ", e);
        }
    }

    private static String loadResourceFile(String fileName) {
        try (InputStream is = DatabaseConfig.class.getClassLoader().getResourceAsStream(fileName)) {
            if (is != null) {
                return new String(is.readAllBytes(), StandardCharsets.UTF_8);
            }
        } catch (Exception e) {
            logger.warn("Could not read resource file: {}", fileName);
        }
        return null;
    }
}
