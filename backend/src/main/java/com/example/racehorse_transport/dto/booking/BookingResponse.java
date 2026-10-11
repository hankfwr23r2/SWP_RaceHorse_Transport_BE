package com.example.racehorse_transport.dto.booking;

import lombok.*;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingResponse {
    private String id; // "BK-001"
    private Integer numericId; // 1
    private String type; // "domestic", "international"
    private String customer; // username
    private String customerName; // Họ tên khách hàng
    private String status; // "pending_intake", "under_review", etc.
    private Long createdAt; // timestamp ms
    private Long departAt; // timestamp ms

    private String originName;
    private String originCountry;
    private String destName;
    private String destCountry;

    private PartyContactDto consignor;
    private PartyContactDto consignee;

    private Integer totalHorses;
    private List<BookingHorseDto> horses;
    private String waybillNo;
}
