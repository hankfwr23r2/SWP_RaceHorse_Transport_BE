package com.example.racehorse_transport.controller;

import com.example.racehorse_transport.dto.admin.AccountResponse;
import com.example.racehorse_transport.dto.admin.CreateStaffRequest;
import com.example.racehorse_transport.response.ApiResponse;
import com.example.racehorse_transport.service.AdminAccountService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/accounts")
@RequiredArgsConstructor
public class AdminAccountController {

    private final AdminAccountService adminAccountService;

    // 1. API Lấy danh sách toàn bộ tài khoản
    @GetMapping
    public ResponseEntity<ApiResponse<List<AccountResponse>>> getAllAccounts() {
        List<AccountResponse> accounts = adminAccountService.getAllAccounts();
        return ResponseEntity.ok(ApiResponse.success(accounts, "Lấy danh sách tài khoản thành công"));
    }

    // 2. API Admin tạo tài khoản nhân viên mới
    @PostMapping
    public ResponseEntity<ApiResponse<AccountResponse>> createStaffAccount(@Valid @RequestBody CreateStaffRequest request) {
        AccountResponse response = adminAccountService.createStaffAccount(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Tạo tài khoản nhân viên thành công"));
    }

    // 3. API Khóa / Mở khóa tài khoản
    @PatchMapping("/{userId}/status")
    public ResponseEntity<ApiResponse<Void>> toggleAccountStatus(
            @PathVariable Integer userId,
            @RequestBody Map<String, Boolean> body) {
        boolean lock = body.getOrDefault("locked", false);
        adminAccountService.toggleAccountStatus(userId, lock);
        String msg = lock ? "Đã khóa tài khoản thành công" : "Đã mở khóa tài khoản thành công";
        return ResponseEntity.ok(ApiResponse.success(null, msg));
    }

    // 4. API Đặt lại mật khẩu cho nhân viên
    @PostMapping("/{userId}/reset-password")
    public ResponseEntity<ApiResponse<Map<String, String>>> resetPassword(@PathVariable Integer userId) {
        String tempPassword = adminAccountService.resetPassword(userId);
        return ResponseEntity.ok(ApiResponse.success(Map.of("tempPassword", tempPassword), "Đặt lại mật khẩu thành công"));
    }
}
