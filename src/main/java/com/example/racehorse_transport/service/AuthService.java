package com.example.racehorse_transport.service;

import com.example.racehorse_transport.dto.AuthResponse;
import com.example.racehorse_transport.dto.LoginRequest;
import com.example.racehorse_transport.dto.RegisterRequest;

public interface AuthService {
    
    // Đăng ký tài khoản người dùng mới
    void register(RegisterRequest request);

    // Đăng nhập và nhận về JWT Token
    AuthResponse login(LoginRequest request);
}
