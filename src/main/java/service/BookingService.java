package service;

import entity.Booking;

import java.util.List;
import java.util.Optional;

public interface BookingService {
    List<Booking> findAll();
    Optional<Booking> findById(Integer id);
    Booking save(Booking entity);
    void deleteById(Integer id);
}
