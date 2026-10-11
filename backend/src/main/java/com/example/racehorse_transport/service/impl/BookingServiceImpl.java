package com.example.racehorse_transport.service.impl;

import com.example.racehorse_transport.dto.booking.BookingHorseDto;
import com.example.racehorse_transport.dto.booking.BookingResponse;
import com.example.racehorse_transport.dto.booking.CreateBookingRequest;
import com.example.racehorse_transport.dto.booking.PartyContactDto;
import com.example.racehorse_transport.entity.*;
import com.example.racehorse_transport.repository.*;
import com.example.racehorse_transport.service.BookingService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookingServiceImpl implements BookingService {

    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final HorseRepository horseRepository;
    private final SystemLogRepository systemLogRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

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

    @Override
    @Transactional
    public BookingResponse createBooking(String customerUsername, CreateBookingRequest request) {
        // 1. Tìm thông tin User
        User user = userRepository.findByUsernameOrEmail(customerUsername, customerUsername)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thông tin người dùng: " + customerUsername));

        // 2. Tìm hoặc tự động tạo Customer profile
        Customer customer = customerRepository.findById(user.getId())
                .orElseGet(() -> {
                    Customer c = new Customer();
                    c.setUser(user);
                    c.setFullName(request.getConsignor() != null ? request.getConsignor().getName() : user.getUsername());
                    c.setPhone(request.getConsignor() != null ? request.getConsignor().getPhone() : "");
                    return customerRepository.save(c);
                });

        // 3. Chuyển đổi timestamp ngày khởi hành
        Instant departureInstant = request.getDepartAt() != null
                ? Instant.ofEpochMilli(request.getDepartAt())
                : Instant.now().plusSeconds(86400 * 3);

        // 4. Serialize cấu hình chi tiết ngựa vào detailsJson
        String detailsJson = null;
        try {
            detailsJson = objectMapper.writeValueAsString(request.getHorses());
        } catch (Exception e) {
            log.warn("Could not serialize horses detailsJson: {}", e.getMessage());
        }

        // 5. Tạo đơn hàng Booking mới
        Booking booking = Booking.builder()
                .customerID(customer)
                .bookingDate(Instant.now())
                .departureDate(departureInstant)
                .status("pending_intake")
                .bookingType(request.getType() != null ? request.getType().toLowerCase() : "domestic")
                .consignorName(request.getConsignor() != null ? request.getConsignor().getName().trim() : "")
                .consignorPhone(request.getConsignor() != null ? request.getConsignor().getPhone().trim() : "")
                .consigneeName(request.getConsignee() != null ? request.getConsignee().getName().trim() : "")
                .consigneePhone(request.getConsignee() != null ? request.getConsignee().getPhone().trim() : "")
                .pickupAddress(request.getOriginName() != null ? request.getOriginName().trim() : "")
                .dropoffAddress(request.getDestName() != null ? request.getDestName().trim() : "")
                .totalHorses(request.getHorses() != null ? request.getHorses().size() : 1)
                .detailsJson(detailsJson)
                .build();

        Booking savedBooking = bookingRepository.save(booking);

        // 6. Lưu danh sách ngựa cơ bản của khách hàng
        if (request.getHorses() != null) {
            for (BookingHorseDto hDto : request.getHorses()) {
                try {
                    Horse horse = Horse.builder()
                            .customerID(customer)
                            .horseName(hDto.getName() != null ? hDto.getName().trim() : "Ngựa chưa đặt tên")
                            .microchipID(hDto.getMicrochip() != null ? hDto.getMicrochip().trim() : null)
                            .gender(hDto.getSex() != null ? hDto.getSex().trim() : "stallion")
                            .status("ACTIVE")
                            .build();
                    horseRepository.save(horse);
                } catch (Exception ex) {
                    log.warn("Could not save horse: {}", ex.getMessage());
                }
            }
        }

        // 7. Ghi Audit Log vào SYSTEM_LOG
        try {
            SystemLog sysLog = SystemLog.builder()
                    .actionbyUserid(user)
                    .actionType("CREATE_BOOKING")
                    .targetTable("BOOKING")
                    .targetRecordID(savedBooking.getId())
                    .newData("Tạo đơn vận chuyển " + savedBooking.getTotalHorses() + " con ngựa (" + savedBooking.getPickupAddress() + " -> " + savedBooking.getDropoffAddress() + ")")
                    .createdAt(Instant.now())
                    .build();
            systemLogRepository.save(sysLog);
        } catch (Exception ignored) {
        }

        log.info("Successfully created booking ID={} for user={}", savedBooking.getId(), customerUsername);
        return mapToResponse(savedBooking);
    }

    @Override
    public List<BookingResponse> getCustomerBookings(String customerUsername) {
        User user = userRepository.findByUsernameOrEmail(customerUsername, customerUsername)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thông tin người dùng: " + customerUsername));

        return bookingRepository.findByCustomerID_IdOrderByBookingDateDesc(user.getId())
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    public BookingResponse getBookingById(Integer id, String customerUsername) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng có ID: " + id));

        return mapToResponse(booking);
    }

    @Override
    public List<BookingResponse> getBookingsByStatus(String status) {
        if (status == null || status.trim().isEmpty() || "ALL".equalsIgnoreCase(status)) {
            return bookingRepository.findAllByOrderByBookingDateDesc()
                    .stream()
                    .map(this::mapToResponse)
                    .toList();
        }
        return bookingRepository.findByStatusOrderByBookingDateAsc(status)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    private BookingResponse mapToResponse(Booking b) {
        String formattedId = "BK-" + String.format("%03d", b.getId());
        String customerUsername = "";
        String customerFullName = "";

        if (b.getCustomerID() != null) {
            customerFullName = b.getCustomerID().getFullName() != null ? b.getCustomerID().getFullName() : "";
            if (b.getCustomerID().getUser() != null) {
                customerUsername = b.getCustomerID().getUser().getUsername();
            }
        }

        List<BookingHorseDto> horseDtos = new ArrayList<>();
        if (b.getDetailsJson() != null && !b.getDetailsJson().trim().isEmpty()) {
            try {
                horseDtos = objectMapper.readValue(b.getDetailsJson(), new TypeReference<List<BookingHorseDto>>() {});
            } catch (Exception ignored) {
            }
        }

        return BookingResponse.builder()
                .id(formattedId)
                .numericId(b.getId())
                .type(b.getBookingType() != null ? b.getBookingType() : "domestic")
                .customer(customerUsername)
                .customerName(customerFullName)
                .status(b.getStatus() != null ? b.getStatus() : "pending_intake")
                .createdAt(b.getBookingDate() != null ? b.getBookingDate().toEpochMilli() : System.currentTimeMillis())
                .departAt(b.getDepartureDate() != null ? b.getDepartureDate().toEpochMilli() : System.currentTimeMillis())
                .originName(b.getPickupAddress())
                .destName(b.getDropoffAddress())
                .consignor(PartyContactDto.builder().name(b.getConsignorName()).phone(b.getConsignorPhone()).build())
                .consignee(PartyContactDto.builder().name(b.getConsigneeName()).phone(b.getConsigneePhone()).build())
                .totalHorses(b.getTotalHorses() != null ? b.getTotalHorses() : 1)
                .horses(horseDtos)
                .waybillNo(b.getWaybillNo())
                .build();
    }
}

