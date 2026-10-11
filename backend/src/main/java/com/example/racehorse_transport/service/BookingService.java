package com.example.racehorse_transport.service;

import com.example.racehorse_transport.dto.booking.CreateBookingRequest;
import com.example.racehorse_transport.dto.booking.BookingResponse;
import com.example.racehorse_transport.entity.Booking;

import java.util.List;
import java.util.Optional;

public interface BookingService {
    List<Booking> findAll();
    Optional<Booking> findById(Integer id);
    Booking save(Booking entity);
    void deleteById(Integer id);

    // Nghiệp vụ Flow 1: Khách hàng tạo yêu cầu đặt chuyến
    BookingResponse createBooking(String customerUsername, CreateBookingRequest request);

    // Nghiệp vụ Flow 1: Khách hàng xem danh sách đơn của mình
    List<BookingResponse> getCustomerBookings(String customerUsername);

    // Nghiệp vụ Flow 1: Xem chi tiết đơn
    BookingResponse getBookingById(Integer id, String customerUsername);

    // Nghiệp vụ Flow 1: Manager xem đơn theo trạng thái (chờ tiếp nhận)
    List<BookingResponse> getBookingsByStatus(String status);
}

