package repository;

import entity.BookingHorse;
import entity.BookingHorseId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BookingHorseRepository extends JpaRepository<BookingHorse, BookingHorseId> {
}
