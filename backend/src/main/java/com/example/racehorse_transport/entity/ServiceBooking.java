package com.example.racehorse_transport.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Entity
@Table(name = "SERVICE_BOOKING")
public class ServiceBooking {
    @EmbeddedId
    private ServiceBookingId id;

    @MapsId("bookingID")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "BookingID", nullable = false)
    private Booking bookingID;

    @MapsId("horseID")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "HorseID", nullable = false)
    private Horse horseID;

    @MapsId("serviceID")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ServiceID", nullable = false)
    private Service serviceID;

    @Column(name = "quantity")
    private Integer quantity;

    @Column(name = "unitPrice", precision = 18, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "subtotal", precision = 18, scale = 2)
    private BigDecimal subtotal;


}