package service;

import entity.Location;

import java.util.List;
import java.util.Optional;

public interface LocationService {
    List<Location> findAll();
    Optional<Location> findById(Integer id);
    Location save(Location entity);
    void deleteById(Integer id);
}
