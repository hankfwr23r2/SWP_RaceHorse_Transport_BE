package service;

import entity.BookingVehicle;
import entity.BookingVehicleId;
import java.util.List;
import java.util.Optional;

public interface BookingVehicleService {
    List<BookingVehicle> findAll();
    Optional<BookingVehicle> findById(BookingVehicleId id);
    BookingVehicle save(BookingVehicle entity);
    void deleteById(BookingVehicleId id);
}
