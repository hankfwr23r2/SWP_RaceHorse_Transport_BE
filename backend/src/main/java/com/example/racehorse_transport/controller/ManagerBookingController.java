package com.example.racehorse_transport.controller;

import com.example.racehorse_transport.dto.booking.BookingResponse;
import com.example.racehorse_transport.response.ApiResponse;
import com.example.racehorse_transport.service.BookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/manager/bookings")
@RequiredArgsConstructor
public class ManagerBookingController {

    private final BookingService bookingService;

    // 1. API Manager lấy danh sách đơn chờ tiếp nhận (hoặc lọc theo status)
    @GetMapping("/intake")
    public ResponseEntity<ApiResponse<List<BookingResponse>>> getIntakeBookings(
            @RequestParam(value = "status", required = false, defaultValue = "pending_intake") String status) {
        List<BookingResponse> bookings = bookingService.getBookingsByStatus(status);
        return ResponseEntity.ok(ApiResponse.success(bookings, "Lấy danh sách đơn chờ tiếp nhận thành công"));
    }

    // 2. API Manager xem toàn bộ đơn
    @GetMapping
    public ResponseEntity<ApiResponse<List<BookingResponse>>> getAllBookings() {
        List<BookingResponse> bookings = bookingService.getBookingsByStatus("ALL");
        return ResponseEntity.ok(ApiResponse.success(bookings, "Lấy danh sách toàn bộ đơn hàng thành công"));
    }
}
