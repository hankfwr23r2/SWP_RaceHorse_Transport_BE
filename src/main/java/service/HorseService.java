package service;

import entity.Horse;

import java.util.List;
import java.util.Optional;

public interface HorseService {
    List<Horse> findAll();
    Optional<Horse> findById(Integer id);
    Horse save(Horse entity);
    void deleteById(Integer id);
}
