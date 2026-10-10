package com.example.racehorse_transport.service.impl;

import com.example.racehorse_transport.dto.AuthResponse;
import com.example.racehorse_transport.dto.LoginRequest;
import com.example.racehorse_transport.dto.RegisterRequest;
import com.example.racehorse_transport.entity.Customer;
import com.example.racehorse_transport.entity.Staff;
import com.example.racehorse_transport.entity.User;
import com.example.racehorse_transport.repository.CustomerRepository;
import com.example.racehorse_transport.repository.StaffRepository;
import com.example.racehorse_transport.repository.UserRepository;
import com.example.racehorse_transport.security.JwtUtils;
import com.example.racehorse_transport.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final StaffRepository staffRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;

    @Override
    @Transactional
    public void register(RegisterRequest request) {
        // 1. Kiểm tra username đã tồn tại chưa
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Username đã được sử dụng!");
        }

        // 2. Kiểm tra email đã tồn tại chưa
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email đã được sử dụng!");
        }

        // 3. Tạo tài khoản User mới với mật khẩu mã hóa BCrypt
        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        User savedUser = userRepository.save(user);

        // 4. Mặc định tạo thông tin hồ sơ Customer tương ứng
        Customer customer = new Customer();
        customer.setUser(savedUser);
        customer.setFullName(request.getFullName() != null && !request.getFullName().isBlank()
                ? request.getFullName()
                : request.getUsername());
        customer.setPhone(request.getPhone());
        customer.setAddress(request.getAddress());
        customerRepository.save(customer);
    }

        // ==========================================
    // 1. ĐĂNG NHẬP DÀNH CHO KHÁCH HÀNG (CUSTOMER)
    // ==========================================
    @Override
    public AuthResponse loginCustomer(LoginRequest request) {
        // Tìm User theo username HOẶC email
        User user = userRepository.findByUsernameOrEmail(request.getUsername(), request.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("Tên đăng nhập/email hoặc mật khẩu không chính xác!"));

        // So khớp mật khẩu đã hash
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Tên đăng nhập/email hoặc mật khẩu không chính xác!");
        }

        // KIỂM TRA BẢO MẬT: Bắt buộc phải có trong bảng Customer
        Customer customer = customerRepository.findById(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Tài khoản này không phải là tài khoản khách hàng!"));

        // Sinh JWT Token với Role là CUSTOMER
        String token = jwtUtils.generateToken(user.getUsername(), "CUSTOMER");

        return AuthResponse.builder()
                .accessToken(token)
                .tokenType("Bearer")
                .userId(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role("CUSTOMER")
                .fullName(customer.getFullName())
                .build();
    }

    // ==========================================
    // 2. ĐĂNG NHẬP DÀNH CHO NHÂN VIÊN NỘI BỘ (STAFF)
    // ==========================================
    @Override
    public AuthResponse loginStaff(LoginRequest request) {
        // Tìm User theo username HOẶC email
        User user = userRepository.findByUsernameOrEmail(request.getUsername(), request.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("Tài khoản nội bộ hoặc mật khẩu không chính xác!"));

        // So khớp mật khẩu
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Tài khoản nội bộ hoặc mật khẩu không chính xác!");
        }

        // KIỂM TRA BẢO MẬT: Bắt buộc phải tồn tại trong bảng Staff
        Staff staff = staffRepository.findById(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Tài khoản này không có quyền truy cập hệ thống nội bộ!"));

        // Kiểm tra trạng thái làm việc (nếu bị nghỉ việc/khóa thì chặn)
        if ("INACTIVE".equalsIgnoreCase(staff.getEmploymentStatus())) {
            throw new IllegalArgumentException("Tài khoản nhân viên đã bị vô hiệu hóa. Vui lòng liên hệ Admin!");
        }

        String staffRole = staff.getRole() != null ? staff.getRole().toUpperCase() : "STAFF";

        // Sinh JWT Token với đúng Role nội bộ (MANAGER, SPECIALIST, COORDINATOR...)
        String token = jwtUtils.generateToken(user.getUsername(), staffRole);

        return AuthResponse.builder()
                .accessToken(token)
                .tokenType("Bearer")
                .userId(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(staffRole)
                .staffCode(staff.getStaffCode())
                .build();
    }

    // ==========================================
    // 3. LÀM MỚI ACCESS TOKEN TỪ REFRESH TOKEN
    // ==========================================
    @Override
    public AuthResponse refreshToken(String refreshToken) {
        if (!jwtUtils.validateToken(refreshToken)) {
            throw new IllegalArgumentException("Refresh token không hợp lệ hoặc đã hết hạn!");
        }

        String username = jwtUtils.getUsernameFromToken(refreshToken);
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Người dùng không tồn tại!"));

        String role = "CUSTOMER";
        String fullName = null;
        String staffCode = null;

        Optional<Staff> staffOpt = staffRepository.findById(user.getId());
        if (staffOpt.isPresent()) {
            Staff staff = staffOpt.get();
            if ("INACTIVE".equalsIgnoreCase(staff.getEmploymentStatus())) {
                throw new IllegalArgumentException("Tài khoản nhân viên đã bị vô hiệu hóa!");
            }
            role = staff.getRole() != null ? staff.getRole().toUpperCase() : "STAFF";
            staffCode = staff.getStaffCode();
        } else {
            Optional<Customer> customerOpt = customerRepository.findById(user.getId());
            if (customerOpt.isPresent()) {
                fullName = customerOpt.get().getFullName();
            }
        }

        String newAccessToken = jwtUtils.generateToken(username, role);

        return AuthResponse.builder()
                .accessToken(newAccessToken)
                .tokenType("Bearer")
                .userId(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(role)
                .fullName(fullName)
                .staffCode(staffCode)
                .build();
    }
}

