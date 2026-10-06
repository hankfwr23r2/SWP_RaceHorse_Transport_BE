package service;

import entity.ServiceBooking;
import entity.ServiceBookingId;
import java.util.List;
import java.util.Optional;

public interface ServiceBookingService {
    List<ServiceBooking> findAll();
    Optional<ServiceBooking> findById(ServiceBookingId id);
    ServiceBooking save(ServiceBooking entity);
    void deleteById(ServiceBookingId id);
}
