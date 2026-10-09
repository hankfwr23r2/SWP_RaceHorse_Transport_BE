package com.example.racehorse_transport.service.impl;

import com.example.racehorse_transport.entity.Booking;

import com.example.racehorse_transport.repository.BookingRepository;
import com.example.racehorse_transport.service.BookingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class BookingServiceImpl implements BookingService {

    private final BookingRepository bookingRepository;

    @Autowired
    public BookingServiceImpl(BookingRepository bookingRepository) {
        this.bookingRepository = bookingRepository;
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
    // PHẦN VIỆC CỦA DEV 1 (Lead): Quản lý Đơn hàng (Flow 1)
    // =========================================================================
    // TODO (Dev 1): Khách hàng tạo Yêu cầu vận chuyển.
    // - Viết hàm createTransportRequest(BookingDTO)
    // - Validate thông tin ngựa, điểm đón, điểm đến
    
    // TODO (Dev 1): Manager tiếp nhận/duyệt đơn thô ban đầu.
    // - Viết hàm approveInitialBooking(Integer bookingId)
    // - Đổi status đơn hàng sang "Đã tiếp nhận"

    // =========================================================================
    // PHẦN VIỆC CỦA DEV 2: Tài chính & Hồ sơ (Flow 2)
    // =========================================================================
    // TODO (Dev 2): Tạo Báo giá (Quote).
    // - Viết hàm createQuotation(Integer bookingId, BigDecimal price)
    
    // TODO (Dev 2): Quyết toán đơn hàng.
    // - Viết hàm finalizeBooking(Integer bookingId)
    // - Tính tổng chi phí phát sinh, xuất hóa đơn cuối cùng.

    // =========================================================================
    // PHẦN VIỆC CỦA DEV 4: Bàn giao (Flow 6)
    // =========================================================================
    // TODO (Dev 4): Bàn giao, ký nhận, cập nhật trạng thái kết thúc.
    // - Viết hàm completeBookingDelivery(Integer bookingId)
    // - Đổi trạng thái thành "Hoàn thành", lưu chữ ký người nhận.

}
