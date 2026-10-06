package service;

import entity.Vehicle;

import java.util.List;
import java.util.Optional;

public interface VehicleService {
    List<Vehicle> findAll();
    Optional<Vehicle> findById(Integer id);
    Vehicle save(Vehicle entity);
    void deleteById(Integer id);
}
