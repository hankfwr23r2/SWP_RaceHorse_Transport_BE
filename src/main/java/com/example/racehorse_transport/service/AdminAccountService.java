package com.example.racehorse_transport.service;

import com.example.racehorse_transport.dto.admin.AccountResponse;
import com.example.racehorse_transport.dto.admin.CreateStaffRequest;

import java.util.List;

public interface AdminAccountService {

    // 1. Lấy toàn bộ danh sách tài khoản (Staff + Customer) cho Admin
    List<AccountResponse> getAllAccounts();

    // 2. Admin tạo tài khoản nhân viên mới (trả về mật khẩu tạm)
    AccountResponse createStaffAccount(CreateStaffRequest request);

    // 3. Khóa hoặc mở khóa tài khoản
    void toggleAccountStatus(Integer userId, boolean lock);

    // 4. Đặt lại mật khẩu tạm thời cho nhân viên
    String resetPassword(Integer userId);
}
