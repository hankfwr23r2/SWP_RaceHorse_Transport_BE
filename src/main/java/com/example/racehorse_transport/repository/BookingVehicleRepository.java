package com.example.racehorse_transport.repository;

import com.example.racehorse_transport.entity.BookingVehicle;
import com.example.racehorse_transport.entity.BookingVehicleId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BookingVehicleRepository extends JpaRepository<BookingVehicle, BookingVehicleId> {
}
