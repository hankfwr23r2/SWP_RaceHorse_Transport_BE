package entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "BOOKING_ASSIGNMENT")
public class BookingAssignment {
    @Id
    @Column(name = "AssignmentID", nullable = false)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "BookingID")
    private Booking bookingID;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "StaffID")
    private Staff staffID;

    @Size(max = 100)
    @Column(name = "AssignRole", length = 100)
    private String assignRole;

    @Size(max = 50)
    @Column(name = "status", length = 50)
    private String status;


}