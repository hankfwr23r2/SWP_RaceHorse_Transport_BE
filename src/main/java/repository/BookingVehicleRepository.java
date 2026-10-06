package repository;

import entity.BookingVehicle;
import entity.BookingVehicleId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BookingVehicleRepository extends JpaRepository<BookingVehicle, BookingVehicleId> {
}
