package service;

import entity.BookingHorse;
import entity.BookingHorseId;
import java.util.List;
import java.util.Optional;

public interface BookingHorseService {
    List<BookingHorse> findAll();
    Optional<BookingHorse> findById(BookingHorseId id);
    BookingHorse save(BookingHorse entity);
    void deleteById(BookingHorseId id);
}
