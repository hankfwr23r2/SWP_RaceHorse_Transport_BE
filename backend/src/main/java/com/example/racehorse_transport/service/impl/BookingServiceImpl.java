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

import com.example.racehorse_transport.dto.booking.BookingDetailsPayload;
import com.example.racehorse_transport.dto.coordinator.CoordinatorPlanRequest;
import com.example.racehorse_transport.dto.coordinator.VehicleTripDto;
import com.example.racehorse_transport.service.FleetService;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookingServiceImpl implements BookingService {

    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final HorseRepository horseRepository;
    private final SystemLogRepository systemLogRepository;
    private final BookingVehicleRepository bookingVehicleRepository;
    private final FleetService fleetService;
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

    @Override
    @Transactional
    public BookingResponse confirmCoordinatorPlan(String bookingIdentifier, CoordinatorPlanRequest request) {
        if (bookingIdentifier == null || bookingIdentifier.trim().isEmpty()) {
            throw new IllegalArgumentException("Mã đơn hàng không được để trống!");
        }

        // 1. Phân giải Booking ID (chấp nhận "BK-001", "1", "ORD-2026-0001", v.v.)
        Integer bookingId;
        String cleanId = bookingIdentifier.trim();
        try {
            if (cleanId.toUpperCase().startsWith("BK-")) {
                bookingId = Integer.parseInt(cleanId.substring(3).trim());
            } else if (cleanId.toUpperCase().startsWith("ORD-")) {
                String[] parts = cleanId.split("-");
                bookingId = Integer.parseInt(parts[parts.length - 1].trim());
            } else {
                bookingId = Integer.parseInt(cleanId);
            }
        } catch (Exception ex) {
            throw new IllegalArgumentException("Định dạng mã đơn không hợp lệ: " + bookingIdentifier);
        }

        // 2. Tìm đơn hàng
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng ID: " + bookingIdentifier));

        if (request.getTrips() == null || request.getTrips().isEmpty()) {
            throw new IllegalArgumentException("Phương án điều phối phải có ít nhất 1 chuyến xe!");
        }

        // 3. Kiểm tra tính khả dụng & tải trọng của từng xe
        Instant departDate = booking.getDepartureDate() != null ? booking.getDepartureDate() : Instant.now();
        List<BookingVehicle> newVehicles = new ArrayList<>();

        for (int i = 0; i < request.getTrips().size(); i++) {
            VehicleTripDto trip = request.getTrips().get(i);
            if (trip.getVehicleId() == null || trip.getVehicleId().trim().isEmpty()) {
                throw new IllegalArgumentException("Chuyến thứ " + (i + 1) + " chưa được chọn xe!");
            }
            if (trip.getHorseIds() == null || trip.getHorseIds().isEmpty()) {
                throw new IllegalArgumentException("Chuyến thứ " + (i + 1) + " phải chở ít nhất 1 ngựa!");
            }

            Vehicle vehicle = fleetService.findVehicleByIdOrCode(trip.getVehicleId());

            // Kiểm tra tải trọng ngăn xe
            if (trip.getHorseIds().size() > vehicle.getCapacity()) {
                throw new IllegalArgumentException("Xe " + vehicle.getLicensePlate() + " chỉ có " + vehicle.getCapacity()
                        + " ngăn, không thể chở " + trip.getHorseIds().size() + " con ngựa!");
            }

            // Kiểm tra lịch bận & khứ hồi về trụ sở VN
            fleetService.validateVehicleAvailability(vehicle.getId(), departDate, booking.getBookingType(), booking.getId());

            // Chuẩn hóa tripId
            if (trip.getTripId() == null || trip.getTripId().trim().isEmpty()) {
                trip.setTripId("TRP-" + String.format("%03d", booking.getId()) + "-" + (i + 1));
            }
            // Gán vehicleId là id chuẩn dạng số
            trip.setVehicleId(String.valueOf(vehicle.getId()));

            BookingVehicle bv = BookingVehicle.builder()
                    .id(new BookingVehicleId(booking.getId(), vehicle.getId()))
                    .bookingID(booking)
                    .vehicleID(vehicle)
                    .assignAt(Instant.now())
                    .build();
            newVehicles.add(bv);
        }

        // 4. Lưu liên kết xe vào bảng BOOKING_VEHICLE
        bookingVehicleRepository.deleteByBookingID_Id(booking.getId());
        bookingVehicleRepository.flush();
        bookingVehicleRepository.saveAll(newVehicles);

        // 5. Cập nhật detailsJson của Booking
        BookingDetailsPayload payload = new BookingDetailsPayload();
        if (booking.getDetailsJson() != null && !booking.getDetailsJson().trim().isEmpty()) {
            String existingJson = booking.getDetailsJson().trim();
            try {
                if (existingJson.startsWith("{")) {
                    payload = objectMapper.readValue(existingJson, BookingDetailsPayload.class);
                } else if (existingJson.startsWith("[")) {
                    List<BookingHorseDto> horses = objectMapper.readValue(existingJson, new TypeReference<List<BookingHorseDto>>() {});
                    payload.setHorses(horses);
                }
            } catch (Exception ex) {
                log.warn("Error reading existing detailsJson: {}", ex.getMessage());
            }
        }

        payload.setTrips(request.getTrips());
        payload.setRoute(request.getRoute());
        payload.setGate(request.getGate());

        Map<String, Object> planMap = new HashMap<>();
        planMap.put("at", System.currentTimeMillis());
        planMap.put("by", request.getBy() != null ? request.getBy() : "Điều phối viên");
        planMap.put("note", request.getNote() != null ? request.getNote() : "");
        payload.setPlan(planMap);

        if (payload.getHistory() == null) {
            payload.setHistory(new ArrayList<>());
        }
        Map<String, Object> historyEntry = new HashMap<>();
        historyEntry.put("time", System.currentTimeMillis());
        historyEntry.put("actor", request.getBy() != null ? request.getBy() : "Điều phối viên");
        historyEntry.put("text", "Xác nhận " + request.getTrips().size() + " xe và lộ trình di chuyển");
        payload.getHistory().add(historyEntry);

        try {
            booking.setDetailsJson(objectMapper.writeValueAsString(payload));
        } catch (Exception ex) {
            log.error("Could not serialize payload: {}", ex.getMessage());
        }

        // 6. Cập nhật trạng thái đơn sang pending_commercial
        booking.setStatus("pending_commercial");
        Booking updatedBooking = bookingRepository.save(booking);

        // 7. Ghi nhật ký hệ thống SYSTEM_LOG
        try {
            SystemLog sysLog = SystemLog.builder()
                    .actionType("COORDINATOR_CONFIRM_PLAN")
                    .targetTable("BOOKING")
                    .targetRecordID(updatedBooking.getId())
                    .newData("Điều phối viên (" + (request.getBy() != null ? request.getBy() : "coordinator") + ") chốt "
                            + request.getTrips().size() + " xe và lộ trình đơn BK-" + updatedBooking.getId()
                            + ", chuyển quản lý duyệt báo giá & phân tài/hộ tống.")
                    .createdAt(Instant.now())
                    .build();
            systemLogRepository.save(sysLog);
        } catch (Exception ignored) {}

        log.info("Coordinator successfully confirmed fleet plan for booking ID={}", updatedBooking.getId());
        return mapToResponse(updatedBooking);
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

        BookingDetailsPayload payload = null;
        List<BookingHorseDto> horseDtos = new ArrayList<>();
        if (b.getDetailsJson() != null && !b.getDetailsJson().trim().isEmpty()) {
            String json = b.getDetailsJson().trim();
            try {
                if (json.startsWith("{")) {
                    payload = objectMapper.readValue(json, BookingDetailsPayload.class);
                    if (payload.getHorses() != null) {
                        horseDtos = payload.getHorses();
                    }
                } else if (json.startsWith("[")) {
                    horseDtos = objectMapper.readValue(json, new TypeReference<List<BookingHorseDto>>() {});
                }
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
                .trips(payload != null ? payload.getTrips() : null)
                .route(payload != null ? payload.getRoute() : null)
                .gate(payload != null ? payload.getGate() : null)
                .plan(payload != null ? payload.getPlan() : null)
                .quote(payload != null ? payload.getQuote() : null)
                .payment(payload != null ? payload.getPayment() : null)
                .medical(payload != null ? payload.getMedical() : null)
                .intake(payload != null ? payload.getIntake() : null)
                .history(payload != null ? payload.getHistory() : null)
                .build();
    }
}

