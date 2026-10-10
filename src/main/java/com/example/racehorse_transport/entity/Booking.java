package com.example.racehorse_transport.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "BOOKING")
public class Booking {
    @Id
    @Column(name = "BookingID", nullable = false)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "CustomerID")
    private Customer customerID;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "RouteID")
    private Route routeID;

    @Column(name = "BookingDate")
    private Instant bookingDate;

    @Column(name = "DepartureDate")
    private Instant departureDate;

    @Size(max = 50)
    @Column(name = "Status", length = 50)
    private String status;

    @Column(name = "ToTalBookingPrice", precision = 18, scale = 2)
    private BigDecimal totalBookingPrice;

}