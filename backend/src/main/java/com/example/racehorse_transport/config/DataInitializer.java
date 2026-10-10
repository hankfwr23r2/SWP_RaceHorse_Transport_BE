package com.example.racehorse_transport.config;

import com.example.racehorse_transport.entity.Staff;
import com.example.racehorse_transport.entity.User;
import com.example.racehorse_transport.repository.StaffRepository;
import com.example.racehorse_transport.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final StaffRepository staffRepository;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        // 1. Tắt IDENTITY_CACHE trên SQL Server để ngăn ngừa ID bị nhảy số khi restart server
        try {
            jdbcTemplate.execute("ALTER DATABASE SCOPED CONFIGURATION SET IDENTITY_CACHE = OFF;");
            log.info("SQL Server IDENTITY_CACHE has been set to OFF.");
        } catch (Exception e) {
            log.warn("Could not set IDENTITY_CACHE: {}", e.getMessage());
        }

        // 2. Tự động khởi tạo tài khoản Admin mặc định nếu chưa tồn tại
        if (userRepository.findByEmail("admin01@gmail.com").isEmpty()) {
            User adminUser = new User();
            adminUser.setUsername("admin01");
            adminUser.setEmail("admin01@gmail.com");
            adminUser.setPasswordHash(passwordEncoder.encode("admin123"));
            adminUser = userRepository.save(adminUser);

            Staff adminStaff = new Staff();
            adminStaff.setUser(adminUser);
            adminStaff.setRole("ADMIN");
            adminStaff.setStaffCode("ADMIN-01");
            adminStaff.setEmploymentStatus("ACTIVE");
            adminStaff.setHireDate(LocalDate.now());
            staffRepository.save(adminStaff);

            log.info(">>> Seeded default ADMIN account: email=admin01@gmail.com, password=admin123 (UserID: {})", adminUser.getId());
        }
    }
}
