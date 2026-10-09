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

    @Override
    public AuthResponse login(LoginRequest request) {
        // 1. Tìm user theo username
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("Tên đăng nhập hoặc mật khẩu không chính xác!"));

        // 2. So khớp mật khẩu nhập vào với mật khẩu đã băm (hash) trong database
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Tên đăng nhập hoặc mật khẩu không chính xác!");
        }

        // 3. Xác định vai trò (Role): Nếu có trong bảng Staff thì lấy role Staff, ngược lại là CUSTOMER
        String role = "CUSTOMER";
        Optional<Staff> staffOpt = staffRepository.findById(user.getId());
        if (staffOpt.isPresent() && staffOpt.get().getRole() != null) {
            role = staffOpt.get().getRole();
        }

        // 4. Sinh JWT Token
        String token = jwtUtils.generateToken(user.getUsername(), role);

        // 5. Trả về thông tin phản hồi
        return AuthResponse.builder()
                .accessToken(token)
                .tokenType("Bearer")
                .userId(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(role)
                .build();
    }
}
