package com.example.racehorse_transport.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "TRIP_DOCUMENT")
public class TripDocument {
    @Id
    @Column(name = "TripDocumentID", nullable = false)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "BookingID")
    private Booking bookingID;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "RegulationID")
    private Regulation regulationID;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "StaffID")
    private Staff staffID;

    @Size(max = 100)
    @Column(name = "documentType", length = 100)
    private String documentType;

    @Size(max = 100)
    @Column(name = "documentNumber", length = 100)
    private String documentNumber;

    @Column(name = "issue_Date")
    private LocalDate issueDate;

    @Column(name = "expiryDate")
    private LocalDate expiryDate;

    @Size(max = 50)
    @Column(name = "status", length = 50)
    private String status;


}