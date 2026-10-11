package com.example.racehorse_transport.service.impl;

import com.example.racehorse_transport.dto.admin.AccountResponse;
import com.example.racehorse_transport.dto.admin.CreateStaffRequest;
import com.example.racehorse_transport.entity.Customer;
import com.example.racehorse_transport.entity.Staff;
import com.example.racehorse_transport.entity.User;
import com.example.racehorse_transport.repository.CustomerRepository;
import com.example.racehorse_transport.repository.StaffRepository;
import com.example.racehorse_transport.repository.UserRepository;
import com.example.racehorse_transport.service.AdminAccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AdminAccountServiceImpl implements AdminAccountService {

    private final UserRepository userRepository;
    private final StaffRepository staffRepository;
    private final CustomerRepository customerRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public List<AccountResponse> getAllAccounts() {
        List<AccountResponse> result = new ArrayList<>();

        // 1. Thêm danh sách nhân viên Staff
        List<Staff> staffList = staffRepository.findAll();
        for (Staff staff : staffList) {
            User user = staff.getUser();
            if (user != null) {
                String role = staff.getRole() != null ? staff.getRole().toLowerCase() : "staff";
                String status = "ACTIVE".equalsIgnoreCase(staff.getEmploymentStatus()) ? "active" : "locked";

                result.add(AccountResponse.builder()
                        .id("TK-" + String.format("%03d", user.getId()))
                        .userId(user.getId())
                        .name(user.getUsername() != null ? user.getUsername() : staff.getStaffCode())
                        .email(user.getEmail())
                        .phone(null)
                        .role(role)
                        .status(status)
                        .staffCode(staff.getStaffCode())
                        .hireDate(staff.getHireDate())
                        .build());
            }
        }

        // 2. Thêm danh sách khách hàng Customer
        List<Customer> customerList = customerRepository.findAll();
        for (Customer customer : customerList) {
            User user = customer.getUser();
            if (user != null) {
                result.add(AccountResponse.builder()
                        .id("TK-" + String.format("%03d", user.getId()))
                        .userId(user.getId())
                        .name(customer.getFullName() != null ? customer.getFullName() : user.getUsername())
                        .email(user.getEmail())
                        .phone(customer.getPhone())
                        .role("customer")
                        .status("active")
                        .staffCode(null)
                        .hireDate(null)
                        .build());
            }
        }

        return result;
    }

    @Override
    @Transactional
    public AccountResponse createStaffAccount(CreateStaffRequest request) {
        String email = request.getEmail().trim().toLowerCase();

        // 1. Kiểm tra Email đã tồn tại chưa
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email " + email + " đã có tài khoản trong hệ thống!");
        }

        // 2. Sinh mật khẩu tạm (dễ đọc, ngẫu nhiên: Eq + 6 ký tự + 2 số)
        String tempPassword = "Eq" + UUID.randomUUID().toString().replace("-", "").substring(0, 6) + (10 + (int)(Math.random() * 90));

        // 3. Tạo tài khoản User
        User user = new User();
        user.setUsername(request.getName().trim()); // Lưu Họ tên vào username để hiển thị
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(tempPassword));
        User savedUser = userRepository.save(user);

        // 4. Sinh mã nhân viên tự động theo vai trò (TX-01, QL-01, DP-01, KD-01...)
        String rawRole = request.getRole().trim().toLowerCase();
        String prefix = getStaffCodePrefix(rawRole);
        long count = staffRepository.countByRoleIgnoreCase(rawRole) + 1;
        String staffCode = prefix + "-" + String.format("%02d", count);

        // 5. Tạo thông tin Staff
        Staff staff = new Staff();
        staff.setUser(savedUser);
        staff.setRole(rawRole.toUpperCase());
        staff.setStaffCode(staffCode);
        staff.setHireDate(LocalDate.now());
        staff.setEmploymentStatus("ACTIVE");
        staffRepository.save(staff);

        // 6. Trả về kết quả kèm mật khẩu tạm cho Admin
        return AccountResponse.builder()
                .id("TK-" + String.format("%03d", savedUser.getId()))
                .userId(savedUser.getId())
                .name(request.getName().trim())
                .email(email)
                .phone(request.getPhone() != null ? request.getPhone().trim() : "")
                .role(rawRole)
                .status("active")
                .staffCode(staffCode)
                .hireDate(staff.getHireDate())
                .tempPassword(tempPassword)
                .build();
    }

    @Override
    @Transactional
    public void toggleAccountStatus(Integer userId, boolean lock) {
        Staff staff = staffRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy nhân viên có ID: " + userId));

        // Quy tắc bảo mật: Không được khóa Admin duy nhất còn hoạt động trong hệ thống
        if (lock && "ADMIN".equalsIgnoreCase(staff.getRole())) {
            long activeAdminCount = staffRepository.findAll().stream()
                    .filter(s -> "ADMIN".equalsIgnoreCase(s.getRole()) && "ACTIVE".equalsIgnoreCase(s.getEmploymentStatus()))
                    .count();
            if (activeAdminCount <= 1) {
                throw new IllegalArgumentException("Không thể khóa Quản trị viên (Admin) duy nhất còn hoạt động trong hệ thống!");
            }
        }

        staff.setEmploymentStatus(lock ? "INACTIVE" : "ACTIVE");
        staffRepository.save(staff);
    }

    @Override
    @Transactional
    public String resetPassword(Integer userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng có ID: " + userId));

        String tempPassword = "Eq" + UUID.randomUUID().toString().replace("-", "").substring(0, 6) + (10 + (int)(Math.random() * 90));
        user.setPasswordHash(passwordEncoder.encode(tempPassword));
        userRepository.save(user);

        return tempPassword;
    }

    // Hàm phụ trợ sinh tiền tố mã nhân viên
    private String getStaffCodePrefix(String role) {
        return switch (role.toLowerCase()) {
            case "manager" -> "QL";
            case "coordinator" -> "DP";
            case "specialist" -> "KD";
            case "driver" -> "TX";
            case "escort" -> "HT";
            case "admin" -> "ADM";
            default -> "NV";
        };
    }
}
