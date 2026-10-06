package entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "VEHICLE")
public class Vehicle {
    @Id
    @Column(name = "VehicleID", nullable = false)
    private Integer id;

    @Size(max = 100)
    @Column(name = "vehicleType", length = 100)
    private String vehicleType;

    @Size(max = 50)
    @Column(name = "licensePlate", length = 50)
    private String licensePlate;

    @Column(name = "capacity")
    private Integer capacity;

    @Size(max = 50)
    @Column(name = "status", length = 50)
    private String status;


}