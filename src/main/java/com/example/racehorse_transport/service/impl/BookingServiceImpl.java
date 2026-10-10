package com.example.racehorse_transport.service.impl;

import com.example.racehorse_transport.entity.Booking;
import com.example.racehorse_transport.entity.Log;
import com.example.racehorse_transport.repository.BookingRepository;
import com.example.racehorse_transport.repository.LogRepository;
import com.example.racehorse_transport.service.BookingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
public class BookingServiceImpl implements BookingService {

    private final BookingRepository bookingRepository;
    private final LogRepository logRepository;

    @Autowired
    public BookingServiceImpl(BookingRepository bookingRepository, LogRepository logRepository) {
        this.bookingRepository = bookingRepository;
        this.logRepository = logRepository;
    }

    @Override
    public List<Booking> findAll() {
        return bookingRepository.findAll();
    }

    @Override
    public Optional<Booking> findById(Integer id) {
        return bookingRepository.findById(id);
    }

    @Override
    public Booking save(Booking entity) {
        return bookingRepository.save(entity);
    }

    @Override
    public void deleteById(Integer id) {
        bookingRepository.deleteById(id);
    }

    // =========================================================================
    // PHẦN VIỆC CỦA DEV 4: Bàn giao (Flow 6)
    // =========================================================================

    // Bàn giao, ký nhận, cập nhật trạng thái kết thúc đơn hàng
    @Override
    @Transactional
    public boolean completeBookingDelivery(Integer bookingId, String recipientName, String recipientSignature, String note) {
        // 1. Tìm đơn hàng cần hoàn thành
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng có ID: " + bookingId));

        // 2. Kiểm tra trạng thái hiện tại
        if ("COMPLETED".equalsIgnoreCase(booking.getStatus())) {
            throw new IllegalArgumentException("Đơn hàng này đã được bàn giao và hoàn tất trước đó!");
        }

        // 3. Cập nhật trạng thái đơn hàng sang "COMPLETED" (Hoàn thành)
        booking.setStatus("COMPLETED");
        bookingRepository.save(booking);

        // 4. Lưu biên bản bàn giao & chữ ký vào bảng LOG hệ thống để đối soát
        Log deliveryLog = new Log();
        deliveryLog.setId((int) (logRepository.count() + 1));
        deliveryLog.setBookingID(booking);
        deliveryLog.setLogType("DELIVERY_COMPLETED");
        deliveryLog.setStatus("SUCCESS");
        deliveryLog.setNote("Hoàn tất bàn giao ngựa. Người nhận: " + recipientName
                + (recipientSignature != null ? " | Chữ ký/Biên bản: " + recipientSignature : "")
                + (note != null ? " | Ghi chú: " + note : ""));
        deliveryLog.setCreatedAt(Instant.now());
        logRepository.save(deliveryLog);

        return true;
    }
}