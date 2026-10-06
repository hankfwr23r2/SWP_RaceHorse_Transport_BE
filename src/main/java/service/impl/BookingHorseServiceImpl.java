package service.impl;

import entity.BookingHorse;
import entity.BookingHorseId;
import repository.BookingHorseRepository;
import service.BookingHorseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class BookingHorseServiceImpl implements BookingHorseService {

    private final BookingHorseRepository bookingHorseRepository;

    @Autowired
    public BookingHorseServiceImpl(BookingHorseRepository bookingHorseRepository) {
        this.bookingHorseRepository = bookingHorseRepository;
    }

    @Override
    public List<BookingHorse> findAll() {
        return bookingHorseRepository.findAll();
    }

    @Override
    public Optional<BookingHorse> findById(BookingHorseId id) {
        return bookingHorseRepository.findById(id);
    }

    @Override
    public BookingHorse save(BookingHorse entity) {
        return bookingHorseRepository.save(entity);
    }

    @Override
    public void deleteById(BookingHorseId id) {
        bookingHorseRepository.deleteById(id);
    }
}
